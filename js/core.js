/* JLPT Exam Lab — core engine (v6).
   Data loading, question generation, exam model, grading and persistence.
   Exposes window.JLPT for the UI layer. No DOM rendering happens here. */
(function () {
  "use strict";

  const VERSION = "6.0.0";
  const STORE = {
    settings: "jlpt6.settings",
    exam: "jlpt6.exam",
    mistakes: "jlpt6.mistakes",
    stats: "jlpt6.stats"
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
    study: false, lang: "both", theme: "auto", workerUrl: "", apiKey: ""
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
      clean[id] = {
        q: q,
        wrong: Number(entry.wrong) || 0,
        right: Number(entry.right) || 0,
        lastAt: Number(entry.lastAt) || 0
      };
    });
    state.mistakes = clean;
  }

  function saveMistakes() { writeJson(STORE.mistakes, state.mistakes); }

  function loadStats() { state.stats = readJson(STORE.stats, {}) || {}; }
  function saveStats() { writeJson(STORE.stats, state.stats); }

  function resetData() {
    [STORE.settings, STORE.settings + ".key", STORE.exam, STORE.mistakes, STORE.stats].forEach((key) => {
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
    if (s.indexOf("読解") !== -1) return "reading";
    if (s.indexOf("文法") !== -1) return "grammar";
    return "vocab";
  }

  function normalizeQuestion(raw, level) {
    if (!raw || typeof raw !== "object") return null;
    const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : "";
    const options = Array.isArray(raw.options)
      ? raw.options.filter((o) => typeof o === "string" && o.trim()).map((o) => o.trim())
      : [];
    if (options.length !== 4 || new Set(options).size !== 4) return null;
    let answer = Number(raw.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;

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

    const section = sectionKey(raw.section);
    const rawSection = String(raw.section || "");
    return {
      id: "q" + hashString(section + "|" + finalPrompt + "|" + options.join("|") +
        (starData ? "|" + starData.before + starData.after : "")),
      level: raw.level || level || state.settings.level,
      section: section,
      sectionLabel: rawSection && rawSection !== section ? rawSection : SECTION_META[section].label,
      subtype: String(raw.subtype || ""),
      lesson: String(raw.lesson || ""),
      passage: String(raw.passage || ""),
      prompt: finalPrompt,
      kana: String(raw.kana || ""),
      options: options,
      answer: answer,
      starData: starData,
      exp_en: String(raw.exp_en || ""),
      exp_bn: String(raw.exp_bn || "")
    };
  }

  function loadBank(level) {
    const raw = (window.JLPT_BANKS || {})[level] || [];
    return raw.map((q) => normalizeQuestion(q, level)).filter(Boolean);
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

  function fromBank(opts) {
    const all = loadBank(opts.level);
    if (!all.length) throw new Error("No offline questions are available for " + opts.level + ".");
    const filtered = all.filter((q) =>
      (opts.section === "all" || q.section === opts.section) &&
      (opts.lesson === "all" || q.lesson === opts.lesson));
    const pool = filtered.length ? filtered : all;
    const picked = shuffle(pool).slice(0, opts.count);
    if (picked.length < opts.count) {
      const seen = new Set(picked.map((q) => q.id));
      shuffle(all).forEach((q) => {
        if (picked.length < opts.count && !seen.has(q.id)) { picked.push(q); seen.add(q.id); }
      });
    }
    return picked;
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

  function geminiPrompt(opts) {
    return [
      "You write JLPT practice questions. Produce " + Math.min(opts.count, 25) + " multiple-choice questions for JLPT " + opts.level + ".",
      "Sections allowed: " + (opts.section === "all" ? "vocabulary, grammar, reading" : opts.section) + ".",
      "Lessons: " + (opts.lesson === "all" ? "any" : opts.lesson) + ".",
      "Return ONLY valid JSON: an array of objects with keys:",
      'section (one of "文字・語彙", "文法", "読解" with the level), subtype (string), lesson (string),',
      "prompt (Japanese sentence with ＿＿ for the blank), options (exactly 4 distinct Japanese strings),",
      "answer (0-based index), kana (reading of the full sentence), exp_en (one clear English sentence),",
      "exp_bn (the same explanation in Bengali script).",
      "For 文法 questions that ask where ★ goes, also add starData: {before, after, ordered:[4 words in correct order], starPos: 0-3}.",
      "Do not repeat questions. Do not include any text outside the JSON array."
    ].join(" ");
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
        const timer = setTimeout(() => controller.abort(), 25000);
        let res;
        try {
          res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            signal: controller.signal,
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
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

  async function fromGemini(opts) {
    const promptText = geminiPrompt(opts);
    const worker = String(state.settings.workerUrl || "").trim().replace(/\/+$/, "");
    let payload = null;
    if (worker) {
      try {
        const res = await fetch(worker + "/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ promptText: promptText, model: "gemini-flash-latest" })
        });
        const data = await res.json();
        if (data && data.ok && Array.isArray(data.data)) payload = data.data;
        else if (!state.settings.apiKey) throw new Error((data && data.error) || "Worker request failed.");
      } catch (err) {
        if (!state.settings.apiKey) throw err;
      }
    }
    if (!payload) payload = await callGeminiDirect(promptText);
    const questions = payload
      .map((raw) => normalizeQuestion(raw, opts.level))
      .filter(Boolean);
    if (!questions.length) throw new Error("The model returned no usable questions.");
    return questions.slice(0, opts.count);
  }

  async function buildQuestions(opts) {
    if (opts.source === "online") {
      try { const q = await fromOnline(opts); if (q.length) return q; } catch (err) { /* fall back below */ }
      return fromBank(opts);
    }
    if (opts.source === "gemini") {
      try { const q = await fromGemini(opts); if (q.length) return q; } catch (err) { /* fall back below */ }
      return fromBank(opts);
    }
    return fromBank(opts);
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
    return {
      sections: sections,
      keys: keys,
      max: max,
      total: total,
      passTotal: passTotal,
      pass: total >= passTotal && keys.every((key) => sections[key].ok),
      correct: correct,
      totalQ: exam.questions.length
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
    return {
      app: "jlpt-exam-lab",
      version: VERSION,
      exportedAt: new Date().toISOString(),
      settings: settings,
      mistakes: state.mistakes,
      stats: state.stats
    };
  }

  window.JLPT = {
    VERSION: VERSION,
    STORE: STORE,
    SECTION_META: SECTION_META,
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
    rich: rich,
    furiganize: furiganize,
    speak: speak,
    buildQuestions: buildQuestions,
    createExam: createExam,
    currentRemaining: currentRemaining,
    saveExam: saveExam,
    loadSavedExam: loadSavedExam,
    clearSavedExam: clearSavedExam,
    gradeExam: gradeExam,
    recordResults: recordResults,
    streakCount: streakCount,
    exportPayload: exportPayload
  };
})();
