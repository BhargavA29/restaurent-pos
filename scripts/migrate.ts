// Applies pending migrations to the database in DATABASE_URL.
// Run through `npm run db:migrate` (dev) or `npm run db:migrate:prod` (prod),
// which load .env.local or .env.prod respectively.
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const host = new URL(url).host;
  console.log(`Migrating ${host}`);

  const pool = new Pool({ connectionString: url });
  await migrate(drizzle({ client: pool }), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("Done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
