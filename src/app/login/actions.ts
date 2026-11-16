"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { owners } from "@/db/schema";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// Compared against when the email is unknown, so timing doesn't reveal which emails exist.
let dummyHash: string | undefined;
function getDummyHash() {
  return (dummyHash ??= bcrypt.hashSync("not-a-real-password", 12));
}

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter your email and password" };

  const [owner] = await getDb()
    .select()
    .from(owners)
    .where(eq(owners.email, parsed.data.email))
    .limit(1);

  const ok = await bcrypt.compare(parsed.data.password, owner?.passwordHash ?? getDummyHash());
  if (!owner || !ok) return { error: "Email or password is wrong" };

  const jar = await cookies();
  jar.set(
    SESSION_COOKIE,
    await signSession({ ownerId: owner.id, name: owner.name }),
    sessionCookieOptions,
  );
  redirect("/pos");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
