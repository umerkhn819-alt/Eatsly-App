import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as authService from "../services/authService.js";

export const authRouter = Router();

authRouter.post(
  "/auth/register",
  asyncHandler(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const result = await authService.register({ email, password });
    res.status(201).json({ ok: true, ...result });
  }),
);

authRouter.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";

    const result = await authService.login({ email, password });
    res.json({ ok: true, ...result });
  }),
);

authRouter.get(
  "/auth/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ ok: true, user: req.authUser });
  }),
);
