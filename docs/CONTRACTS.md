# OpenBloom Architecture Contracts

This document specifies the shared interfaces, contracts, and conventions across all modules and subagents in the OpenBloom codebase. All implementations must adhere strictly to these patterns.

---

## 1. Zero New Dependencies & Runtime Requirements
- **Node.js**: Native Node 18+ (ES modules only, `"type": "module"`).
- **HTTP / Fetch**: Native `fetch`, `AbortSignal.timeout(ms)`, `node:crypto`, `node:http`, `node:fs`, `node:path`, `node:os`.
- **Zero npm dependencies**: No external packages may be installed.
- **Security**: Never log or commit secrets or API keys. Treat all external network input as untrusted.

---

## 2. Shared Core Contracts

### 2.1 Gemini AI Client (`lib/ai/gemini.js`)
```javascript
/**
 * Asks Gemini model with structured output support and timeout.
 * @param {Object} options
 * @param {string} [options.system] - Optional system prompt instruction
 * @param {string} options.prompt - User prompt text
 * @param {boolean} [options.json=false] - Whether to enforce and parse JSON response
 * @param {number} [options.timeoutMs=20000] - Request timeout (default 20s)
 * @returns {Promise<{ text: string, json?: any, model: string }>}
 * @throws {GeminiAuthError} If GEMINI_API_KEY is not set (status 503)
 * @throws {Error} On upstream HTTP error or timeout
 */
export async function askGemini({ system, prompt, json = false, timeoutMs = 20000 });

export class GeminiAuthError extends Error {
  constructor(message = "GEMINI_API_KEY is not configured on this server") {
    super(message);
    this.name = "GeminiAuthError";
    this.status = 503;
  }
}
```
- Reads `process.env.GEMINI_API_KEY` (throws `GeminiAuthError` if missing).
- Reads `process.env.GEMINI_MODEL || "gemini-2.5-flash"` for the model name.
- Uses standard Google Gemini REST endpoint `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}` with `fetch`.
- Timeout enforced with `AbortSignal.timeout(timeoutMs)`.

### 2.2 Untrusted Text Sanitization (`lib/ai/guard.js`)
```javascript
/**
 * Sanitizes untrusted text (e.g. news headlines, SEC filings, user notes)
 * before injecting into LLM prompts. Strips prompt injection markers, system tags,
 * and caps length.
 * @param {string} text - Raw input string
 * @param {number} [maxLen=8000] - Max character limit
 * @returns {string} Cleaned sanitized text
 */
export function sanitizeUntrusted(text, maxLen = 8000);
```

### 2.3 Caching Subsystem (`lib/cache.js`)
```javascript
/**
 * In-memory / Redis cache with stale-while-error fallback.
 * @param {string} key
 * @param {number} ttlMs
 * @param {() => Promise<any>} fetchFn
 * @returns {Promise<any>}
 */
export async function wrap(key, ttlMs, fetchFn);
export async function get(key);
export async function set(key, val, ttlMs);
export function clear();
```
- Default backend: In-memory LRU/Map with TTL and stale-while-error cache.
- Optional: If `process.env.REDIS_URL` is set, gracefully connect or fall back to in-memory if unreachable.
- Suggested TTL constants:
  - Quotes / Ticker price: 15s (`15 * 1000`)
  - Charts / Bars: 60s (`60 * 1000`)
  - Options / Chains: 30s (`30 * 1000`)
  - Macro / Yield curves / Rates: 15 min (`15 * 60 * 1000`)
  - Filings (SEC): 1 hour (`60 * 60 * 1000`)
  - AI responses: 10 min (`10 * 60 * 1000`)

### 2.4 Rate Limiting Middleware (`lib/ratelimit.js`)
```javascript
/**
 * Sliding window rate limiter.
 * @param {string} bucketName - Unique limiter name/scope
 * @param {number} perMinute - Allowed requests per minute per IP
 * @returns {(req: http.IncomingMessage, res: http.ServerResponse) => boolean} returns true if allowed, false if rejected (sends 429)
 */
export function middleware(bucketName, perMinute);

/**
 * Checks limit directly.
 * @returns {{ allowed: boolean, remaining: number, resetMs: number }}
 */
export function checkLimit(key, perMinute);
```
- Default limits:
  - General API: 60 req/min
  - AI endpoints (`/api/ai*`, `/api/brief`, `/api/filing-ai`, `/api/strategy-ai`): 10 req/min
- When limit exceeded: responds with status `429 Too Many Requests`, sets `Retry-After: <seconds>` header, and sends `{ error: "Too many requests, please slow down.", retryAfter: <sec> }`.

### 2.5 Client Persistent Storage (`public/js/storage.js`)
```javascript
/**
 * Safe local storage wrapper. All localStorage calls are wrapped in try/catch
 * to handle privacy modes, quotas, and server-side contexts.
 */
export function get(key, fallback = null);
export function set(key, val);
export function remove(key);
export function list(prefix = "");
```

---

## 3. Module Extension Conventions

### 3.1 Backend Route Modules (`lib/routes/<name>.js`)
To avoid merge conflicts, each new API endpoint lives in its own file under `lib/routes/`:
```javascript
// lib/routes/example.js
/**
 * Handles incoming request.
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {Object} [helpers] - Optional helper functions { send, readBody, httpError }
 */
export default async function handler(req, res, helpers) {
  // Read params or body
  // Return JSON via helpers.send(res, 200, { data }) or res.end()
}
```
- Agents **do NOT** edit `server.js` directly during their phase.
- Agents declare their routes in `docs/INTEGRATION.md`.

### 3.2 Frontend Command Modules (`public/js/fn/<name>.js`)
Follow the existing OpenBloom screen registration pattern:
```javascript
// public/js/fn/example.js
import { esc } from "../api.js";
import { html, sect, table } from "../ui.js";

export default [
  {
    id: "CMD_NAME",       // Uppercase command code
    name: "Screen Title",  // Descriptive name
    group: "Category",    // Group for HELP screen
    source: "Data Source",// Source attribution
    needs: false,         // true if requires security/ticker first (e.g. AAPL CMD)
    opts: [],             // Optional argument list
    async render(ctx) {
      // ctx.el, ctx.sec, ctx.args, ctx.go, ctx.toast, ctx.setSource, etc.
    }
  }
];
```
- Agents **do NOT** edit `public/js/fn/index.js` or `public/js/commands.js` directly during their phase.
- Agents declare their commands in `docs/INTEGRATION.md`.

---

## 4. Manifest & Integration Registration (`docs/INTEGRATION.md`)
Every agent appends its added routes, commands, and files to `docs/INTEGRATION.md` so the Integrator can cleanly wire them into `server.js` and `public/js/fn/index.js` in Phase 2.
