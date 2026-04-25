import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as aiChatService from "../services/aiChatService.js";
import * as aiRecommendationsService from "../services/aiRecommendationsService.js";
import {
  getRandomRecipes,
  getRecipeInformation,
} from "../services/spoonacularClient.js";
import {
  createRecipeFromPhoto,
  getPhotoRecipeById,
} from "../services/photoRecipeService.js";

export const aiRouter = Router();

aiRouter.use(requireAuth);

aiRouter.post(
  "/ai/recommendations",
  asyncHandler(async (req, res) => {
    const result = await aiRecommendationsService.generateRecommendations(req.body);
    res.json({ ok: true, ...result });
  }),
);

aiRouter.post(
  "/ai/chat",
  asyncHandler(async (req, res) => {
    const result = await aiChatService.runChat(req.body);
    res.json({ ok: true, ...result });
  }),
);

aiRouter.post(
  "/ai/photo/recipe",
  asyncHandler(async (req, res) => {
    const result = await createRecipeFromPhoto(req.body);
    res.json({ ok: true, ...result });
  }),
);

aiRouter.get(
  "/ai/photo/recipes/:id",
  asyncHandler(async (req, res) => {
    const recipe = await getPhotoRecipeById(req.params.id);
    res.json({ ok: true, recipe });
  }),
);

aiRouter.get(
  "/ai/spoonacular/recipes/random",
  asyncHandler(async (req, res) => {
    const raw = (req.query as Record<string, unknown>).number;
    const parsed =
      raw === undefined || raw === null || raw === ""
        ? 12
        : Number.parseInt(String(raw), 10);
    const number =
      Number.isInteger(parsed) && parsed >= 1 && parsed <= 20 ? parsed : 12;
    const recipes = await getRandomRecipes(number);
    res.json({ ok: true, recipes });
  }),
);

aiRouter.get(
  "/ai/spoonacular/recipes/:id",
  asyncHandler(async (req, res) => {
    const raw = req.params.id;
    if (raw === "random") {
      throw new HttpError(400, "Invalid recipe id.");
    }
    const id = Number.parseInt(raw, 10);
    if (!Number.isInteger(id) || id < 1 || String(id) !== raw) {
      throw new HttpError(400, "Invalid recipe id.");
    }
    const recipe = await getRecipeInformation(id);
    res.json({ ok: true, recipe });
  }),
);
