// Creates or updates an owner account in the database in DATABASE_URL.
// Usage: npm run owner:create -- "Name" username
//        npm run owner:create:prod -- "Name" username
// The password is read from the OWNER_PASSWORD environment variable,
// or prompted for, so it never lands in shell history.
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";

const USERNAME_RE = /^[a-z0-9._-]{2,40}$/;

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

  const [name, rawUsername] = process.argv.slice(2);
  if (!name || !rawUsername) {
    throw new Error('Usage: owner:create -- "Name" username');
  }
  const username = rawUsername.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) {
    throw new Error(
      "Username must be 2-40 characters (letters, numbers, '.', '_', '-')",
    );
  }

  const password = await readPassword();
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const passwordHash = await bcrypt.hash(password, 12);
  const pool = new Pool({ connectionString: url });
  await pool.query(
    `insert into owners (name, username, password_hash)
     values ($1, $2, $3)
     on conflict (username) do update
       set name = excluded.name,
           password_hash = excluded.password_hash`,
    [name.trim(), username, passwordHash],
  );
  await pool.end();
  console.log(`Saved owner ${username} on ${new URL(url).host}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
