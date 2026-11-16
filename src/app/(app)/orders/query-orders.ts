import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db";
import { orderItems, orders, payments } from "@/db/schema";
import { buildShortBillPath } from "@/lib/bill-share";
import type { OrderType } from "@/lib/cart";
import {
  isoDateSchema,
  normalizePhoneInput,
  orderStatusSchema,
  paymentModeSchema,
  type OrderStatus,
  type PaymentMode,
} from "@/lib/validators";

export const ORDERS_PAGE_SIZE = 20;

export type OrdersSort = "recent" | "oldest" | "total_desc" | "total_asc";

export type OrdersFilterParams = {
  customerPhone?: string;
  q: string;
  status: "all" | OrderStatus;
  type: "all" | OrderType;
  mode: "all" | PaymentMode;
  from: string;
  to: string;
  sort: OrdersSort;
  page: number;
};

export type OrderTableRow = {
  id: string;
  billPath: string;
  billNo: number;
  type: OrderType;
  status: OrderStatus;
  customerName: string | null;
  customerPhone: string | null;
  total: number;
  discountTotal: number;
  businessDate: string;
  placedAtIso: string;
  itemsSummary: string;
  itemCount: number;
  payments: { mode: PaymentMode; amount: number }[];
};

export type OrdersPageData = {
  orders: OrderTableRow[];
  totalCount: number;
  totalRevenue: number;
  inProgressCount: number;
  readyCount: number;
  deliveredCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  todayDate: string;
  yesterdayDate: string;
  sevenDaysAgoDate: string;
  filters: OrdersFilterParams;
};

export type RawOrdersSearchParams = {
  q?: string;
  status?: string;
  type?: string;
  mode?: string;
  from?: string;
  to?: string;
  sort?: string;
  page?: string;
};

const istDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
});

function shiftIsoDate(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split("-").map((n) => Number.parseInt(n, 10));
  return new Date(Date.UTC(y, m - 1, d + deltaDays)).toISOString().slice(0, 10);
}

function validIsoDate(value: string | undefined): string {
  if (!value || !isoDateSchema.safeParse(value).success) return "";
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
    ? value
    : "";
}

export function parseOrdersSearchParams(
  raw: RawOrdersSearchParams,
  fixedCustomerPhone?: string,
): OrdersFilterParams {
  const parsedPage = Number.parseInt(raw.page ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const statusParsed = orderStatusSchema.safeParse(raw.status);
  const modeParsed = paymentModeSchema.safeParse(raw.mode);

  const type: "all" | OrderType =
    raw.type === "takeaway" || raw.type === "pickup" ? raw.type : "all";

  const sort: OrdersSort =
    raw.sort === "oldest" || raw.sort === "total_desc" || raw.sort === "total_asc"
      ? raw.sort
      : "recent";

  return {
    customerPhone: fixedCustomerPhone,
    q: (raw.q ?? "").trim().slice(0, 80),
    status: statusParsed.success ? statusParsed.data : "all",
    type,
    mode: modeParsed.success ? modeParsed.data : "all",
    from: validIsoDate(raw.from),
    to: validIsoDate(raw.to),
    sort,
    page,
  };
}

export async function queryOrdersPage(
  filters: OrdersFilterParams,
): Promise<OrdersPageData> {
  const todayDate = istDateFormatter.format(new Date());
  const yesterdayDate = shiftIsoDate(todayDate, -1);
  const sevenDaysAgoDate = shiftIsoDate(todayDate, -6);

  const conditions: SQL[] = [];

  if (filters.customerPhone) {
    conditions.push(eq(orders.customerPhone, filters.customerPhone));
  }
  if (filters.status !== "all") {
    conditions.push(eq(orders.status, filters.status));
  }
  if (filters.type !== "all") {
    conditions.push(eq(orders.type, filters.type));
  }
  if (filters.from) {
    conditions.push(gte(orders.businessDate, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(orders.businessDate, filters.to));
  }
  if (filters.mode !== "all") {
    conditions.push(
      sql`exists (select 1 from ${payments} where ${payments.orderId} = ${orders.id} and ${payments.mode} = ${filters.mode})`,
    );
  }
  if (filters.q) {
    const escaped = filters.q.replace(/[\\%_]/g, "\\$&");
    const orParts: SQL[] = [
      sql`exists (select 1 from ${orderItems} where ${orderItems.orderId} = ${orders.id} and ${orderItems.name} ilike ${`%${escaped}%`})`,
    ];

    if (/^#?\d+$/.test(filters.q)) {
      const billNo = Number.parseInt(filters.q.replace(/^#/, ""), 10);
      if (Number.isSafeInteger(billNo) && billNo > 0 && billNo <= 2_147_483_647) {
        orParts.push(eq(orders.billNo, billNo));
      }
    }

    if (!filters.customerPhone) {
      orParts.push(ilike(orders.customerName, `%${escaped}%`));
      const digits = normalizePhoneInput(filters.q);
      if (digits.length > 0) {
        orParts.push(ilike(orders.customerPhone, `%${digits}%`));
      }
    }

    const qClause = or(...orParts);
    if (qClause) conditions.push(qClause);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const db = getDb();

  const [agg] = await db
    .select({
      totalCount: sql<number>`count(*)::int`,
      totalRevenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
      inProgressCount: sql<number>`count(*) filter (where ${orders.status} = 'in_progress')::int`,
      readyCount: sql<number>`count(*) filter (where ${orders.status} = 'ready')::int`,
      deliveredCount: sql<number>`count(*) filter (where ${orders.status} = 'delivered')::int`,
    })
    .from(orders)
    .where(whereClause);

  const totalCount = agg?.totalCount ?? 0;
  const totalRevenue = agg?.totalRevenue ?? 0;
  const inProgressCount = agg?.inProgressCount ?? 0;
  const readyCount = agg?.readyCount ?? 0;
  const deliveredCount = agg?.deliveredCount ?? 0;

  const totalPages = Math.max(1, Math.ceil(totalCount / ORDERS_PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const offset = (currentPage - 1) * ORDERS_PAGE_SIZE;

  const orderByClauses =
    filters.sort === "oldest"
      ? [asc(orders.placedAt), asc(orders.billNo)]
      : filters.sort === "total_desc"
        ? [desc(orders.total), desc(orders.placedAt)]
        : filters.sort === "total_asc"
          ? [asc(orders.total), desc(orders.placedAt)]
          : [desc(orders.placedAt), desc(orders.billNo)];

  const orderRows =
    totalCount === 0
      ? []
      : await db
          .select({
            id: orders.id,
            billNo: orders.billNo,
            type: orders.type,
            status: orders.status,
            customerName: orders.customerName,
            customerPhone: orders.customerPhone,
            total: orders.total,
            discountTotal: orders.discountTotal,
            businessDate: orders.businessDate,
            placedAt: orders.placedAt,
          })
          .from(orders)
          .where(whereClause)
          .orderBy(...orderByClauses)
          .limit(ORDERS_PAGE_SIZE)
          .offset(offset);

  const orderIds = orderRows.map((o) => o.id);
  const [itemRows, paymentRows] =
    orderIds.length === 0
      ? [[], []]
      : await Promise.all([
          db
            .select({
              orderId: orderItems.orderId,
              name: orderItems.name,
              variantName: orderItems.variantName,
              qty: orderItems.qty,
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
    { parts: string[]; count: number }
  >();
  for (const row of itemRows) {
    const entry = itemsByOrder.get(row.orderId) ?? { parts: [], count: 0 };
    entry.parts.push(
      `${row.qty}× ${row.name}${row.variantName ? ` (${row.variantName})` : ""}`,
    );
    entry.count += row.qty;
    itemsByOrder.set(row.orderId, entry);
  }

  const paymentsByOrder = new Map<string, { mode: PaymentMode; amount: number }[]>();
  for (const row of paymentRows) {
    const list = paymentsByOrder.get(row.orderId) ?? [];
    list.push({ mode: row.mode, amount: row.amount });
    paymentsByOrder.set(row.orderId, list);
  }

  const tableRows: OrderTableRow[] = orderRows.map((o) => {
    const itemInfo = itemsByOrder.get(o.id);
    const parts = itemInfo?.parts ?? [];
    const summary =
      parts.length <= 2
        ? parts.join(", ")
        : `${parts.slice(0, 2).join(", ")} +${parts.length - 2} more`;

    return {
      id: o.id,
      billPath: buildShortBillPath(o.billNo),
      billNo: o.billNo,
      type: o.type as OrderType,
      status: o.status as OrderStatus,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      total: o.total,
      discountTotal: o.discountTotal,
      businessDate: o.businessDate,
      placedAtIso: o.placedAt.toISOString(),
      itemsSummary: summary || "Order items",
      itemCount: itemInfo?.count ?? 0,
      payments: paymentsByOrder.get(o.id) ?? [],
    };
  });

  return {
    orders: tableRows,
    totalCount,
    totalRevenue,
    inProgressCount,
    readyCount,
    deliveredCount,
    currentPage,
    totalPages,
    pageSize: ORDERS_PAGE_SIZE,
    todayDate,
    yesterdayDate,
    sevenDaysAgoDate,
    filters,
  };
}
