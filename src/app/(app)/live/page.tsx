import { and, asc, eq, inArray, or } from "drizzle-orm";
import type { Metadata } from "next";
import { getDb } from "@/db";
import {
  orderItems,
  orders,
  payments,
  type OrderAddonSnapshot,
} from "@/db/schema";
import { requireOwner } from "@/lib/auth";
import { signBillId } from "@/lib/bill-share";
import type { OrderType } from "@/lib/cart";
import type { OrderStatus, PaymentMode } from "@/lib/validators";
import { LiveOrdersView, type LiveOrderRow } from "./live-orders-view";

export const metadata: Metadata = { title: "Live orders" };

const istDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
});

export default async function LiveOrdersPage() {
  await requireOwner();
  const todayDate = istDateFormatter.format(new Date());
  const db = getDb();

  const orderRows = await db
    .select({
      id: orders.id,
      billNo: orders.billNo,
      type: orders.type,
      status: orders.status,
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      total: orders.total,
      placedAt: orders.placedAt,
    })
    .from(orders)
    .where(
      or(
        inArray(orders.status, ["in_progress", "ready"]),
        and(eq(orders.status, "delivered"), eq(orders.businessDate, todayDate)),
      ),
    )
    .orderBy(asc(orders.placedAt));

  const orderIds = orderRows.map((o) => o.id);

  const [itemRows, paymentRows] =
    orderIds.length === 0
      ? [[], []]
      : await Promise.all([
          db
            .select({
              id: orderItems.id,
              orderId: orderItems.orderId,
              name: orderItems.name,
              variantName: orderItems.variantName,
              addons: orderItems.addons,
              qty: orderItems.qty,
              discount: orderItems.discount,
              complimentary: orderItems.complimentary,
              lineTotal: orderItems.lineTotal,
            })
            .from(orderItems)
            .where(inArray(orderItems.orderId, orderIds)),
          db
            .select({
              orderId: payments.orderId,
              mode: payments.mode,
              amount: payments.amount,
            })
            .from(payments)
            .where(inArray(payments.orderId, orderIds)),
        ]);

  const itemsByOrder = new Map<
    string,
    {
      id: string;
      name: string;
      variantName: string | null;
      addons: OrderAddonSnapshot[];
      qty: number;
      discount: number;
      complimentary: boolean;
      lineTotal: number;
    }[]
  >();
  for (const row of itemRows) {
    const list = itemsByOrder.get(row.orderId) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      variantName: row.variantName,
      addons: row.addons,
      qty: row.qty,
      discount: row.discount,
      complimentary: row.complimentary,
      lineTotal: row.lineTotal,
    });
    itemsByOrder.set(row.orderId, list);
  }

  const paymentsByOrder = new Map<string, { mode: PaymentMode; amount: number }[]>();
  for (const row of paymentRows) {
    const list = paymentsByOrder.get(row.orderId) ?? [];
    list.push({ mode: row.mode, amount: row.amount });
    paymentsByOrder.set(row.orderId, list);
  }

  const initialOrders: LiveOrderRow[] = orderRows.map((o) => ({
    id: o.id,
    sig: signBillId(o.id),
    billNo: o.billNo,
    type: o.type as OrderType,
    status: o.status as OrderStatus,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    total: o.total,
    placedAtIso: o.placedAt.toISOString(),
    items: itemsByOrder.get(o.id) ?? [],
    payments: paymentsByOrder.get(o.id) ?? [],
  }));

  return <LiveOrdersView key={todayDate} initialOrders={initialOrders} />;
}
