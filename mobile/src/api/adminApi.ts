import { apiFetchJson } from "./http";

export async function seedRecipes(): Promise<{ inserted: number }> {
  const res = await apiFetchJson<{ ok: true; inserted: number }>("/admin/seed/recipes", {
    method: "POST",
  });
  return { inserted: res.inserted };
}
