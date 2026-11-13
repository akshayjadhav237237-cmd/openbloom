// lib/routes/filing-ai.js
// SEC EDGAR filing summarization via Google Gemini.

import { askGemini, GeminiAuthError } from "../ai/gemini.js";
import { sanitizeUntrusted } from "../ai/guard.js";

// In-memory 1h cache keyed by accession number or URL
const filingCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

function getCached(key) {
  const item = filingCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) {
    filingCache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(key, data) {
  if (filingCache.size > 200) {
    const oldest = filingCache.keys().next().value;
    filingCache.delete(oldest);
  }
  filingCache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validates the Gemini response against the required schema.
 */
function validateSchema(data) {
  if (!data || typeof data !== "object") throw new Error("Invalid response format from AI");
  const keyPoints = Array.isArray(data.keyPoints) ? data.keyPoints.map(String).slice(0, 5) : [];
  const risks = Array.isArray(data.risks) ? data.risks.map(String).slice(0, 3) : [];
  const changes = Array.isArray(data.changes) ? data.changes.map(String) : [];
  const verdict = typeof data.verdict === "string" ? data.verdict : "Analysis completed.";

  return { keyPoints, risks, changes, verdict };
}

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

  const { url, accessionNumber, form, ticker } = body;
  if (!url || typeof url !== "string") {
    return send(res, 400, { error: "Missing required 'url' of the SEC filing" });
  }

  // Security check: Only allow fetching from official SEC EDGAR archive
  const parsedUrl = new URL(url);
  if (!parsedUrl.hostname.endsWith("sec.gov")) {
    return send(res, 400, { error: "Only official SEC EDGAR URLs (sec.gov) are permitted" });
  }

  const cacheKey = accessionNumber || url;
  const cached = getCached(cacheKey);
  if (cached) {
    return send(res, 200, { ...cached, cached: true });
  }

  try {
    // SEC EDGAR rate limit compliance: User-Agent format
    const secRes = await fetch(url, {
      headers: {
        "User-Agent": "OpenBloom/1.0 (contact@openbloom.local)",
        Accept: "text/html,application/xhtml+xml,text/plain",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!secRes.ok) {
      return send(res, 502, { error: `Failed to fetch filing from SEC (HTTP ${secRes.status})` });
    }

    const rawText = await secRes.text();
    const plainText = stripHtml(rawText);
    const sanitized = sanitizeUntrusted(plainText, 14000);

    const systemPrompt = `You are a professional equity research analyst. Summarize this SEC ${form || "filing"} for ${ticker || "the company"}.
Return a strict JSON object with this EXACT schema:
{
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "risks": ["risk 1", "risk 2", "risk 3"],
  "changes": ["major operational or financial change 1", "change 2"],
  "verdict": "One sentence summary of the strategic impact."
}
Rules:
- Be strictly objective and factual based only on the filing excerpt.
- Keep each bullet point under 25 words.
- Return ONLY the JSON object.`;

    const aiRes = await askGemini({
      system: systemPrompt,
      prompt: `Filing Text Excerpt:\n${sanitized}`,
      json: true,
      timeoutMs: 20000,
    });

    const parsedData = validateSchema(aiRes.json || JSON.parse(aiRes.text));
    const responsePayload = {
      ...parsedData,
      accessionNumber: accessionNumber || null,
      form: form || "Filing",
      ticker: ticker || "",
      model: aiRes.model,
    };

    setCached(cacheKey, responsePayload);
    return send(res, 200, responsePayload);
  } catch (err) {
    if (err instanceof GeminiAuthError || err.status === 503) {
      return send(res, 503, {
        error: "Gemini API key is not configured. Set GEMINI_API_KEY in your server environment.",
        code: "AUTH_MISSING",
      });
    }
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    return send(res, status, { error: err.message || "Failed to summarize filing" });
  }
}
