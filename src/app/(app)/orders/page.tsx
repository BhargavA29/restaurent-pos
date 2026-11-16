import type { Metadata } from "next";
import { requireOwner } from "@/lib/auth";
import { OrdersView } from "./orders-view";
import {
  parseOrdersSearchParams,
  queryOrdersPage,
  type RawOrdersSearchParams,
} from "./query-orders";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<RawOrdersSearchParams>;
}) {
  await requireOwner();
  const params = await searchParams;
  const filters = parseOrdersSearchParams(params);
  const data = await queryOrdersPage(filters);

  return (
    <OrdersView
      key={JSON.stringify({ ...filters, page: data.currentPage })}
      data={data}
      basePath="/orders"
    />
  );
}
