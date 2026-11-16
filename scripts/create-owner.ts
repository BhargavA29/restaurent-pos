// Creates an owner account in the database in DATABASE_URL.
// Usage: npm run owner:create -- "Name" email@example.com
//        npm run owner:create:prod -- "Name" email@example.com
// The password is read from the OWNER_PASSWORD environment variable,
// or prompted for, so it never lands in shell history.
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";

async function readPassword() {
  if (process.env.OWNER_PASSWORD) return process.env.OWNER_PASSWORD;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question("Password (min 8 characters): ");
  rl.close();
  return answer;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const [name, rawEmail] = process.argv.slice(2);
  if (!name || !rawEmail) {
    throw new Error('Usage: owner:create -- "Name" email@example.com');
  }
  const email = rawEmail.trim().toLowerCase();

  const password = await readPassword();
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const passwordHash = await bcrypt.hash(password, 12);
  const pool = new Pool({ connectionString: url });
  await pool.query(
    "insert into owners (name, email, password_hash) values ($1, $2, $3)",
    [name.trim(), email, passwordHash],
  );
  await pool.end();
  console.log(`Created owner ${email} on ${new URL(url).host}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
