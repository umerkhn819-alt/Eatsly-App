export type AuthUser = {
  id: string;
  email: string;
  role: "user" | "admin";
};

export type UserRow = {
  id: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
};

export type RecipeIngredient = {
  name: string;
  amount?: string;
};

export type RecipeRow = {
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
};
