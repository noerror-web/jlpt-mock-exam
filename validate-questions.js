#!/usr/bin/env node
/**
 * Developer question bank validator.
 * Validates CORE_QUESTION_BANK_N5 and CORE_QUESTION_BANK_N4 extracted from index.html.
 * Fails on:
 *   - Answer out of range
 *   - Duplicate options
 *   - Repeated-character glitch options (e.g. "行行")
 *   - Duplicate prompts or question IDs
 *   - Missing exp_en, exp_bn, or kana
 */

const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "index.html");
const html = fs.readFileSync(indexPath, "utf8");

// Extract getQuestionId helper
const idMatch = html.match(/function getQuestionId\([\s\S]*?\n  \}/);
if (!idMatch) {
  console.error("FATAL: Could not locate getQuestionId in index.html");
  process.exit(1);
}
const getQuestionId = new Function(idMatch[0] + "; return getQuestionId;")();

// Extract CORE_QUESTION_BANK_N5
const n5Match = html.match(/const CORE_QUESTION_BANK_N5 = (\[[\s\S]*?\n  \]);/);
if (!n5Match) {
  console.error("FATAL: Could not locate CORE_QUESTION_BANK_N5 in index.html");
  process.exit(1);
}
const N5 = eval(n5Match[1]);

// Extract CORE_QUESTION_BANK_N4
const n4Match = html.match(/const CORE_QUESTION_BANK_N4 = (\[[\s\S]*?\n  \]);/);
if (!n4Match) {
  console.error("FATAL: Could not locate CORE_QUESTION_BANK_N4 in index.html");
  process.exit(1);
}
const N4 = eval(n4Match[1]);

function validateBank(name, bank) {
  const errors = [];
  const seenIds = new Set();
  const seenPrompts = new Set();

  bank.forEach((q, idx) => {
    const qLabel = `${name}[${idx}]`;

    // 1. Answer out of range
    if (!Array.isArray(q.options) || q.options.length < 2) {
      errors.push(`${qLabel}: options array missing or has fewer than 2 choices`);
    } else if (typeof q.answer !== "number" || q.answer < 0 || q.answer >= q.options.length) {
      errors.push(`${qLabel}: answer out of range (${q.answer}, options length ${q.options ? q.options.length : 0})`);
    }

    // 2. Duplicate options
    if (Array.isArray(q.options)) {
      if (new Set(q.options).size !== q.options.length) {
        errors.push(`${qLabel}: duplicate options: ${JSON.stringify(q.options)}`);
      }

      // 3. Repeated-character options (e.g. "行行")
      q.options.forEach((opt) => {
        const str = String(opt || "");
        if (str.length >= 2 && /^([^\s])\1+$/.test(str) && !str.includes("々")) {
          errors.push(`${qLabel}: repeated-character glitch option: "${str}"`);
        }
      });
    }

    // 4. Duplicate prompts / IDs
    const qId = getQuestionId(q);
    if (seenIds.has(qId)) {
      errors.push(`${qLabel}: duplicate question ID: "${qId}"`);
    }
    seenIds.add(qId);

    if (q.prompt) {
      if (seenPrompts.has(q.prompt)) {
        errors.push(`${qLabel}: duplicate prompt: "${q.prompt}"`);
      }
      seenPrompts.add(q.prompt);
    }

    // 5. Missing exp_en / exp_bn / kana
    if (!q.exp_en || !String(q.exp_en).trim()) {
      errors.push(`${qLabel}: missing exp_en`);
    }
    if (!q.exp_bn || !String(q.exp_bn).trim()) {
      errors.push(`${qLabel}: missing exp_bn`);
    }
    if (!q.kana || !String(q.kana).trim()) {
      errors.push(`${qLabel}: missing kana`);
    }
  });

  return errors;
}

const n5Errors = validateBank("N5", N5);
const n4Errors = validateBank("N4", N4);
const allErrors = [...n5Errors, ...n4Errors];

console.log(`Validated ${N5.length} N5 questions and ${N4.length} N4 questions.`);

if (allErrors.length > 0) {
  console.error(`❌ Validation failed with ${allErrors.length} error(s):`);
  allErrors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
} else {
  console.log("✅ All questions in core banks passed validation successfully!");
  process.exit(0);
}
