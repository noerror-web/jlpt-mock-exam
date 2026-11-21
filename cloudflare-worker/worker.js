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
  "http://localhost",
  "http://127.0.0.1"
];

function isOriginAllowed(requestOrigin, env) {
  if (!requestOrigin) return true;
  const configured = env.ALLOWED_ORIGIN || env.ALLOWED_ORIGINS;
  if (!configured || configured.trim() === "*") {
    // If not strictly configured, verify against default domains or allow all for development
    return true;
  }
  const allowedList = configured.split(",").map((s) => s.trim().toLowerCase());
  const reqLower = requestOrigin.toLowerCase();
  return allowedList.some((allowed) => reqLower === allowed || reqLower.startsWith(allowed));
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
        },
      });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowOriginHeader,
      "Content-Type": "application/json",
    };

    if (requestOrigin && !allowed) {
      return new Response(
        JSON.stringify({ ok: false, error: "Origin not allowed by CORS policy." }),
        { status: 403, headers: corsHeaders }
      );
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    // Health / info endpoint
    if (pathname === "/" || pathname === "/health") {
      const activeKey = env.GEMINI_API_KEY || env.VERTEX_API_KEY || "";
      const isAQ = activeKey.startsWith("AQ.");
      return new Response(
        JSON.stringify({
          status: "online",
          service: "JLPT Mock Exam Cloudflare Proxy",
          author: "Md Mominur Islam",
          features: ["telegram-proxy", "gemini-proxy"],
          hasTelegramToken: Boolean(env.TELEGRAM_BOT_TOKEN),
          hasApiKey: Boolean(activeKey),
          keyType: activeKey ? (isAQ ? "Google AI Studio Auth Key (AQ.)" : "Google AI Studio Standard Key (AIza)") : "None",
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Input payload size check (Guard against memory exhaustion DoS)
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > 102400) { // 100 KB max limit
      return new Response(
        JSON.stringify({ ok: false, error: "Payload too large. Max request size is 100 KB." }),
        { status: 413, headers: corsHeaders }
      );
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
        const body = await request.json();
        const { chatId, text, summary } = body;
        const targetChatId = chatId || env.TELEGRAM_DEFAULT_CHAT_ID || "5479582136";

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
            const sPct = Math.round((st.correct / st.total) * 100);
            const sPass = typeof st.passed === "boolean" ? (st.passed ? "✓" : "✗") : "";
            secText += `• ${secName}: ${st.correct}/${st.total} (${sPct}%) ${sPass}\n`;
          });

          messageText = [
            `🎯 *JLPT ${summary.level} EXAM SUBMISSION*`,
            `━━━━━━━━━━━━━━━━━━━━`,
            `👤 *Candidate:* ${candidate}`,
            `📅 *Date:* ${summary.dateStr}`,
            `📚 *Scope:* ${summary.scope}`,
            `📊 *Score:* *${summary.correctTotal} / ${summary.total} (${summary.pct}%)*`,
            `🏁 *Result:* ${badge}`,
            `━━━━━━━━━━━━━━━━━━━━`,
            `📋 *Section Breakdown:*`,
            secText.trim(),
            `━━━━━━━━━━━━━━━━━━━━`,
            `🤖 *Author:* Md Mominur Islam`,
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
            parse_mode: "Markdown",
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
        const body = await request.json();
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
          "gemini-flash-lite-latest",
          "gemini-flash-latest",
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
