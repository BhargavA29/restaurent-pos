import { defineConfig } from "drizzle-kit";

// Used only to generate migrations (`npm run db:generate`), which needs no database.
// Applying them is done by scripts/migrate.ts so dev and prod are explicit.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
