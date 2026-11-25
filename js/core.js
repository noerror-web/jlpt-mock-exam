/* JLPT Exam Lab — core engine (v6).
   Data loading, question generation, exam model, grading and persistence.
   Exposes window.JLPT for the UI layer. No DOM rendering happens here. */
(function () {
  "use strict";

  const VERSION = "6.7.1";
  const STORE = {
    settings: "jlpt6.settings",
    exam: "jlpt6.exam",
    mistakes: "jlpt6.mistakes",
    stats: "jlpt6.stats",
    generated: "jlpt6.generated",
    served: "jlpt6.served",
    done: "jlpt6.done",
    migrated: "jlpt6.migrated"
  };

  // Where a question came from. "generated" is the machine-built pool,
  // "bank" is the curated / scraped / past-paper pool, "live" is a remote API.
  const ORIGIN_META = {
    generated: { label: "Generated", en: "generated pool" },
    bank: { label: "Bank", en: "question bank" },
    live: { label: "Live", en: "live API" }
  };

  const SECTION_META = {
    vocab: { label: "文字・語彙", en: "Vocabulary & Kanji" },
    grammar: { label: "文法", en: "Grammar" },
    reading: { label: "読解", en: "Reading" }
  };
  const LESSONS = { N5: ["L1-12", "L13-25"], N4: ["L26-35", "L36-40", "L41-50"] };
  const PASS_TOTAL = { N5: 80, N4: 90 };
  const SECTION_POINTS = 60;
  const SECTION_MIN = Math.round(SECTION_POINTS * 0.32);

  const DEFAULT_SETTINGS = {
    level: "N5", name: "", source: "bank", section: "all", lesson: "all",
    count: 20, timer: 15, layout: "focus", furigana: true, autoAdvance: false,
    study: false, lang: "both", theme: "auto",
    workerUrl: "https://jlpt-mock-exam-proxy.mominurislam.workers.dev", apiKey: "", relayDefault: true,
    telegramUrl: "https://jlpt-mock-exam-proxy.mominurislam.workers.dev/api/telegram"
  };

  /* ---------------------------------------------------------------- utils */

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  const RICH_TAGS = [
    ["&lt;u&gt;", "<u>"], ["&lt;/u&gt;", "</u>"],
    ["&lt;b&gt;", "<b>"], ["&lt;/b&gt;", "</b>"],
    ["&lt;br&gt;", "<br>"], ["&lt;br/&gt;", "<br>"], ["&lt;br /&gt;", "<br>"],
    ["&lt;ruby&gt;", "<ruby>"], ["&lt;/ruby&gt;", "</ruby>"],
    ["&lt;rt&gt;", "<rt>"], ["&lt;/rt&gt;", "</rt>"]
  ];

  function safeRich(text) {
    let out = escapeHtml(text);
    RICH_TAGS.forEach((pair) => { out = out.split(pair[0]).join(pair[1]); });
    return out;
  }

  function stripHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = safeRich(html);
    Array.from(div.querySelectorAll("rt")).forEach((rt) => rt.remove());
    return (div.textContent || "").replace(/\s+/g, " ").trim();
  }

  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function seededShuffle(list, seed) {
    const arr = list.slice();
    let s = 2166136261;
    const key = String(seed || "");
    for (let i = 0; i < key.length; i += 1) {
      s ^= key.charCodeAt(i);
      s = Math.imul(s, 16777619) >>> 0;
    }
    for (let i = arr.length - 1; i > 0; i -= 1) {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      const j = s % (i + 1);
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const uid = () => "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function hashString(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  function fmtClock(seconds) {
    const s = Math.max(0, Math.round(seconds));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }

  function fmtDuration(seconds) {
    const s = Math.max(0, Math.round(seconds || 0));
    if (s < 60) return s + "s";
    const m = Math.floor(s / 60);
    return (s % 60) ? m + "m " + (s % 60) + "s" : m + "m";
  }

  function dayKey(date) {
    const d = date || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) { return fallback; }
  }

  function writeJson(key, value) {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch (err) { /* private mode or quota — memory state still works */ }
  }

  /* ---------------------------------------------------------------- state */

  const state = {
    settings: Object.assign({}, DEFAULT_SETTINGS),
    exam: null,
    mistakes: {},
    stats: {}
  };

  function loadSettings() {
    const saved = readJson(STORE.settings, {}) || {};
    state.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
    // Older saves stored an empty relay; restore the built-in one once.
    if (!saved.relayDefault) {
      if (!state.settings.workerUrl) state.settings.workerUrl = DEFAULT_SETTINGS.workerUrl;
      state.settings.relayDefault = true;
    }
    if (!LESSONS[state.settings.level]) state.settings.level = "N5";
    if (state.settings.apiKey === "stored") {
      try { state.settings.apiKey = localStorage.getItem(STORE.settings + ".key") || ""; }
      catch (err) { state.settings.apiKey = ""; }
    } else {
      state.settings.apiKey = "";
    }
  }

  function saveSettings() {
    writeJson(STORE.settings, Object.assign({}, state.settings, { apiKey: state.settings.apiKey ? "stored" : "" }));
    try {
      if (state.settings.apiKey) localStorage.setItem(STORE.settings + ".key", state.settings.apiKey);
      else localStorage.removeItem(STORE.settings + ".key");
    } catch (err) { /* ignore */ }
  }

  function loadMistakes() {
    const stored = readJson(STORE.mistakes, {}) || {};
    const clean = {};
    Object.keys(stored).forEach((id) => {
      const entry = stored[id];
      if (!entry || !entry.q) return;
      const q = normalizeQuestion(entry.q, entry.q.level);
      if (!q) return;
      // Key by the question's own id, not the stored key: an entry written under an
      // older id scheme would otherwise never match its question again.
      const prev = clean[q.id];
      clean[q.id] = {
        q: q,
        wrong: Math.max(Number(entry.wrong) || 0, prev ? prev.wrong : 0),
        right: Math.max(Number(entry.right) || 0, prev ? prev.right : 0),
        lastAt: Math.max(Number(entry.lastAt) || 0, prev ? prev.lastAt : 0)
      };
    });
    state.mistakes = clean;
  }

  function saveMistakes() { writeJson(STORE.mistakes, state.mistakes); }

  function loadStats() { state.stats = readJson(STORE.stats, {}) || {}; }
  function saveStats() { writeJson(STORE.stats, state.stats); }

  function resetData() {
    [STORE.settings, STORE.settings + ".key", STORE.exam, STORE.mistakes, STORE.stats,
      STORE.served, STORE.done, STORE.generated, STORE.migrated].forEach((key) => {
      try { localStorage.removeItem(key); } catch (err) { /* ignore */ }
    });
    state.settings = Object.assign({}, DEFAULT_SETTINGS);
    state.exam = null;
    state.mistakes = {};
    state.stats = {};
  }

  /* ---------------------------------------------------------------- data model */

  function sectionKey(raw) {
    const s = String(raw || "");
    if (s === "vocab" || s === "grammar" || s === "reading") return s;
    if (/読解|reading/i.test(s)) return "reading";
    if (/文法|grammar/i.test(s)) return "grammar";
    return "vocab";
  }

  function normalizeQuestion(raw, level) {
    if (!raw || typeof raw !== "object") return null;
    // Level purity: a question tagged for another level is never accepted.
    if (raw.level && String(raw.level).toUpperCase().indexOf(String(level).toUpperCase()) === -1) return null;
    const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : "";
    const options = Array.isArray(raw.options)
      ? raw.options.filter((o) => typeof o === "string" && o.trim()).map((o) => o.trim())
      : [];
    if (options.length !== 4 || new Set(options).size !== 4) return null;
    let answer = Number(raw.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
      if (typeof raw.answer === "string" && options.indexOf(raw.answer.trim()) !== -1) {
        answer = options.indexOf(raw.answer.trim());
      } else {
        return null;
      }
    }

    let starData = null;
    if (raw.starData && Array.isArray(raw.starData.ordered) && raw.starData.ordered.length === 4) {
      const ordered = raw.starData.ordered.map(String);
      const starPos = clamp(Math.round(Number(raw.starData.starPos) || 0), 0, 3);
      starData = {
        before: String(raw.starData.before || ""),
        after: String(raw.starData.after || ""),
        ordered: ordered,
        starPos: starPos
      };
      const found = options.indexOf(ordered[starPos]);
      if (found !== -1) answer = found;
    }

    const finalPrompt = prompt || (starData ? "次の言葉を並べたとき、★に入るものはどれですか。" : "");
    if (!finalPrompt) return null;

    // Stable option order per question, so the answer is not always option A
    // while ids and option order stay identical across reloads: sort first, then
    // shuffle from a content-only seed, so normalizing an already-normalized
    // question gives back the same ids and the same option order.
    const correctText = options[answer];
    const canonical = options.slice().sort();
    const orderedOptions = seededShuffle(canonical, finalPrompt + "|" + canonical.join("|"));
    answer = orderedOptions.indexOf(correctText);
    if (answer === -1) return null;

    const section = sectionKey(raw.section);
    const rawSection = String(raw.section || "");
    return {
      id: "q" + hashString(section + "|" + finalPrompt + "|" + canonical.join("|") +
        (starData ? "|" + starData.before + starData.after : "")),
      level: level || state.settings.level,
      section: section,
      sectionLabel: rawSection && rawSection !== section ? rawSection : SECTION_META[section].label,
      subtype: String(raw.subtype || ""),
      origin: ORIGIN_META[raw.origin] ? raw.origin : "bank",
      lesson: String(raw.lesson || ""),
      passage: String(raw.passage || ""),
      prompt: finalPrompt,
      kana: String(raw.kana || ""),
      options: orderedOptions,
      answer: answer,
      starData: starData,
      exp_en: String(raw.exp_en || ""),
      exp_bn: String(raw.exp_bn || "")
    };
  }

  const bankCache = {};

  function loadBank(level) {
    if (bankCache[level]) return bankCache[level];
    const raw = (window.JLPT_BANKS || {})[level] || [];
    const bank = raw.map((q) => normalizeQuestion(q, level)).filter(Boolean)
      // A 読解 item with no passage cannot be answered, so it never reaches a paper.
      .filter((q) => !(q.section === "reading" && !String(q.passage || "").trim()));
    bankCache[level] = bank;
    if (raw.length) migrateLedger(level, raw, bank);
    return bank;
  }

  // Question ids are content hashes. Until 6.7.1 they also depended on the option
  // order, so a saved paper renumbered itself on resume. Carry an older ledger over
  // once by mapping each legacy id to the stable one.
  function legacyId(raw) {
    if (!raw || typeof raw !== "object") return "";
    const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : "";
    const options = Array.isArray(raw.options)
      ? raw.options.filter((o) => typeof o === "string" && o.trim()).map((o) => o.trim())
      : [];
    const star = raw.starData && Array.isArray(raw.starData.ordered) && raw.starData.ordered.length === 4
      ? { before: String(raw.starData.before || ""), after: String(raw.starData.after || "") }
      : null;
    const finalPrompt = prompt || (star ? "次の言葉を並べたとき、★に入るものはどれですか。" : "");
    return "q" + hashString(sectionKey(raw.section) + "|" + finalPrompt + "|" + options.join("|") +
      (star ? "|" + star.before + star.after : ""));
  }

  function migrateLedger(level, raw, bank) {
    const marker = readJson(STORE.migrated, {});
    if (marker[level]) return;
    const map = new Map();
    raw.forEach((item) => {
      const q = normalizeQuestion(item, level);
      if (!q) return;
      const legacy = legacyId(item);
      if (legacy && legacy !== q.id) map.set(legacy, q.id);
    });
    if (map.size) {
      [STORE.done, STORE.served].forEach((key) => {
        const store = readJson(key, {});
        const list = Array.isArray(store[level]) ? store[level] : [];
        if (!list.length) return;
        store[level] = list.map((id) => map.get(id) || id);
        try { localStorage.setItem(key, JSON.stringify(store)); } catch (err) { /* storage full */ }
      });
    }
    marker[level] = true;
    try { localStorage.setItem(STORE.migrated, JSON.stringify(marker)); } catch (err) { /* storage full */ }
  }

  // Pool coverage for the setup screen: what has been finished, what is still unseen.
  function bankProgress(level) {
    const list = loadBank(level);
    const done = new Set(doneIds(level));
    const out = { total: list.length, done: 0, fresh: 0, generated: 0, bank: 0, live: 0, generatedFresh: 0, bankFresh: 0 };
    list.forEach((q) => {
      const origin = q.origin || "bank";
      out[origin] = (out[origin] || 0) + 1;
      if (done.has(q.id)) out.done += 1;
      else {
        out.fresh += 1;
        if (origin === "generated") out.generatedFresh += 1;
        if (origin === "bank") out.bankFresh += 1;
      }
    });
    return out;
  }

  /* ---------------------------------------------------------------- furigana */

  const FURI = (window.JLPT_FURIGANA_PAIRS || []).slice().sort((a, b) => b[0].length - a[0].length);

  function rubyFragment(text) {
    let pieces = [text];
    FURI.forEach((pair) => {
      const word = pair[0];
      const reading = pair[1];
      const next = [];
      pieces.forEach((piece) => {
        if (typeof piece !== "string") { next.push(piece); return; }
        let idx = 0;
        let pos = 0;
        while ((pos = piece.indexOf(word, idx)) !== -1) {
          if (pos > idx) next.push(piece.slice(idx, pos));
          const ruby = document.createElement("ruby");
          ruby.textContent = word;
          const rt = document.createElement("rt");
          rt.textContent = reading;
          ruby.appendChild(rt);
          next.push(ruby);
          idx = pos + word.length;
        }
        if (idx < piece.length) next.push(piece.slice(idx));
      });
      pieces = next;
    });
    const frag = document.createDocumentFragment();
    pieces.forEach((piece) => frag.append(typeof piece === "string" ? document.createTextNode(piece) : piece));
    return frag;
  }

  function furiganize(html) {
    if (!state.settings.furigana) return html;
    const root = document.createElement("div");
    root.innerHTML = html;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.parentElement || node.parentElement.closest("ruby,rt,script,style")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (node.textContent.trim()) node.replaceWith(rubyFragment(node.textContent));
    });
    return root.innerHTML;
  }

  function rich(text) { return furiganize(safeRich(text)); }

  /* ---------------------------------------------------------------- speech */

  function speak(text) {
    if (!("speechSynthesis" in window)) return false;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(stripHtml(text));
    utter.lang = "ja-JP";
    utter.rate = 0.9;
    const voice = (window.speechSynthesis.getVoices() || []).find((v) => /ja|japan/i.test(v.lang + " " + v.name));
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
    return true;
  }

  /* ---------------------------------------------------------------- generation */

  // Generated local items cover the whole N5 course, so they answer to either half.
  function lessonFits(q, wanted) {
    if (!wanted || wanted === "all") return true;
    if (!q.lesson) return true;
    return q.lesson === wanted || q.lesson === "L1-25";
  }

  function servedIds(level) {
    const store = readJson(STORE.served, {});
    return Array.isArray(store[level]) ? store[level] : [];
  }

  function rememberServed(level, picked) {
    const store = readJson(STORE.served, {});
    store[level] = servedIds(level).concat(picked.map((q) => q.id)).slice(-8000);
    try { localStorage.setItem(STORE.served, JSON.stringify(store)); } catch (err) { /* storage full */ }
  }

  // Questions finished in a graded exam, in completion order.
  function doneIds(level) {
    const store = readJson(STORE.done, {});
    return Array.isArray(store[level]) ? store[level] : [];
  }

  function markDone(level, questions) {
    const store = readJson(STORE.done, {});
    const list = Array.isArray(store[level]) ? store[level] : [];
    const have = new Set(list);
    questions.forEach((q) => {
      if (!q || !q.id || have.has(q.id)) return;
      have.add(q.id);
      list.push(q.id);
    });
    store[level] = list.slice(-20000);
    try { localStorage.setItem(STORE.done, JSON.stringify(store)); } catch (err) { /* storage full */ }
  }

  // Union of a done ledger from an export file with the one on this device.
  function mergeDone(incoming) {
    if (!incoming || typeof incoming !== "object") return;
    const store = readJson(STORE.done, {});
    Object.keys(incoming).forEach((level) => {
      const list = Array.isArray(store[level]) ? store[level] : [];
      const have = new Set(list);
      (Array.isArray(incoming[level]) ? incoming[level] : []).forEach((id) => {
        if (typeof id === "string" && !have.has(id)) { have.add(id); list.push(id); }
      });
      store[level] = list.slice(-20000);
    });
    try { localStorage.setItem(STORE.done, JSON.stringify(store)); } catch (err) { /* storage full */ }
  }

  // Never-seen questions first, then papers started but never finished, then the
  // questions completed longest ago — so a paper only repeats once the pool is spent.
  function freshFirst(list, level) {
    const done = doneIds(level);
    const rank = new Map(done.map((id, i) => [id, i]));
    const served = new Set(servedIds(level));
    const fresh = [];
    const started = [];
    const recycled = [];
    list.forEach((q) => {
      if (rank.has(q.id)) recycled.push(q);
      else if (served.has(q.id)) started.push(q);
      else fresh.push(q);
    });
    recycled.sort((a, b) => rank.get(a.id) - rank.get(b.id));
    return shuffle(fresh).concat(shuffle(started)).concat(recycled);
  }

  const SECTION_SPLIT = [["vocab", 0.4], ["grammar", 0.3], ["reading", 0.3]];

  function fromBank(opts) {
    const all = loadBank(opts.level);
    if (!all.length) throw new Error("No offline questions are available for " + opts.level + ".");
    const filtered = all.filter((q) =>
      (opts.section === "all" || q.section === opts.section) &&
      lessonFits(q, opts.lesson));
    const pool = filtered.length ? filtered : all;
    const ordered = freshFirst(pool, opts.level);
    // While the pool still holds enough unseen questions, build the paper from those
    // alone — a section that ran dry is topped up from other sections, never repeated.
    const done = new Set(doneIds(opts.level));
    const fresh = ordered.filter((q) => !done.has(q.id));
    const source = fresh.length >= opts.count ? fresh : ordered;
    const picked = [];

    // A whole paper keeps the JLPT mix: 40% vocabulary, 30% grammar, 30% reading.
    if (opts.section === "all" && opts.count >= 10) {
      const quota = SECTION_SPLIT.map(([key, share], i) => [key, Math.round(opts.count * share)]);
      quota[quota.length - 1][1] += opts.count - quota.reduce((sum, pair) => sum + pair[1], 0);
      quota.forEach(([key, want]) => {
        const have = new Set(picked.map((q) => q.id));
        source.filter((q) => q.section === key && !have.has(q.id)).slice(0, want).forEach((q) => picked.push(q));
      });
    }

    if (picked.length < opts.count) {
      const have = new Set(picked.map((q) => q.id));
      source.forEach((q) => {
        if (picked.length < opts.count && !have.has(q.id)) { picked.push(q); have.add(q.id); }
      });
    }

    const result = picked.slice(0, opts.count);
    rememberServed(opts.level, result);
    return result;
  }

  async function fetchJson(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs || 9000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function fromOnline(opts) {
    const levelNum = opts.level === "N5" ? 5 : 4;
    const wantVocab = Math.max(1, Math.round(opts.count / 2));
    const questions = [];

    try {
      const offset = Math.floor(Math.random() * 560);
      const data = await fetchJson("https://jlpt-vocab-api.vercel.app/api/words?level=" + levelNum + "&limit=40&offset=" + offset);
      const words = (data.words || []).filter((w) => w && w.word && w.furigana && w.meaning);
      words.slice(0, wantVocab).forEach((w) => {
        const decoys = shuffle(words.filter((x) => x.furigana !== w.furigana)).slice(0, 3).map((x) => x.furigana);
        if (decoys.length < 3) return;
        const options = shuffle([w.furigana].concat(decoys));
        questions.push(normalizeQuestion({
          section: "文字・語彙 (" + opts.level + " Vocabulary & Kanji)",
          subtype: "問題2：表記",
          lesson: "online",
          origin: "live",
          prompt: "「" + w.word + "」の読み方は　どれですか。",
          options: options,
          answer: options.indexOf(w.furigana),
          kana: w.furigana,
          exp_en: w.word + " (" + w.furigana + ") means “" + w.meaning + "”.",
          exp_bn: ""
        }, opts.level));
      });
    } catch (err) { /* vocab API down — kanji questions still work */ }

    try {
      const list = await fetchJson("https://kanjiapi.dev/v1/kanji/jlpt-" + levelNum);
      const picks = shuffle(Array.isArray(list) ? list : []).slice(0, Math.max(1, opts.count - questions.length));
      const details = await Promise.all(picks.map((ch) =>
        fetchJson("https://kanjiapi.dev/v1/kanji/" + encodeURIComponent(ch)).catch(() => null)));
      const meanings = details.filter(Boolean).map((d) => d.meanings && d.meanings[0]).filter(Boolean);
      details.filter(Boolean).forEach((d) => {
        const correct = (d.meanings || [])[0];
        if (!correct) return;
        const decoys = shuffle(meanings.filter((m) => m !== correct)).slice(0, 3);
        if (decoys.length < 3) return;
        const options = shuffle([correct].concat(decoys));
        const q = normalizeQuestion({
          section: "文字・語彙 (" + opts.level + " Vocabulary & Kanji)",
          subtype: "問題4：意味",
          lesson: "online",
          origin: "live",
          prompt: "「" + d.kanji + "」の意味として　いちばん　いいものは　どれですか。",
          options: options,
          answer: options.indexOf(correct),
          kana: (d.on_readings && d.on_readings[0]) || (d.kun_readings && d.kun_readings[0]) || "",
          exp_en: d.kanji + ": " + (d.meanings || []).join(", ") + ". On: " + (d.on_readings || []).join("、") + " · Kun: " + (d.kun_readings || []).join("、"),
          exp_bn: ""
        }, opts.level);
        if (q) questions.push(q);
      });
    } catch (err) { /* kanji API down */ }

    if (!questions.length) throw new Error("Live sources did not return questions.");
    return shuffle(questions.filter(Boolean)).slice(0, opts.count);
  }

  const LEVEL_GUIDE = {
    N5: "JLPT N5 only: hiragana and katakana words plus about 100 basic kanji (numbers, days, family, school, food, places, directions); roughly 800 everyday words; です/ます, particles は・が・を・に・で・へ・と, past and negative forms, basic て-form, い and な adjectives, counters 一つ・二つ, dates and times.",
    N4: "JLPT N4 only: about 300 kanji and roughly 1,500 words; plain and polite forms, て-form requests, potential, passive, causative, conditionals たら・ば・なら, 〜ている・〜てある, giving and receiving あげる・くれる・もらう, basic keigo."
  };

  function sectionQuota(count, section) {
    if (section !== "all") return { [section]: count };
    const vocab = Math.max(1, Math.round(count * 0.4));
    const grammar = Math.max(1, Math.round(count * 0.3));
    return { vocab: vocab, grammar: grammar, reading: Math.max(1, count - vocab - grammar) };
  }

  function geminiPrompt(opts, avoid) {
    const count = clamp(Number(opts.count) || 20, 1, 40);
    const level = opts.level === "N4" ? "N4" : "N5";
    const quota = sectionQuota(count, opts.section);
    const sectionLine = Object.keys(quota).map((key) =>
      SECTION_META[key].label + " (" + key + "): exactly " + quota[key]).join("; ");
    const avoidList = (avoid || []).filter(Boolean).slice(-30)
      .map((p) => "- " + String(p).replace(/\s+/g, " ").slice(0, 110)).join("\n");
    return [
      "You are a JLPT item writer. Create a fresh mock-exam paper of " + count + " questions for " + level + ".",
      "LEVEL CONTRACT: " + LEVEL_GUIDE[level],
      "Every question must be solvable with " + level + " knowledge alone. Never use N3, N2 or N1 grammar, vocabulary or kanji. Do not label items N3+.",
      "SECTION MIX: " + sectionLine + ".",
      "Lessons: " + (opts.lesson === "all" ? "spread across the whole level" : opts.lesson) + ".",
      "EXAM STYLE: follow real JLPT wording. Vocabulary: kanji reading, orthography, context fill. Grammar: sentence fill and ★ word-order items (at most 3). Reading: a short passage plus one question about it.",
      "For every question: prompt in Japanese with ＿＿ or （　　） for the blank; exactly 4 distinct options; exactly one correct option; no romaji; no English inside Japanese text. Rotate correct answers across positions instead of always using the first.",
      "READING RULE: for section 読解 put the passage in \"passage\" (80–160 characters for N5, 120–220 for N4) and the question in \"prompt\".",
      "FRESHNESS: this is request seed " + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8) + ". Never reuse any of these earlier questions:\n" + (avoidList || "(none yet)"),
      "Return ONLY a JSON array, no prose. Each object: level (\"" + level + "\"), section (\"文字・語彙\" | \"文法\" | \"読解\"), subtype, lesson, passage (reading only), prompt, kana, options (4 strings), answer (0-3), exp_en (one clear English sentence), exp_bn (same in Bengali script).",
      "Star questions also need starData: {before, after, ordered:[4 words in the correct order], starPos:0-3}."
    ].join("\n");
  }

  /* ------------------------------------------------------------ generation history */

  function promptKey(q) {
    return String((q.passage || "") + "|" + (q.prompt || "")).replace(/\s+/g, " ").trim().toLowerCase();
  }

  function readGenerated() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE.generated) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) { return {}; }
  }

  function generatedSeen(level) {
    const all = readGenerated();
    const list = Array.isArray(all[level]) ? all[level] : [];
    return {
      ids: new Set(list.map((item) => item.id).filter(Boolean)),
      prompts: new Set(list.map((item) => item.key).filter(Boolean))
    };
  }

  function rememberGenerated(level, questions) {
    const all = readGenerated();
    const list = Array.isArray(all[level]) ? all[level] : [];
    questions.forEach((q) => list.push({ id: q.id, key: promptKey(q) }));
    all[level] = list.slice(-150);
    try { localStorage.setItem(STORE.generated, JSON.stringify(all)); } catch (err) { /* storage full */ }
  }

  function extractJson(text) {
    const cleaned = String(text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) throw new Error("The model did not return a JSON array.");
    return JSON.parse(cleaned.slice(start, end + 1));
  }

  async function callGeminiDirect(promptText) {
    const key = state.settings.apiKey;
    if (!key) throw new Error("Add a Gemini API key or worker URL in Tools & settings.");
    const models = ["gemini-flash-latest", "gemini-flash-lite-latest"];
    let lastError = null;
    for (const model of models) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 40000);
        let res;
        try {
          res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
              generationConfig: { temperature: 1, topP: 0.95, maxOutputTokens: 8192 }
            })
          });
        } finally { clearTimeout(timer); }
        if (!res.ok) throw new Error("Gemini HTTP " + res.status);
        const data = await res.json();
        const text = data && data.candidates && data.candidates[0] && data.candidates[0].content
          && data.candidates[0].content.parts && data.candidates[0].content.parts[0]
          && data.candidates[0].content.parts[0].text;
        if (!text) throw new Error("Gemini returned an empty answer.");
        return extractJson(text);
      } catch (err) { lastError = err; }
    }
    throw lastError || new Error("Gemini request failed.");
  }

  async function requestGemini(promptText) {
    const worker = String(state.settings.workerUrl || "").trim().replace(/\/+$/, "");
    let payload = null;
    if (worker) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      try {
        const res = await fetch(worker + "/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ promptText: promptText, model: "gemini-flash-latest" }),
          signal: controller.signal
        });
        const data = await res.json();
        if (data && data.ok && Array.isArray(data.data)) payload = data.data;
        else if (!state.settings.apiKey) throw new Error((data && data.error) || "AI relay request failed.");
      } catch (err) {
        if (!state.settings.apiKey) {
          throw new Error(err && err.name === "AbortError" ? "AI relay timed out" : (err && err.message) || "AI relay unreachable");
        }
      } finally {
        clearTimeout(timer);
      }
    }
    if (!payload) payload = await callGeminiDirect(promptText);
    return Array.isArray(payload) ? payload : [];
  }

  async function fromGemini(opts) {
    const level = opts.level === "N4" ? "N4" : "N5";
    const wanted = clamp(Number(opts.count) || 20, 1, 40);
    const seen = generatedSeen(level);
    const collected = [];
    const keys = new Set(seen.prompts);

    for (let attempt = 0; attempt < 2 && collected.length < wanted; attempt += 1) {
      const avoid = Array.from(keys).concat(collected.map(promptKey));
      const payload = await requestGemini(geminiPrompt(opts, avoid));
      payload.forEach((raw) => {
        if (collected.length >= wanted) return;
        const q = normalizeQuestion(Object.assign({}, raw, { origin: raw.origin || "generated" }), level);
        if (!q) return;
        if (q.section === "reading" && !String(q.passage || "").trim()) return;
        const key = promptKey(q);
        if (seen.ids.has(q.id) || keys.has(key)) return;
        seen.ids.add(q.id);
        keys.add(key);
        collected.push(q);
      });
    }

    if (!collected.length) throw new Error("The model returned no usable " + level + " questions. Nothing is reused across papers, so try again.");
    rememberGenerated(level, collected);
    return collected;
  }

  async function buildQuestions(opts) {
    state.generation = { requested: opts.count, used: "bank", got: 0, reason: "" };
    if (opts.source === "online") {
      try {
        const q = await fromOnline(opts);
        if (q.length) {
          state.generation = { requested: opts.count, used: "online", got: q.length, reason: "" };
          return q;
        }
      } catch (err) {
        state.generation.reason = (err && err.message) || "live sources unavailable";
      }
      const fallback = fromBank(opts);
      state.generation.got = fallback.length;
      return fallback;
    }
    if (opts.source === "gemini") {
      try {
        const q = await fromGemini(opts);
        if (q.length) {
          state.generation = { requested: opts.count, used: "gemini", got: q.length, reason: "" };
          return q;
        }
      } catch (err) {
        state.generation.reason = (err && err.message) || "the model did not answer";
      }
      const fallback = fromBank(opts);
      state.generation.got = fallback.length;
      return fallback;
    }
    const bank = fromBank(opts);
    state.generation.got = bank.length;
    return bank;
  }

  /* ---------------------------------------------------------------- exam model */

  function createExam(opts) {
    const questions = opts.questions || [];
    return {
      id: uid(),
      level: opts.level,
      source: opts.source || "bank",
      candidate: opts.candidate || "",
      questions: questions,
      answers: new Array(questions.length).fill(null),
      flags: new Array(questions.length).fill(false),
      layout: opts.layout || state.settings.layout,
      timerMinutes: Number(opts.timer) || 0,
      remaining: (Number(opts.timer) || 0) * 60,
      startedAt: Date.now(),
      timerEndAt: 0,
      paused: false,
      graded: false,
      finishedAt: null,
      elapsed: 0
    };
  }

  function currentRemaining(exam) {
    const target = exam || state.exam;
    if (!target || !target.timerMinutes) return 0;
    if (target.paused || !target.timerEndAt) return Math.max(0, target.remaining);
    return Math.max(0, Math.ceil((target.timerEndAt - Date.now()) / 1000));
  }

  function saveExam() {
    const exam = state.exam;
    if (!exam || exam.graded) return;
    if (exam.timerMinutes && !exam.paused) exam.remaining = currentRemaining(exam);
    writeJson(STORE.exam, exam);
  }

  function loadSavedExam() {
    const saved = readJson(STORE.exam, null);
    if (!saved || !Array.isArray(saved.questions) || !saved.questions.length) return null;
    const questions = saved.questions.map((q) => normalizeQuestion(q, saved.level)).filter(Boolean);
    if (!questions.length) return null;
    const answers = Array.isArray(saved.answers) && saved.answers.length === questions.length
      ? saved.answers.slice() : new Array(questions.length).fill(null);
    return Object.assign({}, saved, {
      questions: questions,
      answers: answers,
      flags: Array.isArray(saved.flags) && saved.flags.length === questions.length
        ? saved.flags.slice() : new Array(questions.length).fill(false),
      graded: false
    });
  }

  function clearSavedExam() { writeJson(STORE.exam, null); }

  function gradeExam(exam) {
    const sections = {};
    exam.questions.forEach((q, i) => {
      const bucket = sections[q.section] || (sections[q.section] = { key: q.section, correct: 0, total: 0 });
      bucket.total += 1;
      if (exam.answers[i] === q.answer) bucket.correct += 1;
    });
    const keys = Object.keys(sections);
    keys.forEach((key) => {
      const s = sections[key];
      s.points = Math.round((s.correct / s.total) * SECTION_POINTS);
      s.min = SECTION_MIN;
      s.ok = s.points >= SECTION_MIN;
    });
    const max = keys.length * SECTION_POINTS;
    const total = keys.reduce((sum, key) => sum + sections[key].points, 0);
    const passTotal = Math.round((max * (PASS_TOTAL[exam.level] || 80)) / 180);
    const correct = exam.questions.filter((q, i) => exam.answers[i] === q.answer).length;
    const origins = { generated: 0, bank: 0, live: 0 };
    exam.questions.forEach((q) => { origins[q.origin || "bank"] += 1; });
    return {
      sections: sections,
      keys: keys,
      max: max,
      total: total,
      passTotal: passTotal,
      pass: total >= passTotal && keys.every((key) => sections[key].ok),
      correct: correct,
      totalQ: exam.questions.length,
      origins: origins
    };
  }

  function recordResults(exam, result) {
    const now = Date.now();
    exam.questions.forEach((q, i) => {
      const correct = exam.answers[i] === q.answer;
      const entry = state.mistakes[q.id];
      if (correct) {
        if (entry) {
          entry.right = (entry.right || 0) + 1;
          if (entry.right >= 2) delete state.mistakes[q.id];
        }
      } else {
        state.mistakes[q.id] = {
          q: q,
          wrong: (entry ? entry.wrong : 0) + 1,
          right: 0,
          lastAt: now
        };
      }
    });
    saveMistakes();

    const stats = state.stats;
    stats.sessions = (stats.sessions || 0) + 1;
    stats.solved = (stats.solved || 0) + result.totalQ;
    stats.correct = (stats.correct || 0) + result.correct;
    stats.days = stats.days || {};
    stats.days[dayKey()] = (stats.days[dayKey()] || 0) + 1;
    stats.bySection = stats.bySection || {};
    Object.keys(result.sections || {}).forEach((key) => {
      const s = result.sections[key];
      const bucket = stats.bySection[key] || (stats.bySection[key] = { solved: 0, correct: 0 });
      bucket.solved += s.total;
      bucket.correct += s.correct;
    });
    saveStats();
    markDone(exam.level, exam.questions);
  }

  function streakCount() {
    const days = state.stats.days || {};
    const walk = (start) => {
      let count = 0;
      const d = new Date(start);
      while (days[dayKey(d)]) { count += 1; d.setDate(d.getDate() - 1); }
      return count;
    };
    if (days[dayKey()]) return walk(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return walk(yesterday);
  }

  function exportPayload() {
    const settings = Object.assign({}, state.settings);
    delete settings.apiKey;
    delete settings.telegramToken;
    delete settings.telegramChat;
    delete settings.telegramUrl;
    return {
      app: "jlpt-exam-lab",
      version: VERSION,
      exportedAt: new Date().toISOString(),
      settings: settings,
      mistakes: state.mistakes,
      stats: state.stats,
      done: readJson(STORE.done, {})
    };
  }

  window.JLPT = {
    VERSION: VERSION,
    STORE: STORE,
    SECTION_META: SECTION_META,
    ORIGIN_META: ORIGIN_META,
    LESSONS: LESSONS,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    state: state,
    escapeHtml: escapeHtml,
    safeRich: safeRich,
    stripHtml: stripHtml,
    shuffle: shuffle,
    clamp: clamp,
    hashString: hashString,
    uid: uid,
    fmtClock: fmtClock,
    fmtDuration: fmtDuration,
    dayKey: dayKey,
    readJson: readJson,
    writeJson: writeJson,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    loadMistakes: loadMistakes,
    saveMistakes: saveMistakes,
    loadStats: loadStats,
    saveStats: saveStats,
    resetData: resetData,
    normalizeQuestion: normalizeQuestion,
    loadBank: loadBank,
    bankProgress: bankProgress,
    doneIds: doneIds,
    rich: rich,
    furiganize: furiganize,
    speak: speak,
    buildQuestions: buildQuestions,
    geminiPrompt: geminiPrompt,
    createExam: createExam,
    currentRemaining: currentRemaining,
    saveExam: saveExam,
    mergeDone: mergeDone,
    loadSavedExam: loadSavedExam,
    clearSavedExam: clearSavedExam,
    gradeExam: gradeExam,
    recordResults: recordResults,
    streakCount: streakCount,
    exportPayload: exportPayload
  };
})();
