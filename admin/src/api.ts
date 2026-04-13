import type { AuthUser, RecipeRow, UserRow } from "./types";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "http://127.0.0.1:3000";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function readToken(): string | null {
  return localStorage.getItem("tasteai_admin_token");
}

export function saveToken(token: string): void {
  localStorage.setItem("tasteai_admin_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("tasteai_admin_token");
}

export function hasToken(): boolean {
  return !!readToken();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const token = readToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error?: { message?: unknown } }).error?.message === "string"
        ? ((body as { error: { message: string } }).error.message)
        : res.statusText || "Request failed";
    throw new ApiError(res.status, message);
  }
  return body as T;
}

export async function login(email: string, password: string): Promise<void> {
  const r = await request<{ ok: true; token: string; user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (r.user.role !== "admin") {
    throw new ApiError(403, "This account is not an admin.");
  }
  saveToken(r.token);
}

export async function fetchMe(): Promise<AuthUser> {
  const r = await request<{ ok: true; user: AuthUser }>("/auth/me");
  return r.user;
}

export async function fetchOverview(): Promise<{ users: number; recipes: number; favorites: number }> {
  const r = await request<{ ok: true; overview: { users: number; recipes: number; favorites: number } }>(
    "/admin/overview",
  );
  return r.overview;
}

export async function fetchUsers(): Promise<UserRow[]> {
  const r = await request<{ ok: true; users: UserRow[] }>("/admin/users?limit=200&offset=0");
  return r.users;
}

export async function setUserRole(id: string, role: "user" | "admin"): Promise<void> {
  await request<{ ok: true }>(`/admin/users/${encodeURIComponent(id)}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function fetchRecipes(): Promise<RecipeRow[]> {
  const r = await request<{ ok: true; recipes: RecipeRow[] }>("/admin/recipes?limit=200&offset=0");
  return r.recipes;
}

export async function deleteRecipe(id: string): Promise<void> {
  await request<unknown>(`/admin/recipes/${encodeURIComponent(id)}`, { method: "DELETE" });
}
