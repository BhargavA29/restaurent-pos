"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { type OrderType } from "@/lib/cart";
import { formatIstDateTime, formatRupees, ORDER_TYPE_LABEL } from "@/lib/format";
import { expenseSchema, parseRupeesInput, type PaymentMode } from "@/lib/validators";
import { deleteExpense, saveExpense } from "./actions";

export type DayRevenuePoint = {
  date: string;
  dayShort: string;
  dayNum: string;
  revenue: number;
  orderCount: number;
};

export type TopSellingRow = {
  name: string;
  variantName: string | null;
  qty: number;
  revenue: number;
};

export type ExpenseItem = {
  id: string;
  spentOn: string;
  description: string;
  amount: number;
  createdAtIso: string;
};

export type DayBillRow = {
  id: string;
  sig: string;
  billNo: number;
  type: OrderType;
  customerName: string | null;
  total: number;
  placedAtIso: string;
};

export type HourlyBucket = {
  hour: number;
  label: string;
  orderCount: number;
  revenue: number;
};

type DashboardViewProps = {
  selectedDate: string;
  selectedDateLabel: string;
  todayDate: string;
  prevDate: string;
  nextDate: string;
  sevenDays: DayRevenuePoint[];
  topItems: TopSellingRow[];
  initialExpenses: ExpenseItem[];
  bills: DayBillRow[];
  paymentTotals: Record<PaymentMode, number>;
  hourlyBreakdown: HourlyBucket[];
};

const timeOnlyFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  timeStyle: "short",
});

function csvCell(value: string | number): string {
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function DashboardView({
  selectedDate,
  selectedDateLabel,
  todayDate,
  prevDate,
  nextDate,
  sevenDays,
  topItems,
  initialExpenses,
  bills,
  paymentTotals,
  hourlyBreakdown,
}: DashboardViewProps) {
  const router = useRouter();
  const dateInputId = useId();
  const descId = useId();
  const amountId = useId();

  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseError, setExpenseError] = useState<string | null>(null);

  const todayPoint = sevenDays[sevenDays.length - 1];
  const yesterdayPoint = sevenDays[sevenDays.length - 2];

  const dayRevenue = todayPoint?.revenue ?? 0;
  const dayOrderCount = todayPoint?.orderCount ?? 0;
  const avgBill = dayOrderCount > 0 ? Math.round(dayRevenue / dayOrderCount) : 0;
  const yesterdayRevenue = yesterdayPoint?.revenue ?? 0;

  const expenseTotal = useMemo(
    () => expenses.reduce((sum, item) => sum + item.amount, 0),
    [expenses],
  );
  const netAfterExpenses = dayRevenue - expenseTotal;
  const expectedCashInDrawer = paymentTotals.cash - expenseTotal;

  const sevenDayTotal = useMemo(
    () => sevenDays.reduce((sum, d) => sum + d.revenue, 0),
    [sevenDays],
  );
  const maxDayRevenue = useMemo(
    () => Math.max(...sevenDays.map((d) => d.revenue), 1),
    [sevenDays],
  );
  const maxTopQty = useMemo(
    () => Math.max(...topItems.map((i) => i.qty), 1),
    [topItems],
  );
  const maxHourOrders = useMemo(
    () => Math.max(...hourlyBreakdown.map((h) => h.orderCount), 1),
    [hourlyBreakdown],
  );
  const peakHour = useMemo(() => {
    if (hourlyBreakdown.length === 0) return null;
    return hourlyBreakdown.reduce((best, cur) =>
      cur.orderCount > best.orderCount ||
      (cur.orderCount === best.orderCount && cur.revenue > best.revenue)
        ? cur
        : best,
    );
  }, [hourlyBreakdown]);

  function goToDate(date: string) {
    if (!date) return;
    router.push(date === todayDate ? "/dashboard" : `/dashboard?date=${date}`);
  }

  function handleExportCsv() {
    const rows: string[] = [];
    const push = (...cols: (string | number)[]) => {
      rows.push(cols.map(csvCell).join(","));
    };

    push("FRY Daily Summary", selectedDate);
    push("Metric", "Value");
    push("Total Revenue (INR)", dayRevenue);
    push("Orders", dayOrderCount);
    push("Average Bill (INR)", avgBill);
    push("UPI Collected (INR)", paymentTotals.upi);
    push("Card Collected (INR)", paymentTotals.card);
    push("Cash Sales (INR)", paymentTotals.cash);
    push("Daily Expenses (INR)", expenseTotal);
    push("Expected Cash in Drawer (INR)", expectedCashInDrawer);
    push("Net After Expenses (INR)", netAfterExpenses);

    rows.push("");
    push("Top-Selling Items", "Variant", "Qty", "Revenue (INR)");
    for (const item of topItems) {
      push(item.name, item.variantName ?? "", item.qty, item.revenue);
    }

    rows.push("");
    push("Bills", "Time (IST)", "Order Type", "Customer", "Total (INR)");
    for (const bill of bills) {
      push(
        `#${bill.billNo}`,
        formatIstDateTime(bill.placedAtIso),
        ORDER_TYPE_LABEL[bill.type],
        bill.customerName ?? "",
        bill.total,
      );
    }

    rows.push("");
    push("Expenses", "Time (IST)", "Amount (INR)");
    for (const exp of expenses) {
      push(exp.description, timeOnlyFormatter.format(new Date(exp.createdAtIso)), exp.amount);
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FRY-Summary-${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const id = crypto.randomUUID();
    const parsed = expenseSchema.safeParse({
      id,
      spentOn: selectedDate,
      description: desc,
      amount: parseRupeesInput(amount),
    });

    if (!parsed.success) {
      setExpenseError(parsed.error.issues[0]?.message ?? "Check expense details");
      return;
    }

    const newItem: ExpenseItem = {
      id: parsed.data.id,
      spentOn: parsed.data.spentOn,
      description: parsed.data.description,
      amount: parsed.data.amount,
      createdAtIso: new Date().toISOString(),
    };

    const prevSnapshot = expenses;
    setExpenseError(null);
    setDesc("");
    setAmount("");
    setExpenses((prev) => [newItem, ...prev]);

    void saveExpense(parsed.data)
      .then((res) => {
        if (res.error) {
          setExpenses(prevSnapshot);
          setExpenseError(res.error);
        }
      })
      .catch(() => {
        setExpenses(prevSnapshot);
        setExpenseError("Could not save expense. Check connection and try again.");
      });
  }

  function handleDeleteExpense(id: string) {
    const prevSnapshot = expenses;
    setExpenseError(null);
    setExpenses((prev) => prev.filter((item) => item.id !== id));

    void deleteExpense(id)
      .then((res) => {
        if (res.error) {
          setExpenses(prevSnapshot);
          setExpenseError(res.error);
        }
      })
      .catch(() => {
        setExpenses(prevSnapshot);
        setExpenseError("Could not delete expense. Check connection and try again.");
      });
  }

  const diffVsYesterday = dayRevenue - yesterdayRevenue;
  const revenueDeltaLabel =
    yesterdayRevenue > 0
      ? `${diffVsYesterday >= 0 ? "+" : "-"}${formatRupees(Math.abs(diffVsYesterday))} vs day before`
      : "No sales the day before";

  const isToday = selectedDate === todayDate;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-normal leading-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-2">{selectedDateLabel}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => goToDate(prevDate)}
            className="btn btn-secondary min-h-11 px-3"
          >
            <ChevronLeft size={16} strokeWidth={1.5} aria-hidden />
          </button>

          <label htmlFor={dateInputId} className="sr-only">
            Select business date
          </label>
          <input
            id={dateInputId}
            type="date"
            value={selectedDate}
            max={todayDate}
            onChange={(e) => goToDate(e.target.value)}
            className="field w-auto font-mono text-sm"
          />

          <button
            type="button"
            aria-label="Next day"
            disabled={isToday}
            onClick={() => goToDate(nextDate)}
            className="btn btn-secondary min-h-11 px-3"
          >
            <ChevronRight size={16} strokeWidth={1.5} aria-hidden />
          </button>

          {!isToday ? (
            <button
              type="button"
              onClick={() => goToDate(todayDate)}
              className="btn btn-secondary min-h-11 px-3.5 text-sm"
            >
              Today
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleExportCsv}
            className="btn btn-secondary min-h-11 px-3.5 text-sm"
          >
            <Download size={16} strokeWidth={1.5} aria-hidden />
            Export CSV
          </button>
        </div>
      </header>

      <section
        aria-label="Day summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <div className="rounded-card border border-hairline bg-card p-5">
          <p className="text-sm text-ink-2">Total revenue</p>
          <p className="mt-2 font-mono text-3xl font-medium leading-none text-ink">
            {formatRupees(dayRevenue)}
          </p>
          <p className="mt-2.5 text-xs text-ink-3">
            {dayOrderCount} {dayOrderCount === 1 ? "order" : "orders"} ·{" "}
            {formatRupees(avgBill)} avg bill · {revenueDeltaLabel}
          </p>
        </div>

        <div className="rounded-card border border-hairline bg-card p-5">
          <p className="text-sm text-ink-2">Daily expenses</p>
          <p className="mt-2 font-mono text-3xl font-medium leading-none text-ink">
            {formatRupees(expenseTotal)}
          </p>
          <p className="mt-2.5 text-xs text-ink-3">
            {expenses.length} {expenses.length === 1 ? "entry" : "entries"} logged
          </p>
        </div>

        <div className="rounded-card border border-hairline bg-card p-5">
          <p className="text-sm text-ink-2">Net after expenses</p>
          <p
            className={`mt-2 font-mono text-3xl font-medium leading-none ${
              netAfterExpenses < 0 ? "text-negative" : "text-ink"
            }`}
          >
            {netAfterExpenses < 0
              ? `-${formatRupees(Math.abs(netAfterExpenses))}`
              : formatRupees(netAfterExpenses)}
          </p>
          <p className="mt-2.5 text-xs text-ink-3">Revenue minus drawer expenses</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
        <div className="rounded-card border border-hairline bg-card p-5 md:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-base font-medium">7-day revenue</h2>
              <p className="mt-0.5 text-xs text-ink-3">
                Tap any day to inspect its sales and expenses
              </p>
            </div>
            <span className="font-mono text-sm text-ink-2">
              {formatRupees(sevenDayTotal)} total
            </span>
          </div>

          <div className="relative mt-6 h-56">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 bottom-10 flex flex-col justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="w-12 text-right font-mono text-[11px] text-ink-3">
                  {formatRupees(maxDayRevenue)}
                </span>
                <span className="h-px flex-1 bg-hairline" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 text-right font-mono text-[11px] text-ink-3">
                  {formatRupees(Math.round(maxDayRevenue / 2))}
                </span>
                <span className="h-px flex-1 bg-hairline" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 text-right font-mono text-[11px] text-ink-3">
                  ₹0
                </span>
                <span className="h-px flex-1 bg-hairline" />
              </div>
            </div>

            <div className="relative flex h-full items-end gap-2 ps-14">
              {sevenDays.map((day) => {
                const selected = day.date === selectedDate;
                const pct =
                  day.revenue > 0
                    ? Math.max(4, Math.round((day.revenue / maxDayRevenue) * 100))
                    : 0;

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => goToDate(day.date)}
                    aria-pressed={selected}
                    title={`${day.date}: ${formatRupees(day.revenue)} (${day.orderCount} orders)`}
                    className="group flex h-full flex-1 flex-col items-center justify-end gap-2 rounded-control px-1 pb-1 transition-colors hover:bg-raised/60"
                  >
                    <div className="flex w-full flex-1 items-end justify-center pt-2">
                      <div
                        style={{ height: day.revenue > 0 ? `${pct}%` : "2px" }}
                        className={`w-full max-w-10 rounded-t-md transition-colors ${
                          selected
                            ? "bg-accent"
                            : day.revenue > 0
                              ? "bg-raised group-hover:bg-hairline-strong"
                              : "bg-hairline"
                        }`}
                      />
                    </div>
                    <div className="text-center leading-tight">
                      <span
                        className={`block text-[11px] ${
                          selected ? "font-medium text-accent-text" : "text-ink-3"
                        }`}
                      >
                        {day.dayShort}
                      </span>
                      <span
                        className={`block font-mono text-xs ${
                          selected ? "font-medium text-ink" : "text-ink-2"
                        }`}
                      >
                        {day.dayNum}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-card border border-hairline bg-card p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-medium">Top-selling items</h2>
            <span className="font-mono text-xs text-ink-3">{topItems.length}</span>
          </div>

          {topItems.length === 0 ? (
            <p className="mt-6 text-sm text-ink-3">No items sold on this day</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3.5">
              {topItems.slice(0, 8).map((item, idx) => {
                const widthPct = Math.max(6, Math.round((item.qty / maxTopQty) * 100));
                return (
                  <li
                    key={`${item.name}-${item.variantName ?? "base"}-${idx}`}
                    className="flex flex-col gap-1.5"
                  >
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate font-medium text-ink">
                        {item.name}
                        {item.variantName ? (
                          <span className="font-normal text-ink-3">
                            {" "}
                            · {item.variantName}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-ink-2">
                        {item.qty}× · {formatRupees(item.revenue)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="h-full rounded-full bg-accent"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="rounded-card border border-hairline bg-card p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-base font-medium">Daily expense log</h2>
              <p className="mt-0.5 text-xs text-ink-3">
                Cash spent for milk, fries, gas or counter supplies
              </p>
            </div>
            <span className="font-mono text-sm text-ink-2">
              {formatRupees(expenseTotal)}
            </span>
          </div>

          <form onSubmit={handleAddExpense} className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1">
                <label htmlFor={descId} className="sr-only">
                  Expense description
                </label>
                <input
                  id={descId}
                  type="text"
                  maxLength={120}
                  value={desc}
                  onChange={(e) => {
                    setDesc(e.target.value);
                    if (expenseError) setExpenseError(null);
                  }}
                  placeholder="Oil, potatoes, packaging…"
                  required
                  className="field text-sm"
                />
              </div>
              <div className="w-full sm:w-32">
                <label htmlFor={amountId} className="sr-only">
                  Amount in rupees
                </label>
                <input
                  id={amountId}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100000}
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (expenseError) setExpenseError(null);
                  }}
                  placeholder="₹ Amount"
                  required
                  className="field font-mono text-sm"
                />
              </div>
              <button type="submit" className="btn btn-primary px-4 text-sm">
                <Plus size={16} strokeWidth={1.5} aria-hidden />
                Add
              </button>
            </div>

            {expenseError ? (
              <p role="alert" className="text-xs text-negative">
                {expenseError}
              </p>
            ) : null}
          </form>

          {expenses.length === 0 ? (
            <p className="mt-6 text-sm text-ink-3">No expenses logged for this day</p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline rounded-control border border-hairline bg-bg">
              {expenses.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {item.description}
                    </p>
                    <p className="font-mono text-xs text-ink-3">
                      {timeOnlyFormatter.format(new Date(item.createdAtIso))}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-sm font-medium text-ink">
                      {formatRupees(item.amount)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Delete expense ${item.description}`}
                      onClick={() => handleDeleteExpense(item.id)}
                      className="grid size-10 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-raised hover:text-negative"
                    >
                      <Trash2 size={16} strokeWidth={1.5} aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-card border border-hairline bg-card p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-medium">Bills for the day</h2>
            <span className="font-mono text-xs text-ink-3">{bills.length}</span>
          </div>

          {bills.length === 0 ? (
            <p className="mt-6 text-sm text-ink-3">No orders placed on this day</p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline rounded-control border border-hairline bg-bg">
              {bills.map((bill) => (
                <li
                  key={bill.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-mono text-sm font-medium text-ink">
                        #{bill.billNo}
                      </span>
                      <span className="text-xs text-ink-2">
                        {ORDER_TYPE_LABEL[bill.type]}
                      </span>
                      {bill.customerName ? (
                        <span className="truncate text-xs text-ink-3">
                          · {bill.customerName}
                        </span>
                      ) : null}
                    </div>
                    <p className="font-mono text-xs text-ink-3">
                      {formatIstDateTime(bill.placedAtIso)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-sm font-medium text-ink">
                      {formatRupees(bill.total)}
                    </span>
                    <a
                      href={`/bill/${bill.id}?s=${encodeURIComponent(bill.sig)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open bill #${bill.billNo}`}
                      className="btn btn-secondary min-h-10 px-2.5 text-xs"
                    >
                      <ExternalLink size={14} strokeWidth={1.5} aria-hidden />
                      Bill
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="rounded-card border border-hairline bg-card p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-base font-medium">Cash drawer &amp; payment tally</h2>
              <p className="mt-0.5 text-xs text-ink-3">
                Verify UPI, card, and physical cash at closing
              </p>
            </div>
          </div>

          <dl className="mt-4 divide-y divide-hairline rounded-control border border-hairline bg-bg text-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-ink-2">UPI collected</dt>
              <dd className="font-mono font-medium">{formatRupees(paymentTotals.upi)}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-ink-2">Card collected</dt>
              <dd className="font-mono font-medium">{formatRupees(paymentTotals.card)}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-ink-2">Cash sales</dt>
              <dd className="font-mono font-medium">{formatRupees(paymentTotals.cash)}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-ink-2">Less: Daily expenses</dt>
              <dd className="font-mono text-negative">-{formatRupees(expenseTotal)}</dd>
            </div>
            <div className="flex items-center justify-between bg-raised/60 px-4 py-3.5">
              <dt className="font-medium text-ink">Expected cash in drawer</dt>
              <dd
                className={`font-mono text-lg font-medium ${
                  expectedCashInDrawer < 0 ? "text-negative" : "text-ink"
                }`}
              >
                {expectedCashInDrawer < 0
                  ? `-${formatRupees(Math.abs(expectedCashInDrawer))}`
                  : formatRupees(expectedCashInDrawer)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-card border border-hairline bg-card p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-base font-medium">Peak hours</h2>
              <p className="mt-0.5 text-xs text-ink-3">
                Rush-hour order volume across the day
              </p>
            </div>
            {peakHour ? (
              <span className="rounded bg-accent-soft px-2 py-0.5 font-mono text-xs font-medium text-accent-text">
                Peak: {peakHour.label}
              </span>
            ) : null}
          </div>

          {hourlyBreakdown.length === 0 ? (
            <p className="mt-6 text-sm text-ink-3">No orders yet to show peak hours</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {hourlyBreakdown.map((bucket) => {
                const widthPct = Math.max(
                  6,
                  Math.round((bucket.orderCount / maxHourOrders) * 100),
                );
                const isPeak = peakHour?.hour === bucket.hour;
                return (
                  <li key={bucket.hour} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className={isPeak ? "font-medium text-ink" : "text-ink-2"}>
                        {bucket.label}
                      </span>
                      <span className="font-mono text-ink-2">
                        {bucket.orderCount}{" "}
                        {bucket.orderCount === 1 ? "order" : "orders"} ·{" "}
                        {formatRupees(bucket.revenue)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className={`h-full rounded-full ${
                          isPeak ? "bg-accent" : "bg-ink-3/50"
                        }`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
