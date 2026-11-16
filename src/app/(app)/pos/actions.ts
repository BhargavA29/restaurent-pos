"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { orderItems, orders, payments } from "@/db/schema";
import { requireOwner } from "@/lib/auth";
import { signBillId } from "@/lib/bill-share";
import { createOrderSchema, type CreateOrderInput } from "@/lib/validators";

export type PlaceOrderResult =
  | { billNo: number; orderId: string; sig: string }
  | { error: string };

const istDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
});

export async function placeOrder(input: CreateOrderInput): Promise<PlaceOrderResult> {
  const owner = await requireOwner();
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid order details" };
  }

  const data = parsed.data;
  const placedAt = new Date(data.placedAt);
  const businessDate = istDateFormatter.format(placedAt);

  try {
    const billNo = await getDb().transaction(async (tx) => {
      const [existing] = await tx
        .select({ billNo: orders.billNo })
        .from(orders)
        .where(eq(orders.id, data.id))
        .limit(1);

      if (existing) return existing.billNo;

      const [inserted] = await tx
        .insert(orders)
        .values({
          id: data.id,
          type: data.type,
          customerName: data.customerName || null,
          customerPhone: data.customerPhone || null,
          subtotal: data.subtotal,
          discountTotal: data.discountTotal,
          total: data.total,
          businessDate,
          placedAt,
          createdBy: owner.ownerId,
        })
        .returning({ billNo: orders.billNo });

      await tx.insert(orderItems).values(
        data.items.map((item) => ({
          orderId: data.id,
          kind: item.kind,
          name: item.name,
          variantName: item.variantName,
          unitPrice: item.unitPrice,
          addons: item.addons,
          qty: item.qty,
          discount: item.discount,
          complimentary: item.complimentary,
          lineTotal: item.lineTotal,
        })),
      );

      const paymentRows =
        data.total === 0
          ? [{ orderId: data.id, mode: data.payments[0].mode, amount: 0 }]
          : data.payments
              .filter((p) => p.amount > 0)
              .map((p) => ({ orderId: data.id, mode: p.mode, amount: p.amount }));

      await tx.insert(payments).values(paymentRows);
      return inserted.billNo;
    });

    revalidatePath("/dashboard");
    return { billNo, orderId: data.id, sig: signBillId(data.id) };
  } catch {
    return { error: "Could not save order. Check connection and try again." };
  }
}
