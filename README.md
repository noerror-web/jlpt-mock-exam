# JLPT N5 / N4 Practice & Mock Exam Generator

A modern, offline-capable progressive web application (PWA) for official Japanese Language Proficiency Test (JLPT) N5 and N4 exam preparation. Zero build step, zero dependencies, deployable directly on GitHub Pages. Created by **Md Mominur Islam**.

🔗 **Live Web App:** [https://noerror-web.github.io/jlpt-mock-exam/](https://noerror-web.github.io/jlpt-mock-exam/)

---

## ✨ Features

- **📱 Offline Progressive Web App (PWA)**: Complete offline support via Service Worker caching (`sw.js` and `manifest.json`). Installable on iOS Safari and Android Chrome as a native-like app.
- **📚 100-Item Built-in Offline Fallback Bank**: Authentic offline questions (60 for N5, 40 for N4) covering Kanji Reading, Orthography, Context Vocabulary, Grammar, ★ Star-Ordering, and Reading Comprehension passages when network APIs are unreachable.
- **🌐 Zero-Key Live API Mode**: Dynamically generates fresh vocabulary and kanji questions using `kanjiapi.dev`, `jlpt-vocab-api`, and contextual sentence banks with strict level filtering (excluding non-N5 kanji like `嫌` in N5 exams).
- **🔲 Focus Exam Mode (1 by 1) & 📜 List View**: Toggle between a traditional all-at-once question list and a focused single-question view with progress tracking and mobile sticky action bar.
- **⚖️ Real JLPT Scoring Engine**: Evaluates genuine JLPT certification pass criteria:
  - **Overall Score Cutoff**: N5 ≥ 44.4% (80/180), N4 ≥ 50.0% (90/180).
  - **Sectional Minimum (基準点)**: Every tested section (`文字・語彙`, `文法`, `読解`) must achieve at least 32%. A failing section triggers `不合格 (基準点未達)`.
- **📊 Visual Results Dashboard**: Section score metric bars with 32% threshold indicators, time taken, weak topic breakdown chips, and pure Canvas confetti celebration on passing.
- **🃏 Mistake Bank & Interactive Flashcards**: Spaced repetition mistake review system with interactive 3D flip flashcards (front: Japanese prompt with furigana; back: reading, answer, and bilingual explanations).
- **⏱ Wall-Clock Exam Timer**: Drift-free timer synchronized with `Date.now()` and `visibilitychange` listeners, preventing time drift when mobile screens sleep or tabs switch.
- **🇧🇩 + 🇬🇧 Bilingual Explanations**: Accurate explanations available in both Bengali (বাংলা) and English, with instant view toggles.
- **★ Star Ordering (文の組み立て)**: Interactive tap-to-arrange slot mechanic mirroring the official JLPT exam format with lexical duplicate-chip support.
- **🔊 Japanese Speech Synthesis (TTS)**: Native browser audio playback for sentences and reading passages.
- **📖 Tap-Any-Kanji Popover**: Bottom sheet on mobile and floating card on desktop displaying stroke counts, on/kun readings, and meanings with active-question anti-cheat protection.
- **💾 Auto-Save & Resume**: Persists active in-progress exams across page reloads and offers an instant "⚡ Resume Exam" prompt.
- **✈️ Telegram Auto-Push via Worker**: Automatically dispatches formatted score cards to Telegram via private serverless proxy.

---

## 🚀 Getting Started

No build tools, Node modules, or compilation required.

Simply open [`index.html`](index.html) in any modern browser, or visit the live deployment at [https://noerror-web.github.io/jlpt-mock-exam/](https://noerror-web.github.io/jlpt-mock-exam/).

---

## ☁️ Cloudflare Worker Proxy & Security

A production-ready serverless proxy is included in [`cloudflare-worker/`](cloudflare-worker/) to keep your Telegram Bot Token and Gemini API Key 100% private.

### Worker Environment Variables:
Set in Cloudflare Dashboard under **Settings ➔ Variables and Secrets** or via Wrangler CLI:
- `TELEGRAM_BOT_TOKEN`: Your Telegram Bot Token (`YOUR_TELEGRAM_BOT_TOKEN`).
- `GEMINI_API_KEY`: Your Google AI Studio API Key (`AQ...` or `AIza...`).
- `ALLOWED_ORIGIN`: (Optional) Comma-separated list of allowed origins (e.g. `https://noerror-web.github.io,http://localhost`).

### Security Hardening:
- **CORS Allowlist**: Validates incoming `Origin` against allowed hosts.
- **Payload Size Guards**: Rejects payloads over 100 KB with `HTTP 413`.
- **Secret Sanitization**: Redacts sensitive API keys and internal URLs from error responses.
- **Robust JSON Parsing**: Regex extraction handles conversational prose and markdown fences from LLM responses without crashing.

---

## 📋 Changelog

### Version 5.0 (Latest Release)
- **PWA & Offline System**: Added `manifest.json`, `sw.js` with stale-while-revalidate caching, and relative subpath resolution for GitHub Pages.
- **Offline Question Banks**: Expanded to 60 authentic N5 questions and 40 authentic N4 questions.
- **Exam Flow**: Added Focus Mode (1 question at a time) with mobile bottom sticky navigation alongside classic List view.
- **Mistake Bank Flashcards**: Added interactive 3D flip card mode with mastery tracking.
- **Real JLPT Scoring**: Implemented authentic JLPT overall thresholds and sectional minimum (基準点 ≥ 32%) scoring.
- **Mobile Ergonomics**: Streamlined header to ≤ 52px on phones; transformed dictionary popover into mobile bottom sheet.
- **Wall-Clock Timer**: Synchronized with `Date.now()` and `visibilitychange` to eliminate mobile background sleep drift.
- **Auto-Save & Resume**: Preserves in-progress exams in `localStorage` with a 1-click restore banner.
- **Accessibility & Animations**: Added `:focus-visible`, `prefers-reduced-motion` compliance, and pure Canvas pass confetti.

---

## 👤 Author

**Md Mominur Islam**
