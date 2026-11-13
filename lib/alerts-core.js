// lib/alerts-core.js
// Pure alert condition parsing and evaluation engine.

const OPERATORS = [
  "crossesAbove",
  "crossesBelow",
  "crosses",
  ">=",
  "<=",
  ">",
  "<",
  "==",
  "=",
];

/**
 * Parses a plain text alert string into a structured rule object.
 * Examples:
 *   "NVDA > 150"
 *   "SPY <= 400"
 *   "VIX >= 25"
 *   "AAPL crossesAbove 220"
 *   "BTC crossesBelow 90000"
 *   "SPY RSI < 30"
 * @param {string} text
 * @returns {{ id: string, raw: string, symbol: string, metric: string, op: string, target: number, created: number }}
 */
export function parseRule(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Alert rule text must be a non-empty string");
  }

  const trimmed = text.trim();
  // Find which operator appears in the text
  let foundOp = null;
  let opIndex = -1;

  for (const op of OPERATORS) {
    // Match operator with word boundary or whitespace around it
    const re = new RegExp(`(?:\\s+|^)(${op})(?:\\s+|$)`, "i");
    const m = re.exec(trimmed);
    if (m) {
      foundOp = op;
      opIndex = m.index;
      break;
    }
  }

  if (!foundOp) {
    throw new Error(`Could not find a valid operator in rule "${trimmed}". Supported: ${OPERATORS.join(", ")}`);
  }

  const leftPart = trimmed.slice(0, opIndex).trim();
  const rightPart = trimmed.slice(opIndex + foundOp.length).trim();

  const target = parseFloat(rightPart);
  if (isNaN(target)) {
    throw new Error(`Invalid target value "${rightPart}" in alert rule`);
  }

  const leftTokens = leftPart.split(/\s+/).filter(Boolean);
  if (!leftTokens.length) {
    throw new Error(`Missing ticker or symbol in alert rule: "${trimmed}"`);
  }

  const symbol = leftTokens[0].toUpperCase();
  const metric = leftTokens.length > 1 ? leftTokens.slice(1).join(" ").toUpperCase() : "PRICE";

  // Normalize operator
  let normalizedOp = foundOp;
  if (foundOp === "=") normalizedOp = "==";
  if (foundOp.toLowerCase() === "crossesabove") normalizedOp = "crossesAbove";
  if (foundOp.toLowerCase() === "crossesbelow") normalizedOp = "crossesBelow";

  return {
    id: `alrt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    raw: trimmed,
    symbol,
    metric,
    op: normalizedOp,
    target,
    created: Date.now(),
  };
}

/**
 * Evaluates an alert rule against current and previous values.
 * @param {Object} rule - Parsed rule
 * @param {number} currentVal - Current asset/indicator price
 * @param {number} [prevVal] - Prior asset/indicator price (for crossover detection)
 * @returns {{ triggered: boolean, message: string }}
 */
export function evaluateRule(rule, currentVal, prevVal = undefined) {
  if (typeof currentVal !== "number" || isNaN(currentVal)) {
    return { triggered: false, message: "Invalid current price" };
  }

  const t = rule.target;
  let triggered = false;

  switch (rule.op) {
    case ">":
      triggered = currentVal > t;
      break;
    case "<":
      triggered = currentVal < t;
      break;
    case ">=":
      triggered = currentVal >= t;
      break;
    case "<=":
      triggered = currentVal <= t;
      break;
    case "==":
      triggered = Math.abs(currentVal - t) < 0.0001;
      break;
    case "crossesAbove":
      if (typeof prevVal === "number" && !isNaN(prevVal)) {
        triggered = prevVal <= t && currentVal > t;
      } else {
        triggered = currentVal > t;
      }
      break;
    case "crossesBelow":
      if (typeof prevVal === "number" && !isNaN(prevVal)) {
        triggered = prevVal >= t && currentVal < t;
      } else {
        triggered = currentVal < t;
      }
      break;
    case "crosses":
      if (typeof prevVal === "number" && !isNaN(prevVal)) {
        triggered = (prevVal < t && currentVal >= t) || (prevVal > t && currentVal <= t);
      } else {
        triggered = Math.abs(currentVal - t) < 0.01;
      }
      break;
    default:
      return { triggered: false, message: `Unknown operator: ${rule.op}` };
  }

  const message = triggered
    ? `🚨 Alert Triggered: ${rule.symbol} ${rule.metric} (${currentVal}) ${rule.op} ${rule.target}`
    : "";

  return { triggered, message };
}
