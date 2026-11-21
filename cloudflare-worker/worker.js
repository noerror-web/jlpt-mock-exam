/**
 * JLPT Mock Exam Cloudflare Worker Proxy
 * Secures Telegram Bot Token and Gemini API Key server-side.
 * 
 * Environment Variables (Set in Cloudflare Dashboard or via wrangler secret put):
 * - TELEGRAM_BOT_TOKEN: Your Telegram bot token
 * - GEMINI_API_KEY: Your Google AI Studio API key (supports both "AQ." and "AIza" formats)
 */

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";

    // Handle CORS preflight options request
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, x-goog-api-key",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Content-Type": "application/json",
    };

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

        if (!chatId) {
          return new Response(
            JSON.stringify({ ok: false, error: "Missing required 'chatId' parameter." }),
            { status: 400, headers: corsHeaders }
          );
        }

        let messageText = text;
        if (!messageText && summary) {
          const candidate = summary.candidate || "Student";
          const badge = summary.passed ? "✅ PASS (合格ライン ≥ 60%)" : "❌ KEEP PRACTICING (< 60%)";

          let secText = "";
          Object.entries(summary.sectionStats || {}).forEach(([secName, st]) => {
            const sPct = Math.round((st.correct / st.total) * 100);
            secText += `• ${secName}: ${st.correct}/${st.total} (${sPct}%)\n`;
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
            chat_id: chatId,
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
          JSON.stringify({ ok: false, error: "Failed to dispatch Telegram message: " + err.message }),
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

        // Fast & stable modern Gemini models on generativelanguage.googleapis.com
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
            // Generative Language API (works with both AQ. authorization keys and AIza standard keys via x-goog-api-key)
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
              lastError = new Error(`${m} HTTP ${gRes.status}: ${errJson?.error?.message || "AI error"}`);
              continue;
            }

            const gData = await gRes.json();
            const rawText = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error("Empty candidate text from AI model");

            const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
            const parsed = JSON.parse(cleaned);

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

        throw lastError || new Error("All AI models failed: " + (lastError?.message || "unknown error"));
      } catch (err) {
        return new Response(
          JSON.stringify({ ok: false, error: err.message }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    return new Response(JSON.stringify({ error: "Endpoint not found" }), {
      status: 404,
      headers: corsHeaders,
    });
  },
};
