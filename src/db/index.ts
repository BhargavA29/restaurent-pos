import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// DATABASE_URL points at the dev Neon database locally (.env.local)
// and at the prod database in Vercel's Production environment.
const globalForDb = globalThis as unknown as {
  db?: ReturnType<typeof create>;
};

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local.");
  }
  return drizzle({ client: new Pool({ connectionString: url }), schema });
}

/** Lazy so that builds and pages that never touch the database don't need a URL. */
export function getDb() {
  return (globalForDb.db ??= create());
}
