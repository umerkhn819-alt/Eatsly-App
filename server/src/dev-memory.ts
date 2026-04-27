import dotenv from "dotenv";
import { MongoMemoryServer } from "mongodb-memory-server";

dotenv.config();

async function boot(): Promise<void> {
  const mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri();
  console.info(
    "[dev] Ephemeral MongoDB started (mongodb-memory-server). Data is not persisted across restarts.",
  );
  await import("./index.js");
}

void boot().catch((err) => {
  console.error("Failed to boot dev server with in-memory MongoDB:", err);
  process.exit(1);
});
