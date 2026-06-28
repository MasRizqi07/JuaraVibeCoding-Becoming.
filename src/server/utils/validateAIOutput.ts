import { BecomingResultSchema } from "@becoming/types";
import { logEvent } from "./logger";

/**
 * Validates the raw JSON output from the Gemini API against the strict BecomingResultSchema Zod schema.
 * Re-attempts / retries up to 3 times if validation fails, compiling a high-contrast fallback
 * on continuous exception blocks to provide a flawless, reliable UX.
 */
export async function validateAndNormalizeAIOutput(
  rawText: string,
  executeCall: () => Promise<string>,
  fallbackAction: () => any
): Promise<any> {
  const maxRetries = 3;
  let currentRaw = rawText;
  let validationFailuresCount = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 1. Clean markdown JSON formatting if present
      let cleanText = currentRaw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      
      // 2. Parse JSON
      const parsed = JSON.parse(cleanText);
      
      // 3. Zod Schema Verification
      const result = BecomingResultSchema.safeParse(parsed);
      
      if (result.success) {
        logEvent({
          level: "info",
          message: `[AI Output Validation SUCCESS] Validation passed on ${attempt === 0 ? "initial attempt" : `retry #${attempt}`}`,
        });
        return result.data;
      }
      
      // Zod Parsing failed
      validationFailuresCount++;
      const errorDetails = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");
      
      logEvent({
        level: "warn",
        message: `[AI Output Validation FAILED] Attempt ${attempt}/${maxRetries} failed. Errors: ${errorDetails}`,
        meta: { issues: result.error.issues }
      });

    } catch (parseErr: any) {
      validationFailuresCount++;
      logEvent({
        level: "warn",
        message: `[AI Output Validation EXCEPTION] Parse error on attempt ${attempt}/${maxRetries}: ${parseErr.message}`,
      });
    }

    // If still within retries, perform re-call
    if (attempt < maxRetries) {
      logEvent({
        level: "info",
        message: `[AI Output Validation RETRYING] Initiating AI request retry attempt #${attempt + 1}...`
      });
      try {
        currentRaw = await executeCall();
      } catch (callErr: any) {
        logEvent({
          level: "error",
          message: `[AI Output Validation RETRY ERROR] AI request failed during retry: ${callErr.message}`
        });
        // Settle immediately into fallback if the call itself fails
        break;
      }
    }
  }

  // 4. Exhausted attempts or fatal error: return deterministic feedback
  logEvent({
    level: "warn",
    message: `[AI Output Validation OVERFLOW] Exhausted all ${maxRetries} validation retries. Activating deterministic local fallbackcompiler. Total failures recorded: ${validationFailuresCount}`
  });
  
  return fallbackAction();
}
export default validateAndNormalizeAIOutput;
