import { between, desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { getDb } from "@/db";
import { expenses, orderItems, orders } from "@/db/schema";
import { requireOwner } from "@/lib/auth";
import { signBillId } from "@/lib/bill-share";
import { isoDateSchema } from "@/lib/validators";
import {
  DashboardView,
  type DayBillRow,
  type DayRevenuePoint,
  type ExpenseItem,
  type TopSellingRow,
} from "./dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

const istDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
});

const fullDateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  weekday: "short",
});

function isValidIsoCalendarDate(value: string | undefined): value is string {
  if (!value || !isoDateSchema.safeParse(value).success) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function shiftIsoDate(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split("-").map((n) => Number.parseInt(n, 10));
  return new Date(Date.UTC(y, m - 1, d + deltaDays)).toISOString().slice(0, 10);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireOwner();
  const params = await searchParams;
  const todayDate = istDateFormatter.format(new Date());
  const selectedDate = isValidIsoCalendarDate(params.date) ? params.date : todayDate;

  const dates = Array.from({ length: 7 }, (_, i) => shiftIsoDate(selectedDate, i - 6));
  const db = getDb();

  const [dailyRows, topRows, expenseRows, billRows] = await Promise.all([
    db
      .select({
        businessDate: orders.businessDate,
        revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
        orderCount: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(between(orders.businessDate, dates[0], selectedDate))
      .groupBy(orders.businessDate),
    db
      .select({
        name: orderItems.name,
        variantName: orderItems.variantName,
        qty: sql<number>`coalesce(sum(${orderItems.qty}), 0)::int`,
        revenue: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orders.businessDate, selectedDate))
      .groupBy(orderItems.name, orderItems.variantName)
      .orderBy(sql`sum(${orderItems.qty}) desc`, sql`sum(${orderItems.lineTotal}) desc`),
    db
      .select({
        id: expenses.id,
        spentOn: expenses.spentOn,
        description: expenses.description,
        amount: expenses.amount,
        createdAt: expenses.createdAt,
      })
      .from(expenses)
      .where(eq(expenses.spentOn, selectedDate))
      .orderBy(desc(expenses.createdAt)),
    db
      .select({
        id: orders.id,
        billNo: orders.billNo,
        type: orders.type,
        customerName: orders.customerName,
        total: orders.total,
        placedAt: orders.placedAt,
      })
      .from(orders)
      .where(eq(orders.businessDate, selectedDate))
      .orderBy(desc(orders.billNo)),
  ]);

  const dailyByDate = new Map(dailyRows.map((r) => [r.businessDate, r]));

  const sevenDays: DayRevenuePoint[] = dates.map((d) => {
    const dt = new Date(`${d}T00:00:00Z`);
    const stats = dailyByDate.get(d);
    return {
      date: d,
      dayShort: weekdayFormatter.format(dt),
      dayNum: d.slice(8),
      revenue: stats?.revenue ?? 0,
      orderCount: stats?.orderCount ?? 0,
    };
  });

  const topItems: TopSellingRow[] = topRows;
  const initialExpenses: ExpenseItem[] = expenseRows.map((e) => ({
    id: e.id,
    spentOn: e.spentOn,
    description: e.description,
    amount: e.amount,
    createdAtIso: e.createdAt.toISOString(),
  }));

  const bills: DayBillRow[] = billRows.map((b) => ({
    id: b.id,
    sig: signBillId(b.id),
    billNo: b.billNo,
    type: b.type,
    customerName: b.customerName,
    total: b.total,
    placedAtIso: b.placedAt.toISOString(),
  }));

  return (
    <DashboardView
      key={selectedDate}
      selectedDate={selectedDate}
      selectedDateLabel={fullDateFormatter.format(new Date(`${selectedDate}T00:00:00Z`))}
      todayDate={todayDate}
      prevDate={shiftIsoDate(selectedDate, -1)}
      nextDate={shiftIsoDate(selectedDate, 1)}
      sevenDays={sevenDays}
      topItems={topItems}
      initialExpenses={initialExpenses}
      bills={bills}
    />
  );
}
