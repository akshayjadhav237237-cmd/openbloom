// test/strategy-ai.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { validateStrategyParams, VALID_STRATEGIES } from "../lib/routes/strategy-ai.js";

test("strategy: valid strategies list includes all 6 core models", () => {
  assert.deepEqual(VALID_STRATEGIES, ["ma_cross", "rsi_meanrev", "bollinger", "supertrend", "macd", "vwap"]);
});

test("strategy: validates ma_cross params and checks fast < slow", () => {
  const valid = validateStrategyParams("ma_cross", { fast: 10, slow: 50 });
  assert.deepEqual(valid, { fast: 10, slow: 50 });

  assert.throws(() => validateStrategyParams("ma_cross", { fast: 50, slow: 20 }), /Fast MA length must be less/);
  assert.throws(() => validateStrategyParams("ma_cross", { fast: 1, slow: 50 }), /between 2 and 100/);
});

test("strategy: validates rsi_meanrev parameters and bounds", () => {
  const valid = validateStrategyParams("rsi_meanrev", { length: 14, oversold: 25, overbought: 75 });
  assert.deepEqual(valid, { length: 14, oversold: 25, overbought: 75 });

  assert.throws(() => validateStrategyParams("rsi_meanrev", { length: 14, oversold: 50, overbought: 70 }), /Oversold threshold must be between 5 and 45/);
});

test("strategy: validates bollinger and supertrend parameters", () => {
  const bb = validateStrategyParams("bollinger", { length: 20, mult: 2.5 });
  assert.deepEqual(bb, { length: 20, mult: 2.5 });

  const st = validateStrategyParams("supertrend", { atrLength: 14, factor: 3 });
  assert.deepEqual(st, { atrLength: 14, factor: 3 });

  assert.throws(() => validateStrategyParams("supertrend", { atrLength: 1, factor: 3 }), /between 3 and 50/);
});

test("strategy: rejects unsupported strategy names with clear message", () => {
  assert.throws(
    () => validateStrategyParams("quantum_neural_net", {}),
    /Unsupported strategy 'quantum_neural_net'/
  );
});
