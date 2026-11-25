#!/usr/bin/env node
/* Builds the local N5 question bank (js/data/bank-n5-large.js) from the curated
   data in tools/data. Deterministic: the same inputs always produce the same
   2,000 questions, so the committed bank can be regenerated and diffed.

   Run: node tools/build-n5-bank.js [--report] */
"use strict";

const fs = require("fs");
const path = require("path");

const words = require("./data/n5-words");
const verbs = require("./data/n5-verbs");
const grammar = require("./data/n5-grammar");
const counters = require("./data/n5-counters");
const reading = require("./data/n5-reading");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "js", "data", "bank-n5-large.js");
const TARGET = 2000;
const LESSON = "L1-25";

/* ---------------------------------------------------------------- helpers */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20251125);

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

function uniq(list) { return Array.from(new Set(list)); }

function parseWords() {
  return words.map((line) => {
    const [word, readingKana, meaning, pos] = line.split("|");
    return { word, reading: readingKana, meaning, pos };
  });
}

function parseVerbs() {
  return verbs.map((line) => {
    const [dict, kana, masu, group, meaning] = line.split("|");
    return { dict, reading: kana, masu, group: Number(group), meaning };
  });
}

const hasKanji = (s) => /[\u4e00-\u9fff]/.test(s);

/* ------------------------------------------------------------- conjugation */

const GODAN = {
  "う": ["わ", "って", "った"], "く": ["か", "いて", "いた"], "ぐ": ["が", "いで", "いだ"],
  "す": ["さ", "して", "した"], "つ": ["た", "って", "った"], "ぬ": ["な", "んで", "んだ"],
  "ぶ": ["ば", "んで", "んだ"], "む": ["ま", "んで", "んだ"], "る": ["ら", "って", "った"]
};

function conj(v) {
  const d = v.dict;
  const stem = v.masu.replace(/ます$/, "");
  const last = d.slice(-1);
  const base = d.slice(0, -1);

  if (v.group === 3) {
    if (d === "来る") return { te: "来て", ta: "来た", nai: "来ない", masu: "来ます" };
    if (d === "する") return { te: "して", ta: "した", nai: "しない", masu: "します" };
    return { te: stem + "して", ta: stem + "した", nai: stem + "しない", masu: stem + "します" };
  }
  if (v.group === 2) {
    const s = d.slice(0, -1);
    return { te: s + "て", ta: s + "た", nai: s + "ない", masu: s + "ます" };
  }
  if (d === "行く") return { te: "行って", ta: "行った", nai: "行かない", masu: "行きます" };
  const row = GODAN[last];
  if (!row) throw new Error("Unknown godan ending: " + d);
  return { te: base + row[1], ta: base + row[2], nai: base + row[0] + "ない", masu: stem + "ます" };
}

/* ------------------------------------------------------------------- rules */

const RULES = {
  wo: {
    en: "「を」 marks the direct object of the verb.",
    bn: "「を」 ক্রিয়ার কর্ম (object) চিহ্নিত করে।"
  },
  ni_time: {
    en: "「に」 marks a specific clock time or date.",
    bn: "「に」 নির্দিষ্ট সময় বা তারিখ বোঝায়।"
  },
  ni_place: {
    en: "「に」 marks where something exists (あります / います) or where someone lives.",
    bn: "「に」 কোনো কিছু কোথায় আছে (あります/います) বা কেউ কোথায় থাকে বোঝায়।"
  },
  de_place: {
    en: "「で」 marks the place where an action happens.",
    bn: "「で」 কাজটি কোথায় হচ্ছে সেই স্থান বোঝায়।"
  },
  de_means: {
    en: "「で」 marks the means or tool of an action.",
    bn: "「で」 কাজের মাধ্যম বা যন্ত্র বোঝায়।"
  },
  e_dir: {
    en: "「へ」 marks the direction you go toward.",
    bn: "「へ」 যাওয়ার দিক বোঝায়।"
  },
  to_with: {
    en: "「と」 means “together with” a person.",
    bn: "「と」 কারও সঙ্গে (together with) বোঝায়।"
  },
  ni_person: {
    en: "「に」 marks the person an action is directed to.",
    bn: "「に」 যাকে উদ্দেশ্য করে কাজটি করা হয় সেই ব্যক্তিকে বোঝায়।"
  },
  mo: {
    en: "「も」 means “also / too”.",
    bn: "「も」 “এবং/ও” (also) বোঝায়।"
  },
  no: {
    en: "「の」 links two nouns, showing possession or belonging.",
    bn: "「の」 দুটি বিশেষ্যের মধ্যে সম্পর্ক (মালিকানা) বোঝায়।"
  },
  kara: {
    en: "「から」 marks the starting point in time or place.",
    bn: "「から」 সময় বা স্থানের শুরু বোঝায়।"
  },
  made: {
    en: "「まで」 marks the end point in time or place.",
    bn: "「まで」 সময় বা স্থানের শেষ সীমা বোঝায়।"
  },
  ga: {
    en: "「が」 marks the subject, especially with あります / います and question words.",
    bn: "「が」 কর্তা বোঝায়, বিশেষত あります/います এবং প্রশ্নবোধক শব্দের সঙ্গে।"
  },
  wa: {
    en: "「は」 marks the topic of the sentence.",
    bn: "「は」 বাক্যের বিষয় (topic) চিহ্নিত করে।"
  },
  ka: {
    en: "「か」 at the end of a sentence makes a question.",
    bn: "বাক্যের শেষে 「か」 প্রশ্ন বোঝায়।"
  },
  na_adj: {
    en: "A な-adjective takes 「な」 before a noun.",
    bn: "な-বিশেষণ বিশেষ্যের আগে 「な」 নেয়।"
  },
  counter: {
    en: "Each kind of thing takes its own counter (つ, ほん, にん, まい, だい…).",
    bn: "প্রতিটি ধরনের জিনিসের জন্য আলাদা counter (つ, ほん, にん, まい, だい…) ব্যবহৃত হয়।"
  },
  demo: {
    en: "この = near me · その = near you · あの = over there · どの = which.",
    bn: "この = আমার কাছে · その = তোমার কাছে · あの = ওখানে · どの = কোনটি।"
  },
  qword: {
    en: "The question word must match what is being asked (time, place, person, price…).",
    bn: "প্রশ্নবোধক শব্দটি প্রশ্নের ধরনের সঙ্গে মিলতে হবে (সময়, স্থান, ব্যক্তি, দাম…)।"
  },
  adverb: {
    en: "The adverb must fit the meaning of the sentence.",
    bn: "ক্রিয়াবিশেষণটি বাক্যের অর্থের সঙ্গে মিলতে হবে।"
  }
};

/* --------------------------------------------------------------- builders */

const questions = [];
const seenPrompts = new Set();

function push(q) {
  const key = (q.passage || "") + "|" + q.prompt;
  if (seenPrompts.has(key)) return false;
  seenPrompts.add(key);
  questions.push(q);
  return true;
}

function vocabQ(entry) {
  const base = {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    lesson: LESSON
  };
  return base;
}

function readingItem(entry, pool) {
  if (!entry.reading || !hasKanji(entry.word)) return;
  const near = (w) => Math.abs(w.reading.length - entry.reading.length);
  const others = pool
    .filter((w) => w.reading && w.reading !== entry.reading && w.word !== entry.word)
    .sort((a, b) => near(a) - near(b))
    .slice(0, 60);
  const options = [entry.reading].concat(shuffle(others).slice(0, 3).map((w) => w.reading));
  if (new Set(options).size !== 4) return;
  push({
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: LESSON,
    prompt: "「" + entry.word + "」の読み方は　どれですか。",
    options,
    answer: 0,
    kana: entry.reading,
    exp_en: "「" + entry.word + "」 is read 「" + entry.reading + "」 and means “" + entry.meaning + "”.",
    exp_bn: "「" + entry.word + "」-এর সঠিক পাঠ 「" + entry.reading + "」 (অর্থ: " + entry.meaning + ")।"
  });
}

function orthographyItem(entry, pool) {
  if (!entry.reading || !hasKanji(entry.word)) return;
  // はやい = 早い / 速い: a shared reading makes the kanji question ambiguous.
  const twins = pool.filter((w) => w.reading === entry.reading && w.word !== entry.word);
  if (twins.length) return;
  const near = (w) => Math.abs(w.word.length - entry.word.length);
  const others = pool
    .filter((w) => w.reading && w.reading !== entry.reading && hasKanji(w.word) && w.word !== entry.word)
    .sort((a, b) => near(a) - near(b))
    .slice(0, 60);
  const options = [entry.word].concat(shuffle(others).slice(0, 3).map((w) => w.word));
  if (new Set(options).size !== 4) return;
  push({
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題2：表記 (Orthography)",
    lesson: LESSON,
    prompt: "「" + entry.reading + "」を　漢字で　書くと　どれですか。",
    options,
    answer: 0,
    kana: entry.reading,
    exp_en: "「" + entry.reading + "」 is written 「" + entry.word + "」 (“" + entry.meaning + "”).",
    exp_bn: "「" + entry.reading + "」 লেখা হয় 「" + entry.word + "」 (অর্থ: " + entry.meaning + ")।"
  });
}

function meaningItem(entry, pool) {
  const first = (s) => String(s).toLowerCase().split(/[\s,;]+/)[0];
  const others = pool.filter((w) => w.pos === entry.pos && w.meaning !== entry.meaning && first(w.meaning) !== first(entry.meaning));
  const options = [entry.meaning].concat(shuffle(others).slice(0, 3).map((w) => w.meaning));
  if (new Set(options).size !== 4) return;
  push({
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題4：意味 (Meaning)",
    lesson: LESSON,
    prompt: "「" + entry.word + "」の意味は　どれですか。",
    options,
    answer: 0,
    kana: entry.reading || entry.word,
    exp_en: "「" + entry.word + "」 (" + (entry.reading || "—") + ") means “" + entry.meaning + "”.",
    exp_bn: "「" + entry.word + "」-এর অর্থ: " + entry.meaning + "।"
  });
}

const FORM_NAME = { te: "て形", nai: "ない形", ta: "た形", masu: "ます形" };
const BN_FORM = { te: "て-রূপ (te-form)", nai: "ない-রূপ (nai-form)", ta: "た-রূপ (ta-form)", masu: "ます-রূপ (masu-form)" };

const IRREGULAR_WRONGS = {
  "来る|te": ["来るて", "きて", "来んで"],
  "来る|ta": ["来るた", "きた", "来だ"],
  "来る|nai": ["来らない", "来るない", "来なない"],
  "来る|masu": ["来るます", "来りします", "来しします"],
  "する|te": ["するて", "しで", "すて"],
  "する|ta": ["するた", "しだ", "すた"],
  "する|nai": ["するない", "しらない", "すない"],
  "する|masu": ["するます", "しります", "すします"]
};

function wrongForms(v, form, correct) {
  const key = v.dict + "|" + form;
  if (IRREGULAR_WRONGS[key]) return IRREGULAR_WRONGS[key];
  const stem = v.masu.replace(/ます$/, "");
  const base = correct.slice(0, -1);
  if (v.group === 2) {
    if (form === "te") return [v.dict + "て", stem + "って", base + "で"];
    if (form === "ta") return [v.dict + "た", stem + "った", base + "だ"];
    if (form === "nai") return [v.dict + "ない", stem + "らない", stem + "なくない"];
    return [v.dict + "ます", stem + "ります", stem + "します"];
  }
  if (form === "te") return [stem + "て", v.dict + "て", correct.endsWith("で") ? base + "て" : base + "で"];
  if (form === "ta") return [stem + "た", v.dict + "た", correct.endsWith("だ") ? base + "た" : base + "だ"];
  if (form === "nai") return [stem + "ない", v.dict + "ない", stem + "らない"];
  return [v.dict + "ます", stem + "ります", stem + "します"];
}

function verbItem(v, form) {
  const f = conj(v);
  const correct = f[form];
  const wrongs = wrongForms(v, form, correct);
  const options = uniq([correct].concat(wrongs)).slice(0, 4);
  if (options.length !== 4) return;
  push({
    section: "文法 (N5 Grammar)",
    subtype: "問題5：動詞の形 (Verb Forms)",
    lesson: LESSON,
    prompt: "「" + v.masu + "」の「" + FORM_NAME[form] + "」は　どれですか。",
    options,
    answer: 0,
    kana: correct,
    exp_en: "「" + v.masu + "」 (" + v.meaning + ") → " + FORM_NAME[form] + " 「" + correct + "」.",
    exp_bn: "「" + v.masu + "」-এর " + BN_FORM[form] + " হলো 「" + correct + "」。"
  });
}

const IADJ_FORM = {
  neg: { label: "否定形（〜くない）", bn: "নেতিবাচক রূপ (〜くない)" },
  past: { label: "た形（〜かった）", bn: "অতীত রূপ (〜かった)" },
  pastneg: { label: "否定のた形（〜くなかった）", bn: "অতীত নেতিবাচক রূপ (〜くなかった)" }
};
const NADJ_FORM = {
  neg: { label: "否定形（〜じゃない）", bn: "নেতিবাচক রূপ (〜じゃない)" },
  past: { label: "た形（〜だった）", bn: "অতীত রূপ (〜だった)" },
  pastneg: { label: "否定のた形（〜じゃなかった）", bn: "অতীত নেতিবাচক রূপ (〜じゃなかった)" }
};

function iAdjItem(entry, form) {
  const s = entry.word;
  if (!/い$/.test(s)) return;
  const stem = s.slice(0, -1);
  const forms = {
    neg: [stem + "くない", stem + "いない", stem + "くなくない", stem + "かった"],
    past: [stem + "かった", stem + "いかった", stem + "くだった", stem + "くかった"],
    pastneg: [stem + "くなかった", stem + "くないかった", stem + "いくなかった", stem + "かったない"]
  };
  const options = uniq(forms[form]).slice(0, 4);
  if (options.length !== 4) return;
  push({
    section: "文法 (N5 Grammar)",
    subtype: "問題5：形容詞の形 (Adjective Forms)",
    lesson: LESSON,
    prompt: "「" + s + "」の" + IADJ_FORM[form].label + "は　どれですか。",
    options,
    answer: 0,
    kana: options[0],
    exp_en: "「" + s + "」 (" + entry.meaning + ") → " + IADJ_FORM[form].label + " 「" + options[0] + "」.",
    exp_bn: "「" + s + "」-এর " + IADJ_FORM[form].bn + " হলো 「" + options[0] + "」。"
  });
}

function naAdjItem(entry, form) {
  const s = entry.word;
  const forms = {
    neg: [s + "じゃない", s + "くない", s + "かない", s + "だじゃない"],
    past: [s + "だった", s + "かった", s + "だだった", s + "だったです"],
    pastneg: [s + "じゃなかった", s + "くなかった", s + "じゃないかった", s + "だったじゃない"]
  };
  const options = uniq(forms[form]).slice(0, 4);
  if (options.length !== 4) return;
  push({
    section: "文法 (N5 Grammar)",
    subtype: "問題5：形容詞の形 (Adjective Forms)",
    lesson: LESSON,
    prompt: "「" + s + "」の" + NADJ_FORM[form].label + "は　どれですか。",
    options,
    answer: 0,
    kana: options[0],
    exp_en: "「" + s + "」 (" + entry.meaning + ") → " + NADJ_FORM[form].label + " 「" + options[0] + "」.",
    exp_bn: "「" + s + "」-এর " + NADJ_FORM[form].bn + " হলো 「" + options[0] + "」。"
  });
}

function fillItem(line) {
  const [sentence, correct, w1, w2, w3, tag] = line.split("|");
  const rule = RULES[tag] || RULES.wa;
  const options = uniq([correct, w1, w2, w3]);
  if (options.length !== 4) return;
  const full = sentence.replace("＿", correct);
  push({
    section: "文法 (N5 Grammar)",
    subtype: "問題5：文法形式 (Sentence Fill)",
    lesson: LESSON,
    prompt: sentence,
    options,
    answer: 0,
    kana: full,
    exp_en: rule.en + " Answer: 「" + correct + "」.",
    exp_bn: rule.bn + " সঠিক উত্তর: 「" + correct + "」。"
  });
}

function starItem(line) {
  const [before, after, chunks, starPos] = line.split("|");
  const ordered = chunks.split(",");
  if (ordered.length !== 4) return;
  const pos = Number(starPos);
  if (!(pos >= 0 && pos <= 3)) return;
  const full = before + ordered.join("") + after;
  push({
    section: "文法 (N5 Grammar)",
    subtype: "問題6：並べ替え (Word Order)",
    lesson: LESSON,
    prompt: "次の言葉を並べたとき、★に入るものはどれですか。",
    options: ordered.slice(),
    answer: pos,
    kana: full,
    starData: { before, after, ordered, starPos: pos },
    exp_en: "Correct sentence: 「" + full + "」 — ★ is 「" + ordered[pos] + "」.",
    exp_bn: "সঠিক বাক্য: 「" + full + "」 — ★ = 「" + ordered[pos] + "」。"
  });
}

function counterItems() {
  const make = (label, mapping, frame) => {
    const entries = Object.keys(mapping);
    entries.forEach((num) => {
      const correct = mapping[num];
      const others = shuffle(entries.filter((n) => n !== num && mapping[n] !== correct)).slice(0, 3).map((n) => mapping[n]);
      const options = [correct].concat(others);
      if (options.length !== 4 || new Set(options).size !== 4) return;
      push({
        section: "文字・語彙 (N5 Vocabulary & Kanji)",
        subtype: "問題3：数え方 (Counters & Readings)",
        lesson: LESSON,
        prompt: "「" + num + label + "」の読み方は　どれですか。",
        options,
        answer: 0,
        kana: correct,
        exp_en: "「" + num + label + "」 is read 「" + correct + "」 (" + frame + ").",
        exp_bn: "「" + num + label + "」 পড়া হয় 「" + correct + "」。"
      });
    });
  };
  counters.counters.forEach((c) => make(c.kanji, c.readings, c.name));
  make("月", counters.months, "month of the year");
  make("日", counters.dates, "day of the month");
  make("時", counters.hours, "o'clock");
  make("分", counters.minutes, "minutes");
}

function readingItems() {
  const kinds = {};
  reading.forEach((p) => p.qs.forEach((line) => {
    const [, answer, kind] = line.split("|");
    if (!kinds[kind]) kinds[kind] = [];
    kinds[kind].push(answer);
  }));
  Object.keys(kinds).forEach((k) => { kinds[k] = uniq(kinds[k]); });

  reading.forEach((p) => {
    p.qs.forEach((line) => {
      const [question, answer, kind] = line.split("|");
      const pool = (kinds[kind] || []).filter((a) => a !== answer && p.t.indexOf(a) === -1);
      const options = [answer].concat(shuffle(pool).slice(0, 3));
      if (options.length !== 4 || new Set(options).size !== 4) return;
      const sentences = p.t.split("。").map((s) => s + "。");
      const support = sentences.find((s) => s.indexOf(answer) !== -1) || p.t;
      push({
        section: "読解 (N5 Reading Comprehension)",
        subtype: "問題7：読解 (Reading)",
        lesson: LESSON,
        passage: p.t,
        prompt: question,
        options,
        answer: 0,
        kana: "",
        exp_en: "The passage says: 「" + support + "」 Answer: 「" + answer + "」.",
        exp_bn: "অনুচ্ছেদে বলা হয়েছে: 「" + support + "」 সঠিক উত্তর: 「" + answer + "」。"
      });
    });
  });
}

/* ------------------------------------------------------------------ build */

const pool = parseWords();
const verbList = parseVerbs();
const wordPool = pool.concat(verbList.map((v) => ({ word: v.dict, reading: v.reading, meaning: v.meaning, pos: "v" })));

const groups = {
  kanji_reading: [],
  orthography: [],
  meaning: [],
  verb_te: [],
  verb_nai: [],
  verb_ta: [],
  verb_masu: [],
  iadj: [],
  naadj: [],
  fill: [],
  star: [],
  counter: [],
  reading: []
};

function collect(key, fn) {
  const before = questions.length;
  fn();
  groups[key].push.apply(groups[key], questions.slice(before));
  questions.length = before;
  // remove these prompts from the dedupe set so other groups can still use them
  groups[key].slice().forEach((q) => seenPrompts.delete((q.passage || "") + "|" + q.prompt));
}

wordPool.forEach((w) => collect("kanji_reading", () => readingItem(w, wordPool)));
wordPool.forEach((w) => collect("orthography", () => orthographyItem(w, wordPool)));
wordPool.forEach((w) => collect("meaning", () => meaningItem(w, wordPool)));

const drillVerbs = [];
const seenMasu = new Set();
verbList.filter((v) => v.dict !== "ある").forEach((v) => {
  if (seenMasu.has(v.masu)) return; // 降る and 降りる share 降ります
  seenMasu.add(v.masu);
  drillVerbs.push(v);
});

drillVerbs.forEach((v) => {
  collect("verb_te", () => verbItem(v, "te"));
  collect("verb_nai", () => verbItem(v, "nai"));
  collect("verb_ta", () => verbItem(v, "ta"));
  collect("verb_masu", () => verbItem(v, "masu"));
});

wordPool.filter((w) => w.pos === "i").forEach((w) => {
  ["neg", "past", "pastneg"].forEach((f) => collect("iadj", () => iAdjItem(w, f)));
});
wordPool.filter((w) => w.pos === "na").forEach((w) => {
  ["neg", "past", "pastneg"].forEach((f) => collect("naadj", () => naAdjItem(w, f)));
});

grammar.fill.forEach((line) => collect("fill", () => fillItem(line)));
grammar.star.forEach((line) => collect("star", () => starItem(line)));
collect("counter", counterItems);
collect("reading", readingItems);

/* quotas keep the mix close to a real paper: 40% vocabulary, 30% grammar,
   30% reading. Leftovers fill any shortfall so the bank is exactly 2,000. */
const QUOTA = {
  kanji_reading: 300,
  orthography: 260,
  meaning: 430,
  verb_te: 90,
  verb_nai: 90,
  verb_ta: 90,
  verb_masu: 90,
  iadj: 150,
  naadj: 42,
  fill: 88,
  star: 20,
  counter: 90,
  reading: 150
};

const chosen = [];
const used = new Set();
Object.keys(QUOTA).forEach((key) => {
  const items = shuffle(groups[key]).slice(0, QUOTA[key]);
  items.forEach((q) => { chosen.push(q); used.add(q); });
});

const leftovers = [];
Object.keys(groups).forEach((key) => {
  groups[key].forEach((q) => { if (!used.has(q)) leftovers.push(q); });
});
shuffle(leftovers).forEach((q) => { if (chosen.length < TARGET) { chosen.push(q); used.add(q); } });

if (chosen.length !== TARGET) {
  console.error("Only " + chosen.length + " questions could be built; need " + TARGET + ".");
  const supply = Object.keys(groups).map((k) => k + "=" + groups[k].length).join(" ");
  console.error("Supply: " + supply);
  process.exit(1);
}

/* ------------------------------------------------------------------ write */

/* Stable shuffle of every option list so the correct answer is spread across
   A–D instead of always sitting first in the committed data. */
const dist = [0, 0, 0, 0];
chosen.forEach((q) => {
  const correctText = q.starData ? q.starData.ordered[q.starData.starPos] : q.options[q.answer];
  const opts = shuffle(q.options.slice());
  const idx = opts.indexOf(correctText);
  if (idx !== -1) {
    q.options = opts;
    q.answer = idx;
    dist[idx] += 1;
  }
});

function esc(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

const lines = [];
lines.push("/* Generated by tools/build-n5-bank.js — do not edit by hand.");
lines.push("   2,000 local JLPT N5 questions built from the curated data in tools/data.");
lines.push("   Regenerate with: node tools/build-n5-bank.js */");
lines.push("window.JLPT_BANKS = window.JLPT_BANKS || {};");
lines.push("window.JLPT_BANKS.N5 = (window.JLPT_BANKS.N5 || []).concat([");
const entries = [];
chosen.forEach((q) => {
  const parts = [];
  ["section", "subtype", "lesson", "passage", "prompt", "kana", "exp_en", "exp_bn"].forEach((k) => {
    if (q[k] != null && q[k] !== "") parts.push(k + ': "' + esc(q[k]) + '"');
  });
  parts.push("options: [" + q.options.map((o) => '"' + esc(o) + '"').join(", ") + "]");
  parts.push("answer: " + q.answer);
  if (q.starData) {
    parts.push('starData: { before: "' + esc(q.starData.before) + '", after: "' + esc(q.starData.after) +
      '", ordered: [' + q.starData.ordered.map((o) => '"' + esc(o) + '"').join(", ") + "], starPos: " + q.starData.starPos + " }");
  }
  entries.push("  {\n    " + parts.join(",\n    ") + "\n  }");
});
lines.push(entries.join(",\n"));
lines.push("]);");
lines.push("");

fs.writeFileSync(OUT, lines.join("\n"), "utf8");

const byType = {};
chosen.forEach((q) => {
  const k = q.prompt.length ? q.subtype : "unknown";
  byType[k] = (byType[k] || 0) + 1;
});
const bySection = {};
chosen.forEach((q) => { bySection[q.section] = (bySection[q.section] || 0) + 1; });

console.log("Wrote " + chosen.length + " questions to " + path.relative(ROOT, OUT) + " (" +
  Math.round(fs.statSync(OUT).size / 1024) + " KB)");
console.log("Sections: " + Object.keys(bySection).map((k) => k + " " + bySection[k]).join(" · "));
console.log("Supply: " + Object.keys(groups).map((k) => k + "=" + groups[k].length).join(" "));

if (process.argv.includes("--report")) {
  console.log("\nBy subtype:");
  Object.keys(byType).sort().forEach((k) => console.log("  " + k + ": " + byType[k]));
  const answers = [0, 0, 0, 0];
  chosen.forEach((q) => { answers[q.answer] += 1; });
  console.log("Answer positions: " + answers.join(" / "));
}
