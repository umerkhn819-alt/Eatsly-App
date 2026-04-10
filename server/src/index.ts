import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectMongo, disconnectMongo } from "./db/mongo.js";
import { ensureFavoriteIndexes } from "./repos/favoritesRepo.js";
import { ensureRecipeIndexes } from "./repos/recipesRepo.js";
import { ensureUserIndexes } from "./repos/usersRepo.js";
import { ensureBootstrapAdmin } from "./services/authService.js";

let server: ReturnType<ReturnType<typeof createApp>["listen"]> | null = null;

async function shutdown(signal: string) {
  console.info(`Received ${signal}, shutting down…`);
  await new Promise<void>((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });
  await disconnectMongo();
  process.exit(0);
}

async function main() {
  await connectMongo();
  await ensureUserIndexes();
  await ensureRecipeIndexes();
  await ensureFavoriteIndexes();
  if (env.ADMIN_BOOTSTRAP_EMAIL && env.ADMIN_BOOTSTRAP_PASSWORD) {
    await ensureBootstrapAdmin({
      email: env.ADMIN_BOOTSTRAP_EMAIL,
      password: env.ADMIN_BOOTSTRAP_PASSWORD,
    });
  }
  const app = createApp();
  server = app.listen(env.PORT);
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${env.PORT} is already in use. Stop the other process (e.g. another npm run dev) or set PORT in server/.env to a free port.`,
      );
      process.exit(1);
    }
    console.error("HTTP server error:", err);
    process.exit(1);
  });
  server.on("listening", () => {
    console.info(`TasteAI API listening on http://localhost:${env.PORT}`);
  });

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
