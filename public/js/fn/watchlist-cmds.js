// public/js/fn/watchlist-cmds.js
// Custom user watchlist screen with persistent local storage.

import { esc, api, pct, num, cls } from "../api.js";
import { html, sect, table } from "../ui.js";
import * as storage from "../storage.js";

const DEFAULT_SYMBOLS = ["SPY", "QQQ", "AAPL", "NVDA", "MSFT", "BTC", "GLD"];

function getWatchlist() {
  return storage.get("watchlist_tickers", DEFAULT_SYMBOLS);
}

function saveWatchlist(list) {
  storage.set("watchlist_tickers", list);
}

export default [
  {
    id: "WL",
    name: "Custom Watchlist",
    group: "Workspace",
    needs: false,
    opts: ["ADD", "DEL", "CLEAR"],
    source: "Live Quotes + Client Storage",
    async render(ctx) {
      let tickers = getWatchlist();
      const action = (ctx.args[0] || "").toUpperCase();
      const symbolArg = (ctx.args[1] || "").toUpperCase();

      if (action === "ADD" && symbolArg) {
        if (!tickers.includes(symbolArg)) {
          tickers.push(symbolArg);
          saveWatchlist(tickers);
          ctx.toast(`Added ${symbolArg} to watchlist`);
        }
      } else if (action === "DEL" && symbolArg) {
        tickers = tickers.filter((t) => t !== symbolArg);
        saveWatchlist(tickers);
        ctx.toast(`Removed ${symbolArg} from watchlist`);
      } else if (action === "CLEAR") {
        saveWatchlist([]);
        tickers = [];
        ctx.toast("Watchlist cleared");
      }

      ctx.el.innerHTML = "";
      ctx.setTitle("Personal Watchlist");
      ctx.setSource("Live Exchange Feeds");

      const container = html(`
        <div style="padding:10px; font-size:12px; line-height:1.5;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:6px; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="amber" style="font-weight:bold; font-size:13px;">⭐ WATCHLIST (${tickers.length} tickers)</span>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="wl-reset-btn" style="background:#222; border:1px solid #444; color:#888; font-size:10px; padding:2px 8px; border-radius:3px; cursor:pointer;">Reset Defaults</button>
            </div>
          </div>

          <form class="wl-add-form" style="display:flex; gap:6px; margin-bottom:12px;">
            <input type="text" class="wl-add-input" placeholder="Add ticker (e.g. AMZN, TSLA, ETH)..." style="background:#161616; border:1px solid #333; color:#fff; padding:5px 8px; font-size:12px; border-radius:3px; width:220px;" />
            <button type="submit" style="background:#f59e0b; color:#000; font-weight:bold; border:none; padding:5px 12px; font-size:12px; border-radius:3px; cursor:pointer;">ADD</button>
          </form>

          <div class="wl-table-wrap">
            <div class="loading">Fetching quotes for watchlist securities...</div>
          </div>
        </div>
      `);

      ctx.el.append(container);

      const tableWrap = container.querySelector(".wl-table-wrap");
      const addForm = container.querySelector(".wl-add-form");
      const addInput = container.querySelector(".wl-add-input");
      const resetBtn = container.querySelector(".wl-reset-btn");

      resetBtn.onclick = () => {
        saveWatchlist(DEFAULT_SYMBOLS);
        ctx.go("WL");
      };

      addForm.onsubmit = (e) => {
        e.preventDefault();
        const sym = addInput.value.trim().toUpperCase();
        if (sym) {
          ctx.go(`WL ADD ${sym}`);
        }
      };

      if (!tickers.length) {
        tableWrap.innerHTML = `<div class="hint">Your watchlist is currently empty. Add tickers using the bar above or type <b>WL ADD &lt;TICKER&gt;</b>.</div>`;
        return;
      }

      try {
        const quotes = await api.quotes(tickers);
        const rows = tickers.map((sym) => {
          const q = (quotes && quotes[sym]) || {};
          return {
            symbol: sym,
            price: q.price ?? null,
            change: q.change ?? null,
            changePct: q.changePct ?? null,
            high: q.high ?? null,
            low: q.low ?? null,
            volume: q.volume ?? null,
          };
        });

        tableWrap.innerHTML = "";
        tableWrap.append(
          table(
            rows,
            [
              { key: "symbol", label: "Ticker", left: true, lbl: true },
              {
                key: "price",
                label: "Last Price",
                fmt: (v) => (v != null ? num(v, 2) : "—"),
              },
              {
                key: "changePct",
                label: "Change %",
                cls: (v) => cls(v),
                fmt: (v) => (v != null ? pct(v) : "—"),
              },
              {
                key: "high",
                label: "High",
                fmt: (v) => (v != null ? num(v, 2) : "—"),
                cls: () => "dim",
              },
              {
                key: "low",
                label: "Low",
                fmt: (v) => (v != null ? num(v, 2) : "—"),
                cls: () => "dim",
              },
              {
                key: "volume",
                label: "Volume",
                fmt: (v) => (v != null ? Number(v).toLocaleString() : "—"),
                cls: () => "dim",
              },
              {
                key: () => "Remove",
                label: "",
                left: true,
                html: true,
                fmt: (_, r) =>
                  `<button class="wl-del-btn" data-sym="${esc(r.symbol)}" style="background:transparent; border:none; color:#ef4444; font-size:11px; cursor:pointer;">✕</button>`,
              },
            ],
            {
              onRow: (r) => ctx.go(`${r.symbol} DES`),
            }
          )
        );

        tableWrap.querySelectorAll(".wl-del-btn").forEach((btn) => {
          btn.onclick = (e) => {
            e.stopPropagation();
            ctx.go(`WL DEL ${btn.dataset.sym}`);
          };
        });
      } catch (err) {
        tableWrap.innerHTML = `<span style="color:#ef4444;">Failed to load quotes: ${esc(err.message)}</span>`;
      }
    },
  },
];
