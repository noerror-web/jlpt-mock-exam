# JLPT Exam Lab

A free JLPT N5 and N4 practice app: timed mock exams with JLPT-style scoring, instant
feedback in English and Bengali, mistake drills, flashcards, furigana and a kanji
dictionary. It is a static site with no build step and works offline once loaded.

Open `index.html` from a local web server, or use the hosted copy on GitHub Pages.

## Features

- **Mock exams** — N5 (59 questions) and N4 (40 questions) across 文字・語彙, 文法 and 読解,
  filtered by lesson range and section.
- **Real scoring** — each section scales to 60 points (180 total); N5 pass mark 80,
  N4 pass mark 90, with the official 19/60 minimum per section.
- **Saved progress** — an exam in progress survives a reload, including the timer and
  the real start time, and can be resumed or discarded from the setup screen.
- **Review that teaches** — every question shows the correct answer, the reading and the
  explanation in English, Bengali, or both.
- **Study mode** — an optional instant-feedback mode that locks the question once you
  choose and shows the answer and explanation straight away, so practice sessions double
  as lessons.
- **Progress stats** — lifetime accuracy for Vocabulary & Kanji, Grammar and Reading on the
  setup screen, so weak areas are visible before the next exam.
- **Copy, print or send** — a result summary copies to the clipboard in one tap, the whole
  paper prints with an answer key, and “Send to Telegram” pushes the score to a chat you
  configure in Tools & settings.
- **Telegram in two fields** — paste a bot token from @BotFather and your chat ID; both stay
  in this browser, are never included in exports, and are used only when you press send.
  No server or Cloudflare account is involved.
- **Mistake bank and drills** — wrong answers are collected; answer one correctly twice
  and it clears. Flashcards work from the mistake bank or the full level bank.
- **Study tools** — furigana toggle, read-aloud, a kanji popover (kanjiapi), and printable
  papers with an answer key.
- **Question sources** — offline bank (default), live kanji/vocabulary APIs, or
  AI-generated questions through Gemini (direct key or your own proxy URL).
- **Private by default** — everything is stored in `localStorage` on the device; exports
  never include the API key.

## Layout

```
index.html                 markup and view shells
assets/styles.css          design system, light and dark themes
js/core.js                 data model, question generation, grading, persistence
js/app.js                  setup, exam UI, timer, results, drills, flashcards, tools
js/data/bank-n5.js         N5 question bank
js/data/bank-n4.js         N4 question bank
js/data/furigana.js        kanji reading pairs for ruby annotations
js/data/kanji-readings.js  offline fallback readings for the kanji popover
sw.js                      service worker (offline shell)
validate-questions.js      question bank validator
```

Scripts are classic (non-module) scripts so the app also works when opened from a
simple static host. `js/core.js` loads before `js/app.js`.

## Developing

```bash
python3 -m http.server 8000     # then open http://localhost:8000
node validate-questions.js      # checks both banks
```

No install step is required. To deploy, push the folder to any static host; the paths are
relative, so GitHub Pages project sites (`/jlpt-mock-exam/`) work as-is.

## AI question generation (optional)

In **Tools & settings** add either:

- a **Gemini API key** (sent directly to Google and stored only on this device), or
- a **Proxy URL** for your own worker that injects the key server-side, so it never reaches
  the browser.

If the model or network fails, the app falls back to the offline bank and says so.

## Credits

Question banks, explanations and the original app idea come from
[noerror-web/jlpt-mock-exam](https://github.com/noerror-web/jlpt-mock-exam).
Dictionary data: [kanjiapi.dev](https://kanjiapi.dev). Vocabulary:
[jlpt-vocab-api](https://github.com/WelkinYang/JLPT_Vocab). Fonts: Google Fonts
(Noto Sans JP, Noto Sans Bengali, Inter).

Not affiliated with the Japan Foundation or JEES. JLPT is a trademark of its owners.
