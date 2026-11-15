// public/js/fn/alerts-cmds.js
// Price and technical alert command module: ALRT

import { esc, api, num, cls } from "../api.js";
import { html, sect, table } from "../ui.js";
import * as storage from "../storage.js";
import { parseRule, evaluateRule } from "../../lib/alerts-core.js";

function getAlerts() {
  return storage.get("active_alerts", []);
}

function saveAlerts(alerts) {
  storage.set("active_alerts", alerts);
}

function getAlertHistory() {
  return storage.get("alert_history", []);
}

function recordHistory(event) {
  const history = getAlertHistory();
  history.unshift(event);
  storage.set("alert_history", history.slice(0, 50));
}

// Background poller state (singleton across renders)
let pollerActive = false;
const prevPrices = new Map();

export function startAlertPoller(notifyFn) {
  if (pollerActive || typeof window === "undefined") return;
  pollerActive = true;

  setInterval(async () => {
    const alerts = getAlerts();
    if (!alerts.length) return;

    const symbols = [...new Set(alerts.map((a) => a.symbol))];
    try {
      const quotes = await api.quotes(symbols);
      const quoteMap = new Map();
      if (Array.isArray(quotes)) {
        for (const q of quotes) {
          if (q && q.symbol) quoteMap.set(q.symbol.toUpperCase(), q.price || q.last || q.regularMarketPrice);
        }
      }

      for (const alert of alerts) {
        const curPrice = quoteMap.get(alert.symbol);
        if (typeof curPrice === "number") {
          const prevPrice = prevPrices.get(alert.symbol);
          const result = evaluateRule(alert, curPrice, prevPrice);

          if (result.triggered) {
            const event = {
              id: alert.id,
              symbol: alert.symbol,
              raw: alert.raw,
              price: curPrice,
              time: Date.now(),
              message: result.message,
            };
            recordHistory(event);

            // Browser Notification if granted
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              try {
                new Notification(`OpenBloom Alert: ${alert.symbol}`, {
                  body: `${alert.symbol} hit ${curPrice} (${alert.raw})`,
                  icon: "/favicon.ico",
                });
              } catch {}
            }

            if (typeof notifyFn === "function") {
              notifyFn(result.message);
            }
          }
        }
      }

      for (const [sym, pr] of quoteMap.entries()) {
        prevPrices.set(sym, pr);
      }
    } catch {}
  }, 60000);
}

export default [
  {
    id: "ALRT",
    name: "Price & Technical Alerts",
    group: "Workspace",
    needs: false,
    opts: ["DEL", "CLEAR", "NOTIFY"],
    source: "Alert Engine + Storage",
    async render(ctx) {
      // Ensure poller is running
      startAlertPoller((msg) => {
        if (ctx && typeof ctx.toast === "function") {
          ctx.toast(msg);
        }
      });

      let alerts = getAlerts();
      const rawArg = ctx.args.join(" ").trim();
      const firstArg = (ctx.args[0] || "").toUpperCase();

      if (firstArg === "DEL" && ctx.args[1]) {
        const idToDel = ctx.args[1];
        alerts = alerts.filter((a) => a.id !== idToDel && a.symbol !== idToDel.toUpperCase());
        saveAlerts(alerts);
        ctx.toast(`Alert removed`);
      } else if (firstArg === "CLEAR") {
        saveAlerts([]);
        alerts = [];
        ctx.toast("All alerts cleared");
      } else if (firstArg === "NOTIFY") {
        if (typeof Notification !== "undefined") {
          Notification.requestPermission().then((res) => {
            ctx.toast(`Browser notification permission: ${res}`);
          });
        }
      } else if (rawArg && !["DEL", "CLEAR", "NOTIFY"].includes(firstArg)) {
        try {
          const parsed = parseRule(rawArg);
          alerts.push(parsed);
          saveAlerts(alerts);
          ctx.toast(`Alert created: ${parsed.symbol} ${parsed.op} ${parsed.target}`);
        } catch (err) {
          ctx.toast(`Error: ${err.message}`);
        }
      }

      ctx.el.innerHTML = "";
      ctx.setTitle("Price & Indicator Alerts");
      ctx.setSource("Client Engine (60s poll)");

      const container = html(`
        <div style="padding:10px; font-size:12px; line-height:1.5;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:6px; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="amber" style="font-weight:bold; font-size:13px;">🚨 ACTIVE ALERTS (${alerts.length})</span>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="alrt-perm-btn" style="background:#222; border:1px solid #444; color:#aaa; font-size:10px; padding:2px 8px; border-radius:3px; cursor:pointer;">Enable Notifications</button>
              <button class="alrt-clear-btn" style="background:#222; border:1px solid #444; color:#888; font-size:10px; padding:2px 8px; border-radius:3px; cursor:pointer;">Clear All</button>
            </div>
          </div>

          <form class="alrt-add-form" style="display:flex; gap:6px; margin-bottom:8px;">
            <input type="text" class="alrt-rule-input" placeholder="e.g. NVDA > 150, SPY RSI < 30, AAPL crossesAbove 230..." style="background:#161616; border:1px solid #333; color:#fff; padding:5px 8px; font-size:12px; border-radius:3px; flex:1;" />
            <button type="submit" style="background:#f59e0b; color:#000; font-weight:bold; border:none; padding:5px 12px; font-size:12px; border-radius:3px; cursor:pointer;">SET ALERT</button>
          </form>

          <div style="font-size:11px; color:#777; margin-bottom:14px;">
            Supported syntax: <code style="color:#f59e0b;">NVDA &gt; 150</code>, <code style="color:#f59e0b;">VIX &gt;= 25</code>, <code style="color:#f59e0b;">BTC &lt; 85000</code>, <code style="color:#f59e0b;">AAPL crossesAbove 220</code>
          </div>

          <div class="alrt-active-wrap" style="margin-bottom:16px;"></div>

          <div style="border-top:1px solid #333; padding-top:10px; margin-top:10px;">
            <span class="amber" style="font-weight:bold; font-size:12px;">📜 TRIGGERED ALERTS HISTORY</span>
            <div class="alrt-hist-wrap" style="margin-top:6px;"></div>
          </div>
        </div>
      `);

      ctx.el.append(container);

      const form = container.querySelector(".alrt-add-form");
      const input = container.querySelector(".alrt-rule-input");
      const permBtn = container.querySelector(".alrt-perm-btn");
      const clearBtn = container.querySelector(".alrt-clear-btn");
      const activeWrap = container.querySelector(".alrt-active-wrap");
      const histWrap = container.querySelector(".alrt-hist-wrap");

      permBtn.onclick = () => {
        if (typeof Notification !== "undefined") {
          Notification.requestPermission().then((res) => {
            alert(`Notification status: ${res}`);
          });
        }
      };

      clearBtn.onclick = () => {
        saveAlerts([]);
        ctx.go("ALRT");
      };

      form.onsubmit = (e) => {
        e.preventDefault();
        const rule = input.value.trim();
        if (rule) {
          ctx.go(`ALRT ${rule}`);
        }
      };

      if (!alerts.length) {
        activeWrap.innerHTML = `<div class="hint">No active alert rules. Create one above (e.g. <b>ALRT NVDA &gt; 150</b>).</div>`;
      } else {
        activeWrap.append(
          table(
            alerts,
            [
              { key: "symbol", label: "Symbol", left: true, lbl: true },
              { key: "metric", label: "Metric", left: true },
              { key: "op", label: "Condition", left: true },
              { key: "target", label: "Target", r: true, fn: (r) => num(r.target) },
              { key: (r) => new Date(r.created).toLocaleTimeString(), label: "Created", left: true, cls: () => "dim" },
              {
                key: () => "Delete",
                label: "Action",
                left: true,
                fn: () => `<button class="alrt-del-row" style="background:#331111; color:#ff6666; border:1px solid #552222; font-size:10px; padding:2px 6px; cursor:pointer; border-radius:2px;">DEL</button>`,
              },
            ],
            {
              onClick(row, el, evt) {
                if (evt.target.classList.contains("alrt-del-row")) {
                  const updated = getAlerts().filter((a) => a.id !== row.id);
                  saveAlerts(updated);
                  ctx.go("ALRT");
                }
              },
            }
          )
        );
      }

      const history = getAlertHistory();
      if (!history.length) {
        histWrap.innerHTML = `<div class="hint" style="color:#666;">No triggered alerts yet. Alerts will appear here when market prices cross your thresholds.</div>`;
      } else {
        histWrap.append(
          table(history, [
            { key: "symbol", label: "Symbol", left: true, lbl: true },
            { key: "message", label: "Alert Notification", left: true },
            { key: (r) => new Date(r.time).toLocaleTimeString(), label: "Timestamp", left: true, cls: () => "dim" },
          ])
        );
      }
    },
  },
];
