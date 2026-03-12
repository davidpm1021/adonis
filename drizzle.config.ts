import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL || "./adonis.db";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: databaseUrl.startsWith("postgresql") ? "postgresql" : "sqlite",
  dbCredentials: databaseUrl.startsWith("postgresql")
    ? { url: databaseUrl }
    : { url: databaseUrl },
});
