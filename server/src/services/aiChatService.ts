import { HttpError } from "../middleware/errorHandler.js";
import { searchRecipes } from "./spoonacularClient.js";

const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 6_000;
const MAX_TOTAL_CHARS = 48_000;

type IncomingMsg = { role: "user" | "assistant"; content: string };

function parseMessages(body: unknown): IncomingMsg[] {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "JSON body is required");
  }
  const b = body as Record<string, unknown>;
  const raw = b.messages;
  if (!Array.isArray(raw)) {
    throw new HttpError(400, "messages must be a non-empty array");
  }
  if (raw.length === 0) {
    throw new HttpError(400, "messages must be a non-empty array");
  }
  if (raw.length > MAX_MESSAGES) {
    throw new HttpError(400, `At most ${MAX_MESSAGES} messages are allowed`);
  }

  const out: IncomingMsg[] = [];
  let total = 0;

  for (let i = 0; i < raw.length; i += 1) {
    const row = raw[i];
    if (!row || typeof row !== "object") {
      throw new HttpError(400, `Invalid message at index ${i}`);
    }
    const r = row as Record<string, unknown>;
    if (r.role !== "user" && r.role !== "assistant") {
      throw new HttpError(400, `Invalid role at index ${i}`);
    }
    if (typeof r.content !== "string") {
      throw new HttpError(400, `Invalid content at index ${i}`);
    }
    const content = r.content;
    if (content.length > MAX_MESSAGE_CHARS) {
      throw new HttpError(400, `Message ${i} is too long`);
    }
    if (content.trim().length === 0) {
      throw new HttpError(400, `Message ${i} is empty`);
    }
    total += content.length;
    if (total > MAX_TOTAL_CHARS) {
      throw new HttpError(400, "Combined message length is too large");
    }
    out.push({ role: r.role, content });
  }

  return out;
}

export async function runChat(body: unknown): Promise<{
  message: string;
  model: string;
}> {
  const incoming = parseMessages(body);
  const latestUser = [...incoming].reverse().find((m) => m.role === "user");
  if (!latestUser) {
    throw new HttpError(400, "At least one user message is required.");
  }
  const query = latestUser.content.trim();
  if (query.length === 0) {
    throw new HttpError(400, "Latest user message is empty.");
  }

  let message: string;
  try {
    const res = await searchRecipes({
      query,
      number: 3,
    });
    if (res.results.length === 0) {
      message = `I could not find recipes for "${query}". Try another keyword like pasta, chicken, or salad.`;
    } else {
      const lines = res.results.map((r, i) => `${i + 1}. ${r.title}`);
      message = [
        `Top recipe matches for "${query}":`,
        ...lines,
        "Tip: ask with constraints like 'high protein' or 'max fat 25'.",
      ].join("\n");
    }
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    console.error("Spoonacular chat search request failed:", err);
    throw new HttpError(502, "Recipe assistant failed. Try again later.");
  }

  const trimmed = message.trim();
  if (!trimmed) {
    throw new HttpError(502, "Recipe assistant returned an empty response");
  }

  return { message: trimmed, model: "spoonacular:complexSearch" };
}
