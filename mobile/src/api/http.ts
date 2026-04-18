import { parseApiErrorBody } from "./types";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let baseUrl: string | null = null;
let accessToken: string | null = null;

export function configureHttpClient(nextBaseUrl: string): void {
  baseUrl = nextBaseUrl.replace(/\/$/, "");
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

function requireBaseUrl(): string {
  if (!baseUrl) {
    throw new Error("HTTP client is not configured with a base URL.");
  }
  return baseUrl;
}

async function readJsonSafely(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function apiFetchJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${requireBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(url, { ...init, headers });
  const body = await readJsonSafely(res);

  if (!res.ok) {
    const parsed = parseApiErrorBody(body);
    const fallback =
      typeof res.statusText === "string" && res.statusText.length > 0
        ? res.statusText
        : "Request failed";
    throw new ApiError(res.status, parsed ?? fallback);
  }

  return body as T;
}

export async function apiFetchVoid(
  path: string,
  init?: RequestInit,
): Promise<void> {
  const url = `${requireBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const parsed = parseApiErrorBody(body);
    const fallback =
      typeof res.statusText === "string" && res.statusText.length > 0
        ? res.statusText
        : "Request failed";
    throw new ApiError(res.status, parsed ?? fallback);
  }
}
