# JLPT N5 / N4 Practice & Mock Exam Generator

A modern, standalone interactive web application for JLPT (Japanese Language Proficiency Test) N5 and N4 exam preparation. Created by **Md Mominur Islam**.

## ✨ Features

- **🌐 Zero-Key Live API Mode**: Generates live vocabulary and kanji questions using `kanjiapi.dev`, `jlpt-vocab-api`, and contextual sentences.
- **✨ Gemini AI Integration**: Option to connect Google Gemini API for complete written exams (Grammar, ★ Star Ordering, Paraphrase, Usage, and Reading Comprehension).
- **☁️ Cloudflare Worker Proxy Support**: Route Gemini AI and Telegram Bot requests through a serverless Cloudflare Worker to keep your bot token and API keys 100% private.
- **✈️ Telegram Bot Auto-Push**: Automatically sends formatted exam results, candidate details, pass/fail status, and section score breakdowns to your Telegram bot ([@bkttcmocktestbot](https://t.me/bkttcmocktestbot)) upon grading.
- **🇧🇩 + 🇬🇧 Bilingual Explanations**: Rich explanations available in both Bengali (বাংলা) and English, with view toggles.
- **★ Star Ordering (文の組み立て)**: Interactive tap-to-arrange slot mechanic mirroring the official JLPT exam format.
- **🔊 Japanese TTS Audio**: Native browser speech synthesis for question sentences and reading passages.
- **📖 Tap-Any-Kanji Popover Dictionary**: Instant stroke count, on/kun readings, and meanings with anti-cheat spoiler protection on active questions.
- **🔁 Spaced Mistake Review Bank**: Saves incorrect answers locally and requires consecutive correct drills to master.
- **🖨️ PDF & Worksheet Export**: Clean print styling with candidate score slips and exam-integrity mode.
- **🌙 AMOLED Dark Mode & Furigana Toggle**: Customized readability options.

---

## 🚀 Getting Started

No build tools, npm packages, or server installation required.

Simply open `index.html` in any modern web browser, or access the live web app:
🔗 **[https://noerror-web.github.io/jlpt-mock-exam/](https://noerror-web.github.io/jlpt-mock-exam/)**

---

## ☁️ Securing Keys with Cloudflare Worker

A ready-to-deploy Cloudflare Worker is included in the [`cloudflare-worker/`](cloudflare-worker/) directory.

### Quick Setup:
1. Open [dash.cloudflare.com](https://dash.cloudflare.com) ➔ **Compute (Workers & Pages)** ➔ **Create Worker**.
2. Paste the contents of [`cloudflare-worker/worker.js`](cloudflare-worker/worker.js).
3. Under Worker **Settings** ➔ **Variables and Secrets**, add:
   - `TELEGRAM_BOT_TOKEN`: Your Telegram Bot Token (`YOUR_TELEGRAM_BOT_TOKEN`)
   - `GEMINI_API_KEY`: Your Google AI Studio API Key (`AQ...` or `AIza...`)
4. Copy your Worker URL (`https://...workers.dev`) and paste it in **⚙️ Tools & API** ➔ **Cloudflare Worker URL**.
5. Your frontend is now completely key-free and secure!

---

## ✈️ Connecting Telegram Bot

1. Open **⚙️ Tools & API** in the app.
2. Enter your **Telegram Chat ID** (get your numeric ID by messaging [@userinfobot](https://t.me/userinfobot) or [@myidbot](https://t.me/myidbot)).
3. Send `/start` to [@bkttcmocktestbot](https://t.me/bkttcmocktestbot) on Telegram so it can deliver messages to you.
4. Click **Save & Test** to verify!

---

## 👤 Author

**Md Mominur Islam**
