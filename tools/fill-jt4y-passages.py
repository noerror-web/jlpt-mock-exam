#!/usr/bin/env python3
"""Recover the reading passages japanesetest4you pages carry above each question.

The original scrape kept only question stems, so every jt4y 読解 item reached the
app without a passage and loadBank dropped it. The cached pages still hold the
text, so this pass walks them, pairs each question with the passage above it and
writes the passage into tools/data/jt4y-n5.json.

Run with: python3 tools/fill-jt4y-passages.py
"""
import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data", "jt4y-n5.json")
CACHE = os.path.join(ROOT, "cache", "jt4y")

PASSAGE_HEAD = re.compile(r"^Reading Passage\s+\d+\s*$", re.I)
QUESTION = re.compile(r"^(\d+)\.\s*(.+)$")
ANSWER_KEY = re.compile(r"^Answer Key", re.I)


def norm(text):
    return re.sub(r"[\s　・、。,.!?！？_＿()（）]+", "", text or "")


def page_lines(path):
    with open(path, encoding="utf-8") as fh:
        html = fh.read()
    body = re.sub(r"<script[\s\S]*?</script>", "", html)
    body = re.sub(r"<style[\s\S]*?</style>", "", body)
    body = re.sub(r"<br\s*/?>", "\n", body, flags=re.I)
    body = re.sub(r"</(p|div|li|h\d)>", "\n", body, flags=re.I)
    body = re.sub(r"<[^>]+>", "", body)
    body = body.replace("&nbsp;", " ").replace("&gt;", ">").replace("&lt;", "<").replace("&amp;", "&")
    return [line.strip() for line in body.split("\n") if line.strip()]


def passages_by_stem():
    """page slug → {stem: passage}, for every cached page with reading passages.

    Keyed per page so two exercises that reuse a stem such as
    「（ア）には何を入れますか。」 never steal each other's passage.
    """
    found = {}
    for path in sorted(glob.glob(os.path.join(CACHE, "*.html"))):
        lines = page_lines(path)
        if not any(PASSAGE_HEAD.match(line) for line in lines):
            continue
        page = found.setdefault(os.path.basename(path)[:-5], {})
        passage, collecting = [], False
        i = 0
        while i < len(lines):
            line = lines[i]
            if ANSWER_KEY.match(line):
                break
            if PASSAGE_HEAD.match(line):
                passage, collecting = [], True
                i += 1
                continue
            m = QUESTION.match(line)
            if m and passage:
                stem = m.group(2).strip()
                page.setdefault(norm(stem), "\n".join(passage))
                i += 1
                # skip this question's four options
                skipped = 0
                while i < len(lines) and skipped < 4:
                    nxt = lines[i]
                    if QUESTION.match(nxt) or PASSAGE_HEAD.match(nxt) or ANSWER_KEY.match(nxt):
                        break
                    skipped += 1
                    i += 1
                continue
            if collecting and not QUESTION.match(line):
                passage.append(line)
            i += 1
    return found


def main():
    items = json.load(open(DATA, encoding="utf-8"))
    by_page = passages_by_stem()
    filled = 0
    for item in items:
        if item.get("passage"):
            continue
        page = by_page.get(item.get("url", "").rsplit("/", 1)[-1], {})
        stem = re.sub(r"^\s*\d+\.\s*", "", item.get("stem", ""))
        passage = page.get(norm(stem))
        if passage:
            item["passage"] = passage
            filled += 1
            # A "Question N" placeholder is no question at all: with the passage
            # in hand it becomes a normal main-idea item instead of a bare label.
            if re.fullmatch(r"Question\s+\d+", stem):
                item["stem"] = "文章の内容と合っているものはどれですか。"
    json.dump(items, open(DATA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("passages recovered: %d of %d items" % (filled, len(items)))


if __name__ == "__main__":
    main()
