// Seeds the FRY sample menu into DATABASE_URL if no categories exist yet.
// Pass `--replace` to replace an un-ordered dev menu.
// Run via `npm run db:seed` (dev only; keep prod empty apart from owners).
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "../src/db/schema";
import { seedSampleMenuInDb } from "../src/db/seed-data";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const replace = process.argv.includes("--replace");
  const pool = new Pool({ connectionString: url });
  const db = drizzle({ client: pool, schema });
  const { seeded, reason } = await seedSampleMenuInDb(db, { replace });
  await pool.end();

  console.log(
    seeded
      ? `Seeded FRY menu on ${new URL(url).host}`
      : `Skipped seed (${reason ?? "already populated"}) on ${new URL(url).host}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
