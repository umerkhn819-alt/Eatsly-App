import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as favoritesService from "../services/favoritesService.js";

export const favoritesRouter = Router();

favoritesRouter.use(requireAuth);

favoritesRouter.get(
  "/favorites",
  asyncHandler(async (req, res) => {
    const u = req.authUser;
    if (!u) {
      throw new HttpError(500, "Unexpected auth state", false);
    }

    const { limit, offset } = favoritesService.parseFavoriteListQuery(
      req.query as Record<string, unknown>,
    );

    const result = await favoritesService.listFavorites({
      userId: u.id,
      limit,
      offset,
    });

    res.json({ ok: true, ...result });
  }),
);

favoritesRouter.post(
  "/favorites",
  asyncHandler(async (req, res) => {
    const u = req.authUser;
    if (!u) {
      throw new HttpError(500, "Unexpected auth state", false);
    }

    const { recipe, alreadyFavorited } = await favoritesService.addFavorite({
      userId: u.id,
      body: req.body,
    });

    res
      .status(alreadyFavorited ? 200 : 201)
      .json({ ok: true, recipe, alreadyFavorited });
  }),
);

favoritesRouter.delete(
  "/favorites/:recipeId",
  asyncHandler(async (req, res) => {
    const u = req.authUser;
    if (!u) {
      throw new HttpError(500, "Unexpected auth state", false);
    }

    await favoritesService.removeFavorite({
      userId: u.id,
      recipeIdParam: req.params.recipeId,
    });

    res.status(204).send();
  }),
);
