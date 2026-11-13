# OpenBloom Integration Manifest

This file documents all new backend routes, frontend command modules, and infrastructure hooks created by subagents during Phase 1. The Integrator will wire these into `server.js`, `public/js/fn/index.js`, and navigation in Phase 2.

---

## 1. Backend Routes (`lib/routes/*.js`)

| Route Path | Method | Module File | Export | Rate Limit | Description |
|---|---|---|---|---|---|
| `/api/ai` | POST | `lib/routes/ai.js` | default handler | 10/min | Interactive AI market analyst query |
| `/api/filing-ai` | POST | `lib/routes/filing-ai.js` | default handler | 10/min | SEC EDGAR filing summarization via Gemini |
| `/api/strategy-ai` | POST | `lib/routes/strategy-ai.js` | default handler | 10/min | Natural language strategy parser & explanation |
| `/api/brief` | GET | `lib/routes/brief.js` | default handler | 10/min | Daily morning market brief with Gemini analysis |
| `/healthz` | GET | Built-in / `server.js` | inline / route | None | Kubernetes / Cloud Run health check (200 OK) |

---

## 2. Frontend Commands (`public/js/fn/*.js`)

| Command ID | Module File | Needs Security? | Group | Help Summary |
|---|---|---|---|---|
| `AI` | `public/js/fn/ai.js` | No (optional ticker) | AI | Chat with Gemini market analyst using active screen context |
| `EXPLAIN` | `public/js/fn/ai.js` | No | AI | Auto-collects active panel data and explains key metrics |
| `BRIEF` | `public/js/fn/brief.js` | No | Market | Daily market intelligence summary across equities, rates & news |
| `SAVE` | `public/js/fn/workspace-cmds.js` | No | Workspace | Save current layout and panel configurations |
| `LOAD` | `public/js/fn/workspace-cmds.js` | No | Workspace | Load a saved workspace layout |
| `WS` | `public/js/fn/workspace-cmds.js` | No | Workspace | Workspace manager: list, export, import layouts |
| `DEL` | `public/js/fn/workspace-cmds.js` | No | Workspace | Delete a saved workspace layout |
| `WL` | `public/js/fn/watchlist-cmds.js` | No | Workspace | Watchlist manager with live prices and persistent tracking |
| `ALRT` | `public/js/fn/alerts-cmds.js` | No | Alerts | Price and technical indicator alert rules engine |
| `THEME` | `public/js/fn/theme-cmd.js` | No | System | Toggle between dark terminal amber and clean light mode |

---

## 3. Server Integration Instructions (for Integrator in Phase 2)
1. **Logging**: Structured JSON logging in production / Cloud Run environments.
2. **Security Headers**: Set `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
3. **SSRF Guard**: Allowlist upstream hosts for fetching data (Google Generative AI, SEC EDGAR, Yahoo, Nasdaq, Binance, FRED).
4. **Rate Limiting**: Apply `lib/ratelimit.js` to `/api/` endpoints.
5. **Caching**: Wrap data-intensive routes with `lib/cache.js`.
