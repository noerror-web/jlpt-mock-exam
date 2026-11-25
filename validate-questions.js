#!/usr/bin/env node
/**
 * Question bank validator.
 * Run with: node validate-questions.js
 *
 * Checks js/data/bank-n5.js, js/data/bank-n5-large.js, js/data/bank-n5-past.js,
 * js/data/bank-n5-2021-12.js, js/data/bank-n5-web.js and js/data/bank-n4.js for:
 *   - exactly four distinct options and an answer index in range
 *   - required fields (prompt, options, answer)
 *   - star-ordering questions consistent (ordered/starPos/answer)
 *   - duplicate prompts (within and across banks)
 *   - empty banks, and the generated N5 bank holding exactly 2,000 items
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadBank(files) {
  const sandbox = { window: {} };
  [].concat(files).forEach((file) => {
    const code = fs.readFileSync(path.join(__dirname, file), "utf8");
    vm.runInNewContext(code, sandbox, { filename: file });
  });
  return sandbox.window.JLPT_BANKS || {};
}

function checkBank(name, questions, errors) {
  if (!Array.isArray(questions) || questions.length === 0) {
    errors.push(`${name}: bank is missing or empty`);
    return 0;
  }

  const seen = new Set();
  questions.forEach((q, index) => {
    const where = `${name}[${index}]`;
    if (!q || typeof q !== "object") { errors.push(`${where}: not an object`); return; }
    const hasStar = !!(q.starData && Array.isArray(q.starData.ordered));
    if (!hasStar && (typeof q.prompt !== "string" || !q.prompt.trim())) {
      errors.push(`${where}: missing prompt`);
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      errors.push(`${where}: must have exactly 4 options`);
    } else {
      if (new Set(q.options.map((o) => String(o).trim())).size !== 4) errors.push(`${where}: duplicate options`);
      if (q.options.some((o) => typeof o !== "string" || !o.trim())) errors.push(`${where}: empty option`);
    }
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) errors.push(`${where}: answer index out of range`);

    if (hasStar) {
      const s = q.starData;
      if (typeof s.before !== "string" || typeof s.after !== "string") errors.push(`${where}: star question needs before/after text`);
      if (!Array.isArray(s.ordered) || s.ordered.length !== 4) errors.push(`${where}: star ordering needs 4 words`);
      else {
        if (!Number.isInteger(s.starPos) || s.starPos < 0 || s.starPos > 3) errors.push(`${where}: starPos out of range`);
        else if (Array.isArray(q.options) && q.options[q.answer] !== s.ordered[s.starPos]) {
          errors.push(`${where}: the marked answer is not the word at the ★ position`);
        }
      }
    }

    const promptKey = (q.passage ? q.passage + "|" : "") +
      (typeof q.prompt === "string" ? q.prompt : "") +
      (hasStar ? "|" + q.starData.before + q.starData.after + q.starData.ordered.join("") : "");
    if (promptKey.replace(/\s+/g, "").length > 0) {
      const key = promptKey.replace(/\s+/g, "");
      if (seen.has(key)) errors.push(`${where}: duplicate prompt "${promptKey.slice(0, 30)}…"`);
      seen.add(key);
    }
  });
  return questions.length;
}

const errors = [];
const largeOnly = loadBank("js/data/bank-n5-large.js");
const large = checkBank("N5-large", largeOnly.N5, errors);
if (large !== 2000) errors.push(`N5-large: expected 2000 questions, found ${large}`);

const banks = loadBank(["js/data/bank-n5.js", "js/data/bank-n5-large.js", "js/data/bank-n5-past.js", "js/data/bank-n5-2021-12.js", "js/data/bank-n5-web.js"]);
const n5 = checkBank("N5", banks.N5, errors);
const banks4 = loadBank("js/data/bank-n4.js");
const n4 = checkBank("N4", banks4.N4, errors);

const allPrompts = new Set();
[].concat(banks.N5 || [], banks4.N4 || []).forEach((q) => {
  if (!q || typeof q !== "object") return;
  const star = q.starData && Array.isArray(q.starData.ordered)
    ? "|" + (q.starData.before || "") + (q.starData.after || "") + q.starData.ordered.join("") : "";
  const raw = (q.passage ? q.passage + "|" : "") + (typeof q.prompt === "string" ? q.prompt : "") + star;
  const key = raw.replace(/\s+/g, "");
  if (!key) return;
  if (allPrompts.has(key)) errors.push(`cross-level duplicate prompt: "${raw.slice(0, 30)}…"`);
  allPrompts.add(key);
});

if (n5 < 20) errors.push(`N5 bank is small (${n5} questions)`);
if (n4 < 20) errors.push(`N4 bank is small (${n4} questions)`);

if (errors.length) {
  console.error("Question bank validation failed:");
  errors.forEach((message) => console.error("  ✗ " + message));
  process.exit(1);
}

console.log(`Validated ${n5} N5 and ${n4} N4 questions.`);
console.log("✓ All question banks passed validation.");
