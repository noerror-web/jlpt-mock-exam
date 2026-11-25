/* JLPT Exam Lab — UI layer (v6). Depends on window.JLPT from js/core.js. */
(function () {
  "use strict";

  const L = window.JLPT;
  if (!L) { console.error("JLPT core failed to load."); return; }

  const state = L.state;
  const byId = (id) => document.getElementById(id);
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  const VIEWS = ["setup", "exam", "results", "practice", "flash"];
  const timer = { interval: 0 };

  let toastTimer = 0;
  function toast(message) {
    const node = byId("toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 2600);
  }

  function confirmAction(options) {
    const dialog = byId("confirmDialog");
    if (!dialog || !dialog.showModal) {
      return Promise.resolve(window.confirm(options.title + "\n\n" + (options.body || "")));
    }
    return new Promise((resolve) => {
      byId("confirmTitle").textContent = options.title || "Are you sure?";
      byId("confirmBody").textContent = options.body || "";
      byId("confirmOk").textContent = options.ok || "Confirm";
      const cleanup = () => {
        byId("confirmOk").onclick = null;
        byId("confirmCancel").onclick = null;
      };
      const closeWith = (value) => {
        cleanup();
        dialog.close();
        resolve(value);
      };
      byId("confirmOk").onclick = () => closeWith(true);
      byId("confirmCancel").onclick = () => closeWith(false);
      dialog.addEventListener("close", function onClose() {
        dialog.removeEventListener("close", onClose);
        cleanup();
        resolve(false);
      }, { once: true });
      dialog.showModal();
    });
  }

  /* ---------------------------------------------------------------- views */

  function showView(name) {
    state.view = name;
    VIEWS.forEach((view) => {
      const node = byId(view + "View");
      if (node) node.hidden = view !== name;
    });
    closePopover();
    if (name !== "exam") stopTimer();
    window.scrollTo(0, 0);
  }

  /* ---------------------------------------------------------------- setup */

  function setLevel(level) {
    if (state.exam && !state.exam.graded && state.view === "exam") {
      toast("Finish or exit the current exam first.");
      return;
    }
    state.settings.level = level;
    L.saveSettings();
    syncLevelButtons();
    populateSetup();
    renderSetup();
  }

  function syncLevelButtons() {
    $$("#levelSwitch button").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.level === state.settings.level));
    });
  }

  function populateSetup() {
    const level = state.settings.level;
    const lessons = byId("lessonSelect");
    const counts = byId("countSelect");
    if (!lessons || !counts) return;

    lessons.innerHTML = '<option value="all">All lessons</option>';
    (L.LESSONS[level] || []).forEach((range) => {
      const opt = el("option", null, range);
      opt.value = range;
      lessons.append(opt);
    });
    if (!(L.LESSONS[level] || []).includes(state.settings.lesson)) state.settings.lesson = "all";
    lessons.value = state.settings.lesson;

    const max = L.loadBank(level).length || 40;
    const sizes = [10, 15, 20, 30, 40].filter((n) => n <= Math.max(max, 10));
    counts.innerHTML = "";
    sizes.forEach((n) => {
      const opt = el("option", null, n + " questions");
      opt.value = String(n);
      counts.append(opt);
    });
    if (!sizes.includes(Number(state.settings.count))) state.settings.count = sizes[sizes.length - 1];
    counts.value = String(state.settings.count);

    byId("candidateName").value = state.settings.name || "";
    byId("sourceSelect").value = state.settings.source;
    byId("sectionSelect").value = state.settings.section;
    byId("timerSelect").value = String(state.settings.timer);
    byId("viewSelect").value = state.settings.layout;
    byId("furiganaToggle").checked = !!state.settings.furigana;
    byId("autoAdvanceToggle").checked = !!state.settings.autoAdvance;
    byId("studyToggle").checked = !!state.settings.study;
    renderSectionStats();
  }

  function readSetupForm() {
    const opts = {
      level: state.settings.level,
      name: byId("candidateName").value.trim().slice(0, 40),
      source: byId("sourceSelect").value,
      section: byId("sectionSelect").value,
      lesson: byId("lessonSelect").value,
      count: Number(byId("countSelect").value) || 20,
      timer: Number(byId("timerSelect").value) || 0,
      layout: byId("viewSelect").value,
      furigana: byId("furiganaToggle").checked,
      autoAdvance: byId("autoAdvanceToggle").checked,
      study: byId("studyToggle").checked,
      listening: !!state.settings.listening
    };
    Object.assign(state.settings, {
      name: opts.name, source: opts.source, section: opts.section, lesson: opts.lesson,
      count: opts.count, timer: opts.timer, layout: opts.layout, furigana: opts.furigana,
      autoAdvance: opts.autoAdvance, study: opts.study
    });
    L.saveSettings();
    return opts;
  }

  function friendlyGenError(reason) {
    const text = String(reason || "").trim();
    if (!text) return "no response";
    if (/fetch|network|offline|load failed/i.test(text)) return "network blocked or offline";
    if (/origin|403|forbidden/i.test(text)) return "the relay rejected this site";
    if (/quota|429/i.test(text)) return "the model is rate-limited";
    return text.slice(0, 110);
  }

  function setupNote(message, isError) {
    const note = byId("setupNote");
    if (!note) return;
    note.textContent = message || "";
    note.classList.toggle("error", !!isError);
  }

  function renderStats() {
    const s = state.stats;
    const solved = Number(s.solved) || 0;
    const correct = Number(s.correct) || 0;
    byId("statSolved").textContent = String(solved);
    byId("statAccuracy").textContent = solved ? Math.round((correct / solved) * 100) + "%" : "—";
    byId("statStreak").textContent = String(L.streakCount());
  }

  function renderSectionStats() {
    const slot = byId("sectionStats");
    if (!slot) return;
    slot.innerHTML = "";
    const bySection = state.stats.bySection || {};
    const keys = ["vocab", "grammar", "reading"].filter((key) => bySection[key] && bySection[key].solved);
    if (!keys.length) {
      slot.append(el("p", "muted tiny", "Finish an exam to build per-section accuracy."));
      return;
    }
    keys.forEach((key) => {
      const s = bySection[key];
      const pct = Math.round((s.correct / s.solved) * 100);
      const meta = L.SECTION_META[key];
      const row = el("div", "sbar" + (pct < 60 ? " low" : ""));
      row.append(el("span", "name", meta.label + " · " + meta.en));
      row.append(el("span", "val", pct + "% of " + s.solved));
      const track = el("div", "track");
      const fill = el("div", "fill");
      fill.style.width = pct + "%";
      track.append(fill);
      row.append(track);
      slot.append(row);
    });
  }

  // How much of the offline pool this level has used, split by where questions came from.
  function renderBankProgress() {
    const slot = byId("bankProgress");
    if (!slot) return;
    slot.innerHTML = "";
    const level = state.settings.level;
    const p = L.bankProgress(level);
    if (!p.total) return;
    const pct = Math.round((p.done / p.total) * 100);
    const row = el("div", "sbar");
    row.append(el("span", "name", level + " question pool"));
    row.append(el("span", "val", p.done.toLocaleString() + " of " + p.total.toLocaleString() + " done"));
    const track = el("div", "track");
    const fill = el("div", "fill");
    fill.style.width = pct + "%";
    track.append(fill);
    row.append(track);
    slot.append(row);
    const mix = p.generated.toLocaleString() + " generated · " + p.bank.toLocaleString() + " from the question bank";
    const left = p.fresh
      ? p.fresh.toLocaleString() + " unseen questions left; papers take unseen first and only reuse a section once its own pool is empty."
      : "Every question has been done — papers now recycle the oldest first.";
    slot.append(el("p", "muted tiny", left + " (" + mix + ")"));
  }

  function renderBadges() {
    const count = Object.keys(state.mistakes).length;
    byId("mistakeBadge").textContent = String(count);
    byId("cardBadge").textContent = String(count || L.loadBank(state.settings.level).length);
  }

  function renderResume() {
    const slot = byId("resumeSlot");
    const saved = L.loadSavedExam();
    slot.innerHTML = "";
    if (!saved) {
      slot.append(el("p", "muted tiny", "No exam in progress. Start one and it is saved here automatically."));
      return;
    }
    const answered = saved.answers.filter((a) => a !== null && a !== undefined).length;
    const card = el("div", "resume-card");
    card.append(el("strong", null, saved.level + " exam · " + saved.questions.length + " questions"));
    const bits = [answered + " answered", saved.timerMinutes ? "on the clock" : "untimed"];
    card.append(el("p", "muted", bits.join(" · ")));
    const actions = el("div", "resume-actions");
    const resume = el("button", "btn btn-primary btn-sm", "Resume");
    resume.type = "button";
    resume.onclick = resumeExam;
    const discard = el("button", "btn btn-ghost btn-sm", "Discard");
    discard.type = "button";
    discard.onclick = discardExam;
    actions.append(resume, discard);
    card.append(actions);
    slot.append(card);
  }

  function renderSetup() {
    byId("heroLevel").textContent = state.settings.level;
    byId("heroCount").textContent = L.loadBank(state.settings.level).length.toLocaleString();
    renderStats();
    renderSectionStats();
    renderBankProgress();
    renderBadges();
    renderResume();
    syncLevelButtons();
  }

  /* ---------------------------------------------------------------- starting */

  async function startExamRequest(event) {
    if (event) event.preventDefault();
    const opts = readSetupForm();
    const existing = L.loadSavedExam();
    if (existing) {
      const replace = await confirmAction({
        title: "Replace the saved exam?",
        body: "You have a " + existing.level + " exam in progress with " + existing.answers.filter((a) => a != null).length + " answers. Starting a new one discards it.",
        ok: "Start new"
      });
      if (!replace) { renderResume(); return; }
      L.clearSavedExam();
    }

    if (opts.source === "gemini" && !state.settings.apiKey && !state.settings.workerUrl) {
      setupNote("AI generation needs a Gemini key or worker URL. Add one in Tools & settings.", true);
      openDrawer();
      return;
    }

    const button = byId("startBtn");
    button.disabled = true;
    const ai = opts.source === "gemini";
    button.textContent = ai ? "Writing your " + opts.level + " paper…" : "Building your paper…";
    if (ai) {
      setupNote("Gemini is writing " + opts.count + " new " + opts.level + " questions. This takes a few seconds; none are reused from earlier papers.");
    }
    try {
      const questions = await L.buildQuestions(opts);
      if (!questions.length) throw new Error("No questions matched those filters.");
      const gen = L.state.generation || {};
      if (ai && gen.used === "gemini") {
        const short = gen.got < opts.count ? " (" + gen.got + " usable of " + opts.count + ")" : "";
        setupNote(gen.got + " fresh " + opts.level + " questions from Gemini" + short + ". Nothing repeated from your earlier papers.");
      } else if (ai) {
        setupNote("Gemini is unavailable (" + friendlyGenError(gen.reason) + "). Using the offline " + opts.level + " paper.", true);
      }
      const exam = L.createExam({
        level: opts.level,
        source: opts.source,
        candidate: opts.name,
        questions: questions,
        layout: opts.layout,
        timer: opts.timer
      });
      setupNote("");
      beginExam(exam);
    } catch (err) {
      setupNote((err && err.message) || "Could not build the exam.", true);
    } finally {
      button.disabled = false;
      button.textContent = "Start exam";
    }
  }

  function beginExam(exam) {
    state.exam = exam;
    state.current = 0;
    L.saveExam();
    showView("exam");
    renderExam();
    startTimer();
  }

  function resumeExam() {
    const saved = L.loadSavedExam();
    if (!saved) { toast("That exam is no longer saved."); renderResume(); return; }
    state.exam = saved;
    state.current = 0;
    showView("exam");
    renderExam();
    if (saved.timerMinutes && saved.paused) {
      updateTimerChip();
    } else {
      startTimer();
    }
    toast("Exam resumed.");
  }

  async function discardExam() {
    const ok = await confirmAction({
      title: "Discard the saved exam?",
      body: "The paper and its answers will be deleted. This cannot be undone.",
      ok: "Discard"
    });
    if (!ok) return;
    L.clearSavedExam();
    state.exam = null;
    renderResume();
    toast("Saved exam discarded.");
  }

  /* ---------------------------------------------------------------- exam UI */

  function renderExam() {
    const exam = state.exam;
    if (!exam) return;
    byId("examLevel").textContent = exam.level;
    byId("examTitle").textContent = exam.source === "mistakes" ? "Mistake drill"
      : exam.source === "online" ? "Live practice" : exam.source === "gemini" ? "AI exam" : "Mock exam";
    updateLangButton();
    byId("examFuriganaBtn").setAttribute("aria-pressed", String(!!state.settings.furigana));

    const slot = byId("questionsSlot");
    slot.innerHTML = "";
    const frag = document.createDocumentFragment();
    exam.questions.forEach((q, i) => frag.append(renderQuestion(q, i)));
    slot.append(frag);

    renderNavigator();
    updateProgress();
    updateTimerChip();
    setFocus(clampIndex(state.current), false);
    byId("pauseBtn").textContent = exam.paused ? "▶" : "⏸";
    byId("pauseBtn").title = exam.paused ? "Resume" : "Pause";
  }

  const clampIndex = (i) => Math.min(Math.max(0, i), Math.max(0, state.exam.questions.length - 1));

  function jaVoice() {
    const synth = window.speechSynthesis;
    if (!synth || !synth.getVoices) return null;
    const voices = synth.getVoices() || [];
    return voices.filter((v) => /^ja/i.test(v.lang))[0] || null;
  }

  function playScript(text, rate) {
    const synth = window.speechSynthesis;
    if (!synth || !window.SpeechSynthesisUtterance) return false;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(String(text).replace(/\n+/g, "。"));
    utter.lang = "ja-JP";
    utter.rate = rate || 0.95;
    const voice = jaVoice();
    if (voice) utter.voice = voice;
    synth.speak(utter);
    return true;
  }

  function listeningBlock(q) {
    const box = el("div", "listening");
    const row = el("div", "listen-row");
    const play = el("button", "btn btn-sm", "▶ Play");
    play.type = "button";
    const slow = el("button", "btn btn-sm btn-ghost", "▶ Slowly");
    slow.type = "button";
    const show = el("button", "btn btn-sm btn-ghost", "Show script");
    show.type = "button";
    row.append(play, slow, show);
    const note = el("div", "note", jaVoice()
      ? "聴解 · spoken by your device's Japanese voice. The script opens in the review."
      : "This device has no Japanese voice, so read the script instead — it turns this into a 読解 item.");
    const script = el("div", "passage listen-script");
    script.innerHTML = L.rich(q.passage);
    const noVoice = !jaVoice();
    script.hidden = !noVoice;
    if (noVoice) { play.disabled = true; slow.disabled = true; show.hidden = true; }
    play.onclick = () => { if (!playScript(L.plainText(q.passage), 0.95)) { script.hidden = false; toast("This browser cannot speak — script shown instead.", true); } };
    slow.onclick = () => { if (!playScript(L.plainText(q.passage), 0.7)) script.hidden = false; };
    show.onclick = () => {
      script.hidden = !script.hidden;
      show.textContent = script.hidden ? "Show script" : "Hide script";
    };
    box.append(row, note, script);
    return box;
  }

  function renderQuestion(q, index) {
    const exam = state.exam;
    const card = el("article", "q-card card");
    card.dataset.idx = String(index);
    card.id = "qcard-" + index;

    const head = el("div", "q-head");
    head.append(el("span", "q-index", String(index + 1)));
    const tag = el("span", "q-tag");
    tag.innerHTML = "<b>" + L.escapeHtml(L.SECTION_META[q.section].label) + "</b>";
    if (q.subtype) tag.append(document.createTextNode(" · " + q.subtype));
    if (q.lesson) tag.append(document.createTextNode(" · " + q.lesson));
    head.append(tag);
    head.append(el("span", "q-spacer"));

    const flag = el("button", "flag-btn", exam.flags[index] ? "Flagged" : "Flag");
    flag.type = "button";
    flag.setAttribute("aria-pressed", String(!!exam.flags[index]));
    flag.onclick = () => toggleFlag(index);
    head.append(flag);
    card.append(head);

    if (q.section === "listening" && q.passage) {
      card.append(listeningBlock(q, index));
    } else if (q.passage) {
      const passage = el("div", "passage");
      passage.innerHTML = L.rich(q.passage);
      card.append(passage);
    }

    if (q.starData) card.append(starFrame(q));

    const prompt = el("div", "q-text");
    prompt.innerHTML = L.rich(q.prompt);
    card.append(prompt);

    card.append(renderOptions(q, index));
    if (state.settings.study && exam.answers[index] != null) {
      card.append(feedbackBlock(q, exam.answers[index]));
    }

    const actions = el("div", "q-actions");
    const speakBtn = el("button", "btn btn-ghost btn-sm", "🔊 Read aloud");
    speakBtn.type = "button";
    speakBtn.onclick = () => L.speak(q.prompt + " " + q.options[q.answer]);
    actions.append(speakBtn);

    const dictBtn = el("button", "btn btn-ghost btn-sm", "漢 Dictionary");
    dictBtn.type = "button";
    dictBtn.onclick = (ev) => openKanjiPanel(ev.currentTarget, q.passage + " " + q.prompt + " " + q.options.join(" "));
    actions.append(dictBtn);

    if (exam.layout === "focus" && !exam.graded) {
      actions.append(el("span", "spacer"));
      const prev = el("button", "btn btn-ghost btn-sm", "← Previous");
      prev.type = "button";
      prev.disabled = index === 0;
      prev.onclick = () => setFocus(index - 1, true);
      const next = el("button", "btn btn-sm", "Next →");
      next.type = "button";
      next.disabled = index === exam.questions.length - 1;
      next.onclick = () => setFocus(index + 1, true);
      actions.append(prev, next);
    }
    card.append(actions);
    return card;
  }

  function starFrame(q) {
    const frame = el("div", "star-frame");
    const before = el("div", "before");
    before.innerHTML = L.rich(q.starData.before);
    const slots = el("div", "star-slots");
    for (let k = 0; k < 4; k += 1) {
      const slot = el("span", "star-slot" + (k === q.starData.starPos ? " is-star" : ""), k === q.starData.starPos ? "★" : "＿＿");
      slots.append(slot);
    }
    const after = el("div", "after");
    after.innerHTML = L.rich(q.starData.after);
    frame.append(before, slots, after, el("div", "star-hint", "Choose the word that belongs at ★."));
    return frame;
  }

  function renderOptions(q, index) {
    const exam = state.exam;
    const wrap = el("div", "options");
    const answered = exam.answers[index];
    const locked = state.settings.study && answered != null;
    q.options.forEach((option, k) => {
      const label = el("label", "option");
      const input = el("input");
      input.type = "radio";
      input.name = "q-" + index;
      input.value = String(k);
      input.checked = answered === k;
      if (locked) {
        input.disabled = true;
        if (k === q.answer) label.classList.add("is-correct");
        if (k === answered && k !== q.answer) label.classList.add("is-wrong");
        if (k === answered) label.classList.add("is-chosen");
      }
      if (!exam.graded && !locked) input.addEventListener("change", () => onAnswer(index, k));
      const marker = el("span", "marker", String.fromCharCode(65 + k));
      const text = el("span", "opt-text");
      text.innerHTML = L.rich(option);
      label.append(input, marker, text);
      wrap.append(label);
    });
    return wrap;
  }

  function onAnswer(index, value) {
    const exam = state.exam;
    if (!exam || exam.graded) return;
    exam.answers[index] = value;
    L.saveExam();
    updateProgress();
    renderNavigator();
    if (state.settings.study) {
      const card = byId("qcard-" + index);
      if (card) {
        const fresh = renderQuestion(exam.questions[index], index);
        card.replaceWith(fresh);
        if (state.current === index) setFocus(index, false);
      }
      return;
    }
    if (exam.layout === "focus" && state.settings.autoAdvance) {
      setTimeout(() => {
        if (state.exam === exam && state.current === index && index < exam.questions.length - 1) {
          setFocus(index + 1, true);
        }
      }, 280);
    }
  }

  function toggleFlag(index) {
    const exam = state.exam;
    if (!exam) return;
    exam.flags[index] = !exam.flags[index];
    const card = byId("qcard-" + index);
    if (card) {
      const btn = $(".flag-btn", card);
      if (btn) {
        btn.textContent = exam.flags[index] ? "Flagged" : "Flag";
        btn.setAttribute("aria-pressed", String(!!exam.flags[index]));
      }
    }
    L.saveExam();
    renderNavigator();
  }

  function setFocus(index, scroll) {
    const exam = state.exam;
    if (!exam) return;
    const next = clampIndex(index);
    switchSectionClock(exam, next);
    state.current = next;
    $$("#questionsSlot .q-card").forEach((card) => {
      const idx = Number(card.dataset.idx);
      card.classList.toggle("is-current", idx === next);
      if (exam.layout === "focus") card.hidden = idx !== next;
    });
    renderNavigator();
    if (scroll) {
      const card = byId("qcard-" + next);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderNavigator() {
    const exam = state.exam;
    const nav = byId("navigator");
    if (!exam || !nav) return;
    nav.innerHTML = "";
    exam.questions.forEach((q, i) => {
      const btn = el("button", null, String(i + 1));
      btn.type = "button";
      btn.dataset.idx = String(i);
      btn.setAttribute("aria-label", "Question " + (i + 1));
      if (exam.answers[i] !== null && exam.answers[i] !== undefined) btn.classList.add("answered");
      if (exam.flags[i]) btn.classList.add("flagged");
      if (i === state.current) btn.classList.add("current");
      btn.onclick = () => setFocus(i, true);
      nav.append(btn);
    });
  }

  function updateProgress() {
    const exam = state.exam;
    if (!exam) return;
    const answered = exam.answers.filter((a) => a !== null && a !== undefined).length;
    byId("examAnswered").textContent = answered + " / " + exam.questions.length + " answered";
    const pct = exam.questions.length ? (answered / exam.questions.length) * 100 : 0;
    byId("progressBar").style.width = pct + "%";
    byId("examHint").textContent = answered === exam.questions.length
      ? "All questions answered."
      : (exam.questions.length - answered) + " left";
  }

  /* ---------------------------------------------------------------- timer */

  function startTimer() {
    stopTimer();
    const exam = state.exam;
    if (!exam || !exam.timerMinutes || exam.graded) { updateTimerChip(); return; }
    exam.paused = false;
    const left = exam.sectionLeft ? (exam.sectionLeft[exam.sectionNow] || 0) : exam.remaining;
    exam.timerEndAt = Date.now() + Math.max(0, left) * 1000;
    timer.interval = setInterval(onTick, 250);
    updateTimerChip();
  }

  function stopTimer() {
    clearInterval(timer.interval);
    timer.interval = 0;
  }

  // Moving between 問題 hands the stopwatch over: the section you leave keeps the
  // time it had left, the one you enter starts on its own clock.
  function switchSectionClock(exam, next) {
    if (!exam || !exam.sectionLeft) return;
    const q = exam.questions[next];
    if (!q || !q.section || q.section === exam.sectionNow) return;
    exam.sectionLeft[exam.sectionNow] = L.currentRemaining(exam);
    exam.sectionNow = q.section;
    exam.timerEndAt = exam.paused ? 0 : Date.now() + (exam.sectionLeft[q.section] || 0) * 1000;
  }

  function onTick() {
    const exam = state.exam;
    if (!exam || exam.graded || exam.paused) return;
    const left = L.currentRemaining(exam);
    if (exam.sectionLeft) exam.sectionLeft[exam.sectionNow] = left;
    else exam.remaining = left;
    updateTimerChip();
    if (left > 0) return;
    if (exam.sectionLeft) {
      const spent = L.SECTION_META[exam.sectionNow];
      const upcoming = Object.keys(exam.sectionLeft)
        .filter((key) => key !== exam.sectionNow && exam.sectionLeft[key] > 0);
      if (upcoming.length) {
        const key = upcoming[0];
        const idx = exam.questions.findIndex((q) => q.section === key);
        exam.sectionNow = key;
        exam.timerEndAt = Date.now() + exam.sectionLeft[key] * 1000;
        setFocus(idx, true);
        toast(spent.label + " time is up — moving to " + L.SECTION_META[key].label +
          ", " + L.fmtClock(exam.sectionLeft[key]) + ".");
        return;
      }
    }
    stopTimer();
    toast("Time is up — scoring your paper.");
    finishExam(true);
  }

  function updateTimerChip() {
    const chip = byId("timerChip");
    const exam = state.exam;
    if (!chip || !exam) return;
    if (!exam.timerMinutes) {
      chip.textContent = "∞ untimed";
      chip.classList.remove("warn", "danger");
      chip.disabled = true;
      return;
    }
    chip.disabled = false;
    const remaining = L.currentRemaining(exam);
    const label = exam.sectionLeft && L.SECTION_META[exam.sectionNow] ? L.SECTION_META[exam.sectionNow].label + " " : "";
    chip.textContent = (exam.paused ? "❚❚ " : "") + label + L.fmtClock(remaining);
    chip.classList.toggle("warn", remaining < 180 && remaining >= 60);
    chip.classList.toggle("danger", remaining < 60);
    const pauseBtn = byId("pauseBtn");
    if (pauseBtn) {
      pauseBtn.textContent = exam.paused ? "▶" : "⏸";
      pauseBtn.title = exam.paused ? "Resume timer" : "Pause timer";
    }
  }

  function togglePause() {
    const exam = state.exam;
    if (!exam || !exam.timerMinutes || exam.graded) return;
    if (exam.paused) {
      exam.paused = false;
      exam.timerEndAt = Date.now() + exam.remaining * 1000;
      timer.interval = setInterval(onTick, 250);
      toast("Timer resumed.");
    } else {
      exam.remaining = L.currentRemaining(exam);
      exam.paused = true;
      exam.timerEndAt = 0;
      stopTimer();
      L.saveExam();
      toast("Timer paused.");
    }
    updateTimerChip();
  }

  /* ---------------------------------------------------------------- finishing */

  async function finishExam(auto) {
    const exam = state.exam;
    if (!exam || exam.graded) return;
    const unanswered = exam.answers.filter((a) => a === null || a === undefined).length;
    if (!auto && unanswered > 0) {
      const ok = await confirmAction({
        title: unanswered + " unanswered",
        body: "Unanswered questions count as wrong. Score the paper now?",
        ok: "Score it"
      });
      if (!ok) return;
    }
    stopTimer();
    exam.graded = true;
    exam.finishedAt = Date.now();
    exam.elapsed = exam.timerMinutes
      ? Math.max(0, exam.timerMinutes * 60 - Math.max(0, exam.remaining))
      : Math.round((exam.finishedAt - exam.startedAt) / 1000);
    const result = L.gradeExam(exam);
    L.recordResults(exam, result);
    L.clearSavedExam();
    state.exam = exam;
    state.lastResult = { exam: exam, result: result };
    showView("results");
    renderResults();
    if (result.pass) confetti();
    toast(result.pass ? "Passed — well done." : "Scored. Review the answers below.");
    autoSendResult();
  }

  function quitExam() {
    const exam = state.exam;
    if (!exam) return;
    if (exam.timerMinutes && !exam.paused) exam.remaining = L.currentRemaining(exam);
    L.saveExam();
    state.exam = null;
    showView("setup");
    renderSetup();
    toast("Exam saved — resume it from Continue & review.");
  }

  /* ---------------------------------------------------------------- results */

  function originMix(origins) {
    if (!origins) return "";
    const bits = [];
    if (origins.generated) bits.push(origins.generated + " generated");
    if (origins.bank) bits.push(origins.bank + " from the bank");
    if (origins.live) bits.push(origins.live + " live");
    return bits.length > 1 ? "mix: " + bits.join(" · ") : "";
  }

  function renderResults() {
    if (!state.lastResult) return;
    const exam = state.lastResult.exam;
    const result = state.lastResult.result;
    const pct = result.max ? Math.round((result.total / result.max) * 100) : 0;
    const ring = byId("scoreRing");
    ring.style.setProperty("--pct", String(pct));
    ring.style.setProperty("--ring", result.pass ? "var(--ok)" : "var(--bad)");
    ring.setAttribute("aria-label", result.total + " of " + result.max + " points, " + (result.pass ? "pass" : "below pass mark"));
    byId("scoreBig").textContent = String(result.total);
    byId("scoreLabel").textContent = "/ " + result.max;

    const verdict = byId("verdict");
    const failed = result.keys.filter((key) => !result.sections[key].ok);
    const failedNames = failed.map((key) => L.SECTION_META[key].en);
    verdict.textContent = result.pass ? "Pass"
      : failedNames.length ? "Below pass mark — " + failedNames.join(", ") + " under the minimum"
      : "Below pass mark";
    verdict.className = "verdict " + (result.pass ? "pass" : "fail");

    byId("resultsTitle").textContent = exam.level + " · " + (exam.source === "mistakes" ? "mistake drill" : exam.source === "gemini" ? "AI exam" : exam.source === "online" ? "live practice" : "mock exam");
    const parts = [result.correct + " of " + result.totalQ + " correct", "took " + L.fmtDuration(exam.elapsed)];
    if (exam.candidate) parts.push(exam.candidate);
    const mix = originMix(result.origins);
    if (mix) parts.push(mix);
    const firstSection = result.keys.length ? result.sections[result.keys[0]] : { min: 0, worth: 60 };
    byId("resultsSub").textContent = parts.join(" · ") + " · pass mark " + result.passTotal + "/" + result.max +
      " · each section needs " + firstSection.min + "/" + (firstSection.worth || 60);

    renderSectionBars(result);
    renderReview();
    byId("reviewWrongBtn").disabled = result.correct === result.totalQ;
    syncTelegramButton();
  }

  function resultSummary() {
    const { exam, result } = state.lastResult || {};
    if (!exam || !result) return "";
    const lines = [
      "JLPT " + exam.level + " · " + (exam.source === "mistakes" ? "Mistake drill" : "Mock exam"),
      "Score: " + result.total + "/" + result.max + " (" + (result.pass ? "pass" : "below pass mark") + ")",
      result.correct + " of " + result.totalQ + " correct · " + L.fmtDuration(exam.elapsed)
    ];
    result.keys.forEach((key) => {
      const s = result.sections[key];
      lines.push(L.SECTION_META[key].en + ": " + s.correct + "/" + s.total);
    });
    lines.push("#JLPT " + exam.level + " " + result.total + "/" + result.max + " " + (result.pass ? "PASS" : "FAIL") +
      " " + result.keys.map((key) => key + "=" + result.sections[key].points).join(" "));
    return lines.join("\n");
  }

  function syncTelegramButton() {
    const btn = byId("telegramBtn");
    if (!btn) return;
    const sent = !!(state.lastResult && state.lastResult.sent);
    btn.textContent = sent ? "Sent to Telegram" : "Send to Telegram";
    btn.disabled = sent;
  }

  async function postTelegram(url, text) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "HTTP " + res.status);
  }

  async function telegramSend(text) {
    const url = (state.settings.telegramUrl || "").trim();
    if (!/^https:\/\//.test(url)) {
      openDrawer();
      toast("Add your Telegram relay URL in Tools & settings", true);
      return false;
    }
    try {
      await postTelegram(url, text);
      return true;
    } catch (err) {
      toast("Telegram failed: " + err.message, true);
      return false;
    }
  }

  async function sendResultTelegram() {
    const text = resultSummary();
    if (!text) return;
    if (state.lastResult.sent) { toast("Already sent to Telegram."); return; }
    if (await telegramSend(text)) {
      state.lastResult.sent = true;
      syncTelegramButton();
      toast("Result sent to Telegram");
    }
  }

  async function autoSendResult() {
    if (state.settings.autoTelegram === false) return;
    const text = resultSummary();
    if (!text) return;
    const url = (state.settings.telegramUrl || "").trim();
    if (!/^https:\/\//.test(url)) return;
    try {
      await postTelegram(url, text);
      state.lastResult.sent = true;
      syncTelegramButton();
    } catch (err) {
      toast("Result not sent to Telegram: " + err.message, true);
    }
  }

  function copyResult() {
    const text = resultSummary();
    if (!text) return;
    const done = () => toast("Result copied");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => copyFallback(text, done));
    } else {
      copyFallback(text, done);
    }
  }

  function copyFallback(text, done) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
    area.remove();
    if (ok) done(); else toast("Copy failed — select the result text manually", true);
  }

  function renderSectionBars(result) {
    const wrap = byId("sectionBars");
    wrap.innerHTML = "";
    const min = result.keys.length ? result.sections[result.keys[0]].min : 0;
    result.keys.forEach((key) => {
      const s = result.sections[key];
      const meta = L.SECTION_META[key];
      const row = el("div", "sbar" + (s.ok ? "" : " low"));
      const name = el("span", "name", meta.label + " · " + meta.en);
      const val = el("span", "val", s.correct + " of " + s.total + " correct · " + s.points + "/" + (s.worth || 60) + " pts" +
        (s.ok ? "" : " · under the " + min + "-point minimum"));
      const track = el("div", "track");
      const fill = el("div", "fill");
      fill.style.width = Math.round((s.points / (s.worth || 60)) * 100) + "%";
      track.append(fill);
      row.append(name, val, track);
      wrap.append(row);
    });
  }

  function explanationHTML(q, lang) {
    const parts = [];
    if (lang !== "bn" && q.exp_en) parts.push('<div class="exp">' + L.safeRich(q.exp_en) + "</div>");
    if (lang !== "en" && q.exp_bn) parts.push('<div class="exp bn">' + L.safeRich(q.exp_bn) + "</div>");
    return parts.join("");
  }

  function feedbackBlock(q, chosen) {
    const correct = chosen === q.answer;
    const wrap = el("div", "feedback " + (correct ? "good" : "bad"));
    const verdict = el("div", "verdict");
    verdict.textContent = correct ? "✓ Correct" : "✕ Incorrect";
    wrap.append(verdict);
    const answerLine = el("div", "answer-line");
    answerLine.innerHTML = L.safeRich(q.options[q.answer]);
    wrap.append(answerLine);
    if (q.kana) wrap.append(el("div", "q-kana", q.kana));
    const exp = el("div");
    exp.innerHTML = explanationHTML(q, state.settings.lang);
    wrap.append(exp);
    return wrap;
  }

  function reviewItem(q, index, exam) {
    const chosen = exam.answers[index];
    const correct = chosen === q.answer;
    const item = el("details", "card review-item " + (correct ? "correct" : "wrong"));
    if (q.passage) item.open = true;
    const summary = el("summary");
    summary.append(el("span", "status-dot"));
    const label = el("span", "rq");
    label.textContent = (index + 1) + ". " + L.stripHtml(q.prompt);
    summary.append(label);
    summary.append(el("span", "tag", L.SECTION_META[q.section].label));
    item.append(summary);

    const body = el("div", "review-body");
    if (q.passage) {
      const passage = el("div", "passage");
      passage.innerHTML = L.safeRich(q.passage);
      body.append(passage);
    }
    const opts = el("div", "options");
    q.options.forEach((option, k) => {
      const row = el("div", "option");
      if (k === q.answer) row.classList.add("is-correct");
      if (k === chosen && k !== q.answer) row.classList.add("is-wrong");
      row.append(el("span", "marker", String.fromCharCode(65 + k)));
      const text = el("span");
      text.innerHTML = L.safeRich(option);
      row.append(text);
      opts.append(row);
    });
    body.append(opts);
    const exp = el("div");
    exp.innerHTML = explanationHTML(q, state.settings.lang);
    body.append(exp);
    item.append(body);
    return item;
  }

  function renderReview() {
    const exam = state.lastResult.exam;
    const list = byId("reviewList");
    list.innerHTML = "";
    const frag = document.createDocumentFragment();
    exam.questions.forEach((q, i) => frag.append(reviewItem(q, i, exam)));
    list.append(frag);
  }

  /* ---------------------------------------------------------------- practice */

  function openPractice() {
    showView("practice");
    const entries = Object.values(state.mistakes).sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
    byId("practiceTitle").textContent = "Mistake drill";
    byId("practiceSub").textContent = entries.length
      ? entries.length + " question" + (entries.length === 1 ? "" : "s") + " to master. Answer one correctly twice to clear it."
      : "Nothing here yet — wrong answers from an exam land in this list.";
    byId("practiceDrillBtn").disabled = entries.length === 0;
    const list = byId("practiceList");
    list.innerHTML = "";
    if (!entries.length) {
      const card = el("div", "card practice-card");
      card.append(el("p", "muted", "Take an exam first. Any question you get wrong will appear here with the explanation."));
      list.append(card);
      return;
    }
    entries.forEach((entry) => {
      const q = entry.q;
      const card = el("article", "card practice-card");
      const top = el("div", "pc-top");
      top.append(el("span", "q-tag", L.SECTION_META[q.section].label + (q.lesson ? " · " + q.lesson : "")));
      top.append(el("span", "q-spacer"));
      top.append(el("span", "badge", "✕ " + entry.wrong));
      card.append(top);
      const prompt = el("div", "pc-prompt");
      prompt.innerHTML = L.rich(q.prompt);
      card.append(prompt);
      const details = el("details");
      const sum = el("summary", "linkish", "Show answer");
      details.append(sum);
      const body = el("div", "pc-answer");
      body.innerHTML = "✔ " + L.safeRich(q.options[q.answer]) + (q.kana ? " · " + L.escapeHtml(q.kana) : "");
      details.append(body);
      const exp = el("div");
      exp.innerHTML = explanationHTML(q, state.settings.lang);
      details.append(exp);
      card.append(details);
      list.append(card);
    });
  }

  async function clearMistakes() {
    if (!Object.keys(state.mistakes).length) { toast("The mistake bank is already empty."); return; }
    const ok = await confirmAction({
      title: "Clear the mistake bank?",
      body: "This removes every saved mistake. Your stats stay.",
      ok: "Clear"
    });
    if (!ok) return;
    state.mistakes = {};
    L.saveMistakes();
    renderBadges();
    openPractice();
    toast("Mistake bank cleared.");
  }

  function startDrill() {
    const entries = Object.values(state.mistakes).sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
    if (!entries.length) { toast("No mistakes to drill yet."); return; }
    const questions = entries.slice(0, 20).map((e) => e.q);
    const exam = L.createExam({
      level: state.settings.level,
      source: "mistakes",
      candidate: state.settings.name,
      questions: questions,
      layout: "focus",
      timer: 0
    });
    beginExam(exam);
  }

  /* ---------------------------------------------------------------- flashcards */

  function openFlashcards() {
    const mistakes = Object.values(state.mistakes).map((e) => e.q);
    let cards = mistakes;
    let source = "mistakes";
    if (!cards.length) {
      cards = L.loadBank(state.settings.level);
      source = "bank";
    }
    if (!cards.length) { toast("No cards available."); return; }
    state.flash = {
      cards: L.shuffle(cards).slice(0, 30),
      index: 0,
      flipped: false,
      source: source,
      mastered: 0
    };
    byId("flashSub").textContent = source === "mistakes"
      ? "From your mistake bank — clear cards as you learn them."
      : "From the " + state.settings.level + " offline bank.";
    showView("flash");
    renderFlash();
  }

  function renderFlash() {
    const deck = state.flash;
    if (!deck) return;
    const q = deck.cards[deck.index];
    byId("flashCounter").textContent = (deck.index + 1) + " / " + deck.cards.length;
    byId("flashFill").style.width = ((deck.index + 1) / deck.cards.length) * 100 + "%";
    byId("flashMastered").textContent = deck.mastered + " mastered";
    byId("flashFront").innerHTML = L.rich(q.prompt);
    byId("flashAnswer").innerHTML = "✔ " + L.safeRich(q.options[q.answer]) + (q.kana ? " · " + L.escapeHtml(q.kana) : "");
    const exp = byId("flashExpl");
    exp.innerHTML = state.settings.lang === "bn" && q.exp_bn ? L.safeRich(q.exp_bn) : L.safeRich(q.exp_en || "");
    byId("flashExplBn").innerHTML = state.settings.lang !== "en" && q.exp_bn ? L.safeRich(q.exp_bn) : "";
    byId("flashExplBn").style.display = byId("flashExplBn").innerHTML ? "" : "none";
    byId("flashCard").classList.toggle("flipped", deck.flipped);
    byId("flashFlipBtn").textContent = deck.flipped ? "Hide answer" : "Reveal";
  }

  function flipFlash() {
    if (!state.flash) return;
    state.flash.flipped = !state.flash.flipped;
    renderFlash();
  }

  function stepFlash(delta) {
    const deck = state.flash;
    if (!deck) return;
    deck.index = (deck.index + delta + deck.cards.length) % deck.cards.length;
    deck.flipped = false;
    renderFlash();
  }

  function knowFlash() {
    const deck = state.flash;
    if (!deck) return;
    const q = deck.cards[deck.index];
    if (deck.source === "mistakes" && state.mistakes[q.id]) {
      delete state.mistakes[q.id];
      L.saveMistakes();
      renderBadges();
    }
    deck.mastered += 1;
    if (deck.index >= deck.cards.length - 1) {
      toast("Deck finished — " + deck.mastered + " known.");
    }
    stepFlash(1);
  }

  /* ---------------------------------------------------------------- dictionary */

  function kanjiList(text) {
    const set = new Set();
    (L.stripHtml(text).match(/[\u4e00-\u9fff々]/g) || []).forEach((ch) => set.add(ch));
    return Array.from(set).slice(0, 24);
  }

  async function loadKanjiDetail(char) {
    const box = byId("kanjiPopover");
    const detail = box.querySelector(".k-detail");
    if (!detail) return;
    detail.innerHTML = '<span class="muted">Loading…</span>';
    try {
      const res = await fetch("https://kanjiapi.dev/v1/kanji/" + encodeURIComponent(char));
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      detail.innerHTML = "";
      detail.append(el("div", "k-mean", (data.meanings || []).join(", ") || "—"));
      const on = el("div");
      on.innerHTML = "<span>On:</span> " + L.escapeHtml((data.on_readings || []).join("、") || "—");
      const kun = el("div");
      kun.innerHTML = "<span>Kun:</span> " + L.escapeHtml((data.kun_readings || []).join("、") || "—");
      detail.append(on, kun, el("div", "muted", "JLPT " + (data.jlpt || "—") + " · " + (data.stroke_count || "—") + " strokes"));
    } catch (err) {
      const overrides = window.JLPT_KANJI_READING_OVERRIDES || {};
      detail.innerHTML = "";
      detail.append(el("div", "k-mean", overrides[char] ? "Reading: " + overrides[char] : "No offline entry."));
      detail.append(el("div", "muted", "The dictionary needs a connection."));
    }
  }

  function openKanjiPanel(anchor, text) {
    const box = byId("kanjiPopover");
    const chars = kanjiList(text);
    if (!chars.length) { toast("No kanji in this question."); return; }
    box.innerHTML = "";
    const close = el("button", "icon-btn close-x", "✕");
    close.type = "button";
    close.setAttribute("aria-label", "Close dictionary");
    close.onclick = closePopover;
    const title = el("div", "muted tiny", "Tap a kanji to look it up");
    const chips = el("div");
    chips.style.cssText = "display:flex;flex-wrap:wrap;gap:6px";
    chars.forEach((ch) => {
      const btn = el("button", "icon-btn", ch);
      btn.type = "button";
      btn.style.fontFamily = "var(--font-jp)";
      btn.onclick = () => loadKanjiDetail(ch);
      chips.append(btn);
    });
    const detail = el("div", "k-detail");
    box.append(close, title, chips, detail);
    box.hidden = false;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 20);
    box.style.width = width + "px";
    box.style.left = Math.max(10, Math.min(rect.left, window.innerWidth - width - 10)) + "px";
    box.style.top = Math.max(10, Math.min(rect.bottom + 8, window.innerHeight - 280)) + "px";
    loadKanjiDetail(chars[0]);
  }

  function closePopover() {
    const box = byId("kanjiPopover");
    if (box) box.hidden = true;
  }

  /* ---------------------------------------------------------------- data IO */

  function exportData() {
    const payload = L.exportPayload();
    const name = "jlpt-exam-lab-" + L.dayKey() + ".json";
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = el("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast("Exported " + name);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || "{}"));
        if (!data || typeof data !== "object") throw new Error("Not a JLPT Exam Lab export.");
        if (data.mistakes && typeof data.mistakes === "object") {
          Object.keys(data.mistakes).forEach((id) => {
            const entry = data.mistakes[id];
            if (!entry || !entry.q) return;
            const q = L.normalizeQuestion(entry.q, entry.q.level);
            if (!q) return;
            const existing = state.mistakes[q.id];
            state.mistakes[q.id] = {
              q: q,
              wrong: Math.max(Number(entry.wrong) || 0, existing ? existing.wrong : 0),
              right: 0,
              lastAt: Number(entry.lastAt) || Date.now()
            };
          });
          L.saveMistakes();
        }
        if (data.stats && typeof data.stats === "object") {
          state.stats = Object.assign({}, state.stats, data.stats);
          L.saveStats();
        }
        if (data.done && typeof data.done === "object") L.mergeDone(data.done);
        if (data.settings && typeof data.settings === "object") {
          const incoming = Object.assign({}, data.settings);
          delete incoming.apiKey;
          Object.assign(state.settings, incoming);
          L.saveSettings();
        }
        populateSetup();
        renderSetup();
        toast("Import complete.");
      } catch (err) {
        toast("Import failed: " + ((err && err.message) || "invalid file"));
      }
    };
    reader.readAsText(file);
  }

  /* ---------------------------------------------------------------- print */

  function printPaper(kind) {
    const exam = kind === "review" && state.lastResult ? state.lastResult.exam : null;
    const finish = (paperExam) => {
      buildPrintDocument(paperExam, kind);
      window.print();
    };
    if (exam) { finish(exam); return; }
    const opts = readSetupForm();
    L.buildQuestions(Object.assign({}, opts, { source: "bank" }))
      .then((questions) => {
        if (!questions || !questions.length) throw new Error("empty");
        finish(L.createExam({
          level: opts.level, source: "bank", candidate: opts.name,
          questions: questions, layout: "list", timer: 0
        }));
      })
      .catch(() => toast("Could not build a printable paper."));
  }

  function buildPrintDocument(exam, kind) {
    const area = byId("printArea");
    area.innerHTML = "";
    const title = el("h1", null, "JLPT " + exam.level + " practice paper");
    const meta = el("div", "p-meta", (exam.candidate ? exam.candidate + " · " : "") + exam.questions.length + " questions · " + (kind === "review" ? "review copy" : "answer key at the end"));
    area.append(title, meta);

    exam.questions.forEach((q, i) => {
      const block = el("div", "print-q");
      const num = el("div", null, "");
      num.innerHTML = '<span class="p-num">' + (i + 1) + ".</span> " + (q.lesson ? L.escapeHtml(q.lesson) + " · " : "") + (q.passage ? "" : "");
      block.append(num);
      if (q.passage) {
        const p = el("div", "p-passage", "");
        p.innerHTML = L.safeRich(q.passage);
        block.append(p);
      }
      const prompt = el("div", null, "");
      prompt.innerHTML = L.safeRich(q.prompt);
      block.append(prompt);
      const opts = el("div", "p-opts");
      q.options.forEach((option, k) => {
        const row = el("div", null, "");
        row.innerHTML = String.fromCharCode(65 + k) + ". " + L.safeRich(option);
        opts.append(row);
      });
      block.append(opts);
      if (kind === "review") {
        const chosen = exam.answers[i];
        const verdict = el("div", null, "Your answer: " + (chosen == null ? "—" : String.fromCharCode(65 + chosen)) + " · Correct: " + String.fromCharCode(65 + q.answer));
        block.append(verdict);
        if (q.exp_en) block.append(el("div", null, q.exp_en));
      }
      area.append(block);
    });

    if (kind !== "review") {
      const key = el("div", "print-answers");
      key.append(el("h1", null, "Answer key"));
      exam.questions.forEach((q, i) => {
        const row = el("div", null, (i + 1) + ". " + String.fromCharCode(65 + q.answer) + "  " + q.options[q.answer] + (q.kana ? "  (" + q.kana + ")" : ""));
        key.append(row);
      });
      area.append(key);
    }
  }

  /* ---------------------------------------------------------------- drawer */

  function openDrawer() {
    byId("workerUrlInput").value = state.settings.workerUrl || "";
    byId("apiKeyInput").value = state.settings.apiKey || "";
    byId("tgUrlInput").value = state.settings.telegramUrl || "";
    byId("tgAutoToggle").checked = state.settings.autoTelegram !== false;
    byId("listenToggle").checked = state.settings.listening !== false;
    byId("appVersion").textContent = L.VERSION;
    byId("drawer").hidden = false;
    byId("drawerBackdrop").hidden = false;
  }

  function closeDrawer() {
    byId("drawer").hidden = true;
    byId("drawerBackdrop").hidden = true;
  }

  function saveApiSettings() {
    state.settings.workerUrl = byId("workerUrlInput").value.trim();
    state.settings.apiKey = byId("apiKeyInput").value.trim();
    L.saveSettings();
    toast("AI settings saved on this device.");
  }

  function saveTelegramSettings() {
    state.settings.telegramUrl = byId("tgUrlInput").value.trim();
    state.settings.autoTelegram = byId("tgAutoToggle").checked;
    L.saveSettings();
    toast(state.settings.autoTelegram ? "Telegram saved — results auto-send after each exam." : "Telegram saved — send results by hand.");
  }

  async function testTelegram() {
    saveTelegramSettings();
    if (await telegramSend("JLPT Exam Lab is connected. Exam results can be sent here.")) {
      toast("Test message sent to Telegram");
    }
  }

  function clearApiKey() {
    state.settings.apiKey = "";
    byId("apiKeyInput").value = "";
    L.saveSettings();
    toast("API key removed.");
  }

  async function clearAllData() {
    const ok = await confirmAction({
      title: "Clear all saved data?",
      body: "Settings, stats, the mistake bank and any saved exam will be deleted.",
      ok: "Delete everything"
    });
    if (!ok) return;
    L.resetData();
    populateSetup();
    renderSetup();
    closeDrawer();
    toast("All saved data cleared.");
  }

  /* ---------------------------------------------------------------- theme + lang */

  function applyTheme() {
    const mode = state.settings.theme;
    const dark = mode === "dark" || (mode === "auto" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    byId("themeBtn").textContent = dark ? "☀" : "☾";
    byId("themeBtn").setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }

  function toggleTheme() {
    const dark = document.documentElement.dataset.theme === "dark";
    state.settings.theme = dark ? "light" : "dark";
    L.saveSettings();
    applyTheme();
  }

  function updateLangButton() {
    const labels = { en: "EN", bn: "বাংলা", both: "EN+বাংলা" };
    byId("langBtn").textContent = labels[state.settings.lang] || "EN";
    byId("langBtn").title = "Explanation language: " + (labels[state.settings.lang] || "EN");
  }

  function cycleLang() {
    const order = ["both", "en", "bn"];
    const next = order[(order.indexOf(state.settings.lang) + 1) % order.length];
    state.settings.lang = next;
    L.saveSettings();
    updateLangButton();
    if (state.view === "results") renderResults();
    if (state.view === "exam") renderExam();
    if (state.view === "practice") openPractice();
    if (state.view === "flash") renderFlash();
  }

  function toggleFurigana() {
    state.settings.furigana = !state.settings.furigana;
    byId("furiganaToggle").checked = state.settings.furigana;
    L.saveSettings();
    const scrollY = window.scrollY;
    if (state.view === "exam" && state.exam) renderExam();
    if (state.view === "practice") openPractice();
    if (state.view === "flash") renderFlash();
    window.scrollTo(0, scrollY);
  }

  /* ---------------------------------------------------------------- confetti */

  function confetti() {
    const canvas = byId("confetti");
    if (!canvas || !canvas.getContext) return;
    canvas.hidden = false;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ["#c2452d", "#2c3a63", "#e0b357", "#1c7a4f", "#d98c6a"];
    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * 200,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      vx: -1.5 + Math.random() * 3,
      vy: 2 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: -0.1 + Math.random() * 0.2,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    const started = Date.now();
    function frame() {
      const age = Date.now() - started;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      pieces.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (age < 2200) requestAnimationFrame(frame);
      else { ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); canvas.hidden = true; }
    }
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------- keyboard */

  function onKeydown(event) {
    if (event.defaultPrevented) return;
    const tag = (event.target && event.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    const exam = state.exam;
    if (state.view !== "exam" || !exam || exam.graded) return;
    const key = event.key.toLowerCase();
    if (/^[1-4]$/.test(key)) {
      const choice = Number(key) - 1;
      const card = byId("qcard-" + state.current);
      const input = card && card.querySelector('input[value="' + choice + '"]');
      if (input) { input.checked = true; onAnswer(state.current, choice); }
      event.preventDefault();
    } else if (key === "arrowright") {
      setFocus(state.current + 1, true); event.preventDefault();
    } else if (key === "arrowleft") {
      setFocus(state.current - 1, true); event.preventDefault();
    } else if (key === "f") {
      toggleFlag(state.current); event.preventDefault();
    } else if (key === "p") {
      togglePause(); event.preventDefault();
    } else if (key === "enter" && !event.metaKey && !event.ctrlKey) {
      finishExam(false);
    }
  }

  /* ---------------------------------------------------------------- init */

  function bindEvents() {
    $$("#levelSwitch button").forEach((btn) => {
      btn.addEventListener("click", () => setLevel(btn.dataset.level));
    });
    byId("themeBtn").addEventListener("click", toggleTheme);
    byId("menuBtn").addEventListener("click", openDrawer);
    byId("drawerClose").addEventListener("click", closeDrawer);
    byId("drawerBackdrop").addEventListener("click", closeDrawer);

    byId("setupForm").addEventListener("submit", startExamRequest);
    byId("candidateName").addEventListener("input", (event) => {
      state.settings.name = event.target.value.trim().slice(0, 40);
      L.saveSettings();
    });
    byId("sourceSelect").addEventListener("change", (event) => {
      state.settings.source = event.target.value;
      L.saveSettings();
      if (state.settings.source === "gemini" && !state.settings.apiKey && !state.settings.workerUrl) {
        setupNote("Add a Gemini key or worker URL in Tools & settings to generate AI questions.", true);
      } else {
        setupNote("");
      }
    });
    byId("sectionSelect").addEventListener("change", (e) => { state.settings.section = e.target.value; L.saveSettings(); });
    byId("lessonSelect").addEventListener("change", (e) => { state.settings.lesson = e.target.value; L.saveSettings(); });
    byId("countSelect").addEventListener("change", (e) => { state.settings.count = Number(e.target.value); L.saveSettings(); });
    byId("timerSelect").addEventListener("change", (e) => { state.settings.timer = Number(e.target.value); L.saveSettings(); });
    byId("viewSelect").addEventListener("change", (e) => { state.settings.layout = e.target.value; L.saveSettings(); });
    byId("furiganaToggle").addEventListener("change", (e) => { state.settings.furigana = e.target.checked; L.saveSettings(); });
    byId("autoAdvanceToggle").addEventListener("change", (e) => { state.settings.autoAdvance = e.target.checked; L.saveSettings(); });

    byId("mistakesBtn").addEventListener("click", openPractice);
    byId("flashcardsBtn").addEventListener("click", openFlashcards);

    $$("[data-tool]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tool = btn.dataset.tool;
        if (tool === "import") byId("importFile").click();
        if (tool === "export") exportData();
        if (tool === "print") printPaper("paper");
        if (tool === "help") byId("helpDialog").showModal();
      });
    });

    byId("timerChip").addEventListener("click", togglePause);
    byId("pauseBtn").addEventListener("click", togglePause);
    byId("examFuriganaBtn").addEventListener("click", toggleFurigana);
    byId("langBtn").addEventListener("click", cycleLang);
    byId("submitExamBtn").addEventListener("click", () => finishExam(false));
    byId("quitExamBtn").addEventListener("click", quitExam);

    byId("newExamBtn").addEventListener("click", () => { showView("setup"); renderSetup(); });
    byId("backToSetupBtn").addEventListener("click", () => { showView("setup"); renderSetup(); });
    byId("printReviewBtn").addEventListener("click", () => printPaper("review"));
    byId("copyResultBtn").addEventListener("click", copyResult);
    byId("telegramBtn").addEventListener("click", sendResultTelegram);
    byId("reviewWrongBtn").addEventListener("click", () => {
      const { exam, result } = state.lastResult || {};
      if (!exam) return;
      const wrong = exam.questions.filter((q, i) => exam.answers[i] !== q.answer);
      if (!wrong.length) { toast("Every question was correct."); return; }
      beginExam(L.createExam({ level: exam.level, source: "mistakes", candidate: exam.candidate, questions: wrong.slice(0, 20), layout: "focus", timer: 0 }));
    });

    byId("practiceDrillBtn").addEventListener("click", startDrill);
    byId("clearMistakesBtn").addEventListener("click", clearMistakes);
    byId("practiceBackBtn").addEventListener("click", () => { showView("setup"); renderSetup(); });
    byId("flashBackBtn").addEventListener("click", () => { showView("setup"); renderSetup(); });
    byId("flashCard").addEventListener("click", flipFlash);
    byId("flashCard").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flipFlash(); } });
    byId("flashFlipBtn").addEventListener("click", flipFlash);
    byId("flashPrevBtn").addEventListener("click", () => stepFlash(-1));
    byId("flashNextBtn").addEventListener("click", () => stepFlash(1));
    byId("flashKnowBtn").addEventListener("click", knowFlash);

    byId("importFile").addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (file) importData(file);
      event.target.value = "";
    });

    byId("saveApiBtn").addEventListener("click", saveApiSettings);
    byId("clearApiBtn").addEventListener("click", clearApiKey);
    byId("resetRelayBtn").addEventListener("click", () => {
      const relay = "https://jlpt-mock-exam-proxy.mominurislam.workers.dev";
      byId("workerUrlInput").value = relay;
      L.state.settings.workerUrl = relay;
      L.state.settings.relayDefault = true;
      L.saveSettings();
      toast("Using the built-in AI relay");
    });
    byId("saveTgBtn").addEventListener("click", saveTelegramSettings);
    byId("testTgBtn").addEventListener("click", testTelegram);
    byId("tgAutoToggle").addEventListener("change", () => {
      state.settings.autoTelegram = byId("tgAutoToggle").checked;
      L.saveSettings();
      toast(state.settings.autoTelegram ? "Results will auto-send after each exam." : "Auto-send off — send results by hand.");
    });
    byId("listenToggle").addEventListener("change", () => {
      state.settings.listening = byId("listenToggle").checked;
      L.saveSettings();
      toast(state.settings.listening ? "Papers will include 聴解 listening." : "Listening off — papers stay reading and grammar.");
    });
    byId("clearDataBtn").addEventListener("click", clearAllData);

    $$("[data-close-dialog]").forEach((btn) => btn.addEventListener("click", () => btn.closest("dialog").close()));

    document.addEventListener("click", (event) => {
      const pop = byId("kanjiPopover");
      if (pop && !pop.hidden && !pop.contains(event.target) && !event.target.closest(".btn")) closePopover();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closePopover();
        closeDrawer();
      }
    });
    document.addEventListener("keydown", onKeydown);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && state.exam && !state.exam.graded) L.saveExam();
    });

    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if (state.settings.theme === "auto") applyTheme();
      });
    }
  }

  function init() {
    L.loadSettings();
    L.loadMistakes();
    L.loadStats();
    applyTheme();
    populateSetup();
    renderSetup();
    bindEvents();
    showView("setup");

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").then((reg) => {
          if (reg.waiting) toast("A new version is ready — open Tools to reload.");
        }).catch(() => { /* offline mode still works from cache */ });
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
