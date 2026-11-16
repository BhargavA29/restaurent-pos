import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, SESSION_COOKIE } from "./session";

/** Use in server components and actions: returns the signed-in owner or sends them to /login. */
export async function requireOwner() {
  const jar = await cookies();
  const session = await readSession(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");
  return session;
}
