"use client";

import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Pencil,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { formatIstDateTime, formatRupees } from "@/lib/format";
import {
  loadLocalCustomers,
  saveLocalCustomers,
  type CustomerRecord,
} from "@/lib/offline-outbox";
import { updateCustomerName } from "./actions";
import { CustomersTableRowsSkeleton } from "./customers-skeleton";

export type CustomerSort = "recent" | "spent" | "orders";

export type CustomerRow = {
  phone: string;
  name: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAtIso: string;
};

type CustomersViewProps = {
  initialCustomers: CustomerRow[];
  totalCount: number;
  repeatCount: number;
  totalRevenue: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  query: string;
  sort: CustomerSort;
};

const SORT_OPTIONS: { value: CustomerSort; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "spent", label: "Highest spend" },
  { value: "orders", label: "Most orders" },
];

function buildCustomersHref({
  page,
  query,
  sort,
}: {
  page?: number;
  query?: string;
  sort?: CustomerSort;
}): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (sort && sort !== "recent") params.set("sort", sort);
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/customers?${qs}` : "/customers";
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

export function CustomersView({
  initialCustomers,
  totalCount,
  repeatCount,
  totalRevenue,
  currentPage,
  totalPages,
  pageSize,
  query,
  sort,
}: CustomersViewProps) {
  const router = useRouter();
  const searchId = useId();
  const captionId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<CustomerRow[]>(initialCustomers);
  const [editingPhone, setEditingPhone] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [savingPhone, setSavingPhone] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalCount);
  const visiblePages = getVisiblePages(currentPage, totalPages);

  function navigate(href: string) {
    startTransition(() => {
      router.push(href);
    });
  }

  function handleLinkNavigation(
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
    navigate(href);
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = searchInputRef.current?.value ?? "";
    const nextQuery = raw.trim().slice(0, 80);
    navigate(buildCustomersHref({ query: nextQuery, sort }));
  }

  function startEdit(row: CustomerRow) {
    setEditError(null);
    setEditingPhone(row.phone);
    setDraftName(row.name);
  }

  function cancelEdit() {
    setEditError(null);
    setEditingPhone(null);
    setDraftName("");
  }

  function handleSaveName(e: React.FormEvent, row: CustomerRow) {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed) {
      setEditError("Enter a customer name");
      return;
    }
    if (trimmed === row.name) {
      setEditingPhone(null);
      setEditError(null);
      return;
    }

    const prevRows = rows;
    setEditError(null);
    setEditingPhone(null);
    setSavingPhone(row.phone);
    setRows((current) =>
      current.map((c) => (c.phone === row.phone ? { ...c, name: trimmed } : c)),
    );

    void loadLocalCustomers()
      .then((list) => {
        const idx = list.findIndex((c) => c.phone === row.phone);
        const updatedRecord: CustomerRecord =
          idx >= 0
            ? { ...list[idx], name: trimmed }
            : {
                phone: row.phone,
                name: trimmed,
                orderCount: row.orderCount,
                totalSpent: row.totalSpent,
              };
        const nextList =
          idx >= 0
            ? list.map((c, i) => (i === idx ? updatedRecord : c))
            : [updatedRecord, ...list];
        return saveLocalCustomers(nextList);
      })
      .catch(() => {});

    void updateCustomerName({ phone: row.phone, name: trimmed })
      .then((res) => {
        if (res.error) {
          setRows(prevRows);
          setEditError(res.error);
          void loadLocalCustomers()
            .then((list) =>
              saveLocalCustomers(
                list.map((c) =>
                  c.phone === row.phone ? { ...c, name: row.name } : c,
                ),
              ),
            )
            .catch(() => {});
        }
      })
      .catch(() => {
        setRows(prevRows);
        setEditError("Could not update customer name. Check connection and try again.");
      })
      .finally(() => {
        setSavingPhone(null);
      });
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-normal leading-tight">Customers</h1>
        <p className="text-sm text-ink-2">
          Saved from counter orders and cached locally for instant phone lookup
        </p>
      </header>

      <section
        aria-label="Customer summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <div className="rounded-card border border-hairline bg-card p-5">
          <p className="text-sm text-ink-2">Total customers</p>
          {isPending ? (
            <div className="skeleton mt-2 h-8 w-20" />
          ) : (
            <p className="mt-2 font-mono text-3xl font-medium leading-none text-ink">
              {totalCount}
            </p>
          )}
          <p className="mt-2.5 text-xs text-ink-3">
            {query ? `Matching "${query}"` : "Saved with WhatsApp numbers"}
          </p>
        </div>

        <div className="rounded-card border border-hairline bg-card p-5">
          <p className="text-sm text-ink-2">Repeat customers</p>
          {isPending ? (
            <div className="skeleton mt-2 h-8 w-20" />
          ) : (
            <p className="mt-2 font-mono text-3xl font-medium leading-none text-ink">
              {repeatCount}
            </p>
          )}
          <p className="mt-2.5 text-xs text-ink-3">Customers with 2 or more orders</p>
        </div>

        <div className="rounded-card border border-hairline bg-card p-5">
          <p className="text-sm text-ink-2">Total customer spend</p>
          {isPending ? (
            <div className="skeleton mt-2 h-8 w-28" />
          ) : (
            <p className="mt-2 font-mono text-3xl font-medium leading-none text-ink">
              {formatRupees(totalRevenue)}
            </p>
          )}
          <p className="mt-2.5 text-xs text-ink-3">Combined bill value</p>
        </div>
      </section>

      <section className="rounded-card border border-hairline bg-card p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form
            method="get"
            action="/customers"
            onSubmit={handleSearchSubmit}
            className="flex flex-1 flex-wrap items-center gap-2"
          >
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <label htmlFor={searchId} className="sr-only">
                Search customers by name or phone number
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
                defaultValue={query}
                maxLength={80}
                placeholder="Search name or phone…"
                className="field ps-9 text-sm"
              />
            </div>

            {sort !== "recent" ? <input type="hidden" name="sort" value={sort} /> : null}

            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary min-h-11 px-4 text-sm"
            >
              Search
            </button>

            {query ? (
              <Link
                href={buildCustomersHref({ sort })}
                onClick={(e) =>
                  handleLinkNavigation(e, buildCustomersHref({ sort }))
                }
                className="btn btn-secondary min-h-11 px-3.5 text-sm"
              >
                Clear
              </Link>
            ) : null}
          </form>

          <nav aria-label="Sort customers" className="flex flex-wrap items-center gap-1.5">
            {SORT_OPTIONS.map((option) => {
              const selected = sort === option.value;
              const href = buildCustomersHref({ query, sort: option.value });
              return (
                <Link
                  key={option.value}
                  href={href}
                  onClick={(e) => handleLinkNavigation(e, href)}
                  aria-current={selected ? "true" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-control border px-3.5 text-xs font-medium transition-colors ${
                    selected
                      ? "border-accent bg-accent text-white"
                      : "border-hairline bg-bg text-ink-2 hover:border-ink-3 hover:text-ink"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {editError ? (
          <p role="alert" className="mt-3 text-xs text-negative">
            {editError}
          </p>
        ) : null}

        {!isPending && rows.length === 0 ? (
          <div className="mt-6 rounded-control border border-hairline bg-bg px-4 py-10 text-center">
            <p className="text-sm text-ink-2">
              {query
                ? `No customers match "${query}"`
                : "No saved customer phone numbers yet"}
            </p>
            <p className="mt-1 text-xs text-ink-3">
              {query
                ? "Try a different name or 10-digit WhatsApp number."
                : "Customers are added automatically when you take an order with a WhatsApp number."}
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
            <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
              <caption id={captionId} className="sr-only">
                Customers list
              </caption>
              <thead>
                <tr className="border-b border-hairline text-xs text-ink-3">
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    WhatsApp
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Orders
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Avg order
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Total spent
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Last order
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {isPending ? (
                  <CustomersTableRowsSkeleton rows={Math.max(4, Math.min(rows.length || 6, 8))} />
                ) : (
                  rows.map((customer) => {
                  const isEditing = editingPhone === customer.phone;
                  const avgOrder =
                    customer.orderCount > 0
                      ? Math.round(customer.totalSpent / customer.orderCount)
                      : 0;

                  return (
                    <tr key={customer.phone}>
                      <th scope="row" className="px-4 py-3 font-medium text-ink">
                        {isEditing ? (
                          <form
                            onSubmit={(e) => handleSaveName(e, customer)}
                            className="flex items-center gap-1.5"
                          >
                            <label
                              htmlFor={`customer-name-${customer.phone}`}
                              className="sr-only"
                            >
                              Customer name for +91 {customer.phone}
                            </label>
                            <input
                              id={`customer-name-${customer.phone}`}
                              type="text"
                              value={draftName}
                              onChange={(e) => {
                                setDraftName(e.target.value);
                                if (editError) setEditError(null);
                              }}
                              maxLength={80}
                              autoFocus
                              className="field min-h-9 w-44 px-2.5 text-sm font-normal"
                            />
                            <button
                              type="submit"
                              disabled={savingPhone === customer.phone}
                              aria-label="Save customer name"
                              className="grid size-9 shrink-0 place-items-center rounded-control bg-accent text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                              <Check size={15} strokeWidth={1.75} aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              aria-label="Cancel editing"
                              className="grid size-9 shrink-0 place-items-center rounded-control border border-hairline-strong bg-raised text-ink-2 transition-colors hover:text-ink"
                            >
                              <X size={15} strokeWidth={1.75} aria-hidden />
                            </button>
                          </form>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{customer.name}</span>
                            <button
                              type="button"
                              onClick={() => startEdit(customer)}
                              aria-label={`Edit name for ${customer.name}`}
                              className="grid size-8 shrink-0 place-items-center rounded-control text-ink-3 transition-colors hover:bg-raised hover:text-ink"
                            >
                              <Pencil size={14} strokeWidth={1.5} aria-hidden />
                            </button>
                          </div>
                        )}
                      </th>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        <a
                          href={`https://wa.me/91${customer.phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-accent-text hover:underline"
                        >
                          <MessageCircle size={13} strokeWidth={1.5} aria-hidden />
                          +91 {customer.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <Link
                          href={`/customers/${customer.phone}`}
                          className="inline-flex min-h-8 items-center gap-1 rounded-control border border-hairline bg-card px-2.5 py-1 text-xs font-medium text-accent-text transition-colors hover:border-accent"
                        >
                          <span>
                            {customer.orderCount}{" "}
                            {customer.orderCount === 1 ? "order" : "orders"}
                          </span>
                          <ArrowRight size={12} strokeWidth={1.75} aria-hidden />
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-ink-2">
                        {formatRupees(avgOrder)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium">
                        {formatRupees(customer.totalSpent)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-ink-3">
                        {formatIstDateTime(customer.lastOrderAtIso)}
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs text-ink-2">
            Showing {startIdx}–{endIdx} of {totalCount}
          </p>

          <nav aria-label="Customers pagination" className="flex flex-wrap items-center gap-1.5">
            {currentPage > 1 ? (
              <Link
                href={buildCustomersHref({
                  page: currentPage - 1,
                  query,
                  sort,
                })}
                onClick={(e) =>
                  handleLinkNavigation(
                    e,
                    buildCustomersHref({ page: currentPage - 1, query, sort }),
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
                  href={buildCustomersHref({ page: entry, query, sort })}
                  onClick={(e) =>
                    handleLinkNavigation(
                      e,
                      buildCustomersHref({ page: entry, query, sort }),
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
                href={buildCustomersHref({
                  page: currentPage + 1,
                  query,
                  sort,
                })}
                onClick={(e) =>
                  handleLinkNavigation(
                    e,
                    buildCustomersHref({ page: currentPage + 1, query, sort }),
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
