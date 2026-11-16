"use client";

import { Search, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/modal";
import {
  buildCartKey,
  computeCartTotals,
  computeLineTotals,
  type CartLine,
  type OrderType,
} from "@/lib/cart";
import { formatRupees } from "@/lib/format";
import {
  loadLocalCustomers,
  saveCachedMenu,
  saveLocalCustomers,
  upsertLocalCustomer,
  type CustomerRecord,
} from "@/lib/offline-outbox";
import { customerInfoSchema } from "@/lib/validators";
import { CheckoutModal, KotPrintSlip, type CompletedOrder } from "./checkout-modal";
import { CustomizeItemModal, type PosItem } from "./customize-modal";
import { OrderTicket } from "./order-ticket";

export type PosCategory = {
  id: string;
  name: string;
};

export type PosCombo = {
  id: string;
  name: string;
  price: number;
  soldOut: boolean;
  membersSummary: string;
};

export type PopularShortcut = {
  id: string;
  kind: "item" | "combo";
  sourceId: string;
  name: string;
  variantId: string | null;
  variantName: string | null;
  price: number;
  subtitle?: string;
  orderCount: number;
};

type PosTerminalProps = {
  categories: PosCategory[];
  items: PosItem[];
  combos: PosCombo[];
  initialPopular: PopularShortcut[];
  initialCustomers: CustomerRecord[];
};

export function PosTerminal({
  categories,
  items,
  combos,
  initialPopular,
  initialCustomers,
}: PosTerminalProps) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("takeaway");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [autoFilledName, setAutoFilledName] = useState<string | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<CustomerRecord[]>(initialCustomers);
  const [popular, setPopular] = useState<PopularShortcut[]>(initialPopular);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [customizing, setCustomizing] = useState<PosItem | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(null);
  const [lastPrintableOrder, setLastPrintableOrder] = useState<CompletedOrder | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const mobileModalTitleId = useId();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    void saveCachedMenu({ categories, items, combos, initialPopular }).catch(() => {});
  }, [categories, items, combos, initialPopular]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cached = await loadLocalCustomers();
        if (cancelled) return;
        const merged = new Map<string, CustomerRecord>();
        for (const c of cached) merged.set(c.phone, c);
        for (const c of initialCustomers) {
          const prev = merged.get(c.phone);
          if (!prev || c.orderCount >= prev.orderCount) merged.set(c.phone, c);
        }
        const list = Array.from(merged.values());
        setCustomers(list);
        await saveLocalCustomers(list);
      } catch {
        // IndexedDB unavailable; server snapshot in state still works.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCustomers]);

  const customersByPhone = useMemo(
    () => new Map(customers.map((c) => [c.phone, c])),
    [customers],
  );

  const qtyBySource = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of lines) {
      map.set(line.sourceId, (map.get(line.sourceId) ?? 0) + line.qty);
    }
    return map;
  }, [lines]);

  const query = search.trim().toLowerCase();

  const visibleCombos = useMemo(() => {
    if (activeTab !== "all" && activeTab !== "combos") return [];
    if (!query) return combos;
    return combos.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.membersSummary.toLowerCase().includes(query),
    );
  }, [activeTab, combos, query]);

  const visibleItems = useMemo(() => {
    if (activeTab === "combos") return [];
    return items.filter((item) => {
      if (activeTab !== "all" && item.categoryId !== activeTab) return false;
      if (!query) return true;
      return item.name.toLowerCase().includes(query);
    });
  }, [activeTab, items, query]);

  function addLine(incoming: Omit<CartLine, "discount" | "complimentary">) {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.key === incoming.key);
      if (idx >= 0) {
        return prev.map((l, i) => (i === idx ? { ...l, qty: l.qty + incoming.qty } : l));
      }
      return [...prev, { ...incoming, discount: 0, complimentary: false }];
    });
  }

  function handleItemTap(item: PosItem) {
    if (item.soldOut) return;
    if (item.variants.length > 0) {
      setCustomizing(item);
      return;
    }
    addLine({
      key: buildCartKey("item", item.id, null, []),
      kind: "item",
      sourceId: item.id,
      name: item.name,
      variantName: null,
      unitPrice: item.price,
      addons: [],
      qty: 1,
    });
  }

  function handleComboTap(combo: PosCombo) {
    if (combo.soldOut) return;
    addLine({
      key: buildCartKey("combo", combo.id, null, []),
      kind: "combo",
      sourceId: combo.id,
      name: combo.name,
      variantName: null,
      unitPrice: combo.price,
      addons: [],
      subtitle: combo.membersSummary,
      qty: 1,
    });
  }

  function handlePopularTap(shortcut: PopularShortcut) {
    addLine({
      key: buildCartKey(shortcut.kind, shortcut.sourceId, shortcut.variantId, []),
      kind: shortcut.kind,
      sourceId: shortcut.sourceId,
      name: shortcut.name,
      variantName: shortcut.variantName,
      unitPrice: shortcut.price,
      addons: [],
      subtitle: shortcut.subtitle,
      qty: 1,
    });
  }

  function updateQty(key: string, delta: number) {
    setLines((prev) =>
      prev
        .map((line) => {
          if (line.key !== key) return line;
          const nextQty = line.qty + delta;
          if (nextQty <= 0) return null;
          const nextLine = { ...line, qty: nextQty };
          const { gross } = computeLineTotals(nextLine);
          return { ...nextLine, discount: Math.min(nextLine.discount, gross) };
        })
        .filter((l): l is CartLine => l !== null),
    );
  }

  function setDiscount(key: string, discount: number) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, discount } : l)));
  }

  function toggleComplimentary(key: string) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, complimentary: !l.complimentary } : l)),
    );
  }

  function clearCustomer() {
    setCustomerName("");
    setCustomerPhone("");
    setAutoFilledName(null);
    setCustomerError(null);
  }

  function handleCustomerPhoneChange(nextPhone: string) {
    setCustomerPhone(nextPhone);
    if (customerError) setCustomerError(null);

    const match = nextPhone.length === 10 ? customersByPhone.get(nextPhone) : undefined;
    if (match) {
      if (!customerName.trim() || customerName === autoFilledName) {
        setCustomerName(match.name);
        setAutoFilledName(match.name);
      }
    } else if (autoFilledName && customerName === autoFilledName) {
      setCustomerName("");
      setAutoFilledName(null);
    }
  }

  function handlePickCustomer(customer: CustomerRecord) {
    setCustomerPhone(customer.phone);
    setCustomerName(customer.name);
    setAutoFilledName(customer.name);
    if (customerError) setCustomerError(null);
  }

  function clearCart() {
    setLines([]);
    clearCustomer();
    setMobileCartOpen(false);
  }

  function handleCharge() {
    const parsed = customerInfoSchema.safeParse({ customerName, customerPhone });
    if (!parsed.success) {
      setCustomerError(parsed.error.issues[0]?.message ?? "Check customer details");
      return;
    }
    setCustomerName(parsed.data.customerName);
    setCustomerPhone(parsed.data.customerPhone);
    setCustomerError(null);
    setMobileCartOpen(false);
    setCompletedOrder(null);
    setCheckoutOpen(true);
  }

  function handleOrderPlaced(completed: CompletedOrder) {
    setCompletedOrder(completed);
    setLastPrintableOrder(completed);
    setLines([]);
    clearCustomer();

    if (completed.customerPhone) {
      const trimmedName = completed.customerName.trim();
      setCustomers((prev) => {
        const existing = prev.find((c) => c.phone === completed.customerPhone);
        const updated: CustomerRecord = existing
          ? {
              phone: completed.customerPhone,
              name: trimmedName || existing.name,
              orderCount: existing.orderCount + 1,
              totalSpent: existing.totalSpent + completed.total,
            }
          : {
              phone: completed.customerPhone,
              name: trimmedName || "Customer",
              orderCount: 1,
              totalSpent: completed.total,
            };
        return [updated, ...prev.filter((c) => c.phone !== completed.customerPhone)];
      });
      void upsertLocalCustomer({
        phone: completed.customerPhone,
        name: trimmedName,
        orderTotal: completed.total,
      }).catch(() => {});
    }

    const qtyAddedByKey = new Map<string, number>();
    for (const line of completed.items) {
      const id = `${line.kind}:${line.sourceId}`;
      qtyAddedByKey.set(id, (qtyAddedByKey.get(id) ?? 0) + line.qty);
    }
    if (qtyAddedByKey.size > 0) {
      setPopular((prev) =>
        prev.map((s) => {
          const delta = qtyAddedByKey.get(s.id);
          return delta ? { ...s, orderCount: s.orderCount + delta } : s;
        }),
      );
    }
  }

  const totals = computeCartTotals(lines);
  const hasMenu = items.length > 0 || combos.length > 0;

  const sharedTicketProps = {
    lines,
    orderType,
    customerName,
    customerPhone,
    customerError,
    customers,
    onOrderTypeChange: setOrderType,
    onCustomerNameChange: (v: string) => {
      setCustomerName(v);
      setAutoFilledName(null);
      if (customerError) setCustomerError(null);
    },
    onCustomerPhoneChange: handleCustomerPhoneChange,
    onPickCustomer: handlePickCustomer,
    onClearCustomer: clearCustomer,
    onUpdateQty: updateQty,
    onSetDiscount: setDiscount,
    onToggleComplimentary: toggleComplimentary,
    onClearCart: clearCart,
    onCharge: handleCharge,
  };

  return (
    <div className={totals.itemCount > 0 ? "pb-20 lg:pb-0" : undefined}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_23rem] lg:items-start xl:grid-cols-[1fr_25rem]">
        <section className="flex min-w-0 flex-col gap-5">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-normal leading-tight">New order</h1>
              <p className="mt-0.5 text-sm text-ink-2">
                Tap items to build the order, then charge at the counter
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search
                size={16}
                strokeWidth={1.5}
                aria-hidden
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3"
              />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu (/)"
                aria-label="Search menu"
                className="field ps-9 text-sm"
              />
            </div>
          </header>

          {!hasMenu ? (
            <div className="rounded-card border border-hairline bg-card p-6">
              <h2 className="text-base font-medium">No active items on the menu</h2>
              <p className="mt-1 text-sm text-ink-2">
                Add items or load the starter menu in the Menu tab to start taking orders.
              </p>
              <Link href="/menu" className="btn btn-primary mt-4 inline-flex text-sm">
                Open menu manager
              </Link>
            </div>
          ) : (
            <>
              {categories.length > 1 || combos.length > 0 ? (
                <div
                  role="tablist"
                  aria-label="Menu categories"
                  className="flex gap-2 overflow-x-auto pb-1"
                >
                  {[
                    { id: "all", label: "All" },
                    ...(combos.length > 0 ? [{ id: "combos", label: "Combos" }] : []),
                    ...categories.map((c) => ({ id: c.id, label: c.name })),
                  ].map((tab) => {
                    const selected = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setActiveTab(tab.id)}
                        className={`min-h-11 shrink-0 rounded-control border px-4 text-sm font-medium transition-colors ${
                          selected
                            ? "border-accent bg-accent text-white"
                            : "border-hairline bg-card text-ink-2 hover:border-ink-3 hover:text-ink"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {activeTab === "all" && !query && popular.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-sm font-medium text-ink-2">
                      Popular — 1-tap add
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {popular.map((shortcut) => {
                      const countInCart = qtyBySource.get(shortcut.sourceId) ?? 0;
                      return (
                        <button
                          key={`pop-${shortcut.id}`}
                          type="button"
                          onClick={() => handlePopularTap(shortcut)}
                          className="flex min-h-20 flex-col justify-between gap-1.5 rounded-card border border-hairline bg-card px-3.5 py-3 text-left transition-colors hover:border-ink-3 active:scale-[0.99]"
                        >
                          <div className="flex w-full items-start justify-between gap-2">
                            <span className="text-sm font-medium leading-snug text-ink">
                              {shortcut.name}
                              {shortcut.variantName ? (
                                <span className="font-normal text-ink-3">
                                  {" "}
                                  · {shortcut.variantName}
                                </span>
                              ) : null}
                            </span>
                            {countInCart > 0 ? (
                              <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 font-mono text-xs font-medium text-white">
                                {countInCart}
                              </span>
                            ) : null}
                          </div>

                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="font-mono text-xs font-medium text-ink">
                              {formatRupees(shortcut.price)}
                            </span>
                            <span className="text-xs font-medium text-accent-text">
                              + Add
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {visibleCombos.length === 0 && visibleItems.length === 0 ? (
                <div className="rounded-card border border-hairline bg-card px-4 py-8 text-center text-sm text-ink-3">
                  No menu items match &ldquo;{search}&rdquo;
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {visibleCombos.map((combo) => {
                    const countInCart = qtyBySource.get(combo.id) ?? 0;
                    return (
                      <button
                        key={`combo-${combo.id}`}
                        type="button"
                        disabled={combo.soldOut}
                        onClick={() => handleComboTap(combo)}
                        className="flex min-h-28 flex-col justify-between gap-2 rounded-card border border-hairline bg-card p-3.5 text-left transition-colors hover:border-ink-3 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="flex w-full items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="block text-xs font-medium text-accent-text">
                              Combo
                            </span>
                            <span className="mt-0.5 block font-medium leading-snug text-ink">
                              {combo.name}
                            </span>
                          </div>
                          {countInCart > 0 ? (
                            <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 font-mono text-xs font-medium text-white">
                              {countInCart}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex w-full items-end justify-between gap-2 pt-1">
                          {combo.soldOut ? (
                            <span className="text-xs font-medium text-negative">Sold out</span>
                          ) : (
                            <span className="font-mono text-sm font-medium text-ink">
                              {formatRupees(combo.price)}
                            </span>
                          )}
                          <span className="truncate text-xs text-ink-3">
                            {combo.membersSummary}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {visibleItems.map((item) => {
                    const countInCart = qtyBySource.get(item.id) ?? 0;
                    const prices =
                      item.variants.length > 0
                        ? item.variants.map((v) => v.price)
                        : [item.price];
                    const minPrice = Math.min(...prices);
                    const hasMultiplePrices = new Set(prices).size > 1;
                    const hasVariants = item.variants.length > 0;
                    const hasDips = item.addons.length > 0;

                    return (
                      <div
                        key={item.id}
                        className={`flex min-h-28 flex-col justify-between gap-2 rounded-card border border-hairline bg-card p-3.5 transition-colors hover:border-ink-3 ${
                          item.soldOut ? "opacity-50" : ""
                        }`}
                      >
                        <button
                          type="button"
                          disabled={item.soldOut}
                          onClick={() => handleItemTap(item)}
                          className="flex flex-1 flex-col justify-between gap-2 text-left active:scale-[0.99] disabled:cursor-not-allowed"
                        >
                          <div className="flex w-full items-start justify-between gap-2">
                            <span className="font-medium leading-snug text-ink">
                              {item.name}
                            </span>
                            {countInCart > 0 ? (
                              <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 font-mono text-xs font-medium text-white">
                                {countInCart}
                              </span>
                            ) : null}
                          </div>
                        </button>

                        <div className="flex w-full items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            disabled={item.soldOut}
                            onClick={() => handleItemTap(item)}
                            className="text-left disabled:cursor-not-allowed"
                          >
                            {item.soldOut ? (
                              <span className="text-xs font-medium text-negative">Sold out</span>
                            ) : (
                              <span className="font-mono text-sm font-medium text-ink">
                                {formatRupees(minPrice)}
                                {hasMultiplePrices ? "+" : ""}
                              </span>
                            )}
                          </button>

                          {!item.soldOut && hasVariants ? (
                            <span className="text-xs text-ink-3">
                              {item.variants.length} sizes
                            </span>
                          ) : !item.soldOut && hasDips ? (
                            <button
                              type="button"
                              aria-label={`Add dips for ${item.name}`}
                              onClick={() => setCustomizing(item)}
                              className="inline-flex min-h-8 items-center rounded-control border border-hairline-strong bg-bg px-2.5 text-xs font-medium text-accent-text transition-colors hover:border-accent"
                            >
                              + Dips
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>

        <aside className="hidden rounded-card border border-hairline bg-card p-5 lg:sticky lg:top-6 lg:block">
          <OrderTicket {...sharedTicketProps} />
        </aside>
      </div>

      {totals.itemCount > 0 ? (
        <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="flex min-h-14 w-full items-center justify-between gap-3 rounded-card bg-accent px-4 py-3 text-white shadow-[0_8px_24px_rgb(0_0_0/0.2)] transition-transform active:scale-[0.99]"
          >
            <span className="flex items-center gap-2.5 text-sm font-medium">
              <ShoppingBag size={18} strokeWidth={1.5} aria-hidden />
              <span>
                {totals.itemCount} {totals.itemCount === 1 ? "item" : "items"}
              </span>
            </span>
            <span className="flex items-center gap-2 font-mono text-base font-medium">
              <span>View order</span>
              <span>{formatRupees(totals.total)}</span>
            </span>
          </button>
        </div>
      ) : null}

      <Modal
        open={mobileCartOpen}
        onClose={() => setMobileCartOpen(false)}
        titleId={mobileModalTitleId}
        title="Current order"
      >
        <OrderTicket inModal {...sharedTicketProps} />
      </Modal>

      <CustomizeItemModal
        item={customizing}
        onClose={() => setCustomizing(null)}
        onAdd={addLine}
      />

      <CheckoutModal
        open={checkoutOpen}
        lines={lines}
        orderType={orderType}
        customerName={customerName}
        customerPhone={customerPhone}
        completedOrder={completedOrder}
        onOrderPlaced={handleOrderPlaced}
        onClose={() => {
          setCheckoutOpen(false);
          setCompletedOrder(null);
        }}
      />

      <KotPrintSlip order={lastPrintableOrder} />
    </div>
  );
}
