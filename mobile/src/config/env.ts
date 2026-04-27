/**
 * Expo injects `EXPO_PUBLIC_*` variables at bundle time (see `.env.example`).
 */
export function readApiBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(/\/$/, "");
}
