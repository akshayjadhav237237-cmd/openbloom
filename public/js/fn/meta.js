// HELP lists every function; DATA says where each one's numbers come from and how fresh they are.
import { esc } from "../api.js";
import { table, sect, html } from "../ui.js";
import { FUNCS } from "./index.js";

const groups = () => {
  const g = {};
  for (const f of Object.values(FUNCS)) (g[f.group || "Other"] ||= []).push(f);
  return g;
};

export default [
  {
    id: "HELP",
    name: "Functions",
    group: "Help",
    source: "This app",
    render(ctx) {
      ctx.el.innerHTML = "";
      ctx.el.append(
        html(
          `<p class="para">Type a security, then a function, then press Enter (that's GO). <b class="amber">AAPL US EQUITY DES</b>, <b class="amber">VOD LN DES</b>, <b class="amber">SPX INDEX GP</b>, <b class="amber">CL1 COMDTY GP</b>, <b class="amber">EURUSD CURNCY GP</b>, <b class="amber">BTC GP</b>. A function on its own runs on the panel's last security, or market-wide (WEI, TOP, ECO, BRIEF). Esc goes back. Ctrl or Cmd plus 1 to 4 picks a panel. Type LAYOUT 1, 2 or 4 in the top bar to change the grid.</p>
          <div style="background:#161616; border:1px solid #333; padding:10px; border-radius:4px; margin-bottom:12px;">
            <b class="amber">⚡ KEYBOARD SHORTCUTS CHEAT SHEET:</b>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:6px; margin-top:6px; font-size:11px;">
              <div><code class="amber">F1</code> : Open HELP reference</div>
              <div><code class="amber">F2</code> : GOVT yellow key</div>
              <div><code class="amber">F8</code> : EQUITY yellow key</div>
              <div><code class="amber">F9</code> : CMDTY yellow key</div>
              <div><code class="amber">F10</code> : INDEX yellow key</div>
              <div><code class="amber">F11</code> : CRNCY yellow key</div>
              <div><code class="amber">Ctrl/Cmd + 1..4</code> : Focus panel 1-4</div>
              <div><code class="amber">/</code> : Focus top command bar</div>
              <div><code class="amber">Up/Down Arrows</code> : Recall past commands</div>
              <div><code class="amber">Esc</code> : Step back / close modals</div>
            </div>
          </div>`,
        ),
      );
      for (const [g, list] of Object.entries(groups())) {
        ctx.el.append(sect(g));
        ctx.el.append(
          table(
            list,
            [
              { key: "id", label: "Code", left: true, lbl: true },
              { key: "name", label: "What it shows", left: true },
              {
                key: (f) => (f.needs ? "needs a security" : "market-wide"),
                label: "",
                left: true,
                cls: () => "dim",
              },
            ],
            { onRow: (f) => ctx.go(f.id) },
          ),
        );
      }
      ctx.setSource("Click a row to open it");
    },
  },
  {
    id: "DATA",
    name: "Where the data comes from",
    group: "Help",
    source: "This app",
    render(ctx) {
      ctx.el.innerHTML = "";
      ctx.el.append(
        html(
          `<p class="para">Every number here comes from a public source that needs no account and no API key. Crypto prices stream live from the exchanges. Stock, index and futures prices are public quotes that can run up to 15 minutes behind on some exchanges. It is not a paid exchange feed, so use your broker's prices to place orders.</p><p class="para dim">Charts are drawn with <a href="https://www.tradingview.com/" target="_blank" rel="noopener">TradingView Lightweight Charts™</a>, Copyright TradingView, Inc., used under the Apache License 2.0.</p>`,
        ),
      );
      ctx.el.append(
        table(
          Object.values(FUNCS).filter((f) => f.group !== "Help"),
          [
            { key: "id", label: "Code", left: true, lbl: true },
            { key: "name", label: "Function", left: true },
            {
              key: "source",
              label: "Source and freshness",
              left: true,
              wrap: true,
            },
          ],
          { onRow: (f) => ctx.go(f.id) },
        ),
      );
      ctx.setSource("No keys, no accounts, no paid feeds");
    },
  },
];
