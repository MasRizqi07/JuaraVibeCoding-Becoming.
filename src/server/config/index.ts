import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables from .env if present
dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  GEMINI_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().default("notifications@becoming.app"),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  FIREBASE_PROJECT_ID: z.string().default("juaravibecoding-becoming"),
});

let parsedEnv: z.infer<typeof EnvSchema>;

try {
  parsedEnv = EnvSchema.parse(process.env);
} catch (error: any) {
  console.error("❌ Invalid environment configuration:", error.format ? error.format() : error);
  // Fail fast if in production or staging, otherwise log and use defaults
  if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging") {
    process.exit(1);
  }
  // Soft fallback for development
  parsedEnv = EnvSchema.parse({
    NODE_ENV: "development",
    PORT: 3000,
    REDIS_URL: "redis://127.0.0.1:6379",
    FIREBASE_PROJECT_ID: "juaravibecoding-becoming",
  });
}

export const config = {
  env: parsedEnv.NODE_ENV,
  port: parsedEnv.PORT,
  geminiApiKey: parsedEnv.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "",
  sendgridApiKey: parsedEnv.SENDGRID_API_KEY || "",
  sendgridFromEmail: parsedEnv.SENDGRID_FROM_EMAIL,
  redisUrl: parsedEnv.REDIS_URL,
  firebaseProjectId: parsedEnv.FIREBASE_PROJECT_ID,
  isProduction: parsedEnv.NODE_ENV === "production",
  isStaging: parsedEnv.NODE_ENV === "staging",
  isDevelopment: parsedEnv.NODE_ENV === "development",
};
