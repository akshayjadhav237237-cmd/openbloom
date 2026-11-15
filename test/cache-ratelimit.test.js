// test/cache-ratelimit.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { wrap, get, set, clear } from "../lib/cache.js";
import { middleware, resetRateLimits } from "../lib/ratelimit.js";

test("cache: set and get return cached values", async () => {
  await set("test:key1", { price: 150.25 }, 5000);
  const val = await get("test:key1");
  assert.deepEqual(val, { price: 150.25 });
});

test("cache: wrap caches expensive operation and reuses cached value", async () => {
  let counter = 0;
  const fetchFn = async () => {
    counter++;
    return `result_${counter}`;
  };

  const res1 = await wrap("test:wrap1", 5000, fetchFn);
  const res2 = await wrap("test:wrap1", 5000, fetchFn);

  assert.equal(res1, "result_1");
  assert.equal(res2, "result_1");
  assert.equal(counter, 1);
});

test("cache: wrap returns stale-while-error if fetch fails", async () => {
  await set("test:stale", "good_value", 100);

  // Wait for TTL to pass
  await new Promise((resolve) => setTimeout(resolve, 120));

  const failingFetch = async () => {
    throw new Error("Upstream network error");
  };

  // Even though TTL expired, failingFetch causes stale fallback
  const result = await wrap("test:stale", 1000, failingFetch);
  assert.equal(result, "good_value");
});

test("ratelimit: allows requests within perMinute limit", () => {
  resetRateLimits();
  const limiter = middleware("test-limiter", 5);

  let allowedCount = 0;
  for (let i = 0; i < 5; i++) {
    const req = { socket: { remoteAddress: "127.0.0.1" }, headers: {} };
    const res = {
      setHeader: () => {},
    };

    if (limiter(req, res)) allowedCount++;
  }

  assert.equal(allowedCount, 5);
});

test("ratelimit: blocks with 429 when budget is exceeded", () => {
  resetRateLimits();
  const limiter = middleware("test-blocker", 2);

  const req = { socket: { remoteAddress: "127.0.0.2" }, headers: {} };
  let statusCode = 0;
  let retryAfter = null;

  const res = {
    setHeader: (name, val) => {
      if (name.toLowerCase() === "retry-after") retryAfter = val;
    },
    writeHead: (code) => {
      statusCode = code;
    },
    end: () => {},
  };

  // First 2 pass
  assert.equal(limiter(req, res), true);
  assert.equal(limiter(req, res), true);

  // 3rd call should trigger 429
  const passed = limiter(req, res);

  assert.equal(passed, false);
  assert.equal(statusCode, 429);
  assert.ok(retryAfter !== null);
});
