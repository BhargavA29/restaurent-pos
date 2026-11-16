import "server-only";

import { eq } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getDb } from "@/db";
import { orderItems, orders, payments } from "@/db/schema";
import { uuidSchema } from "./validators";

function getSigningSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short.");
  }
  return secret;
}

export function signBillId(orderId: string): string {
  return createHmac("sha256", getSigningSecret())
    .update(orderId)
    .digest("hex")
    .slice(0, 16);
}

export function verifyBillSignature(
  orderId: string,
  sig: string | undefined | null,
): boolean {
  if (!sig) return false;
  const expected = signBillId(orderId);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(sig, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function loadSignedOrder(
  orderId: string,
  sig: string | undefined | null,
) {
  if (!uuidSchema.safeParse(orderId).success || !verifyBillSignature(orderId, sig)) {
    return { status: "invalid" as const };
  }

  const db = getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return { status: "not_found" as const };

  const [items, paymentRows] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(payments).where(eq(payments.orderId, order.id)),
  ]);

  return {
    status: "ok" as const,
    order,
    items,
    payments: paymentRows,
  };
}
