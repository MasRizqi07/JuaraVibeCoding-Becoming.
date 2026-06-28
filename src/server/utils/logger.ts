import pino from "pino";

// Configure pino with redirection / redactions for sensitive fields
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // Redact sensitive headers/credentials
  redact: {
    paths: [
      "apiKey",
      "password",
      "token",
      "Authorization",
      "headers.authorization",
      "process.env.GEMINI_API_KEY",
      "process.env.SENDGRID_API_KEY",
    ],
    censor: "[REDACTED]",
  },
  base: {
    env: process.env.NODE_ENV || "development"
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Standard structured logger with specific tracing parameters
 */
export function logEvent(params: {
  level: "info" | "error" | "warn" | "debug";
  message: string;
  traceId?: string;
  userId?: string;
  path?: string;
  latency_ms?: number;
  meta?: any;
}) {
  const { level, message, traceId, userId, path, latency_ms, meta } = params;
  const payload = {
    traceId,
    userId,
    path,
    latency_ms,
    ...meta,
  };
  
  if (level === "error") {
    logger.error(payload, message);
  } else if (level === "warn") {
    logger.warn(payload, message);
  } else if (level === "debug") {
    logger.debug(payload, message);
  } else {
    logger.info(payload, message);
  }
}
