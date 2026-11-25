#!/usr/bin/env python3
"""Build js/data/bank-n5-web.js from questions collected on the web.

Inputs (cached under tools/cache/web and tools/data):
  cache/web/nihonez/*.json      nihonez.com N5 mock papers (via HosnainRafi pack)
  cache/web/minnanihongo/**     minnanihongo.com N5 quizzes
  data/jt4y-n5.json             japanesetest4you.com N5 exercises
  data/challenge-jlpt-n5.json   challenge-jlpt.com N5 question API

Output items follow the app schema used by js/data/bank-n5*.js.
"""
import glob
import json
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "..", "js", "data", "bank-n5-web.js")

SEC_VOCAB = "文字・語彙 (N5 Vocabulary & Kanji)"
SEC_GRAM = "文法 (N5 Grammar)"
SEC_READ = "読解 (N5 Reading)"

NIHONEZ_SUBTYPE = {
    "kanji-reading": "問題1 漢字読み",
    "orthography": "問題2 表記",
    "contextually-defined-expressions": "問題3 文脈規定",
    "paraphrases": "問題4 言い換え",
    "sentential-grammar-1": "文法 問題1 文法形式",
    "sentential-grammar-2": "文法 問題2 文の組み立て",
    "text-grammar": "文法 問題3 文章の文法",
    "comprehension-short": "読解 問題1 短文",
    "comprehension-medium": "読解 問題2 中文",
    "information-retrieval": "読解 問題3 情報検索",
}
QUIZ_SUBTYPE = {
    "vocabulary": ("vocabulary", "語彙 (Vocabulary)"),
    "kanji": ("vocabulary", "漢字 (Kanji)"),
    "grammar": ("grammar", "文法 (Grammar)"),
    "reading": ("reading", "読解 (Reading)"),
}


def clean_md(text):
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text or "")
    text = re.sub(r"[💡❌✅]", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def norm(s):
    return re.sub(r"[\s　・、。,.!?！？_＿]+", "", s or "")


def furigana_pairs():
    """base → reading pairs verified in js/data/furigana.js plus the curated word lists."""
    script = (
        "const fs=require('fs'),vm=require('vm');"
        "const sb={window:{}};"
        "vm.runInNewContext(fs.readFileSync('js/data/furigana.js','utf8'),sb);"
        "const pairs=(sb.window.JLPT_FURIGANA_PAIRS||[]).slice();"
        "for(const f of ['tools/data/n5-words.js','tools/data/n5-verbs.js']){"
        " for(const line of require(process.cwd()+'/'+f)){"
        "  const p=line.split('|'); if(p[0]&&p[1]) pairs.push([p[0],p[1]]);}}"
        "process.stdout.write(JSON.stringify(pairs));"
    )
    out = subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True)
    pairs = [(p[0], p[1]) for p in json.loads(out.stdout) if len(p) >= 2]
    pairs += [("週間", "しゅうかん"), ("年間", "ねんかん"), ("週間後", "しゅうかんあと")]
    # Verb stems: 帰る / かえる also gives 帰 / かえ, the form the flattened ruby uses.
    for base, reading in list(pairs):
        m = re.match(r"^([\u4e00-\u9fff]+)([\u3040-\u309f]*)$", base)
        if m and m.group(2) and reading.endswith(m.group(2)):
            pairs.append((m.group(1), reading[: -len(m.group(2))]))
    return pairs


KANJI_RUN = re.compile(r"[\u4e00-\u9fff]+")
KANA_AFTER_KANJI = re.compile(r"([\u4e00-\u9fff]+)([\u3040-\u309f]{2,})")


def ungarble(text, pairs):
    """Undo ruby flattened as base+reading (国くに → 国, 帰かえります → 帰ります).

    Only a reading that is a prefix of the kana run after a kanji run is removed,
    so ordinary okurigana (食べます, 書きます) is left alone.
    """
    if not text:
        return text
    by_base = {}
    for base, reading in pairs:
        if base and reading and KANJI_RUN.fullmatch(base):
            by_base.setdefault(base, set()).add(reading)
    for _ in range(4):
        changed = False
        for m in list(KANA_AFTER_KANJI.finditer(text)):
            kanji, kana = m.group(1), m.group(2)
            for size in range(len(kanji), 0, -1):
                base = kanji[-size:]
                for reading in sorted(by_base.get(base, ()), key=len, reverse=True):
                    if len(reading) >= 2 and kana.startswith(reading):
                        start = m.start(1) + len(kanji) - size
                        empty = ""
                        text = text[:start] + base + empty + text[start + size + len(reading):]
                        changed = True
                        break
                if changed:
                    break
            if changed:
                break
        if not changed:
            break
    return text


def clean(s):
    """Plain text for the app: drop ruby readings and every HTML tag."""
    s = re.sub(r"<rt>.*?</rt>", "", s or "", flags=re.S)
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"[ \t]{2,}", " ", s).strip()


def prompt_key(prompt, passage=""):
    """One key form for every bank, so prompts compare across sources.

    The validator keys on `passage + "|" + prompt` with whitespace removed.
    Markup and ruby annotations are stripped here so a plain-text copy from a
    site matches the tagged copy already shipped.
    """
    text = (passage or "") + "|" + (prompt or "")
    text = re.sub(r"<rt>.*?</rt>", "", text, flags=re.S)
    text = re.sub(r"<[^>]+>", "", text)
    return norm(text)


def garbled(text, pairs):
    """True when `ungarble()` could not undo a flattened ruby (国くに left in the text).

    A reading that still sits right after its own kanji base means the scrub
    missed it, so the item is dropped rather than shipped half-garbled.
    """
    if not text:
        return False
    for base, reading in pairs:
        if base and reading and len(reading) >= 2 and (base + reading) in text:
            return True
    return False


def valid(item):
    if not item["prompt"].strip() or len(item["options"]) != 4:
        return False
    opts = [o.strip() for o in item["options"]]
    if any(not o for o in opts) or len(set(opts)) != 4:
        return False
    if any(re.search(r"\.(png|jpe?g|gif|svg|webp)", o, re.I) for o in opts):
        return False
    return 0 <= item["answer"] < 4


def add(items, section, subtype, prompt, options, answer, exp_en, source, passage=""):
    item = {"section": section, "subtype": subtype, "lesson": "", "prompt": prompt,
            "options": options, "answer": int(answer), "kana": "",
            "exp_en": exp_en, "exp_bn": "", "source": source}
    if passage:
        item["passage"] = passage
    if valid(item):
        items.append(item)


def from_nihonez(items):
    for f in sorted(glob.glob(os.path.join(ROOT, "cache", "web", "nihonez", "*.json"))):
        d = json.load(open(f))
        qs = d["questions"]
        i = 0
        for sec in d.get("sections", []):
            for sub in sec.get("subsections", []):
                n = (sub.get("question_to") or 0) - (sub.get("question_from") or 0) + 1
                qtype = sub.get("question_type") or ""
                for q in qs[i:i + n]:
                    if sub.get("category") == "listening" or q.get("audio"):
                        continue
                    opts = [o.get("text", "") for o in (q.get("options") or [])]
                    try:
                        ans = int(q.get("correct_answer")) - 1
                    except (TypeError, ValueError):
                        continue
                    prompt = q.get("html") or q.get("text") or ""
                    prompt = re.sub(r'style="[^"]*"', "", prompt)
                    sec_label = {"vocabulary": SEC_VOCAB, "reading": SEC_READ}.get(sub.get("category"), SEC_GRAM)
                    add(items, sec_label, NIHONEZ_SUBTYPE.get(qtype, qtype), prompt, opts, ans,
                        clean_md(q.get("explanation")), "nihonez.com · " + d["meta"]["title"])
                i += n


def from_quizzes(items):
    for f in sorted(glob.glob(os.path.join(ROOT, "cache", "web", "minnanihongo", "*", "*.json"))):
        cat = os.path.basename(os.path.dirname(f))
        d = json.load(open(f))
        # One vocabulary quiz is filed under reading/ on the site; the title is
        # the reliable label, so prefer it when it names a different skill.
        title = (d.get("meta") or {}).get("title", "")
        for name in ("Vocabulary", "Kanji", "Grammar", "Reading"):
            if re.search(name, title, re.I):
                cat = name.lower()
                break
        if cat == "listening" or cat not in QUIZ_SUBTYPE:
            continue
        sec, subtype = QUIZ_SUBTYPE[cat]
        sec_label = {"vocabulary": SEC_VOCAB, "reading": SEC_READ}.get(sec, SEC_GRAM)
        for q in d.get("questions", []):
            choices = q.get("choices") or []
            ca = (q.get("correct_answer") or "").strip()
            ans = None
            for idx, c in enumerate(choices):
                if c.strip() == ca:
                    ans = idx
                    break
            if ans is None:
                for idx, c in enumerate(choices):
                    if norm(c) == norm(ca):
                        ans = idx
                        break
            if ans is None:
                continue
            add(items, sec_label, subtype,
                q.get("prompt") or "", choices, ans,
                clean_md(q.get("explanation")), "minnanihongo.com · " + d["meta"]["title"])


def from_challenge(items):
    path = os.path.join(ROOT, "data", "challenge-jlpt-n5.json")
    if not os.path.exists(path):
        return
    for q in json.load(open(path)):
        add(items, q["section"], q["subtype"], q["prompt"], q["options"], q["answer"],
            clean_md(q.get("exp_en")), q["source"])


def from_jt4y(items):
    path = os.path.join(ROOT, "data", "jt4y-n5.json")
    if not os.path.exists(path):
        return
    for q in json.load(open(path)):
        stem = re.sub(r"^\s*\d+\.\s*", "", q["stem"]).strip()
        exp = "The answer is 「%s」." % q["options"][q["answer"]]
        if q.get("answer_text") and norm(q["answer_text"]) != norm(q["options"][q["answer"]]):
            exp += " (answer key: %s)" % q["answer_text"]
        slug = q["url"].rsplit("/", 1)[-1]
        # The scraped file tags every jt4y item 文法・読解, which sectionKey reads
        # as reading; the page name says which skill the exercise really tests.
        section = q["section"]
        if re.search(r"reading-exercise", slug):
            section = SEC_READ
        elif re.search(r"(grammar|vocabulary|kanji)-exercise", slug):
            section = SEC_GRAM if "grammar" in slug else SEC_VOCAB
        add(items, section, q["subtype"], stem, q["options"], q["answer"], exp,
            "japanesetest4you.com · " + slug, q.get("passage", ""))


def bank_prompts():
    """Prompt keys already shipped in the other N5 banks, so the app never repeats one.

    The bank files are JS object literals (unquoted keys, multi-line), so they are
    evaluated with Node rather than parsed line by line.
    """
    # Load order matters: bank-n5.js assigns `window.JLPT_BANKS.N5` while the
    # larger banks concat onto it, exactly as index.html loads them.
    files = [os.path.join(ROOT, "..", "js", "data", name) for name in (
        "bank-n5.js", "bank-n5-large.js", "bank-n5-past.js",
        "bank-n5-2021-12.js", "bank-n4.js")]
    files = [p for p in files if os.path.exists(p)]
    script = (
        "const fs=require('fs'),vm=require('vm'),path=require('path');"
        "const sb={window:{}};"
        "for(const f of process.argv.slice(1))"
        " vm.runInNewContext(fs.readFileSync(f,'utf8'),sb,{filename:f});"
        "const out=[];for(const b of Object.values(sb.window.JLPT_BANKS||{}))"
        " for(const q of b||[]) out.push([q.prompt||'',q.passage||'']);"
        "process.stdout.write(JSON.stringify(out));"
    )
    result = subprocess.run(["node", "-e", script] + files, capture_output=True, text=True, check=True)
    keys = set()
    for prompt, passage in json.loads(result.stdout):
        keys.add(prompt_key(prompt, passage))
    return keys


def main():
    items = []
    from_nihonez(items)
    n1 = len(items)
    from_quizzes(items)
    n2 = len(items)
    from_jt4y(items)
    n3 = len(items)
    from_challenge(items)

    pairs = furigana_pairs()
    seen = bank_prompts()
    skipped = 0
    garbled_dropped = 0
    uniq = []
    for it in items:
        for field in ("prompt", "passage", "explanation", "exp_en", "exp_bn"):
            if it.get(field):
                it[field] = clean(ungarble(it[field], pairs))
        it["options"] = [clean(ungarble(o, pairs)) for o in it.get("options", [])]
        texts = [it["prompt"], it.get("passage", ""), it.get("exp_en", ""), *it.get("options", [])]
        if any(garbled(t, pairs) for t in texts):
            garbled_dropped += 1
            continue
        k = prompt_key(it["prompt"], it.get("passage"))
        if k in seen:
            skipped += 1
            continue
        seen.add(k)
        uniq.append(it)

    lines = [
        "/* JLPT N5 questions collected from the web (tools/build-web-bank.py).",
        "   Sources: nihonez.com N5 mock papers, minnanihongo.com N5 quizzes,",
        "   japanesetest4you.com N5 exercises, challenge-jlpt.com N5 pool.",
        "   Duplicates already present in the other N5 banks are dropped.",
        "   Regenerate with: python3 tools/scrape-jt4y.py && python3 tools/scrape-challenge-jlpt.py",
        "   && python3 tools/build-web-bank.py */",
        'window.JLPT_BANKS = window.JLPT_BANKS || {};',
        'window.JLPT_BANKS.N5 = (window.JLPT_BANKS.N5 || []).concat([',
    ]
    for it in uniq:
        lines.append("  " + json.dumps(it, ensure_ascii=False) + ",")
    lines += ["]);", ""]
    open(OUT, "w", encoding="utf-8").write("\n".join(lines))
    print(f"nihonez {n1}, quizzes {n2-n1}, jt4y {n3-n2}, challenge {len(items)-n3}, "
          f"dropped as existing/duplicate {skipped}, dropped as garbled {garbled_dropped}, "
          f"unique {len(uniq)} -> {OUT}")


if __name__ == "__main__":
    main()
