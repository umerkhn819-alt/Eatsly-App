import { apiFetchJson } from "./http";
import type { AuthSuccessPayload, MePayload } from "./types";

export async function registerAccount(
  email: string,
  password: string,
): Promise<AuthSuccessPayload> {
  return apiFetchJson<AuthSuccessPayload>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function loginAccount(
  email: string,
  password: string,
): Promise<AuthSuccessPayload> {
  return apiFetchJson<AuthSuccessPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchMe(): Promise<MePayload> {
  return apiFetchJson<MePayload>("/auth/me", { method: "GET" });
}
