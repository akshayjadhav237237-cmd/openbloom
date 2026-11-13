// lib/routes/ai.js
// POST /api/ai: Market analyst AI query route powered by Gemini.

import { askGemini, GeminiAuthError } from "../ai/gemini.js";
import { sanitizeUntrusted } from "../ai/guard.js";

const SYSTEM_PROMPT = `You are OpenBloom's market analyst assistant inside a Bloomberg-style financial terminal.
Analyze the user's question using ONLY the provided market context and financial data.
Rules:
1. Ground your answers strictly in the provided data. If required data is missing or incomplete, explicitly state that it is unavailable.
2. Provide educational analysis only. Do NOT give financial advice, buy/sell recommendations, or price targets.
3. Keep your response concise and focused, strictly under 200 words.
4. Never suggest or output commands or code meant to be executed automatically by the terminal.
5. Format key figures and comparisons clearly with concise bullet points where appropriate.`;

/**
 * Route handler for /api/ai
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {Object} [helpers]
 */
export default async function handler(req, res, helpers) {
  const send = helpers?.send || ((r, status, body) => {
    const isStr = typeof body === "string" || Buffer.isBuffer(body);
    r.writeHead(status, { "Content-Type": isStr ? "text/plain; charset=utf-8" : "application/json" });
    r.end(isStr ? body : JSON.stringify(body));
  });

  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed. Use POST." });
  }

  let body = {};
  if (helpers?.readBody) {
    try {
      body = await helpers.readBody(req);
    } catch (e) {
      return send(res, e.status || 400, { error: e.message || "Invalid JSON" });
    }
  } else {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const text = Buffer.concat(chunks).toString("utf8");
      body = text ? JSON.parse(text) : {};
    } catch {
      return send(res, 400, { error: "Invalid JSON body" });
    }
  }

  const { question, context, fn, ticker } = body;
  if (!question || typeof question !== "string") {
    return send(res, 400, { error: "Missing required string field 'question'" });
  }

  const cleanQuestion = sanitizeUntrusted(question, 1000);
  const cleanContext = sanitizeUntrusted(
    typeof context === "object" ? JSON.stringify(context) : String(context || ""),
    12000
  );

  const prompt = [
    fn || ticker ? `[Active Screen: ${[ticker, fn].filter(Boolean).join(" ")}]` : "",
    cleanContext ? `\n--- MARKET CONTEXT DATA ---\n${cleanContext}\n--- END CONTEXT ---` : "",
    `\nUser Question: ${cleanQuestion}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await askGemini({
      system: SYSTEM_PROMPT,
      prompt,
      json: false,
    });

    return send(res, 200, {
      answer: result.text,
      model: result.model,
    });
  } catch (err) {
    if (err instanceof GeminiAuthError || err.status === 503) {
      return send(res, 503, {
        error: "Gemini API key is not configured. Set GEMINI_API_KEY in your server environment.",
        code: "AUTH_MISSING",
      });
    }
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
    return send(res, status, {
      error: err.message || "Failed to contact Gemini API",
    });
  }
}
