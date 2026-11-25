#!/usr/bin/env python3
"""Scrape JLPT N5 practice exercises from japanesetest4you.com.

The site sits behind Cloudflare, so pages are fetched through r.jina.ai's
HTML renderer, which also keeps the hidden "Answer Key:" block. Raw HTML is
cached under tools/cache/jt4y/ so a re-run needs no network.

Output: tools/data/jt4y-n5.json
"""
import html
import json
import os
import re
import time
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(ROOT, "cache", "jt4y")
OUT = os.path.join(ROOT, "data", "jt4y-n5.json")
BASE = "https://japanesetest4you.com"

CATEGORIES = {
    "vocabulary-test": ("vocabulary", "文字・語彙 (N5 Vocabulary & Kanji)", "語彙 (Vocabulary)"),
    "kanji-test": ("kanji", "文字・語彙 (N5 Vocabulary & Kanji)", "漢字 (Kanji)"),
    "grammar-test": ("grammar", "文法 (N5 Grammar)", "文法 (Grammar)"),
    "reading-tests": ("reading", "読解 (N5 Reading)", "読解 (Reading)"),
}


def get(url, cache_name, strip_format=True):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, cache_name)
    if os.path.exists(path) and os.path.getsize(path) > 2000:
        return open(path, encoding="utf-8", errors="replace").read()
    target = "https://r.jina.ai/" + url
    req = urllib.request.Request(target, headers={"X-Return-Format": "html"})
    last = None
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                body = r.read().decode("utf-8", "replace")
            if len(body) < 2000:
                raise IOError("short response")
            open(path, "w", encoding="utf-8").write(body)
            time.sleep(1.2)
            return body
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(8 * (attempt + 1))
    raise IOError(f"{url}: {last}")


def text_of(fragment):
    fragment = re.sub(r"<br\s*/?>", " ", fragment)
    fragment = re.sub(r"<[^>]+>", "", fragment)
    return re.sub(r"\s+", " ", html.unescape(fragment)).strip()


def parse_page(page_html, url, section, subtype):
    questions = []
    # Question blocks: a paragraph holding <input name="questN" ...> radios.
    for m in re.finditer(r'<p[^>]*>((?:(?!</p>).)*?name="quest(\d+)"(?:(?!</p>).)*)</p>', page_html, re.S):
        block, num = m.group(1), int(m.group(2))
        first = block.find("<input")
        stem = text_of(block[:first])
        options = [text_of(o) for o in re.findall(r'type="radio"[^>]*>([^<]*)', block)]
        options = [o for o in options if o]
        if not stem or len(options) != 4:
            continue
        questions.append({"num": num, "stem": stem, "options": options, "url": url,
                          "section": section, "subtype": subtype})
    # Answer key: "Question 7: 3 (highlighted text …)"
    key = {}
    for m in re.finditer(r'Question\s+(\d+):\s*([1-4])\s*\((.*?)\)(?=<br|</p>|$)', page_html, re.S):
        num, idx = int(m.group(1)), int(m.group(2)) - 1
        inside = m.group(3)
        hl = re.search(r"<mark[^>]*>(.*?)</mark>", inside, re.S)
        key[num] = (idx, text_of(hl.group(1)) if hl else text_of(inside))
    for q in questions:
        if q["num"] not in key:
            continue
        idx, ans_text = key[q["num"]]
        if not (0 <= idx < 4):
            continue
        norm = lambda s: re.sub(r"[\s　]+", "", s)
        # Trust the index; if the highlighted text names another option, prefer that.
        if ans_text and norm(q["options"][idx]) != norm(ans_text):
            for i, o in enumerate(q["options"]):
                if norm(o) == norm(ans_text):
                    idx = i
                    break
        q["answer"] = idx
        q["answer_text"] = ans_text
        del q["num"]
    return [q for q in questions if "answer" in q]


def category_links(cat, page_html):
    pat = re.compile(re.escape(BASE) + r"/japanese-language-proficiency-test-jlpt-n5-" + cat + r"-[a-z0-9-]*", re.I)
    links = []
    for u in pat.findall(page_html):
        u = u.rstrip("/")
        if u not in links and not u.endswith("-test"):
            links.append(u)
    return links


def slugify(url):
    return re.sub(r"[^a-z0-9]+", "-", url.rsplit("/", 1)[-1].lower()).strip("-")


def main():
    all_q = []
    for slug, (cat, section, subtype) in CATEGORIES.items():
        try:
            cat_html = get(f"{BASE}/category/jlpt-n5/jlpt-n5-{slug}/", f"cat-{cat}.html")
        except Exception as exc:  # noqa: BLE001
            print(f"category {cat} failed: {exc}")
            continue
        links = category_links(cat, cat_html)
        print(f"{cat}: {len(links)} exercise pages")
        for url in links:
            try:
                page = get(url, slugify(url) + ".html")
            except Exception as exc:  # noqa: BLE001
                print(f"  skip {url}: {exc}")
                continue
            qs = parse_page(page, url, section, subtype)
            print(f"  {len(qs):2d} q  {url.rsplit('/', 1)[-1]}")
            all_q.extend(qs)

    seen, uniq = set(), []
    for q in all_q:
        k = re.sub(r"[\s　]+", "", q["stem"])
        if k in seen:
            continue
        seen.add(k)
        uniq.append(q)
    json.dump(uniq, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"saved {len(uniq)} unique questions -> {OUT}")


if __name__ == "__main__":
    main()
