// lib/ai/guard.js
// Prompt injection guard and sanitization helper for untrusted text.

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|directives)/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts)/gi,
  /you\s+are\s+now\s+(in|operating\s+in)?\s*(developer|jailbreak|unrestricted|god)\s+mode/gi,
  /<\|(?:im_start|im_end|system|user|assistant)\|>/gi,
  /\[SYSTEM\s+PROMPT\]/gi,
  /<\/?system>/gi,
  /<\/?prompt>/gi,
  /new\s+system\s+instruction:/gi,
  /override\s+system\s+prompt/gi,
];

/**
 * Sanitizes untrusted text (filings, news, web pages, user notes)
 * before it is passed to LLM prompts.
 * @param {string} text - Raw input text
 * @param {number} [maxLen=8000] - Max character length
 * @returns {string} Sanitized string
 */
export function sanitizeUntrusted(text, maxLen = 8000) {
  if (typeof text !== "string") {
    if (text === null || text === undefined) return "";
    try {
      text = JSON.stringify(text);
    } catch {
      return String(text);
    }
  }

  // Cap length first
  let cleaned = text.slice(0, maxLen);

  // Strip null bytes and non-printable control characters (except newline, tab, cr)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ");

  // Strip known prompt injection triggers by neutralizing them
  for (const pattern of INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, "[redacted]");
  }

  return cleaned.trim();
}
