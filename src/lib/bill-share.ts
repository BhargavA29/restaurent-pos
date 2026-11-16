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

export function signBillNo(billNo: number): string {
  return createHmac("sha256", getSigningSecret())
    .update(`bill:${billNo}`)
    .digest("base64url")
    .slice(0, 6);
}

export function verifyBillNoSignature(
  billNo: number,
  sig: string | undefined | null,
): boolean {
  if (!sig) return false;
  const expected = signBillNo(billNo);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(sig, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function buildShortBillCode(billNo: number): string {
  return `${billNo}-${signBillNo(billNo)}`;
}

export function buildShortBillPath(billNo: number): string {
  return `/b/${buildShortBillCode(billNo)}`;
}

async function loadOrderRelations(order: typeof orders.$inferSelect) {
  const db = getDb();
  const [items, paymentRows] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(payments).where(eq(payments.orderId, order.id)),
  ]);

  return {
    status: "ok" as const,
    order,
    items,
    payments: paymentRows,
    sig: signBillId(order.id),
  };
}

export type LoadedSignedBill =
  | { status: "invalid" }
  | { status: "not_found" }
  | Awaited<ReturnType<typeof loadOrderRelations>>;

export async function loadSignedOrder(
  orderId: string,
  sig: string | undefined | null,
): Promise<LoadedSignedBill> {
  if (!uuidSchema.safeParse(orderId).success || !verifyBillSignature(orderId, sig)) {
    return { status: "invalid" as const };
  }

  const [order] = await getDb()
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return { status: "not_found" as const };
  return loadOrderRelations(order);
}

export async function loadSignedOrderByCode(
  code: string,
): Promise<LoadedSignedBill> {
  const match = /^(\d+)-([A-Za-z0-9_-]{6})$/.exec(code.trim());
  if (!match) return { status: "invalid" as const };

  const billNo = Number.parseInt(match[1], 10);
  if (
    !Number.isSafeInteger(billNo) ||
    billNo <= 0 ||
    billNo > 2_147_483_647 ||
    !verifyBillNoSignature(billNo, match[2])
  ) {
    return { status: "invalid" as const };
  }

  const [order] = await getDb()
    .select()
    .from(orders)
    .where(eq(orders.billNo, billNo))
    .limit(1);

  if (!order) return { status: "not_found" as const };
  return loadOrderRelations(order);
}
