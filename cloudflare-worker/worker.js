/* JLPT Exam Lab — Telegram result relay.

   Holds the bot token and the destination chat ID as Worker secrets, so the
   browser never sees either. It only ever posts to that one chat. */

const MAX_TEXT = 3500;
const DEFAULT_API = "https://api.telegram.org";

function reply(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, headers)
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const allowOrigin = allowed.length === 0 ? "*" : allowed.includes(origin) ? origin : allowed[0];
  return {
    allowOrigin,
    blocked: allowed.length > 0 && !allowed.includes(origin),
    headers: {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    }
  };
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors.headers });
    }
    if (request.method !== "POST") {
      return reply({ ok: false, error: "Use POST" }, 405, cors.headers);
    }
    if (cors.blocked) {
      return reply({ ok: false, error: "Origin not allowed" }, 403, cors.headers);
    }

    let body;
    try {
      body = await request.json();
    } catch (err) {
      return reply({ ok: false, error: "Invalid JSON body" }, 400, cors.headers);
    }
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return reply({ ok: false, error: "Missing text" }, 400, cors.headers);
    }

    const token = env.TELEGRAM_BOT_TOKEN;
    const chat = env.TELEGRAM_CHAT_ID;
    if (!token || !chat) {
      return reply({ ok: false, error: "Worker is missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID" }, 500, cors.headers);
    }

    const form = new URLSearchParams({
      chat_id: chat,
      text: text.slice(0, MAX_TEXT),
      disable_web_page_preview: "true"
    });
    const api = (env.TELEGRAM_API_BASE || DEFAULT_API).replace(/\/$/, "");

    let res;
    try {
      res = await fetch(api + "/bot" + token + "/sendMessage", { method: "POST", body: form });
    } catch (err) {
      return reply({ ok: false, error: "Telegram unreachable" }, 502, cors.headers);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return reply({ ok: false, error: data.description || "Telegram HTTP " + res.status }, 502, cors.headers);
    }
    return reply({ ok: true }, 200, cors.headers);
  }
};
