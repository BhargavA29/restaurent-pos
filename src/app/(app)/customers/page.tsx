import { desc, ilike, or, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { getDb } from "@/db";
import { customers } from "@/db/schema";
import { requireOwner } from "@/lib/auth";
import {
  CustomersView,
  type CustomerRow,
  type CustomerSort,
} from "./customers-view";

export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 20;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; sort?: string }>;
}) {
  await requireOwner();
  const params = await searchParams;

  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const rawPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const query = (params.q ?? "").trim().slice(0, 80);
  const sort: CustomerSort =
    params.sort === "spent" || params.sort === "orders" ? params.sort : "recent";

  const escapedQuery = query.replace(/[\\%_]/g, "\\$&");
  const rawDigits = query.replace(/\D/g, "");
  const phonePattern =
    rawDigits.length === 12 && rawDigits.startsWith("91")
      ? rawDigits.slice(2)
      : rawDigits;

  const whereClause = query
    ? phonePattern.length > 0
      ? or(
          ilike(customers.name, `%${escapedQuery}%`),
          ilike(customers.phone, `%${phonePattern}%`),
        )
      : ilike(customers.name, `%${escapedQuery}%`)
    : undefined;

  const db = getDb();
  const [statsRow] = await db
    .select({
      totalCount: sql<number>`count(*)::int`,
      repeatCount: sql<number>`count(*) filter (where ${customers.orderCount} > 1)::int`,
      totalRevenue: sql<number>`coalesce(sum(${customers.totalSpent}), 0)::int`,
    })
    .from(customers)
    .where(whereClause);

  const totalCount = statsRow?.totalCount ?? 0;
  const repeatCount = statsRow?.repeatCount ?? 0;
  const totalRevenue = statsRow?.totalRevenue ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(rawPage, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const orderByClauses =
    sort === "spent"
      ? [desc(customers.totalSpent), desc(customers.lastOrderAt)]
      : sort === "orders"
        ? [desc(customers.orderCount), desc(customers.lastOrderAt)]
        : [desc(customers.lastOrderAt)];

  const rows =
    totalCount === 0
      ? []
      : await db
          .select({
            phone: customers.phone,
            name: customers.name,
            orderCount: customers.orderCount,
            totalSpent: customers.totalSpent,
            lastOrderAt: customers.lastOrderAt,
          })
          .from(customers)
          .where(whereClause)
          .orderBy(...orderByClauses)
          .limit(PAGE_SIZE)
          .offset(offset);

  const customerList: CustomerRow[] = rows.map((c) => ({
    phone: c.phone,
    name: c.name,
    orderCount: c.orderCount,
    totalSpent: c.totalSpent,
    lastOrderAtIso: c.lastOrderAt.toISOString(),
  }));

  return (
    <CustomersView
      key={`${currentPage}:${sort}:${query}`}
      initialCustomers={customerList}
      totalCount={totalCount}
      repeatCount={repeatCount}
      totalRevenue={totalRevenue}
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={PAGE_SIZE}
      query={query}
      sort={sort}
    />
  );
}
