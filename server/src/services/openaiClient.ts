import OpenAI from "openai";
import { env } from "../config/env.js";
import { HttpError } from "../middleware/errorHandler.js";

let client: OpenAI | null = null;

export function getOpenAiClient(): OpenAI {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new HttpError(
      503,
      "OpenAI is not configured on this server. Set OPENAI_API_KEY in the server environment.",
    );
  }

  if (!client) {
    client = new OpenAI({
      apiKey,
      baseURL: env.OPENAI_BASE_URL,
      timeout: env.OPENAI_TIMEOUT_MS,
      maxRetries: 0,
    });
  }

  return client;
}
