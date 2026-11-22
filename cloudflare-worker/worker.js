/**
 * JLPT Mock Exam Cloudflare Worker Proxy
 * Secures Telegram Bot Token and Gemini API Key server-side.
 * 
 * Environment Variables (Set in Cloudflare Dashboard or via wrangler secret put):
 * - TELEGRAM_BOT_TOKEN: Your Telegram bot token
 * - GEMINI_API_KEY: Your Google AI Studio API key (supports both "AQ." and "AIza" formats)
 * - ALLOWED_ORIGIN: (Optional) Comma-separated list of allowed origins. Defaults to GitHub Pages & localhost.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  "https://noerror-web.github.io",
  "http://localhost:8080",
  "http://localhost:3000",
  "http://localhost",
  "http://127.0.0.1",
  "http://127.0.0.1:8080"
];

function isOriginAllowed(requestOrigin, env) {
  if (!requestOrigin) return false;
  try {
    const reqOriginParsed = new URL(requestOrigin).origin.toLowerCase();
    const configured = env.ALLOWED_ORIGIN || env.ALLOWED_ORIGINS;
    if (configured && configured.trim() === "*") return true;
    const allowedList = configured
      ? configured.split(",").map((s) => {
          try { return new URL(s.trim()).origin.toLowerCase(); } catch { return s.trim().toLowerCase(); }
        })
      : DEFAULT_ALLOWED_ORIGINS.map((s) => s.toLowerCase());
    return allowedList.includes(reqOriginParsed);
  } catch {
    return false;
  }
}

// In-memory sliding window rate limiter fallback (30 requests/min per IP)
const ipRateMap = new Map();
function checkRateLimit(clientIp, env) {
  // If native Cloudflare rate limiter binding is bound, defer to it (caller handles promise)
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxReq = 30;
  const record = ipRateMap.get(clientIp) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
  } else {
    record.count++;
  }
  ipRateMap.set(clientIp, record);

  // Periodic cleanup if map grows
  if (ipRateMap.size > 2000) {
    for (const [ip, rec] of ipRateMap.entries()) {
      if (now > rec.resetAt) ipRateMap.delete(ip);
    }
  }
  return record.count <= maxReq;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractJsonPayload(rawText) {
  if (!rawText || typeof rawText !== "string") return null;
  // 1. Try markdown code block extraction
  const matchFence = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (matchFence && matchFence[1]) {
    try {
      return JSON.parse(matchFence[1].trim());
    } catch {}
  }
  // 2. Try slicing between first [ or { and last ] or }
  const firstArr = rawText.indexOf("[");
  const lastArr = rawText.lastIndexOf("]");
  if (firstArr !== -1 && lastArr > firstArr) {
    try {
      return JSON.parse(rawText.substring(firstArr, lastArr + 1));
    } catch {}
  }
  const firstObj = rawText.indexOf("{");
  const lastObj = rawText.lastIndexOf("}");
  if (firstObj !== -1 && lastObj > firstObj) {
    try {
      return JSON.parse(rawText.substring(firstObj, lastObj + 1));
    } catch {}
  }
  return JSON.parse(rawText.trim());
}

export default {
  async fetch(request, env) {
    const requestOrigin = request.headers.get("Origin") || "";
    const allowed = isOriginAllowed(requestOrigin, env);
    const allowOriginHeader = allowed ? (requestOrigin || "*") : "null";

    // Handle CORS preflight options request
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowOriginHeader,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, x-goog-api-key",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin",
        },
      });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowOriginHeader,
      "Content-Type": "application/json",
      "Vary": "Origin",
    };

    // Reject POST requests missing an Origin header
    if (request.method === "POST" && !requestOrigin) {
      return new Response(
        JSON.stringify({ ok: false, error: "Origin header is required for POST requests." }),
        { status: 403, headers: corsHeaders }
      );
    }

    if (requestOrigin && !allowed) {
      return new Response(
        JSON.stringify({ ok: false, error: "Origin not allowed by CORS policy." }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Rate Limiting per client IP (Cloudflare binding or fallback in-memory window)
    const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
    if (env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === "function") {
      const { success } = await env.RATE_LIMITER.limit({ key: clientIp });
      if (!success) {
        return new Response(
          JSON.stringify({ ok: false, error: "Too many requests. Cloudflare rate limit exceeded." }),
          { status: 429, headers: corsHeaders }
        );
      }
    } else if (!checkRateLimit(clientIp, env)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Too many requests. Rate limit exceeded (max 30 req/min)." }),
        { status: 429, headers: corsHeaders }
      );
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    // Health / info endpoint (no secret leakage; keyType removed)
    if (pathname === "/" || pathname === "/health") {
      const activeKey = env.GEMINI_API_KEY || env.VERTEX_API_KEY || "";
      return new Response(
        JSON.stringify({
          status: "online",
          service: "JLPT Mock Exam Cloudflare Proxy",
          author: "Md Mominur Islam",
          features: ["telegram-proxy", "gemini-proxy"],
          hasTelegramToken: Boolean(env.TELEGRAM_BOT_TOKEN),
          hasApiKey: Boolean(activeKey),
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Enforce 100 KB limit for all incoming POST bodies by reading as text
    let body = {};
    if (request.method === "POST") {
      const rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).length > 102400) { // 100 KB max limit
        return new Response(
          JSON.stringify({ ok: false, error: "Payload too large. Max request size is 100 KB." }),
          { status: 413, headers: corsHeaders }
        );
      }
      try {
        body = JSON.parse(rawBody);
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: "Malformed JSON payload." }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // 1. TELEGRAM PROXY ENDPOINT (/api/telegram)
    if (pathname === "/api/telegram" && request.method === "POST") {
      const botToken = env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return new Response(
          JSON.stringify({ ok: false, error: "TELEGRAM_BOT_TOKEN is not configured in Worker environment variables." }),
          { status: 500, headers: corsHeaders }
        );
      }

      try {
        const { chatId, text, summary } = body;
        const targetChatId = chatId || env.TELEGRAM_DEFAULT_CHAT_ID;

        if (!targetChatId) {
          return new Response(
            JSON.stringify({ ok: false, error: "Missing required 'chatId' parameter." }),
            { status: 400, headers: corsHeaders }
          );
        }

        let messageText = text;
        if (!messageText && summary) {
          const candidate = summary.candidate || "Student";
          const badge = summary.passed ? "✅ PASS (合格)" : "❌ KEEP PRACTICING (不合格)";

          let secText = "";
          Object.entries(summary.sectionStats || {}).forEach(([secName, st]) => {
            const sPct = st.total > 0 ? Math.round((st.correct / st.total) * 100) : 0;
            const sPass = typeof st.passed === "boolean" ? (st.passed ? "✓" : "✗") : "";
            secText += `• ${escapeHtml(secName)}: ${st.correct}/${st.total} (${sPct}%) ${sPass}\n`;
          });

          messageText = [
            `🎯 <b>JLPT ${escapeHtml(summary.level)} EXAM SUBMISSION</b>`,
            `━━━━━━━━━━━━━━━━━━━━`,
            `👤 <b>Candidate:</b> ${escapeHtml(candidate)}`,
            `📅 <b>Date:</b> ${escapeHtml(summary.dateStr)}`,
            `📚 <b>Scope:</b> ${escapeHtml(summary.scope)}`,
            `📊 <b>Score:</b> <b>${summary.correctTotal} / ${summary.total} (${summary.pct}%)</b>`,
            `🏁 <b>Result:</b> ${badge}`,
            `━━━━━━━━━━━━━━━━━━━━`,
            `📋 <b>Section Breakdown:</b>`,
            secText.trim(),
            `━━━━━━━━━━━━━━━━━━━━`,
            `🤖 <b>Author:</b> Md Mominur Islam`,
          ].join("\n");
        }

        if (!messageText) {
          return new Response(
            JSON.stringify({ ok: false, error: "Missing message text or summary." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: targetChatId,
            text: messageText,
            parse_mode: "HTML",
          }),
        });

        const tgData = await tgRes.json();
        return new Response(JSON.stringify(tgData), {
          status: tgRes.status,
          headers: corsHeaders,
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ ok: false, error: "Failed to dispatch Telegram message: " + (err.message || "Network error") }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // 2. GEMINI PROXY ENDPOINT (/api/gemini)
    if (pathname === "/api/gemini" && request.method === "POST") {
      const apiKey = env.GEMINI_API_KEY || env.VERTEX_API_KEY;
      if (!apiKey) {
        return new Response(
          JSON.stringify({ ok: false, error: "GEMINI_API_KEY is not configured in Worker environment variables." }),
          { status: 500, headers: corsHeaders }
        );
      }

      try {
        const promptText = body.promptText;
        const requestedModel = body.model;

        if (!promptText) {
          return new Response(
            JSON.stringify({ ok: false, error: "Missing 'promptText' in request body." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const models = [
          requestedModel,
          "gemini-flash-latest",
          "gemini-flash-lite-latest",
          "gemini-2.5-flash",
          "gemini-3.8-flash",
        ].filter(Boolean);

        let lastError = null;

        for (const m of models) {
          try {
            const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
            const reqHeaders = {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            };

            const gRes = await fetch(targetUrl, {
              method: "POST",
              headers: reqHeaders,
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: promptText }] }],
                generationConfig: {
                  responseMimeType: "application/json",
                  temperature: 0.85,
                },
              }),
            });

            if (!gRes.ok) {
              const errJson = await gRes.json().catch(() => ({}));
              lastError = new Error(`${m} HTTP ${gRes.status}: ${errJson?.error?.message || "AI service error"}`);
              continue;
            }

            const gData = await gRes.json();
            const rawText = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error("Empty candidate response from AI model");

            const parsed = extractJsonPayload(rawText);
            if (!parsed) throw new Error("Could not extract valid JSON structure from response");

            return new Response(JSON.stringify({
              ok: true,
              data: parsed,
              modelUsed: m,
              keyFormat: apiKey.startsWith("AQ.") ? "Authorization Key (AQ.)" : "Standard Key (AIza)"
            }), {
              status: 200,
              headers: corsHeaders,
            });
          } catch (e) {
            lastError = e;
          }
        }

        // Return sanitized error message without internal secrets
        const safeErrorMsg = lastError?.message ? lastError.message.replace(/key=[^&\s]+/gi, "key=[REDACTED]") : "All AI models failed";
        return new Response(
          JSON.stringify({ ok: false, error: safeErrorMsg }),
          { status: 502, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ ok: false, error: "Malformed request payload" }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    return new Response(JSON.stringify({ error: "Endpoint not found" }), {
      status: 404,
      headers: corsHeaders,
    });
  },
};
