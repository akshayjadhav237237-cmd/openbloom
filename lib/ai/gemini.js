// lib/ai/gemini.js
// Native Node 18+ client for Google Gemini API without any npm dependencies.

export class GeminiAuthError extends Error {
  constructor(message = "GEMINI_API_KEY is not configured on this server") {
    super(message);
    this.name = "GeminiAuthError";
    this.status = 503;
    this.code = "AUTH_MISSING";
  }
}

/**
 * Asks Gemini with optional system instructions, JSON enforcement, and timeout.
 * @param {Object} options
 * @param {string} [options.system] - System prompt instructions
 * @param {string} options.prompt - User prompt
 * @param {boolean} [options.json=false] - Enforce JSON response format
 * @param {number} [options.timeoutMs=20000] - Request timeout in milliseconds (default 20s)
 * @returns {Promise<{ text: string, json?: any, model: string }>}
 */
export async function askGemini({ system, prompt, json = false, timeoutMs = 20000 }) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    throw new GeminiAuthError("GEMINI_API_KEY environment variable is missing");
  }

  const model = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: String(prompt || "") }],
      },
    ],
  };

  if (system) {
    body.systemInstruction = {
      parts: [{ text: String(system) }],
    };
  }

  if (json) {
    body.generationConfig = {
      responseMimeType: "application/json",
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let msg = `Gemini API error (HTTP ${res.status})`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson?.error?.message) {
        msg = `Gemini API error: ${errJson.error.message}`;
      }
    } catch {}
    const err = new Error(msg);
    err.status = res.status >= 500 ? 502 : res.status;
    throw err;
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text || "";

  let parsedJson;
  if (json) {
    try {
      parsedJson = JSON.parse(text);
    } catch (e) {
      // If model wrapped response in markdown code blocks, try extracting
      const match = /```json\s*([\s\S]*?)\s*```/.exec(text);
      if (match) {
        parsedJson = JSON.parse(match[1]);
      } else {
        throw new Error(`Failed to parse Gemini response as JSON: ${e.message}`);
      }
    }
  }

  return {
    text,
    ...(parsedJson !== undefined ? { json: parsedJson } : {}),
    model,
  };
}
