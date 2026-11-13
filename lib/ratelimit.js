// lib/ratelimit.js
// Sliding window rate limiter for OpenBloom API endpoints.

class RateLimiter {
  constructor() {
    this.buckets = new Map();
  }

  /**
   * Checks whether an action identified by key is allowed within limit per minute.
   * @param {string} key - Identifier (e.g. IP + endpoint)
   * @param {number} perMinute - Max allowed requests per 60s
   * @returns {{ allowed: boolean, remaining: number, resetMs: number, retryAfterSec: number }}
   */
  check(key, perMinute = 60) {
    const now = Date.now();
    const windowMs = 60 * 1000;
    const windowStart = now - windowMs;

    let timestamps = this.buckets.get(key) || [];
    // Discard timestamps older than 60s
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= perMinute) {
      const oldest = timestamps[0];
      const resetMs = oldest + windowMs - now;
      const retryAfterSec = Math.max(1, Math.ceil(resetMs / 1000));
      return { allowed: false, remaining: 0, resetMs, retryAfterSec };
    }

    timestamps.push(now);
    this.buckets.set(key, timestamps);

    if (this.buckets.size > 5000) {
      // Periodic cleanup of idle keys
      for (const [k, v] of this.buckets.entries()) {
        if (!v.length || v[v.length - 1] <= windowStart) {
          this.buckets.delete(k);
        }
      }
    }

    return {
      allowed: true,
      remaining: perMinute - timestamps.length,
      resetMs: windowMs,
      retryAfterSec: 0,
    };
  }
}

const limiter = new RateLimiter();

/**
 * Checks a rate limit directly.
 */
export function checkLimit(key, perMinute = 60) {
  return limiter.check(key, perMinute);
}

/**
 * Creates HTTP middleware for a route.
 * @param {string} bucketName - e.g. "general" or "ai"
 * @param {number} perMinute - allowed requests per minute
 * @returns {(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => boolean} returns true if allowed, false if rejected (and sends 429)
 */
export function middleware(bucketName = "api", perMinute = 60) {
  return function rateLimitCheck(req, res) {
    // Determine client IP
    const forwarded = req.headers["x-forwarded-for"];
    const ip = (typeof forwarded === "string" ? forwarded.split(",")[0] : req.socket?.remoteAddress || "127.0.0.1").trim();
    const key = `${bucketName}:${ip}`;

    const status = limiter.check(key, perMinute);

    res.setHeader("X-RateLimit-Limit", String(perMinute));
    res.setHeader("X-RateLimit-Remaining", String(status.remaining));

    if (!status.allowed) {
      res.setHeader("Retry-After", String(status.retryAfterSec));
      res.writeHead(429, {
        "Content-Type": "application/json",
        "Retry-After": String(status.retryAfterSec),
      });
      res.end(
        JSON.stringify({
          error: "Too many requests. Please slow down and try again shortly.",
          retryAfter: status.retryAfterSec,
        })
      );
      return false;
    }
    return true;
  };
}
