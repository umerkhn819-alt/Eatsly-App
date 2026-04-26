import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import * as favoritesRepo from "../repos/favoritesRepo.js";
import * as recipesRepo from "../repos/recipesRepo.js";
import * as usersRepo from "../repos/usersRepo.js";
import * as recipesService from "../services/recipesService.js";
import * as seedService from "../services/seedService.js";

function parsePage(query: Record<string, unknown>): { limit: number; offset: number } {
  const limitRaw = typeof query.limit === "string" ? query.limit : undefined;
  const offsetRaw = typeof query.offset === "string" ? query.offset : undefined;
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 20;
  const offset = offsetRaw ? Number.parseInt(offsetRaw, 10) : 0;
  if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
    throw new HttpError(400, "limit must be between 1 and 200");
  }
  if (!Number.isFinite(offset) || offset < 0 || offset > 1_000_000) {
    throw new HttpError(400, "offset must be between 0 and 1000000");
  }
  return { limit, offset };
}

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get("/admin/overview", asyncHandler(async (_req, res) => {
  const [users, recipes, favorites] = await Promise.all([
    usersRepo.listUsersPage({ limit: 1, offset: 0 }).then((x) => x.total),
    recipesRepo.countRecipes(),
    favoritesRepo.countFavorites(),
  ]);
  res.json({ ok: true, overview: { users, recipes, favorites } });
}));

adminRouter.get("/admin/users", asyncHandler(async (req, res) => {
  const { limit, offset } = parsePage(req.query as Record<string, unknown>);
  const { items, total } = await usersRepo.listUsersPage({ limit, offset });
  res.json({
    ok: true,
    users: items.map((u) => ({
      id: u._id.toHexString(),
      email: u.email,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })),
    total,
  });
}));

adminRouter.patch("/admin/users/:id/role", asyncHandler(async (req, res) => {
  const role = (req.body as { role?: unknown })?.role;
  if (role !== "user" && role !== "admin") {
    throw new HttpError(400, "role must be user or admin");
  }
  const ok = await usersRepo.updateUserRole(req.params.id, role);
  if (!ok) {
    throw new HttpError(404, "User not found");
  }
  res.json({ ok: true });
}));

adminRouter.get("/admin/recipes", asyncHandler(async (req, res) => {
  const { limit, offset } = parsePage(req.query as Record<string, unknown>);
  const result = await recipesRepo.listRecipesPage({ limit, offset });
  res.json({
    ok: true,
    recipes: result.items.map(recipesService.toPublicRecipe),
    total: result.total,
  });
}));

adminRouter.delete("/admin/recipes/:id", asyncHandler(async (req, res) => {
  if (!req.authUser) {
    throw new HttpError(500, "Unexpected auth state", false);
  }
  await recipesService.deleteRecipe({
    id: req.params.id,
    userId: req.authUser.id,
    role: req.authUser.role,
  });
  res.status(204).send();
}));

adminRouter.post("/admin/seed/recipes", asyncHandler(async (req, res) => {
  const force = (req.body as { force?: unknown })?.force === true;
  const inserted = await seedService.seedStarterRecipes({ force });
  res.json({ ok: true, inserted });
}));
