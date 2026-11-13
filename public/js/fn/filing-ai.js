// public/js/fn/filing-ai.js
// SEC Filing Summarizer screen powered by Gemini

import { esc, api } from "../api.js";
import { html, sect, table } from "../ui.js";

export default [
  {
    id: "CF_AI",
    name: "Filing AI Summary",
    group: "Equities",
    needs: true,
    source: "SEC EDGAR & Google Gemini",
    opts: ["10-K", "10-Q", "8-K"],
    async render(ctx) {
      const ticker = ctx.sec ? (ctx.sec.ticker || ctx.sec.raw || "") : "";
      const form = ctx.args[0] || "10-K";

      ctx.el.innerHTML = "";
      ctx.setTitle(`${ticker} ${form} AI Summary`);
      ctx.setSource("SEC EDGAR + Gemini");

      ctx.el.innerHTML = `
        <div style="padding:10px; font-size:12px; line-height:1.5;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:6px; margin-bottom:12px;">
            <div>
              <span class="amber" style="font-weight:bold; font-size:13px;">📑 SEC ${esc(form)} AI SUMMARY: ${esc(ticker)}</span>
              <span style="font-size:10px; background:#1e1e1e; color:#888; border:1px solid #444; border-radius:3px; padding:1px 5px; margin-left:8px;">Powered by Gemini</span>
            </div>
            <div style="font-size:10px; color:#666;">Official SEC EDGAR Filing Analysis</div>
          </div>
          <div class="cf-ai-container" style="background:#161616; border:1px solid #2a2a2a; border-radius:4px; padding:12px; color:#eee;">
            <div class="loading">Locating latest ${esc(form)} filing for ${esc(ticker)}...</div>
          </div>
        </div>
      `;

      const container = ctx.el.querySelector(".cf-ai-container");

      try {
        // First fetch filing list to get latest accession number and URL
        const filingsData = await api.fn("cf", { symbol: ticker, form });
        const latestFiling = (filingsData.filings || []).find((f) => f.form === form) || filingsData.filings?.[0];

        if (!latestFiling || !latestFiling.url) {
          container.innerHTML = `<div class="hint">No recent ${esc(form)} filings found for ${esc(ticker)}.</div>`;
          return;
        }

        container.innerHTML = `<div class="loading">Analyzing ${esc(latestFiling.form)} filed on ${esc(latestFiling.filed)} with Gemini...</div>`;

        const summary = await api.post("/api/filing-ai", {
          url: latestFiling.url,
          accessionNumber: latestFiling.accessionNumber,
          form: latestFiling.form,
          ticker,
        });

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span style="color:#aaa;">Filed: <b style="color:#fff;">${esc(latestFiling.filed)}</b> (Period: ${esc(latestFiling.period || "Latest")})</span>
            <a href="${esc(latestFiling.url)}" target="_blank" rel="noopener" style="color:#f59e0b; text-decoration:none;">Open Official SEC Filing ↗</a>
          </div>
          <div style="background:#222; border-left:3px solid #f59e0b; padding:8px 12px; margin-bottom:14px; font-weight:bold; color:#fff;">
            ${esc(summary.verdict)}
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
            <div>
              <div class="amber" style="font-size:12px; margin-bottom:6px; font-weight:bold;">Key Takeaways</div>
              <ul style="margin:0; padding-left:16px; color:#ddd; font-size:11px; line-height:1.5;">
                ${(summary.keyPoints || []).map((p) => `<li style="margin-bottom:4px;">${esc(p)}</li>`).join("")}
              </ul>
            </div>
            <div>
              <div style="color:#ef4444; font-size:12px; margin-bottom:6px; font-weight:bold;">Primary Risks Disclosed</div>
              <ul style="margin:0; padding-left:16px; color:#ddd; font-size:11px; line-height:1.5;">
                ${(summary.risks || []).map((r) => `<li style="margin-bottom:4px;">${esc(r)}</li>`).join("")}
              </ul>
            </div>
          </div>
          ${summary.changes?.length ? `
            <div style="margin-top:14px; border-top:1px solid #2a2a2a; padding-top:8px;">
              <div class="amber" style="font-size:12px; margin-bottom:4px; font-weight:bold;">Operational & Strategic Changes</div>
              <ul style="margin:0; padding-left:16px; color:#aaa; font-size:11px;">
                ${summary.changes.map((c) => `<li style="margin-bottom:3px;">${esc(c)}</li>`).join("")}
              </ul>
            </div>
          ` : ""}
        `;
      } catch (err) {
        container.innerHTML = `<span style="color:#ef4444;">Error: ${esc(err.message || "Failed to generate summary")}</span>`;
      }
    },
  },
];
