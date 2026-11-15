// public/js/fn/ai.js
// Interactive AI market analyst commands: AI and EXPLAIN

import { esc, api } from "../api.js";
import { html, sect } from "../ui.js";

/**
 * Collects a clean text/JSON representation of the active panel content
 * to serve as context for the AI prompt.
 * @param {Object} ctx
 * @returns {string}
 */
function extractPanelContext(ctx) {
  const panel = ctx.panel;
  if (!panel || !panel.body) return "";

  // Attempt to extract text content, stripping excess whitespace
  const rawText = panel.body.innerText || panel.body.textContent || "";
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 120); // Top 120 lines to keep context tight

  return lines.join("\n");
}

export default [
  {
    id: "AI",
    name: "Gemini Analyst",
    group: "AI",
    source: "Google Gemini 2.5",
    needs: false,
    opts: [],
    async render(ctx) {
      const ticker = ctx.sec ? (ctx.sec.ticker || ctx.sec.raw || "") : "";
      const initialQuestion = ctx.args && ctx.args.length ? ctx.args.join(" ") : "";

      ctx.el.innerHTML = "";
      ctx.setTitle(ticker ? `${ticker} AI Analyst` : "Market Analyst AI");
      ctx.setSource("Google Gemini");

      const container = html(`
        <div class="ai-chat-wrap" style="display:flex; flex-direction:column; height:100%; box-sizing:border-box; padding:4px;">
          <div class="ai-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:6px; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="amber" style="font-weight:bold; font-size:13px;">🌸 OPENBLOOM AI</span>
              <span style="font-size:10px; background:#1e1e1e; color:#888; border:1px solid #444; border-radius:3px; padding:1px 5px;">Powered by Gemini</span>
            </div>
            <div style="font-size:10px; color:#666;">Educational only · Not financial advice</div>
          </div>

          <div class="ai-context-banner" style="font-size:11px; color:#aaa; background:#121212; border:1px solid #222; border-radius:3px; padding:4px 8px; margin-bottom:8px;">
            Target: <b class="amber">${esc(ticker || "Macro / Market-Wide")}</b>
            ${ctx.panel && ctx.panel.fn ? ` &middot; Active Screen: <span style="color:#fff;">${esc(ctx.panel.fn)}</span>` : ""}
          </div>

          <div class="ai-messages" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-right:4px;">
            <div class="ai-msg ai-assistant" style="background:#161616; border-left:3px solid #f59e0b; padding:8px 10px; border-radius:0 4px 4px 0; font-size:12px; line-height:1.5;">
              Hello! I am your OpenBloom terminal analyst powered by Google Gemini. Ask me about valuation, technical trends, options positioning, or macro risks.
            </div>
          </div>

          <form class="ai-form" style="display:flex; gap:6px; margin-top:8px;">
            <input type="text" class="ai-input" placeholder="Ask a question about ${esc(ticker || 'the market')}..." spellcheck="false" style="flex:1; background:#1a1a1a; border:1px solid #333; color:#eee; padding:6px 10px; font-family:inherit; font-size:12px; border-radius:3px;" />
            <button type="submit" class="ai-submit" style="background:#f59e0b; color:#000; border:none; padding:6px 14px; font-weight:bold; font-size:12px; border-radius:3px; cursor:pointer;">ASK</button>
          </form>
        </div>
      `);

      ctx.el.append(container);

      const msgBox = container.querySelector(".ai-messages");
      const form = container.querySelector(".ai-form");
      const input = container.querySelector(".ai-input");

      const appendMessage = (role, text) => {
        const d = document.createElement("div");
        d.className = `ai-msg ai-${role}`;
        d.style.cssText =
          role === "user"
            ? "background:#222; border-right:3px solid #888; align-self:flex-end; max-width:85%; padding:6px 10px; border-radius:4px 0 0 4px; font-size:12px; line-height:1.4;"
            : "background:#161616; border-left:3px solid #f59e0b; align-self:flex-start; max-width:95%; padding:8px 10px; border-radius:0 4px 4px 0; font-size:12px; line-height:1.5; white-space:pre-wrap;";

        // Strict escaping of all AI output
        d.textContent = text;
        msgBox.append(d);
        msgBox.scrollTop = msgBox.scrollHeight;
        return d;
      };

      const ask = async (question) => {
        if (!question.trim()) return;
        appendMessage("user", question);
        input.value = "";
        input.disabled = true;

        const loadingDiv = appendMessage("assistant", "Analyzing market data with Gemini...");
        loadingDiv.style.color = "#888";

        try {
          const context = extractPanelContext(ctx);
          const res = await api.post("/api/ai", {
            question,
            context,
            ticker,
            fn: ctx.panel?.fn || "AI",
          });

          loadingDiv.style.color = "#eee";
          loadingDiv.textContent = res.answer || "No response received.";
        } catch (err) {
          loadingDiv.style.color = "#ef4444";
          loadingDiv.style.borderLeftColor = "#ef4444";
          loadingDiv.textContent = `Error: ${err.message || "Failed to reach AI service."}`;
        } finally {
          input.disabled = false;
          input.focus();
          msgBox.scrollTop = msgBox.scrollHeight;
        }
      };

      form.onsubmit = (e) => {
        e.preventDefault();
        ask(input.value);
      };

      if (initialQuestion) {
        ask(initialQuestion);
      } else {
        input.focus();
      }
    },
  },

  {
    id: "EXPLAIN",
    name: "Explain Screen",
    group: "AI",
    source: "Google Gemini 2.5",
    needs: false,
    opts: [],
    async render(ctx) {
      const targetFn = ctx.panel?.fn || "current screen";
      const ticker = ctx.sec ? (ctx.sec.ticker || ctx.sec.raw || "") : "";

      ctx.el.innerHTML = "";
      ctx.setTitle(`Explain: ${ticker ? `${ticker} ` : ""}${targetFn}`);
      ctx.setSource("Google Gemini");

      const card = html(`
        <div class="explain-wrap" style="padding:10px; font-size:12px; line-height:1.5;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:6px; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="amber" style="font-weight:bold; font-size:13px;">💡 SCREEN EXPLAINER</span>
              <span style="font-size:10px; background:#1e1e1e; color:#888; border:1px solid #444; border-radius:3px; padding:1px 5px;">Powered by Gemini</span>
            </div>
            <div style="font-size:10px; color:#666;">Educational only &middot; Not financial advice</div>
          </div>
          <div class="explain-body" style="background:#161616; border:1px solid #2a2a2a; border-radius:4px; padding:12px; white-space:pre-wrap; color:#eee;">
            <div class="loading">Collecting active panel metrics and requesting Gemini explanation...</div>
          </div>
          <div style="margin-top:12px; display:flex; justify-content:flex-end;">
            <button class="re-explain-btn" style="background:#222; color:#ccc; border:1px solid #444; padding:5px 12px; font-size:11px; border-radius:3px; cursor:pointer;">Refresh Explanation</button>
          </div>
        </div>
      `);

      ctx.el.append(card);
      const bodyEl = card.querySelector(".explain-body");
      const refreshBtn = card.querySelector(".re-explain-btn");

      const fetchExplanation = async () => {
        bodyEl.innerHTML = `<div class="loading">Analyzing active screen data with Gemini...</div>`;
        const context = extractPanelContext(ctx);

        try {
          const prompt = `Analyze this ${targetFn} screen data for ${ticker || "the market"}. Break down: 1) What the key figures indicate, 2) Notable shifts or anomalies, 3) Key risk factors to watch. Keep it under 200 words.`;
          const res = await api.post("/api/ai", {
            question: prompt,
            context,
            ticker,
            fn: targetFn,
          });

          // Escape before writing to DOM
          bodyEl.textContent = res.answer || "No explanation provided.";
        } catch (err) {
          bodyEl.innerHTML = `<span style="color:#ef4444;">Error: ${esc(err.message || "Failed to generate explanation")}</span><div style="margin-top:8px; font-size:11px; color:#888;">Ensure GEMINI_API_KEY is configured in your environment.</div>`;
        }
      };

      refreshBtn.onclick = fetchExplanation;
      await fetchExplanation();
    },
  },
];
