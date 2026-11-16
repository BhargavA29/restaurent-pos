"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { requireOwner } from "@/lib/auth";
import { updateOrderStatusSchema, type OrderStatus } from "@/lib/validators";

export async function updateOrderStatus(input: {
  orderId: string;
  status: OrderStatus;
}): Promise<{ error?: string }> {
  await requireOwner();
  const parsed = updateOrderStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid order status" };
  }

  try {
    const updated = await getDb()
      .update(orders)
      .set({ status: parsed.data.status })
      .where(eq(orders.id, parsed.data.orderId))
      .returning({ id: orders.id });

    if (updated.length === 0) {
      return { error: "Order not found" };
    }
    return {};
  } catch {
    return { error: "Could not update order status" };
  }
}
