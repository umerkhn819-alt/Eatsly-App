import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { aiRouter } from "./routes/ai.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { favoritesRouter } from "./routes/favorites.js";
import { healthRouter } from "./routes/health.js";
import { recipesRouter } from "./routes/recipes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin(
        origin: string | undefined,
        cb: (err: Error | null, allow?: boolean) => void,
      ) {
        if (!origin) {
          cb(null, true);
          return;
        }
        cb(null, env.CORS_ORIGINS.includes(origin));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.use(healthRouter);
  app.use(authRouter);
  app.use(recipesRouter);
  app.use(favoritesRouter);
  app.use(aiRouter);
  app.use(adminRouter);

  app.use((_req, res) => {
    res.status(404).json({
      ok: false,
      error: { code: "not_found", message: "Not found" },
    });
  });

  app.use(errorHandler);

  return app;
}
