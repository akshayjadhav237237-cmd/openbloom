// public/js/fn/brief.js
// Morning market brief screen powered by cross-asset data and Gemini.

import { esc, api } from "../api.js";
import { html, sect } from "../ui.js";

export default [
  {
    id: "BRIEF",
    name: "Morning Market Brief",
    group: "Market",
    needs: false,
    opts: [],
    source: "Cross-asset feeds & Google Gemini",
    async render(ctx) {
      ctx.el.innerHTML = "";
      ctx.setTitle("Morning Market Brief");
      ctx.setSource("Gemini + OpenBloom Core Feeds");

      const container = html(`
        <div style="padding:10px; font-size:12px; line-height:1.5; max-width:900px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:8px; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="amber" style="font-weight:bold; font-size:14px;">☕ MORNING MARKET BRIEF</span>
              <span style="font-size:10px; background:#1e1e1e; color:#888; border:1px solid #444; border-radius:3px; padding:1px 5px;">Powered by Gemini</span>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="brief-copy-btn" style="background:#222; border:1px solid #444; color:#eee; font-size:11px; padding:4px 10px; border-radius:3px; cursor:pointer;">📋 Copy as Text</button>
              <button class="brief-refresh-btn" style="background:#1a1a1a; border:1px solid #f59e0b; color:#f59e0b; font-size:11px; padding:4px 10px; border-radius:3px; cursor:pointer;">🔄 Refresh</button>
            </div>
          </div>

          <div class="brief-content" style="background:#141414; border:1px solid #222; border-radius:4px; padding:14px;">
            <div class="loading">Synthesizing global equities, rates, yields, and news with Gemini...</div>
          </div>
        </div>
      `);

      ctx.el.append(container);

      const contentBox = container.querySelector(".brief-content");
      const copyBtn = container.querySelector(".brief-copy-btn");
      const refreshBtn = container.querySelector(".brief-refresh-btn");

      let latestData = null;

      const load = async (force = false) => {
        contentBox.innerHTML = `<div class="loading">Compiling real-time market brief with Gemini...</div>`;
        try {
          const res = await api.get(`/api/brief${force ? "?refresh=1" : ""}`);
          latestData = res;

          contentBox.innerHTML = `
            <div style="font-size:15px; font-weight:bold; color:#fff; border-left:3px solid #f59e0b; padding-left:10px; margin-bottom:14px; line-height:1.4;">
              ${esc(res.headline)}
            </div>

            <div style="margin-bottom:14px;">
              <div class="amber" style="font-size:12px; font-weight:bold; margin-bottom:6px;">Key Market Drivers</div>
              <ul style="margin:0; padding-left:18px; color:#ddd; font-size:12px; line-height:1.6;">
                ${(res.bullets || []).map((b) => `<li style="margin-bottom:4px;">${esc(b)}</li>`).join("")}
              </ul>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; border-top:1px solid #222; padding-top:12px;">
              <div>
                <div style="color:#10b981; font-size:12px; font-weight:bold; margin-bottom:6px;">Catalysts to Watch Today</div>
                <ul style="margin:0; padding-left:16px; color:#aaa; font-size:11px; line-height:1.5;">
                  ${(res.watchToday || []).map((w) => `<li style="margin-bottom:3px;">${esc(w)}</li>`).join("")}
                </ul>
              </div>
              <div>
                <div style="color:#ef4444; font-size:12px; font-weight:bold; margin-bottom:6px;">Macro & Market Risks</div>
                <ul style="margin:0; padding-left:16px; color:#aaa; font-size:11px; line-height:1.5;">
                  ${(res.risks || []).map((r) => `<li style="margin-bottom:3px;">${esc(r)}</li>`).join("")}
                </ul>
              </div>
            </div>

            <div style="margin-top:14px; font-size:10px; color:#666; text-align:right;">
              Generated ${new Date(res.generatedAt || Date.now()).toLocaleTimeString()} &middot; ${res.cached ? "[cached]" : "Live"} &middot; Educational only
            </div>
          `;
        } catch (err) {
          contentBox.innerHTML = `
            <div style="color:#ef4444;">Failed to generate brief: ${esc(err.message)}</div>
            <div style="margin-top:8px; font-size:11px; color:#888;">Ensure GEMINI_API_KEY is configured in your server environment.</div>
          `;
        }
      };

      copyBtn.onclick = () => {
        if (!latestData) return;
        const text = [
          `# ${latestData.headline}`,
          "",
          "## Key Market Drivers",
          ...(latestData.bullets || []).map((b) => `- ${b}`),
          "",
          "## Catalysts to Watch Today",
          ...(latestData.watchToday || []).map((w) => `- ${w}`),
          "",
          "## Macro & Market Risks",
          ...(latestData.risks || []).map((r) => `- ${r}`),
          "",
          `*Generated by OpenBloom on ${new Date().toLocaleDateString()}*`,
        ].join("\n");

        navigator.clipboard?.writeText(text);
        copyBtn.textContent = "✓ Copied!";
        setTimeout(() => (copyBtn.textContent = "📋 Copy as Text"), 2000);
      };

      refreshBtn.onclick = () => load(true);
      await load();
    },
  },
];
