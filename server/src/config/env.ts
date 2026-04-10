import dotenv from "dotenv";

dotenv.config();

function required(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. Copy server/.env.example to server/.env and set it.`,
    );
  }
  return value.trim();
}

function optionalPort(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1 || n > 65535) {
    throw new Error(
      `Invalid PORT: "${value}". Use an integer between 1 and 65535.`,
    );
  }
  return n;
}

function optionalString(value: string | undefined, fallback: string): string {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  return value.trim();
}

function optionalStringsCsv(
  value: string | undefined,
  fallback: string[],
): string[] {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  const out = value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return out.length > 0 ? out : fallback;
}

function optionalOpenAiKey(value: string | undefined): string | null {
  const v = value?.trim();
  if (!v) {
    return null;
  }
  return v;
}

function optionalAiProvider(
  value: string | undefined,
): "auto" | "openai" | "gemini" | "spoonacular" {
  const v = value?.trim().toLowerCase();
  if (!v) {
    return "auto";
  }
  if (v === "auto" || v === "openai" || v === "gemini" || v === "spoonacular") {
    return v;
  }
  throw new Error(`Invalid AI_PROVIDER: "${value}". Use auto, spoonacular, openai, or gemini.`);
}

function optionalTimeoutMs(
  value: string | undefined,
  fallback: number,
): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 5_000 || n > 120_000) {
    throw new Error(
      `Invalid OPENAI_TIMEOUT_MS: "${value}". Use an integer between 5000 and 120000.`,
    );
  }
  return n;
}

const nodeEnvRaw = process.env.NODE_ENV;
const nodeEnv =
  nodeEnvRaw === "production" || nodeEnvRaw === "test"
    ? nodeEnvRaw
    : "development";

const jwtSecret = required("JWT_SECRET", process.env.JWT_SECRET);
if (nodeEnv === "production" && jwtSecret.length < 32) {
  throw new Error(
    "JWT_SECRET must be at least 32 characters when NODE_ENV is production.",
  );
}

export const env = {
  NODE_ENV: nodeEnv,
  PORT: optionalPort(process.env.PORT, 3000),
  MONGODB_URI: required("MONGODB_URI", process.env.MONGODB_URI),
  MONGODB_DB: optionalString(process.env.MONGODB_DB, "tasteai"),
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: optionalString(process.env.JWT_EXPIRES_IN, "7d"),
  OPENAI_API_KEY: optionalOpenAiKey(process.env.OPENAI_API_KEY),
  OPENAI_MODEL: optionalString(process.env.OPENAI_MODEL, "gpt-4o-mini"),
  OPENAI_BASE_URL: optionalString(
    process.env.OPENAI_BASE_URL,
    "https://api.openai.com/v1",
  ),
  OPENAI_TIMEOUT_MS: optionalTimeoutMs(process.env.OPENAI_TIMEOUT_MS, 60_000),
  OPENROUTER_API_KEY: optionalOpenAiKey(process.env.OPENROUTER_API_KEY),
  OPENROUTER_BASE_URL: optionalString(
    process.env.OPENROUTER_BASE_URL,
    "https://openrouter.ai/api/v1",
  ),
  OPENROUTER_TIMEOUT_MS: optionalTimeoutMs(
    process.env.OPENROUTER_TIMEOUT_MS,
    60_000,
  ),
  OPENROUTER_GEMMA_MODELS: optionalStringsCsv(
    process.env.OPENROUTER_GEMMA_MODELS,
    [
      "google/gemma-3n-e4b-it:free",
      "google/gemma-3-27b-it:free",
      "google/gemma-3-12b-it:free",
    ],
  ),
  OPENROUTER_VISION_FALLBACK_MODELS: optionalStringsCsv(
    process.env.OPENROUTER_VISION_FALLBACK_MODELS,
    [
      "meta-llama/llama-3.2-11b-vision-instruct:free",
      "qwen/qwen-2.5-vl-7b-instruct:free",
      "google/gemini-2.0-flash-exp:free",
    ],
  ),
  AI_PROVIDER: optionalAiProvider(process.env.AI_PROVIDER),
  SPOONACULAR_API_KEY: optionalOpenAiKey(process.env.SPOONACULAR_API_KEY),
  SPOONACULAR_BASE_URL: optionalString(
    process.env.SPOONACULAR_BASE_URL,
    "https://api.spoonacular.com",
  ),
  SPOONACULAR_TIMEOUT_MS: optionalTimeoutMs(
    process.env.SPOONACULAR_TIMEOUT_MS,
    60_000,
  ),
  GEMINI_API_KEY: optionalOpenAiKey(process.env.GEMINI_API_KEY),
  GEMINI_MODEL: optionalString(process.env.GEMINI_MODEL, "gemini-2.0-flash"),
  CORS_ORIGINS: optionalStringsCsv(process.env.CORS_ORIGINS, [
    "http://localhost:8082",
    "http://localhost:5173",
  ]),
  ADMIN_BOOTSTRAP_EMAIL: process.env.ADMIN_BOOTSTRAP_EMAIL?.trim() || null,
  ADMIN_BOOTSTRAP_PASSWORD:
    process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim() || null,
} as const;
