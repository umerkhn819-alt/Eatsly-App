import type { RequestHandler } from "express";
import { HttpError } from "./errorHandler.js";
import { asyncHandler } from "./asyncHandler.js";
import { requireAuth } from "./requireAuth.js";

export const requireAdmin: RequestHandler[] = [
  requireAuth,
  asyncHandler(async (req, _res, next) => {
    if (!req.authUser) {
      throw new HttpError(500, "Unexpected auth state", false);
    }
    if (req.authUser.role !== "admin") {
      throw new HttpError(403, "Admin access required");
    }
    next();
  }),
];
