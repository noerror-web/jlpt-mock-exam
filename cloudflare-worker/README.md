# ☁️ JLPT Mock Exam — Cloudflare Worker Proxy

Secures your **Telegram Bot Token** and **Google Gemini API Key** so they are never exposed in public frontend code.

## 🚀 2-Minute Deployment Options

### Option 1: Via Cloudflare Web Dashboard (Zero Install)

1. Sign up / Log in to [dash.cloudflare.com](https://dash.cloudflare.com).
2. On the left sidebar, click **Compute (Workers & Pages)** ➔ **Create application** ➔ **Create Worker**.
3. Name it: `jlpt-mock-exam-proxy` and click **Deploy**.
4. Click **Edit code**:
   - Delete any default template code.
   - Copy and paste the entire contents of [`worker.js`](worker.js).
   - Click **Deploy**.
5. Add your Secrets:
   - Go to your Worker's **Settings** ➔ **Variables and Secrets**.
   - Under **Secrets**, click **Add**:
     - Name: `TELEGRAM_BOT_TOKEN` | Value: `8863407575:AAFICc_QFXygIzV-3h_Ia4U7ZRmnaOdpy9Y`
     - Name: `GEMINI_API_KEY` | Value: *(Your Google Gemini API Key)*
   - Click **Deploy / Save**.
6. Copy your Worker URL:
   - Example: `https://jlpt-mock-exam-proxy.<your-subdomain>.workers.dev`
7. Paste this URL into the **⚙️ Tools & API** drawer in your JLPT Mock Exam web app!

---

### Option 2: Via Wrangler CLI

```bash
cd cloudflare-worker

# Login to Cloudflare
npx wrangler login

# Set Secrets
npx wrangler secret put TELEGRAM_BOT_TOKEN
# Paste: 8863407575:AAFICc_QFXygIzV-3h_Ia4U7ZRmnaOdpy9Y

npx wrangler secret put GEMINI_API_KEY
# Paste: your_gemini_api_key

# Deploy
npx wrangler deploy
```

---

## 📡 API Endpoints

- `GET /health` — Verifies Worker status.
- `POST /api/telegram` — Body: `{ "chatId": "123456789", "summary": { ... } }`
- `POST /api/gemini` — Body: `{ "promptText": "..." }`
