#!/usr/bin/env python3
"""Pull the full JLPT N5 pool from challenge-jlpt.com's public question API.

The site serves its practice sets from POST /api/questions.php. Responses are
cached under tools/cache/web/challenge-jlpt/ so builds are reproducible.

Output: tools/data/challenge-jlpt-n5.json
"""
import json
import os
import time
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(ROOT, "cache", "web", "challenge-jlpt")
OUT = os.path.join(ROOT, "data", "challenge-jlpt-n5.json")
API = "https://challenge-jlpt.com/api/questions.php"

TYPES = {
    "vocabulary": ("文字・語彙 (N5 Vocabulary & Kanji)", "語彙 (Vocabulary)"),
    "grammar": ("文法 (N5 Grammar)", "文法 (Grammar)"),
}


def draw(qtype):
    """One random draw; the API caps every response at 50 items."""
    body = json.dumps({"level": "N5", "type": qtype, "count": 400, "mode": "random"}).encode()
    req = urllib.request.Request(API, data=body, method="POST", headers={
        "Content-Type": "application/json", "Accept": "application/json",
        "User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.loads(r.read().decode("utf-8"))
    if not data.get("ok"):
        raise SystemExit(f"{qtype}: API error {data.get('error')}")
    return data


def fetch(qtype):
    """Accumulate random draws until the whole published pool for the type is held."""
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, qtype + ".json")
    data = {}
    items = {}
    if os.path.exists(path) and os.path.getsize(path) > 2000:
        data = json.load(open(path))
        items = {i["id"]: i for i in data.get("items", [])}
    total = int(data.get("available_count") or 0)
    dry = attempts = 0
    while len(items) < total and attempts < 120 and dry < 8:
        page = draw(qtype)
        total = max(total, int(page.get("available_count") or 0))
        before = len(items)
        for it in page.get("items", []):
            items[it["id"]] = it
        dry = 0 if len(items) > before else dry + 1
        attempts += 1
        print(f"  {qtype}: {len(items)}/{total} after {attempts} draws", flush=True)
        if len(items) < total:
            time.sleep(0.8)
    data.update({"ok": True, "level": "N5", "type": qtype,
                 "available_count": total, "count": len(items),
                 "items": list(items.values())})
    json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False)
    return data


def main():
    out = []
    for qtype, (section, subtype) in TYPES.items():
        data = fetch(qtype)
        items = data.get("items", [])
        print(f"{qtype}: {len(items)} items (available {data.get('available_count')})")
        for q in items:
            choices = [c.strip() for c in q.get("choices") or []]
            prompt = (q.get("question") or "").strip()
            instr = (q.get("instruction") or "").strip()
            if instr and instr not in prompt:
                prompt = instr + " " + prompt
            exp = (q.get("explanation_ja") or "").strip()
            if exp:
                exp = "解説: " + exp
            out.append({
                "section": section, "subtype": subtype, "lesson": "",
                "prompt": prompt, "options": choices,
                "answer": q.get("answer_index"), "kana": "",
                "exp_en": exp, "exp_bn": "",
                "source": f"challenge-jlpt.com · {q.get('id')}",
            })
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"saved {len(out)} -> {OUT}")


if __name__ == "__main__":
    main()
