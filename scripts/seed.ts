// Seeds a sample cafe menu into DATABASE_URL if no categories exist yet.
// Run via `npm run db:seed` (dev only; keep prod empty apart from owners).
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "../src/db/schema";
import { seedSampleMenuInDb } from "../src/db/seed-data";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString: url });
  const db = drizzle({ client: pool, schema });
  const { seeded } = await seedSampleMenuInDb(db);
  await pool.end();

  console.log(
    seeded
      ? `Seeded sample cafe menu on ${new URL(url).host}`
      : `Skipped seed: categories already exist on ${new URL(url).host}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
