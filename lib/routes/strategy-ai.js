// lib/routes/strategy-ai.js
// Natural language strategy generator & results explainer powered by Gemini.

import { askGemini, GeminiAuthError } from "../ai/gemini.js";
import { sanitizeUntrusted } from "../ai/guard.js";

const VALID_STRATEGIES = ["ma_cross", "rsi_meanrev", "bollinger", "supertrend", "macd", "vwap"];

function validateStrategyParams(strat, params) {
  if (!VALID_STRATEGIES.includes(strat)) {
    throw new Error(`Unsupported strategy '${strat}'. Supported: ${VALID_STRATEGIES.join(", ")}`);
  }

  const p = params || {};
  switch (strat) {
    case "ma_cross": {
      const fast = Number(p.fast || 9);
      const slow = Number(p.slow || 21);
      if (fast < 2 || fast > 100) throw new Error("Fast MA length must be between 2 and 100");
      if (slow < 5 || slow > 300) throw new Error("Slow MA length must be between 5 and 300");
      if (fast >= slow) throw new Error("Fast MA length must be less than slow MA length");
      return { fast, slow };
    }
    case "rsi_meanrev": {
      const length = Number(p.length || 14);
      const oversold = Number(p.oversold || 30);
      const overbought = Number(p.overbought || 70);
      if (length < 2 || length > 50) throw new Error("RSI length must be between 2 and 50");
      if (oversold < 5 || oversold > 45) throw new Error("Oversold threshold must be between 5 and 45");
      if (overbought < 55 || overbought > 95) throw new Error("Overbought threshold must be between 55 and 95");
      return { length, oversold, overbought };
    }
    case "bollinger": {
      const length = Number(p.length || 20);
      const mult = Number(p.mult || 2);
      if (length < 5 || length > 100) throw new Error("Bollinger length must be between 5 and 100");
      if (mult < 0.5 || mult > 4) throw new Error("Bollinger multiplier must be between 0.5 and 4.0");
      return { length, mult };
    }
    case "supertrend": {
      const atrLength = Number(p.atrLength || 10);
      const factor = Number(p.factor || 3);
      if (atrLength < 3 || atrLength > 50) throw new Error("Supertrend ATR length must be between 3 and 50");
      if (factor < 1 || factor > 10) throw new Error("Supertrend factor must be between 1 and 10");
      return { atrLength, factor };
    }
    case "macd": {
      const fast = Number(p.fast || 12);
      const slow = Number(p.slow || 26);
      const signal = Number(p.signal || 9);
      if (fast < 2 || fast > 50) throw new Error("MACD fast length must be between 2 and 50");
      if (slow < 5 || slow > 100) throw new Error("MACD slow length must be between 5 and 100");
      if (fast >= slow) throw new Error("MACD fast must be less than slow length");
      if (signal < 2 || signal > 30) throw new Error("MACD signal length must be between 2 and 30");
      return { fast, slow, signal };
    }
    case "vwap": {
      const anchor = ["day", "week", "month"].includes(p.anchor) ? p.anchor : "day";
      return { anchor };
    }
  }
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

  // Mode 2: Explain backtest results
  if (body.explain) {
    const { metrics, ticker, strategy } = body;
    if (!metrics) {
      return send(res, 400, { error: "Missing 'metrics' for explanation" });
    }

    try {
      const prompt = `You are an institutional quant researcher reviewing a trading strategy backtest.
Target: ${ticker || "Security"}
Strategy: ${strategy || "Custom"}
Performance Metrics:
- Net Profit: ${metrics.netProfitPct || 0}%
- Sharpe Ratio: ${metrics.sharpe || "N/A"}
- Sortino Ratio: ${metrics.sortino || "N/A"}
- Max Drawdown: ${metrics.maxDrawdownPct || 0}%
- Win Rate: ${metrics.winRatePct || 0}%
- Profit Factor: ${metrics.profitFactor || "N/A"}
- Total Trades: ${metrics.trades || 0}

Provide a concise critique (max 150 words):
1. Is the sample size statistically meaningful?
2. Assess risk-adjusted returns (Sharpe/Sortino vs Drawdown).
3. Warn about potential curve fitting (overfitting) or regime risk.`;

      const aiRes = await askGemini({
        system: "You are OpenBloom's institutional quant analyst. Deliver concise, candid, math-grounded risk critique. No fluff, max 150 words.",
        prompt,
      });

      return send(res, 200, { explanation: aiRes.text, model: aiRes.model });
    } catch (err) {
      if (err instanceof GeminiAuthError || err.status === 503) {
        return send(res, 503, { error: "Gemini API key is not configured.", code: "AUTH_MISSING" });
      }
      return send(res, 500, { error: err.message });
    }
  }

  // Mode 1: Natural Language Strategy Parsing
  const { prompt, ticker } = body;
  if (!prompt || typeof prompt !== "string") {
    return send(res, 400, { error: "Missing 'prompt' describing the strategy" });
  }

  const cleanPrompt = sanitizeUntrusted(prompt, 500);

  const system = `You are a quantitative trading system parser. Convert a natural language description into a structured trading rule.
You can ONLY choose from these 6 supported strategies:
1. "ma_cross" - Moving Average Cross. Params: { fast: number (default 9), slow: number (default 21) }
2. "rsi_meanrev" - RSI Mean Reversion. Params: { length: number (default 14), oversold: number (default 30), overbought: number (default 70) }
3. "bollinger" - Bollinger Bands Breakout. Params: { length: number (default 20), mult: number (default 2.0) }
4. "supertrend" - Supertrend Trend Follow. Params: { atrLength: number (default 10), factor: number (default 3.0) }
5. "macd" - MACD Crossover. Params: { fast: number (default 12), slow: number (default 26), signal: number (default 9) }
6. "vwap" - VWAP Reversion. Params: { anchor: "day" | "week" | "month" }

Return a strict JSON object:
{
  "strategy": "ma_cross" | "rsi_meanrev" | "bollinger" | "supertrend" | "macd" | "vwap",
  "params": { ... },
  "ticker": string (ticker if mentioned in prompt, e.g. "NVDA", else ""),
  "timeframe": "1D" | "1h" | "1W",
  "reasoning": "One line summary of parsed rules"
}`;

  try {
    const aiRes = await askGemini({
      system,
      prompt: `User rule: "${cleanPrompt}"`,
      json: true,
      timeoutMs: 20000,
    });

    const parsed = aiRes.json || JSON.parse(aiRes.text);
    const validParams = validateStrategyParams(parsed.strategy, parsed.params);

    return send(res, 200, {
      strategy: parsed.strategy,
      params: validParams,
      ticker: parsed.ticker || ticker || "",
      timeframe: parsed.timeframe || "1D",
      reasoning: parsed.reasoning || "Parsed successfully.",
      model: aiRes.model,
    });
  } catch (err) {
    if (err instanceof GeminiAuthError || err.status === 503) {
      return send(res, 503, { error: "Gemini API key is not configured.", code: "AUTH_MISSING" });
    }
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 400;
    return send(res, status, { error: err.message || "Failed to parse strategy description" });
  }
}
