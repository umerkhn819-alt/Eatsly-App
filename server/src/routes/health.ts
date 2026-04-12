import { Router } from "express";
import { getDb, getMongoClient } from "../db/mongo.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";

export const healthRouter = Router();

healthRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    res.json({
      ok: true,
      service: "tasteai-api",
      uptimeSeconds: Math.floor(process.uptime()),
      env: process.env.NODE_ENV ?? "development",
    });
  }),
);

healthRouter.get(
  "/health/db",
  asyncHandler(async (_req, res) => {
    if (!getMongoClient()) {
      throw new HttpError(503, "Database client is not initialized");
    }
    const ping = await getDb().admin().ping();
    if (!ping.ok) {
      throw new HttpError(503, "Database ping did not return ok");
    }
    res.json({
      ok: true,
      db: "connected",
      ping: ping,
    });
  }),
);
