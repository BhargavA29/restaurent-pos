"use client";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import type { OrderType } from "@/lib/cart";
import {
  formatIstDateTime,
  formatPaymentsSummary,
  formatRupees,
  ORDER_STATUS_LABEL,
  ORDER_TYPE_LABEL,
} from "@/lib/format";
import type { OrderStatus, PaymentMode } from "@/lib/validators";
import { updateOrderStatus } from "./actions";
import { OrdersTableRowsSkeleton } from "./orders-skeleton";
import type {
  OrdersFilterParams,
  OrdersPageData,
  OrdersSort,
  OrderTableRow,
} from "./query-orders";

export type CustomerScopeInfo = {
  phone: string;
  name: string;
  allTimeOrders: number;
  allTimeSpent: number;
};

type OrdersViewProps = {
  data: OrdersPageData;
  basePath: string;
  customerScope?: CustomerScopeInfo | null;
};

const SORT_LABELS: { value: OrdersSort; label: string }[] = [
  { value: "recent", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "total_desc", label: "Highest total" },
  { value: "total_asc", label: "Lowest total" },
];

const STATUS_SELECT_STYLES: Record<OrderStatus, string> = {
  in_progress: "border-accent/40 bg-accent-soft text-accent-text",
  ready: "border-positive/40 bg-positive/15 text-positive",
  delivered: "border-hairline-strong bg-raised text-ink-2",
};

function buildOrdersHref(
  basePath: string,
  filters: Partial<OrdersFilterParams>,
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.type && filters.type !== "all") params.set("type", filters.type);
  if (filters.mode && filters.mode !== "all") params.set("mode", filters.mode);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.sort && filters.sort !== "recent") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function getVisiblePages(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push("ellipsis");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

export function OrdersView({
  data,
  basePath,
  customerScope = null,
}: OrdersViewProps) {
  const router = useRouter();
  const searchId = useId();
  const fromId = useId();
  const toId = useId();
  const statusId = useId();
  const typeId = useId();
  const modeId = useId();
  const sortId = useId();
  const captionId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<OrderTableRow[]>(data.orders);
  const [statusCounts, setStatusCounts] = useState({
    inProgress: data.inProgressCount,
    ready: data.readyCount,
    delivered: data.deliveredCount,
  });
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const { filters, totalCount, totalRevenue, currentPage, totalPages, pageSize } = data;
  const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalCount);
  const visiblePages = getVisiblePages(currentPage, totalPages);
  const showCustomerColumn = !customerScope;

  const hasAnyFilter =
    Boolean(filters.q) ||
    filters.status !== "all" ||
    filters.type !== "all" ||
    filters.mode !== "all" ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    filters.sort !== "recent";

  function navigateWith(patch: Partial<OrdersFilterParams>) {
    const next: OrdersFilterParams = {
      ...filters,
      ...patch,
      page: patch.page ?? 1,
    };
    const href = buildOrdersHref(basePath, next);
    startTransition(() => {
      router.push(href);
    });
  }

  function handleLinkClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }
    event.preventDefault();
    startTransition(() => {
      router.push(href);
    });
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = searchInputRef.current?.value ?? "";
    navigateWith({ q: raw.trim().slice(0, 80) });
  }

  function handleStatusChange(orderId: string, nextStatus: OrderStatus) {
    const existing = rows.find((r) => r.id === orderId);
    if (!existing || existing.status === nextStatus) return;

    const prevStatus = existing.status;
    const prevRows = rows;
    const prevCounts = statusCounts;

    const countKey = (s: OrderStatus) =>
      s === "in_progress" ? "inProgress" : s === "ready" ? "ready" : "delivered";

    setErrorBanner(null);
    setRows((cur) =>
      cur.map((r) => (r.id === orderId ? { ...r, status: nextStatus } : r)),
    );
    setStatusCounts((cur) => ({
      ...cur,
      [countKey(prevStatus)]: Math.max(0, cur[countKey(prevStatus)] - 1),
      [countKey(nextStatus)]: cur[countKey(nextStatus)] + 1,
    }));

    void updateOrderStatus({ orderId, status: nextStatus })
      .then((res) => {
        if (res.error) {
          setRows(prevRows);
          setStatusCounts(prevCounts);
          setErrorBanner(res.error);
        }
      })
      .catch(() => {
        setRows(prevRows);
        setStatusCounts(prevCounts);
        setErrorBanner("Could not update order status. Check connection and try again.");
      });
  }

  const datePresets: { label: string; from: string; to: string }[] = [
    { label: "All dates", from: "", to: "" },
    { label: "Today", from: data.todayDate, to: data.todayDate },
    { label: "Yesterday", from: data.yesterdayDate, to: data.yesterdayDate },
    { label: "Last 7 days", from: data.sevenDaysAgoDate, to: data.todayDate },
  ];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          {customerScope ? (
            <Link
              href="/customers"
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-ink-2 hover:text-ink"
            >
              <ArrowLeft size={14} strokeWidth={1.5} aria-hidden />
              All customers
            </Link>
          ) : null}

          <h1 className="text-3xl font-normal leading-tight">
            {customerScope ? customerScope.name : "Orders"}
          </h1>

          {customerScope ? (
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-ink-2">
              <a
                href={`https://wa.me/91${customerScope.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-xs text-accent-text hover:underline"
              >
                <MessageCircle size={14} strokeWidth={1.5} aria-hidden />
                +91 {customerScope.phone}
              </a>
              <span className="font-mono text-xs text-ink-3">
                {customerScope.allTimeOrders} lifetime{" "}
                {customerScope.allTimeOrders === 1 ? "order" : "orders"} ·{" "}
                {formatRupees(customerScope.allTimeSpent)} total
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-ink-2">
              All counter bills with date, status, payment mode, and sort filters
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/live" className="btn btn-secondary min-h-11 px-4 text-sm">
            Live orders
          </Link>
        </div>
      </header>

      <section
        aria-label="Filtered order summary"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <div className="rounded-card border border-hairline bg-card p-5">
          <p className="text-sm text-ink-2">
            {hasAnyFilter ? "Matching orders" : "Total orders"}
          </p>
          {isPending ? (
            <div className="skeleton mt-2 h-8 w-20" />
          ) : (
            <p className="mt-2 font-mono text-3xl font-medium leading-none text-ink">
              {totalCount}
            </p>
          )}
          <p className="mt-2.5 text-xs text-ink-3">In current view</p>
        </div>

        <div className="rounded-card border border-hairline bg-card p-5">
          <p className="text-sm text-ink-2">Total value</p>
          {isPending ? (
            <div className="skeleton mt-2 h-8 w-28" />
          ) : (
            <p className="mt-2 font-mono text-3xl font-medium leading-none text-ink">
              {formatRupees(totalRevenue)}
            </p>
          )}
          <p className="mt-2.5 text-xs text-ink-3">Combined bill amount</p>
        </div>

        <div className="rounded-card border border-hairline bg-card p-5">
          <p className="text-sm text-ink-2">In-Progress / Ready</p>
          {isPending ? (
            <div className="skeleton mt-2 h-8 w-20" />
          ) : (
            <p className="mt-2 font-mono text-3xl font-medium leading-none text-ink">
              {statusCounts.inProgress} / {statusCounts.ready}
            </p>
          )}
          <p className="mt-2.5 text-xs text-ink-3">Active lifecycle bills</p>
        </div>

        <div className="rounded-card border border-hairline bg-card p-5">
          <p className="text-sm text-ink-2">Delivered</p>
          {isPending ? (
            <div className="skeleton mt-2 h-8 w-20" />
          ) : (
            <p className="mt-2 font-mono text-3xl font-medium leading-none text-ink">
              {statusCounts.delivered}
            </p>
          )}
          <p className="mt-2.5 text-xs text-ink-3">Completed orders</p>
        </div>
      </section>

      <section className="rounded-card border border-hairline bg-card p-5 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5" aria-label="Quick date filters">
              {datePresets.map((preset) => {
                const active =
                  filters.from === preset.from && filters.to === preset.to;
                const href = buildOrdersHref(basePath, {
                  ...filters,
                  from: preset.from,
                  to: preset.to,
                  page: 1,
                });
                return (
                  <Link
                    key={preset.label}
                    href={href}
                    onClick={(e) => handleLinkClick(e, href)}
                    aria-current={active ? "true" : undefined}
                    className={`inline-flex min-h-10 items-center rounded-control border px-3 text-xs font-medium transition-colors ${
                      active
                        ? "border-accent bg-accent text-white"
                        : "border-hairline bg-bg text-ink-2 hover:border-ink-3 hover:text-ink"
                    }`}
                  >
                    {preset.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <label htmlFor={fromId} className="text-xs text-ink-3">
                  From
                </label>
                <input
                  id={fromId}
                  type="date"
                  value={filters.from}
                  max={filters.to || data.todayDate}
                  onChange={(e) => navigateWith({ from: e.target.value })}
                  className="field min-h-10 w-auto px-2.5 font-mono text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <label htmlFor={toId} className="text-xs text-ink-3">
                  To
                </label>
                <input
                  id={toId}
                  type="date"
                  value={filters.to}
                  min={filters.from || undefined}
                  max={data.todayDate}
                  onChange={(e) => navigateWith({ to: e.target.value })}
                  className="field min-h-10 w-auto px-2.5 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <form
            method="get"
            action={basePath}
            onSubmit={handleSearchSubmit}
            className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto]"
          >
            <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
              <label htmlFor={searchId} className="sr-only">
                Search orders
              </label>
              <Search
                size={16}
                strokeWidth={1.5}
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
              />
              <input
                ref={searchInputRef}
                id={searchId}
                name="q"
                type="search"
                defaultValue={filters.q}
                maxLength={80}
                placeholder={
                  customerScope
                    ? "Bill # or item name…"
                    : "Bill #, customer, phone or item…"
                }
                className="field ps-9 text-sm"
              />
            </div>

            <div>
              <label htmlFor={statusId} className="sr-only">
                Filter by status
              </label>
              <select
                id={statusId}
                value={filters.status}
                onChange={(e) =>
                  navigateWith({ status: e.target.value as "all" | OrderStatus })
                }
                className="field text-sm"
              >
                <option value="all">All statuses</option>
                <option value="in_progress">In-Progress</option>
                <option value="ready">Ready</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>

            <div>
              <label htmlFor={typeId} className="sr-only">
                Filter by order type
              </label>
              <select
                id={typeId}
                value={filters.type}
                onChange={(e) =>
                  navigateWith({ type: e.target.value as "all" | OrderType })
                }
                className="field text-sm"
              >
                <option value="all">All types</option>
                <option value="takeaway">Takeaway / Parcel</option>
                <option value="pickup">Self-pickup</option>
              </select>
            </div>

            <div>
              <label htmlFor={modeId} className="sr-only">
                Filter by payment mode
              </label>
              <select
                id={modeId}
                value={filters.mode}
                onChange={(e) =>
                  navigateWith({ mode: e.target.value as "all" | PaymentMode })
                }
                className="field text-sm"
              >
                <option value="all">All payments</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
            </div>

            <div>
              <label htmlFor={sortId} className="sr-only">
                Sort orders
              </label>
              <select
                id={sortId}
                value={filters.sort}
                onChange={(e) =>
                  navigateWith({ sort: e.target.value as OrdersSort })
                }
                className="field text-sm"
              >
                {SORT_LABELS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary min-h-11 flex-1 px-4 text-sm sm:flex-initial"
              >
                Search
              </button>
              {hasAnyFilter ? (
                <Link
                  href={basePath}
                  onClick={(e) => handleLinkClick(e, basePath)}
                  className="btn btn-secondary min-h-11 px-3 text-sm"
                >
                  Reset
                </Link>
              ) : null}
            </div>
          </form>
        </div>

        {errorBanner ? (
          <p role="alert" className="mt-3 text-xs text-negative">
            {errorBanner}
          </p>
        ) : null}

        {!isPending && rows.length === 0 ? (
          <div className="mt-6 rounded-control border border-hairline bg-bg px-4 py-10 text-center">
            <p className="text-sm text-ink-2">
              {hasAnyFilter
                ? "No orders match the selected filters"
                : "No orders placed yet"}
            </p>
            <p className="mt-1 text-xs text-ink-3">
              {hasAnyFilter
                ? "Try clearing your date range, search, or status filters."
                : "Orders placed at the counter will appear here."}
            </p>
          </div>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-labelledby={captionId}
            aria-busy={isPending}
            className="mt-4 overflow-x-auto rounded-control border border-hairline bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <table className="w-full min-w-[54rem] border-collapse text-left text-sm">
              <caption id={captionId} className="sr-only">
                {customerScope ? `Orders for ${customerScope.name}` : "Orders list"}
              </caption>
              <thead>
                <tr className="border-b border-hairline text-xs text-ink-3">
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Bill
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Date &amp; time
                  </th>
                  {showCustomerColumn ? (
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Customer
                    </th>
                  ) : null}
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Items
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Total
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Bill
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {isPending ? (
                  <OrdersTableRowsSkeleton
                    rows={Math.max(4, Math.min(rows.length || 6, 8))}
                    showCustomerColumn={showCustomerColumn}
                  />
                ) : (
                  rows.map((order) => (
                    <tr key={order.id}>
                      <th
                        scope="row"
                        className="whitespace-nowrap px-4 py-3 font-mono font-medium text-ink"
                      >
                        #{order.billNo}
                      </th>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-3">
                        {formatIstDateTime(order.placedAtIso)}
                      </td>
                      {showCustomerColumn ? (
                        <td className="px-4 py-3">
                          {order.customerPhone ? (
                            <Link
                              href={`/customers/${order.customerPhone}`}
                              className="group inline-flex flex-col"
                            >
                              <span className="font-medium text-ink group-hover:text-accent-text group-hover:underline">
                                {order.customerName ?? `+91 ${order.customerPhone}`}
                              </span>
                              {order.customerName ? (
                                <span className="font-mono text-xs text-ink-3">
                                  +91 {order.customerPhone}
                                </span>
                              ) : null}
                            </Link>
                          ) : (
                            <span className="text-ink-3">
                              {order.customerName ?? "Walk-in"}
                            </span>
                          )}
                        </td>
                      ) : null}
                      <td className="max-w-xs px-4 py-3">
                        <p className="truncate text-ink">{order.itemsSummary}</p>
                        <p className="font-mono text-xs text-ink-3">
                          {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-2">
                        {ORDER_TYPE_LABEL[order.type]}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <p className="font-mono font-medium text-ink">
                          {formatRupees(order.total)}
                        </p>
                        <p className="font-mono text-[11px] text-ink-3">
                          {formatPaymentsSummary(order.payments)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`Order status for bill #${order.billNo}`}
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(order.id, e.target.value as OrderStatus)
                          }
                          className={`min-h-9 rounded-control border px-2.5 text-xs font-medium ${STATUS_SELECT_STYLES[order.status]}`}
                        >
                          {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map(
                            (st) => (
                              <option key={st} value={st}>
                                {ORDER_STATUS_LABEL[st]}
                              </option>
                            ),
                          )}
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <a
                          href={`/bill/${order.id}?s=${encodeURIComponent(order.sig)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open bill #${order.billNo}`}
                          className="btn btn-secondary min-h-9 px-2.5 text-xs"
                        >
                          <ExternalLink size={13} strokeWidth={1.5} aria-hidden />
                          Bill
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs text-ink-2">
            Showing {startIdx}–{endIdx} of {totalCount}
          </p>

          <nav aria-label="Orders pagination" className="flex flex-wrap items-center gap-1.5">
            {currentPage > 1 ? (
              <Link
                href={buildOrdersHref(basePath, { ...filters, page: currentPage - 1 })}
                onClick={(e) =>
                  handleLinkClick(
                    e,
                    buildOrdersHref(basePath, { ...filters, page: currentPage - 1 }),
                  )
                }
                className="btn btn-secondary min-h-10 gap-1 px-3 text-xs"
              >
                <ChevronLeft size={14} strokeWidth={1.5} aria-hidden />
                Previous
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="btn btn-secondary pointer-events-none min-h-10 gap-1 px-3 text-xs opacity-45"
              >
                <ChevronLeft size={14} strokeWidth={1.5} aria-hidden />
                Previous
              </span>
            )}

            {visiblePages.map((entry, idx) =>
              entry === "ellipsis" ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 font-mono text-xs text-ink-3"
                >
                  …
                </span>
              ) : (
                <Link
                  key={entry}
                  href={buildOrdersHref(basePath, { ...filters, page: entry })}
                  onClick={(e) =>
                    handleLinkClick(
                      e,
                      buildOrdersHref(basePath, { ...filters, page: entry }),
                    )
                  }
                  aria-current={entry === currentPage ? "page" : undefined}
                  className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-control border px-2.5 font-mono text-xs font-medium transition-colors ${
                    entry === currentPage
                      ? "border-accent bg-accent text-white"
                      : "border-hairline bg-bg text-ink-2 hover:border-ink-3 hover:text-ink"
                  }`}
                >
                  {entry}
                </Link>
              ),
            )}

            {currentPage < totalPages ? (
              <Link
                href={buildOrdersHref(basePath, { ...filters, page: currentPage + 1 })}
                onClick={(e) =>
                  handleLinkClick(
                    e,
                    buildOrdersHref(basePath, { ...filters, page: currentPage + 1 }),
                  )
                }
                className="btn btn-secondary min-h-10 gap-1 px-3 text-xs"
              >
                Next
                <ChevronRight size={14} strokeWidth={1.5} aria-hidden />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="btn btn-secondary pointer-events-none min-h-10 gap-1 px-3 text-xs opacity-45"
              >
                Next
                <ChevronRight size={14} strokeWidth={1.5} aria-hidden />
              </span>
            )}
          </nav>
        </div>
      </section>
    </div>
  );
}
