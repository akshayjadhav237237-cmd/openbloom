// test/alerts-core.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { parseRule, evaluateRule } from "../lib/alerts-core.js";

test("alerts: parseRule correctly parses simple inequalities", () => {
  const r1 = parseRule("NVDA > 150");
  assert.equal(r1.symbol, "NVDA");
  assert.equal(r1.metric, "PRICE");
  assert.equal(r1.op, ">");
  assert.equal(r1.target, 150);

  const r2 = parseRule("SPY <= 400.5");
  assert.equal(r2.symbol, "SPY");
  assert.equal(r2.op, "<=");
  assert.equal(r2.target, 400.5);

  const r3 = parseRule("VIX >= 25");
  assert.equal(r3.symbol, "VIX");
  assert.equal(r3.op, ">=");
  assert.equal(r3.target, 25);
});

test("alerts: parseRule parses technical indicator metrics and crossover operators", () => {
  const r1 = parseRule("SPY RSI < 30");
  assert.equal(r1.symbol, "SPY");
  assert.equal(r1.metric, "RSI");
  assert.equal(r1.op, "<");
  assert.equal(r1.target, 30);

  const r2 = parseRule("AAPL crossesAbove 220");
  assert.equal(r2.symbol, "AAPL");
  assert.equal(r2.op, "crossesAbove");
  assert.equal(r2.target, 220);
});

test("alerts: parseRule rejects invalid inputs", () => {
  assert.throws(() => parseRule(""), /non-empty string/);
  assert.throws(() => parseRule("NVDA 150"), /Could not find a valid operator/);
  assert.throws(() => parseRule("> 150"), /Missing ticker or symbol/);
  assert.throws(() => parseRule("AAPL > ABC"), /Invalid target value/);
});

test("alerts: evaluateRule checks static thresholds accurately", () => {
  const rule = parseRule("TSLA > 200");

  const resLow = evaluateRule(rule, 195);
  assert.equal(resLow.triggered, false);

  const resHigh = evaluateRule(rule, 205);
  assert.equal(resHigh.triggered, true);
  assert.ok(resHigh.message.includes("Alert Triggered"));
});

test("alerts: evaluateRule handles crossover detection with prior price", () => {
  const rule = parseRule("BTC crossesAbove 90000");

  // Was already above -> not a fresh crossover
  const res1 = evaluateRule(rule, 91000, 90500);
  assert.equal(res1.triggered, false);

  // Crossed from below to above
  const res2 = evaluateRule(rule, 90500, 89500);
  assert.equal(res2.triggered, true);
});
