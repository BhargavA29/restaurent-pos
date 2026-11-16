"use client";

import {
  Check,
  CheckCircle2,
  ChefHat,
  ExternalLink,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import type { OrderAddonSnapshot } from "@/db/schema";
import { updateOrderStatus } from "@/app/(app)/orders/actions";
import { type OrderType } from "@/lib/cart";
import {
  formatIstDateTime,
  formatPaymentsSummary,
  formatRupees,
  ORDER_STATUS_LABEL,
  ORDER_TYPE_LABEL,
} from "@/lib/format";
import type { OrderStatus, PaymentMode } from "@/lib/validators";
import { LiveOrdersGridSkeleton } from "./loading";

export type LiveOrderRow = {
  id: string;
  billPath: string;
  billNo: number;
  type: OrderType;
  status: OrderStatus;
  customerName: string | null;
  customerPhone: string | null;
  total: number;
  placedAtIso: string;
  items: {
    id: string;
    name: string;
    variantName: string | null;
    addons: OrderAddonSnapshot[];
    qty: number;
    discount: number;
    complimentary: boolean;
    lineTotal: number;
  }[];
  payments: { mode: PaymentMode; amount: number }[];
};

type LiveTab = "active" | OrderStatus;

function StatusBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    in_progress: "bg-accent-soft text-accent-text",
    ready: "bg-positive/15 text-positive",
    delivered: "bg-raised text-ink-2",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

function buildReadyWhatsAppUrl(order: LiveOrderRow): string | null {
  if (!order.customerPhone) return null;
  const greeting = order.customerName ? `Hi ${order.customerName}` : "Hi";
  const text = `${greeting}, your FRY order #${order.billNo} (${formatRupees(order.total)}) is ready for ${
    order.type === "takeaway" ? "takeaway" : "pickup"
  }!`;
  return `https://wa.me/91${order.customerPhone}?text=${encodeURIComponent(text)}`;
}

function LiveOrderCard({
  order,
  onChangeStatus,
}: {
  order: LiveOrderRow;
  onChangeStatus: (orderId: string, nextStatus: OrderStatus) => void;
}) {
  const readyWaHref = order.status === "ready" ? buildReadyWhatsAppUrl(order) : null;

  return (
    <article className="flex flex-col gap-4 rounded-card border border-hairline bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="font-mono text-2xl font-medium tracking-tight text-ink">
              #{order.billNo}
            </span>
            <span className="text-xs font-medium text-ink-2">
              {ORDER_TYPE_LABEL[order.type]}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-ink-3">
            {formatIstDateTime(order.placedAtIso)}
          </p>
        </div>

        <StatusBadge status={order.status} />
      </div>

      {order.customerName || order.customerPhone ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-2">
          <span>
            {order.customerName ?? "Customer"}
            {order.customerPhone ? ` · +91 ${order.customerPhone}` : ""}
          </span>
          {order.customerPhone ? (
            <Link
              href={`/customers/${order.customerPhone}`}
              className="text-accent-text hover:underline"
            >
              Customer history
            </Link>
          ) : null}
        </div>
      ) : null}

      <ul className="flex flex-col gap-1.5 rounded-control border border-hairline bg-bg p-3.5 font-mono text-xs">
        {order.items.map((item) => (
          <li key={item.id}>
            <div className="flex items-baseline justify-between gap-2 text-sm text-ink">
              <span className="font-medium">
                {item.qty}× {item.name}
                {item.variantName ? ` (${item.variantName})` : ""}
              </span>
              <span className="shrink-0 text-ink-2">
                {formatRupees(item.lineTotal)}
              </span>
            </div>
            {item.addons.map((addon, idx) => (
              <div key={`${item.id}-addon-${idx}`} className="ps-4 text-ink-3">
                + {addon.name}
              </div>
            ))}
            {item.complimentary ? (
              <div className="ps-4 text-ink-3">On the house</div>
            ) : item.discount > 0 ? (
              <div className="ps-4 text-ink-3">
                Discount -{formatRupees(item.discount)}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-2">
        <span>
          {formatPaymentsSummary(order.payments)} ·{" "}
          <strong className="font-mono text-sm font-medium text-ink">
            {formatRupees(order.total)}
          </strong>
        </span>
        <a
          href={order.billPath}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-ink-2 hover:text-ink hover:underline"
        >
          Bill
          <ExternalLink size={12} strokeWidth={1.5} aria-hidden />
        </a>
      </div>

      {readyWaHref ? (
        <a
          href={readyWaHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary min-h-10 w-full text-xs text-accent-text"
        >
          <MessageCircle size={14} strokeWidth={1.5} aria-hidden />
          WhatsApp: Order ready
        </a>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-hairline pt-3">
        {order.status === "in_progress" ? (
          <>
            <button
              type="button"
              onClick={() => onChangeStatus(order.id, "ready")}
              className="btn btn-primary min-h-11 flex-1 px-4 text-sm"
            >
              <Check size={16} strokeWidth={1.75} aria-hidden />
              Mark Ready
            </button>
            <button
              type="button"
              onClick={() => onChangeStatus(order.id, "delivered")}
              className="btn btn-secondary min-h-11 px-3.5 text-xs"
            >
              Delivered
            </button>
          </>
        ) : order.status === "ready" ? (
          <>
            <button
              type="button"
              onClick={() => onChangeStatus(order.id, "delivered")}
              className="btn btn-primary min-h-11 flex-1 px-4 text-sm"
            >
              <PackageCheck size={16} strokeWidth={1.75} aria-hidden />
              Mark Delivered
            </button>
            <button
              type="button"
              onClick={() => onChangeStatus(order.id, "in_progress")}
              className="btn btn-secondary min-h-11 px-3.5 text-xs"
            >
              Back to In-Progress
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onChangeStatus(order.id, "ready")}
            className="btn btn-secondary min-h-10 flex-1 text-xs"
          >
            Move back to Ready
          </button>
        )}
      </div>
    </article>
  );
}

export function LiveOrdersView({
  initialOrders,
}: {
  initialOrders: LiveOrderRow[];
}) {
  const router = useRouter();
  const searchId = useId();

  const [orders, setOrders] = useState<LiveOrderRow[]>(initialOrders);
  const [tab, setTab] = useState<LiveTab>("active");
  const [search, setSearch] = useState("");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isRefreshing, startRefreshTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) => {
      if (String(order.billNo).includes(q)) return true;
      if (order.customerName?.toLowerCase().includes(q)) return true;
      if (order.customerPhone?.includes(q)) return true;
      return order.items.some((i) => i.name.toLowerCase().includes(q));
    });
  }, [orders, search]);

  const inProgressOrders = useMemo(
    () => filtered.filter((o) => o.status === "in_progress"),
    [filtered],
  );
  const readyOrders = useMemo(
    () => filtered.filter((o) => o.status === "ready"),
    [filtered],
  );
  const deliveredOrders = useMemo(
    () =>
      filtered
        .filter((o) => o.status === "delivered")
        .slice()
        .sort((a, b) => b.placedAtIso.localeCompare(a.placedAtIso)),
    [filtered],
  );

  function handleChangeStatus(orderId: string, nextStatus: OrderStatus) {
    const prevSnapshot = orders;
    setErrorBanner(null);
    setOrders((current) =>
      current.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)),
    );

    void updateOrderStatus({ orderId, status: nextStatus })
      .then((res) => {
        if (res.error) {
          setOrders(prevSnapshot);
          setErrorBanner(res.error);
        }
      })
      .catch(() => {
        setOrders(prevSnapshot);
        setErrorBanner("Could not update order status. Check connection and try again.");
      });
  }

  function handleRefresh() {
    setErrorBanner(null);
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  const tabs: { id: LiveTab; label: string; count: number }[] = [
    {
      id: "active",
      label: "Active",
      count: inProgressOrders.length + readyOrders.length,
    },
    { id: "in_progress", label: "In-Progress", count: inProgressOrders.length },
    { id: "ready", label: "Ready", count: readyOrders.length },
    { id: "delivered", label: "Delivered today", count: deliveredOrders.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-normal leading-tight">Live orders</h1>
          <p className="mt-1 text-sm text-ink-2">
            Track orders from kitchen preparation through pickup and delivery
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-initial">
            <label htmlFor={searchId} className="sr-only">
              Filter live orders
            </label>
            <Search
              size={16}
              strokeWidth={1.5}
              aria-hidden
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3"
            />
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Bill #, name or item…"
              className="field ps-9 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary min-h-11 px-3.5 text-sm"
          >
            <RefreshCw
              size={15}
              strokeWidth={1.5}
              aria-hidden
              className={isRefreshing ? "animate-spin" : undefined}
            />
            Refresh
          </button>

          <Link href="/orders" className="btn btn-secondary min-h-11 px-3.5 text-sm">
            All orders
          </Link>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Live order status filter"
        className="flex flex-wrap gap-2"
      >
        {tabs.map((t) => {
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(t.id)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-control border px-4 text-sm font-medium transition-colors ${
                selected
                  ? "border-accent bg-accent text-white"
                  : "border-hairline bg-card text-ink-2 hover:border-ink-3 hover:text-ink"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-xs ${
                  selected ? "bg-white/20 text-white" : "bg-raised text-ink-2"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {errorBanner ? (
        <div
          role="alert"
          className="rounded-control border border-negative/40 bg-negative/10 px-4 py-3 text-sm text-negative"
        >
          {errorBanner}
        </div>
      ) : null}

      {isRefreshing ? (
        <LiveOrdersGridSkeleton />
      ) : tab === "active" ? (
        inProgressOrders.length === 0 && readyOrders.length === 0 ? (
          <div className="rounded-card border border-hairline bg-card px-6 py-12 text-center">
            <p className="text-base font-medium text-ink">No active kitchen orders</p>
            <p className="mt-1 text-sm text-ink-3">
              New orders placed at the counter appear here automatically as In-Progress.
            </p>
            <Link href="/pos" className="btn btn-primary mt-5 inline-flex text-sm">
              Take new order
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-medium">
                  <ChefHat size={18} strokeWidth={1.5} className="text-accent-text" aria-hidden />
                  In-Progress
                </h2>
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-mono text-xs font-medium text-accent-text">
                  {inProgressOrders.length}
                </span>
              </div>

              {inProgressOrders.length === 0 ? (
                <p className="rounded-card border border-hairline bg-card px-4 py-8 text-center text-sm text-ink-3">
                  All active orders are ready
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {inProgressOrders.map((order) => (
                    <LiveOrderCard
                      key={order.id}
                      order={order}
                      onChangeStatus={handleChangeStatus}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-medium">
                  <CheckCircle2 size={18} strokeWidth={1.5} className="text-positive" aria-hidden />
                  Ready for pickup
                </h2>
                <span className="rounded-full bg-positive/15 px-2.5 py-0.5 font-mono text-xs font-medium text-positive">
                  {readyOrders.length}
                </span>
              </div>

              {readyOrders.length === 0 ? (
                <p className="rounded-card border border-hairline bg-card px-4 py-8 text-center text-sm text-ink-3">
                  Nothing waiting at the pickup counter
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {readyOrders.map((order) => (
                    <LiveOrderCard
                      key={order.id}
                      order={order}
                      onChangeStatus={handleChangeStatus}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )
      ) : (
        (() => {
          const list =
            tab === "in_progress"
              ? inProgressOrders
              : tab === "ready"
                ? readyOrders
                : deliveredOrders;

          if (list.length === 0) {
            return (
              <div className="rounded-card border border-hairline bg-card px-6 py-12 text-center">
                <p className="text-sm text-ink-2">
                  No {ORDER_STATUS_LABEL[tab].toLowerCase()} orders
                  {tab === "delivered" ? " today" : ""}
                </p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {list.map((order) => (
                <LiveOrderCard
                  key={order.id}
                  order={order}
                  onChangeStatus={handleChangeStatus}
                />
              ))}
            </div>
          );
        })()
      )}
    </div>
  );
}
