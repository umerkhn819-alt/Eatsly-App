export type AuthUser = {
  id: string;
  email: string;
  role: string;
  createdAt?: string;
};

export type AuthSuccessPayload = {
  ok: true;
  token: string;
  user: AuthUser;
};

export type MePayload = {
  ok: true;
  user: AuthUser;
};

type ApiErrorBody = {
  ok: false;
  error?: {
    code?: string;
    message?: string;
  };
};

export type RecipeIngredient = {
  name: string;
  amount?: string;
};

export type RecipePublic = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  tags: string[];
  prepMinutes?: number;
  cookMinutes?: number;
  servings?: number;
  createdAt: string;
  updatedAt: string;
  /** Set for Spoonacular-sourced recipes from the API */
  imageUrl?: string;
};

export type AiSuggestion = {
  title: string;
  reason: string;
  matchesCatalogRecipeTitle: string | null;
  source?: "spoonacular";
  spoonacularId?: number;
  imageUrl?: string | null;
};

export function parseApiErrorBody(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const b = body as ApiErrorBody;
  if (b.ok !== false) {
    return null;
  }
  const msg = b.error?.message;
  return typeof msg === "string" && msg.length > 0 ? msg : null;
}
