import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrdersView } from "@/app/(app)/orders/orders-view";
import {
  parseOrdersSearchParams,
  queryOrdersPage,
  type RawOrdersSearchParams,
} from "@/app/(app)/orders/query-orders";
import { getDb } from "@/db";
import { customers } from "@/db/schema";
import { requireOwner } from "@/lib/auth";
import { normalizePhoneInput } from "@/lib/validators";

type CustomerOrdersPageProps = {
  params: Promise<{ phone: string }>;
  searchParams: Promise<RawOrdersSearchParams>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ phone: string }>;
}): Promise<Metadata> {
  const { phone: rawPhone } = await params;
  const phone = normalizePhoneInput(decodeURIComponent(rawPhone));
  if (!/^[6-9]\d{9}$/.test(phone)) return { title: "Customer orders" };

  const [customer] = await getDb()
    .select({ name: customers.name })
    .from(customers)
    .where(eq(customers.phone, phone))
    .limit(1);

  return {
    title: customer ? `${customer.name} · Orders` : `+91 ${phone} · Orders`,
  };
}

export default async function CustomerOrdersPage({
  params,
  searchParams,
}: CustomerOrdersPageProps) {
  await requireOwner();
  const { phone: rawPhone } = await params;
  const phone = normalizePhoneInput(decodeURIComponent(rawPhone));
  if (!/^[6-9]\d{9}$/.test(phone)) notFound();

  const resolvedSearchParams = await searchParams;
  const filters = parseOrdersSearchParams(resolvedSearchParams, phone);

  const [[customer], data] = await Promise.all([
    getDb()
      .select()
      .from(customers)
      .where(eq(customers.phone, phone))
      .limit(1),
    queryOrdersPage(filters),
  ]);

  if (!customer && data.totalCount === 0) notFound();

  return (
    <OrdersView
      key={JSON.stringify({ phone, ...filters, page: data.currentPage })}
      data={data}
      basePath={`/customers/${phone}`}
      customerScope={{
        phone,
        name: customer?.name ?? "Customer",
        allTimeOrders: customer?.orderCount ?? data.totalCount,
        allTimeSpent: customer?.totalSpent ?? data.totalRevenue,
      }}
    />
  );
}
