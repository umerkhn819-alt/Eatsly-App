import { env } from "../config/env.js";
import { HttpError } from "../middleware/errorHandler.js";
import { getOpenAiClient } from "./openaiClient.js";

type ChatMessage = { role: "user" | "assistant"; content: string };

function selectProvider(): "openai" | "gemini" {
  if (env.AI_PROVIDER === "openai") {
    if (!env.OPENAI_API_KEY) {
      throw new HttpError(503, "AI provider is set to OpenAI but OPENAI_API_KEY is missing.");
    }
    return "openai";
  }
  if (env.AI_PROVIDER === "gemini") {
    if (!env.GEMINI_API_KEY) {
      throw new HttpError(503, "AI provider is set to Gemini but GEMINI_API_KEY is missing.");
    }
    return "gemini";
  }
  if (env.GEMINI_API_KEY) {
    return "gemini";
  }
  if (env.OPENAI_API_KEY) {
    return "openai";
  }
  throw new HttpError(
    503,
    "AI is not configured. Set GEMINI_API_KEY (preferred) or OPENAI_API_KEY in server environment.",
  );
}

function parseGeminiText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    throw new HttpError(502, "Gemini returned invalid response.");
  }
  const root = payload as Record<string, unknown>;
  const candidates = root.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new HttpError(502, "Gemini returned no candidates.");
  }
  const first = candidates[0];
  if (!first || typeof first !== "object") {
    throw new HttpError(502, "Gemini returned malformed candidate.");
  }
  const content = (first as Record<string, unknown>).content;
  if (!content || typeof content !== "object") {
    throw new HttpError(502, "Gemini returned malformed content.");
  }
  const parts = (content as Record<string, unknown>).parts;
  if (!Array.isArray(parts)) {
    throw new HttpError(502, "Gemini returned malformed parts.");
  }
  const text = parts
    .map((p) => {
      if (!p || typeof p !== "object") return "";
      const t = (p as Record<string, unknown>).text;
      return typeof t === "string" ? t : "";
    })
    .join("")
    .trim();
  if (!text) {
    throw new HttpError(502, "Gemini returned empty text.");
  }
  return text;
}

async function callGemini(input: {
  system: string;
  messages: ChatMessage[];
  temperature: number;
  maxOutputTokens: number;
  responseMimeType?: "application/json";
}): Promise<{ text: string; model: string }> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new HttpError(503, "GEMINI_API_KEY is missing.");
  }
  const geminiApiKey = apiKey;
  async function invoke(model: string): Promise<{ text: string; model: string }> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.OPENAI_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.system }] },
          contents: input.messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            temperature: input.temperature,
            maxOutputTokens: input.maxOutputTokens,
            ...(input.responseMimeType
              ? { responseMimeType: input.responseMimeType }
              : {}),
          },
        }),
      });
      const payload = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        return Promise.reject({ status: res.status, payload });
      }
      return { text: parseGeminiText(payload), model };
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    return await invoke(env.GEMINI_MODEL);
  } catch (err) {
    const e = err as { status?: number; payload?: unknown };
    const message =
      typeof (e.payload as Record<string, unknown> | null)?.error === "object"
        ? String(
            ((e.payload as Record<string, unknown>).error as Record<string, unknown>)
              .message ?? "",
          )
        : "";
    const shouldFallback =
      e.status === 404 &&
      /not found|not supported/i.test(message) &&
      env.GEMINI_MODEL !== "gemini-2.0-flash";
    if (shouldFallback) {
      console.warn(
        `Gemini model "${env.GEMINI_MODEL}" not available; falling back to gemini-2.0-flash.`,
      );
      return invoke("gemini-2.0-flash");
    }
    console.error("Gemini request failed:", e.payload ?? err);
    if (e.status === 404 && message) {
      throw new HttpError(
        502,
        `Gemini model "${env.GEMINI_MODEL}" is invalid for generateContent. Try GEMINI_MODEL=gemini-2.0-flash.`,
      );
    }
    throw new HttpError(502, "AI request failed. Try again later.");
  }
}

export async function runAiChat(input: {
  system: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
}): Promise<{ text: string; model: string }> {
  const provider = selectProvider();
  if (provider === "gemini") {
    return callGemini({
      system: input.system,
      messages: input.messages,
      temperature: input.temperature,
      maxOutputTokens: input.maxTokens,
    });
  }

  const openai = getOpenAiClient();
  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: input.temperature,
    max_tokens: input.maxTokens,
    messages: [
      { role: "system", content: input.system },
      ...input.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });
  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new HttpError(502, "AI returned an empty response");
  }
  return { text, model: env.OPENAI_MODEL };
}

export async function runAiJson(input: {
  system: string;
  userContent: string;
  temperature: number;
  maxTokens: number;
}): Promise<{ jsonText: string; model: string }> {
  const provider = selectProvider();
  if (provider === "gemini") {
    const out = await callGemini({
      system: input.system,
      messages: [{ role: "user", content: input.userContent }],
      temperature: input.temperature,
      maxOutputTokens: input.maxTokens,
      responseMimeType: "application/json",
    });
    return { jsonText: out.text, model: out.model };
  }

  const openai = getOpenAiClient();
  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: input.temperature,
    max_tokens: input.maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.userContent },
    ],
  });
  const jsonText = completion.choices[0]?.message?.content?.trim();
  if (!jsonText) {
    throw new HttpError(502, "AI returned an empty response");
  }
  return { jsonText, model: env.OPENAI_MODEL };
}
