// lib/routes/brief.js
// Daily Morning Market Brief combining WEI, MOST, GC, WIRP, ECO, and TOP via Gemini.

import { askGemini, GeminiAuthError } from "../ai/gemini.js";
import { sanitizeUntrusted } from "../ai/guard.js";

// Import existing fn data loaders
import loadWirp from "../fn/wirp.js";
import loadGc from "../fn/gc.js";
import loadEco from "../fn/eco.js";
import loadTop from "../fn/top.js";
import loadMost from "../fn/most.js";
import { board } from "../fn/board.js";

// In-memory 30 min cache
let cachedBrief = null;
let cacheExpiresAt = 0;
const BRIEF_CACHE_TTL_MS = 30 * 60 * 1000;

async function gatherMarketData() {
  const [wirpData, gcData, ecoData, topData, mostData, weiData] = await Promise.allSettled([
    loadWirp({}).catch(() => null),
    loadGc({}).catch(() => null),
    loadEco({}).catch(() => null),
    loadTop({ group: "ALL" }).catch(() => null),
    loadMost({}).catch(() => null),
    board(["SPX", "NDX", "INDU", "VIX", "UKX", "DAX", "NKY", "CL1", "GC1", "EURUSD", "BTC"]).catch(() => []),
  ]);

  const snap = {};

  if (weiData.status === "fulfilled" && Array.isArray(weiData.value)) {
    snap.indices = weiData.value.map((i) => `${i.id || i.symbol}: ${i.price} (${i.chgPct > 0 ? "+" : ""}${i.chgPct}%)`).join(", ");
  }

  if (wirpData.status === "fulfilled" && wirpData.value?.meetings?.length) {
    const nextM = wirpData.value.meetings[0];
    snap.fed = `Next FOMC: ${nextM.date}, Implied Rate: ${nextM.impliedRate}%, Cut Prob: ${nextM.probCut}%, Hike Prob: ${nextM.probHike}%`;
  }

  if (gcData.status === "fulfilled" && gcData.value?.current?.length) {
    const tenors = gcData.value.current.map((t) => `${t.tenor}: ${t.rate}%`).slice(0, 8);
    snap.yields = tenors.join(", ");
  }

  if (ecoData.status === "fulfilled" && ecoData.value?.events?.length) {
    snap.calendar = ecoData.value.events
      .slice(0, 5)
      .map((e) => `${e.time || ""} ${e.country || "US"}: ${e.name} (Cons: ${e.consensus ?? "—"})`)
      .join(" | ");
  }

  if (topData.status === "fulfilled" && topData.value?.items?.length) {
    snap.headlines = topData.value.items.slice(0, 6).map((h) => h.title).join(" | ");
  }

  if (mostData.status === "fulfilled" && mostData.value) {
    const gainers = (mostData.value.gainers || []).slice(0, 3).map((g) => `${g.ticker} +${g.chgPct}%`).join(", ");
    const losers = (mostData.value.losers || []).slice(0, 3).map((l) => `${l.ticker} ${l.chgPct}%`).join(", ");
    snap.movers = `Gainers: ${gainers} | Losers: ${losers}`;
  }

  return snap;
}

export default async function handler(req, res, helpers) {
  const send = helpers?.send || ((r, status, body) => {
    const isStr = typeof body === "string" || Buffer.isBuffer(body);
    r.writeHead(status, { "Content-Type": isStr ? "text/plain; charset=utf-8" : "application/json" });
    r.end(isStr ? body : JSON.stringify(body));
  });

  const now = Date.now();
  const force = new URL(req.url, "http://localhost").searchParams.get("refresh") === "1";

  if (!force && cachedBrief && now < cacheExpiresAt) {
    return send(res, 200, { ...cachedBrief, cached: true });
  }

  try {
    const snapshot = await gatherMarketData();
    const compactText = sanitizeUntrusted(JSON.stringify(snapshot), 10000);

    const systemPrompt = `You are a Chief Market Strategist providing the morning brief for institutional trading desks.
Synthesize the provided cross-asset market data (equities, yields, Fed futures, top news, economic calendar).
Return a strict JSON object with this EXACT schema:
{
  "headline": "A sharp, insightful one-sentence summary of today's market regime and narrative",
  "bullets": [
    "Equities & sentiment: key moves and themes",
    "Rates & Fed: curve dynamics and futures pricing",
    "Macro & releases: today's critical economic data to watch",
    "Commodities & FX: crude, gold, or currency implications",
    "Single-stock movers or sector rotation highlights"
  ],
  "watchToday": ["Catalyst 1 (e.g. CPI print at 8:30 AM ET)", "Catalyst 2", "Catalyst 3"],
  "risks": ["Primary risk 1", "Primary risk 2"]
}
Rules:
- Strictly objective, professional, and data-backed.
- Exactly 5 bullet points.
- No investment advice. Output ONLY the JSON.`;

    const aiRes = await askGemini({
      system: systemPrompt,
      prompt: `Market Data Snapshot:\n${compactText}`,
      json: true,
      timeoutMs: 25000,
    });

    const parsed = aiRes.json || JSON.parse(aiRes.text);
    const result = {
      headline: parsed.headline || "Global Market Intelligence Brief",
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 5) : [],
      watchToday: Array.isArray(parsed.watchToday) ? parsed.watchToday.slice(0, 4) : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 3) : [],
      generatedAt: new Date().toISOString(),
      model: aiRes.model,
    };

    cachedBrief = result;
    cacheExpiresAt = now + BRIEF_CACHE_TTL_MS;

    return send(res, 200, result);
  } catch (err) {
    if (err instanceof GeminiAuthError || err.status === 503) {
      return send(res, 503, {
        error: "Gemini API key is not configured. Set GEMINI_API_KEY to enable automated market briefs.",
        code: "AUTH_MISSING",
      });
    }
    return send(res, 500, { error: err.message || "Failed to generate market brief" });
  }
}
