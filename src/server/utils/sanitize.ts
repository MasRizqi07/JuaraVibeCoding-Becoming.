/**
 * Sanitizes user input answers to protect against prompt injection, control characters,
 * null byte termination, quote escapes, and other model override anomalies.
 */
export function sanitizeUserInput(text: string): string {
  if (!text) return "";

  // 1. Remove Null Bytes and control characters (excluding standard whitespace)
  let clean = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 2. Escape backticks and double quotes to prevent escaping out of string literals
  clean = clean.replace(/\\/g, "\\\\")
               .replace(/`/g, "\\`")
               .replace(/"/g, '\\"');

  // 3. Remove prompt delimiter strings and system-bypass phrases
  // We perform a case-insensitive replacement on suspicious prompt injection phrases
  const blockPatterns = [
    /<<</g,
    />>>/g,
    /---/g,
    /SYSTEM_PROMPT/gi,
    /SYSTEM PROMPT/gi,
    /IGNORE PREVIOUS/gi,
    /IGNORE INSTRUCTIONS/gi,
    /IGNORE THE RULES/gi,
    /YOU ARE NOW/gi,
    /ACT AS/gi,
    /DEVELOPER MODE/gi,
    /DAN MODE/gi,
    /USER_ANSWER_START/gi,
    /USER_ANSWER_END/gi
  ];

  for (const regex of blockPatterns) {
    clean = clean.replace(regex, "[safeRef]");
  }

  // 4. Wrap the output inside strict boundaries as specified in the security directive
  return `---USER_ANSWER_START---\n${clean.trim()}\n---USER_ANSWER_END---`;
}
export default sanitizeUserInput;
