# JLPT N5 / N4 Practice & Mock Exam Generator

A modern, standalone interactive web application for JLPT (Japanese Language Proficiency Test) N5 and N4 exam preparation. Created by **Md Mominur Islam**.

## ✨ Features

- **🌐 Zero-Key Live API Mode**: Generates live vocabulary and kanji questions using `kanjiapi.dev`, `jlpt-vocab-api`, and contextual sentences.
- **✨ Gemini AI Integration**: Option to connect Google Gemini API for complete written exams (Grammar, ★ Star Ordering, Paraphrase, Usage, and Reading Comprehension).
- **✈️ Telegram Bot Auto-Push**: Automatically sends formatted exam results, candidate details, pass/fail status, and section score breakdowns to your Telegram bot ([@bkttcmocktestbot](https://t.me/bkttcmocktestbot)) upon grading.
- **🇧🇩 + 🇬🇧 Bilingual Explanations**: Rich explanations available in both Bengali (বাংলা) and English, with view toggles.
- **★ Star Ordering (文の組み立て)**: Interactive tap-to-arrange slot mechanic mirroring the official JLPT exam format.
- **🔊 Japanese TTS Audio**: Native browser speech synthesis for question sentences and reading passages.
- **📖 Tap-Any-Kanji Popover Dictionary**: Instant stroke count, on/kun readings, and meanings with anti-cheat spoiler protection on active questions.
- **🔁 Spaced Mistake Review Bank**: Saves incorrect answers locally and requires consecutive correct drills to master.
- **🖨️ PDF & Worksheet Export**: Clean print styling with candidate score slips and exam-integrity mode.
- **🌙 AMOLED Dark Mode & Furigana Toggle**: Customized readability options.

## 🚀 Getting Started

No build tools, npm packages, or server installation required.

Simply open `index.html` in any modern web browser:
```bash
# On Windows
start index.html

# On macOS
open index.html

# On Linux
xdg-open index.html
```

Or access the live deployment directly via **GitHub Pages**:
🔗 **[https://noerror-web.github.io/jlpt-mock-exam/](https://noerror-web.github.io/jlpt-mock-exam/)**

## ✈️ Connecting Telegram Bot

1. Open **⚙️ Tools & API** in the app.
2. Under **Telegram Bot Results Auto-Push**:
   - The bot token is pre-configured for [@bkttcmocktestbot](https://t.me/bkttcmocktestbot).
   - Enter your **Telegram Chat ID** (get your numeric ID by sending a message to [@userinfobot](https://t.me/userinfobot) or [@myidbot](https://t.me/myidbot)).
   - Send `/start` to [@bkttcmocktestbot](https://t.me/bkttcmocktestbot) on Telegram so it has permission to message you.
   - Click **Save & Test** to verify connectivity!
3. Every time you grade an exam, your score slip is automatically dispatched to your Telegram!

## 👤 Author

**Md Mominur Islam**
