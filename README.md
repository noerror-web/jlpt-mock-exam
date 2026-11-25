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
- **Copy, print or send** — a result summary copies to the clipboard in one tap, and the
  whole paper prints with an answer key.
- **Results to your own Telegram** — a small Cloudflare Worker holds the bot token and your
  chat ID as secrets and only ever sends to that one chat. The app just stores the worker
  URL and calls it when you press “Send to Telegram”, so the token never reaches the
  browser and nobody else can use your bot.
- **Mistake bank and drills** — wrong answers are collected; answer one correctly twice
  and it clears. Flashcards work from the mistake bank or the full level bank.
- **Study tools** — furigana toggle, read-aloud, a kanji popover (kanjiapi), and printable
  papers with an answer key.
- **Question sources** — smart bank (default; 3,595 N5 and 40 N4 served questions: 2,000
  machine-generated plus 1,595 hand-written, past-paper and scraped items), live
  kanji/vocabulary APIs, or AI-generated questions through Gemini (direct key or your own
  proxy URL).
- **Never the same question twice** — finishing a paper marks its questions done, and the
  next paper takes unseen ones first, section by section, so a paper keeps its vocabulary,
  grammar and reading share. A section only starts reusing questions once its own pool is
  spent. The setup screen shows how much of the pool is left, split into generated and
  bank questions. Once the whole pool is spent, papers recycle the oldest first.
- **Fresh AI papers** — Gemini writes a new N5 or N4 paper on request. The prompt pins the
  level (no N3+ grammar, vocabulary or kanji), demands JLPT exam wording and section mix,
  and rejects any item tagged for another level. Generated questions are remembered per
  device, so later papers skip what you have already seen.
- **Fair options** — option order is shuffled with a stable per-question seed, so the
  correct answer is spread across A–D instead of always first.
- **Private by default** — everything is stored in `localStorage` on the device; exports
  never include the API key or any Telegram secret.

## Layout

```
index.html                 markup and view shells
assets/styles.css          design system, light and dark themes
js/core.js                 data model, question generation, grading, persistence
js/app.js                  setup, exam UI, timer, results, drills, flashcards, tools
js/data/bank-n5.js         N5 question bank
js/data/bank-n5-large.js   2,000 generated N5 questions (tagged origin: generated)
js/data/bank-n5-past.js    N5 questions from the 2024.7 past paper
js/data/bank-n5-2021-12.js N5 questions from the 2021.12 and 2017.7 past papers
js/data/bank-n5-web.js     N5 items scraped from public practice sites
js/data/bank-n4.js         N4 question bank
js/data/furigana.js        kanji reading pairs for ruby annotations
js/data/kanji-readings.js  offline fallback readings for the kanji popover
sw.js                      service worker (offline shell)
validate-questions.js      question bank validator
cloudflare-worker/         Telegram relay (token stays server-side)
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

The app ships with a relay URL that already holds a key, so AI papers work without setup.
Add your own key or worker URL to use your quota instead. If the model or network fails,
the app falls back to the offline bank and says why on the start screen.

Each generated paper carries a random seed and the list of recent questions, and only
new items are kept. The answer key is recalculated after options are shuffled, and
reading items must include a passage.

## Credits

Question banks, explanations and the original app idea come from
[noerror-web/jlpt-mock-exam](https://github.com/noerror-web/jlpt-mock-exam).
Dictionary data: [kanjiapi.dev](https://kanjiapi.dev). Vocabulary:
[jlpt-vocab-api](https://github.com/WelkinYang/JLPT_Vocab). Fonts: Google Fonts
(Noto Sans JP, Noto Sans Bengali, Inter).

Not affiliated with the Japan Foundation or JEES. JLPT is a trademark of its owners.

## Telegram relay

The app comes pre-configured with the existing relay
`https://jlpt-mock-exam-proxy.mominurislam.workers.dev/api/telegram`, where the bot token
and the destination chat ID are already stored as Worker secrets. The app sends only the
text; the worker decides which chat receives it.

`cloudflare-worker/` contains a replacement single-file Worker (`worker.js`) that forwards
a text result to one fixed chat and refuses any caller-supplied chat ID, if you ever want
to host your own.

1. Create a bot with @BotFather, then send it any message and note your numeric chat ID
   (for example from @userinfobot).
2. From `cloudflare-worker/`, deploy and set the secrets:

   ```sh
   npx wrangler deploy
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   npx wrangler secret put TELEGRAM_CHAT_ID
   ```

3. Put your app's origin in `ALLOWED_ORIGIN` (for example
   `https://noerror-web.github.io`) so other sites cannot call the worker.
4. Paste the resulting `https://<name>.<account>.workers.dev` URL into Tools & settings →
   Telegram, and press “Send test”.

The worker accepts only `POST { "text": "..." }`, limits the text length, and sends to the
chat ID from its environment — never to a chat supplied by the caller.
