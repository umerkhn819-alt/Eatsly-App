import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as recipesService from "../services/recipesService.js";

export const recipesRouter = Router();

recipesRouter.use(requireAuth);

recipesRouter.get(
  "/recipes",
  asyncHandler(async (req, res) => {
    const u = req.authUser;
    if (!u) {
      throw new HttpError(500, "Unexpected auth state", false);
    }

    const { mineOnly, limit, offset } = recipesService.parseListQuery(
      req.query as Record<string, unknown>,
    );

    const result = await recipesService.listRecipes({
      userId: u.id,
      mineOnly,
      limit,
      offset,
    });

    res.json({ ok: true, ...result });
  }),
);

recipesRouter.post(
  "/recipes",
  asyncHandler(async (req, res) => {
    const u = req.authUser;
    if (!u) {
      throw new HttpError(500, "Unexpected auth state", false);
    }

    const recipe = await recipesService.createRecipeForUser({
      userId: u.id,
      body: req.body,
    });

    res.status(201).json({ ok: true, recipe });
  }),
);

recipesRouter.get(
  "/recipes/:id",
  asyncHandler(async (req, res) => {
    const recipe = await recipesService.getRecipeById(req.params.id);
    res.json({ ok: true, recipe });
  }),
);

recipesRouter.patch(
  "/recipes/:id",
  asyncHandler(async (req, res) => {
    const u = req.authUser;
    if (!u) {
      throw new HttpError(500, "Unexpected auth state", false);
    }

    const recipe = await recipesService.updateRecipe({
      id: req.params.id,
      userId: u.id,
      role: u.role,
      body: req.body,
    });

    res.json({ ok: true, recipe });
  }),
);

recipesRouter.delete(
  "/recipes/:id",
  asyncHandler(async (req, res) => {
    const u = req.authUser;
    if (!u) {
      throw new HttpError(500, "Unexpected auth state", false);
    }

    await recipesService.deleteRecipe({
      id: req.params.id,
      userId: u.id,
      role: u.role,
    });

    res.status(204).send();
  }),
);
