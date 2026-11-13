// public/js/fn/strategy-ai.js
// Natural language backtest builder and quant results explainer powered by Gemini.

import { esc, api, pct, num } from "../api.js";
import { html, sect, table } from "../ui.js";
import { backtest, EXAMPLE_STRATEGIES } from "../../lib/backtest.js";
import { quantChecks } from "../../lib/quant.js";

const STRAT_MAP = {
  ma_cross: "1 EMA cross (9/21)",
  rsi_meanrev: "2 RSI mean reversion (30/55)",
  supertrend: "3 Supertrend follow",
  macd: "4 MACD + 200 EMA trend filter",
  bollinger: "5 Bollinger breakout",
  vwap: "1 EMA cross (9/21)",
};

export default [
  {
    id: "BTST_AI",
    name: "Natural Language Backtester",
    group: "Strategy",
    needs: false,
    opts: [],
    source: "Google Gemini 2.5 + OpenBloom Quant Engine",
    async render(ctx) {
      const defaultTicker = ctx.sec ? (ctx.sec.ticker || ctx.sec.raw || "SPY") : "SPY";

      ctx.el.innerHTML = "";
      ctx.setTitle("AI Strategy Backtester");
      ctx.setSource("Gemini + Local Quant Engine");

      const card = html(`
        <div style="padding:10px; font-size:12px; line-height:1.5;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:6px; margin-bottom:12px;">
            <div>
              <span class="amber" style="font-weight:bold; font-size:13px;">🧠 NATURAL LANGUAGE STRATEGY TESTER</span>
              <span style="font-size:10px; background:#1e1e1e; color:#888; border:1px solid #444; border-radius:3px; padding:1px 5px; margin-left:8px;">Powered by Gemini</span>
            </div>
            <div style="font-size:10px; color:#666;">Describe rules in plain English</div>
          </div>

          <form class="nl-form" style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px;">
            <div style="display:flex; gap:8px;">
              <input type="text" class="nl-ticker" value="${esc(defaultTicker)}" placeholder="Ticker (e.g. NVDA, SPY)" style="width:120px; background:#161616; border:1px solid #333; color:#fff; padding:6px 10px; font-family:inherit; font-size:12px; border-radius:3px;" />
              <input type="text" class="nl-input" placeholder="e.g., Buy when 20 EMA crosses above 50 EMA, or Buy when RSI drops below 30" style="flex:1; background:#161616; border:1px solid #333; color:#fff; padding:6px 10px; font-family:inherit; font-size:12px; border-radius:3px;" />
              <button type="submit" style="background:#f59e0b; color:#000; font-weight:bold; border:none; padding:6px 16px; border-radius:3px; cursor:pointer;">PARSE & TEST</button>
            </div>
            <div style="font-size:11px; color:#777;">
              Examples: <span class="amber click-ex" style="cursor:pointer;">"Golden cross 50 and 200 EMA on SPY"</span> &middot; <span class="amber click-ex" style="cursor:pointer;">"Oversold RSI below 25 mean reversion on QQQ"</span>
            </div>
          </form>

          <div class="nl-results" style="display:none; background:#141414; border:1px solid #222; border-radius:4px; padding:12px;"></div>
        </div>
      `);

      ctx.el.append(card);

      const form = card.querySelector(".nl-form");
      const tickerInput = card.querySelector(".nl-ticker");
      const input = card.querySelector(".nl-input");
      const resultsDiv = card.querySelector(".nl-results");

      card.querySelectorAll(".click-ex").forEach((el) => {
        el.onclick = () => {
          input.value = el.textContent.replace(/^"|"$/g, "");
          form.dispatchEvent(new Event("submit"));
        };
      });

      form.onsubmit = async (e) => {
        e.preventDefault();
        const prompt = input.value.trim();
        const ticker = tickerInput.value.trim().toUpperCase() || "SPY";
        if (!prompt) return;

        resultsDiv.style.display = "block";
        resultsDiv.innerHTML = `<div class="loading">Parsing strategy with Gemini and compiling quant rules...</div>`;

        try {
          const parsed = await api.post("/api/strategy-ai", { prompt, ticker });

          // Fetch candles
          const tf = parsed.timeframe === "1h" ? "1h" : "1D";
          resultsDiv.innerHTML = `<div class="loading">Parsed: <b>${esc(parsed.strategy)}</b> (${esc(JSON.stringify(parsed.params))}). Fetching ${esc(ticker)} candles...</div>`;

          const candleRes = await api.candles(ticker, tf, 1500);
          const bars = candleRes?.candles || [];
          if (bars.length < 100) {
            resultsDiv.innerHTML = `<div class="err">Insufficient historical bars for ${esc(ticker)}. Try another symbol.</div>`;
            return;
          }

          // Build strategy object
          const baseKey = STRAT_MAP[parsed.strategy] || Object.keys(EXAMPLE_STRATEGIES)[0];
          const baseStrat = EXAMPLE_STRATEGIES[baseKey];
          const strat = {
            ...baseStrat,
            name: `${parsed.strategy} (${JSON.stringify(parsed.params)})`,
            feePct: 0.1,
            slippagePct: 0.05,
          };

          const runRes = backtest(bars, strat);
          const s = runRes.stats;
          const checks = quantChecks(runRes);

          resultsDiv.innerHTML = `
            <div style="border-bottom:1px solid #2a2a2a; padding-bottom:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <b class="amber" style="font-size:13px;">${esc(parsed.strategy.toUpperCase())}</b> on <b style="color:#fff;">${esc(ticker)}</b> (${bars.length} bars)
                <div style="font-size:11px; color:#888;">${esc(parsed.reasoning)}</div>
              </div>
              <button class="explain-strat-btn" style="background:#222; border:1px solid #f59e0b; color:#f59e0b; font-size:11px; padding:4px 10px; border-radius:3px; cursor:pointer;">🔍 Explain Risk with AI</button>
            </div>

            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin-bottom:12px;">
              <div style="background:#1a1a1a; padding:6px 8px; border-radius:3px;">
                <div style="font-size:10px; color:#888;">Net Profit</div>
                <div style="font-size:14px; font-weight:bold; color:${s.netProfitPct >= 0 ? '#10b981' : '#ef4444'};">${pct(s.netProfitPct)}</div>
              </div>
              <div style="background:#1a1a1a; padding:6px 8px; border-radius:3px;">
                <div style="font-size:10px; color:#888;">Sharpe Ratio</div>
                <div style="font-size:14px; font-weight:bold; color:#fff;">${num(s.sharpe, 2)}</div>
              </div>
              <div style="background:#1a1a1a; padding:6px 8px; border-radius:3px;">
                <div style="font-size:10px; color:#888;">Max Drawdown</div>
                <div style="font-size:14px; font-weight:bold; color:#ef4444;">${pct(s.maxDrawdownPct)}</div>
              </div>
              <div style="background:#1a1a1a; padding:6px 8px; border-radius:3px;">
                <div style="font-size:10px; color:#888;">Win Rate (${s.trades} trades)</div>
                <div style="font-size:14px; font-weight:bold; color:#fff;">${pct(s.winRatePct)}</div>
              </div>
            </div>

            <div class="strat-ai-explanation" style="display:none; background:#1e1e1e; border-left:3px solid #f59e0b; padding:10px; margin-top:10px; font-size:11px; line-height:1.4;"></div>
          `;

          const explainBtn = resultsDiv.querySelector(".explain-strat-btn");
          const explDiv = resultsDiv.querySelector(".strat-ai-explanation");

          explainBtn.onclick = async () => {
            explDiv.style.display = "block";
            explDiv.innerHTML = `<div class="loading">Analyzing backtest distributions and overfitting risk with Gemini...</div>`;

            try {
              const res = await api.post("/api/strategy-ai", {
                explain: true,
                ticker,
                strategy: parsed.strategy,
                metrics: {
                  netProfitPct: s.netProfitPct,
                  sharpe: s.sharpe,
                  sortino: s.sortino,
                  maxDrawdownPct: s.maxDrawdownPct,
                  winRatePct: s.winRatePct,
                  profitFactor: s.profitFactor,
                  trades: s.trades,
                },
              });
              explDiv.innerHTML = `
                <div style="color:#f59e0b; font-weight:bold; margin-bottom:4px;">Gemini Quant Review:</div>
                <div style="color:#ddd; white-space:pre-wrap;">${esc(res.explanation)}</div>
              `;
            } catch (err) {
              explDiv.innerHTML = `<span style="color:#ef4444;">Error: ${esc(err.message)}</span>`;
            }
          };
        } catch (err) {
          resultsDiv.innerHTML = `<span style="color:#ef4444;">Failed to parse or run strategy: ${esc(err.message)}</span>`;
        }
      };
    },
  },
];
