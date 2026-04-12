import type { RequestHandler } from "express";
import { HttpError } from "./errorHandler.js";
import { asyncHandler } from "./asyncHandler.js";
import * as usersRepo from "../repos/usersRepo.js";
import { verifyAccessToken } from "../services/authService.js";

function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token || token.length === 0) {
    return null;
  }
  return token.trim();
}

export const requireAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const raw = extractBearerToken(req.headers.authorization);
  if (!raw) {
    throw new HttpError(401, "Missing or invalid Authorization header");
  }

  const { sub } = verifyAccessToken(raw);
  const user = await usersRepo.findUserById(sub);
  if (!user) {
    throw new HttpError(401, "Invalid or expired token");
  }

  req.authUser = {
    id: user._id.toHexString(),
    email: user.email,
    role: user.role,
  };

  next();
});
