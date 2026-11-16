"use client";

import { Download, ExternalLink, MessageCircle, Printer } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import { CAFE_INSTAGRAM, CAFE_NAME, CAFE_TAGLINE } from "@/lib/brand";
import {
  computeCartTotals,
  computeLineTotals,
  type CartLine,
  type OrderType,
} from "@/lib/cart";
import {
  formatIstDateTime,
  formatPaymentsSummary,
  formatRupees,
  ORDER_TYPE_LABEL,
} from "@/lib/format";
import { enqueueOfflineOrder } from "@/lib/offline-outbox";
import {
  normalizePhoneInput,
  optionalPhoneSchema,
  parseRupeesInput,
  type CreateOrderInput,
  type PaymentMode,
} from "@/lib/validators";
import { placeOrder } from "./actions";

export type CompletedOrder = {
  orderId: string;
  sig: string;
  shortCode?: string;
  billNo: number;
  queuedOffline?: boolean;
  type: OrderType;
  customerName: string;
  customerPhone: string;
  subtotal: number;
  discountTotal: number;
  total: number;
  placedAtIso: string;
  items: CartLine[];
  payments: { mode: PaymentMode; amount: number }[];
};

const MODES: { id: PaymentMode; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "upi", label: "UPI" },
  { id: "card", label: "Card" },
];

function buildWhatsAppBillText(order: CompletedOrder, billUrl: string | null): string {
  const billLabel = order.queuedOffline ? `#OFF-${order.billNo}` : `#${order.billNo}`;
  const lines: string[] = [
    `*${CAFE_NAME}* (${CAFE_INSTAGRAM})`,
    `Bill ${billLabel} · ${ORDER_TYPE_LABEL[order.type]}`,
    formatIstDateTime(order.placedAtIso),
  ];

  if (order.customerName) {
    lines.push(`Customer: ${order.customerName}`);
  }

  lines.push("");

  for (const item of order.items) {
    const { lineTotal } = computeLineTotals(item);
    const variantPart = item.variantName ? ` (${item.variantName})` : "";
    const tag = item.complimentary
      ? " [On the house]"
      : item.discount > 0
        ? ` [-${formatRupees(item.discount)}]`
        : "";
    lines.push(
      `${item.qty}x ${item.name}${variantPart} - ${formatRupees(lineTotal)}${tag}`,
    );
    for (const addon of item.addons) {
      lines.push(`   + ${addon.name}`);
    }
  }

  lines.push("");
  if (order.discountTotal > 0) {
    lines.push(`Subtotal: ${formatRupees(order.subtotal)}`);
    lines.push(`Discount: -${formatRupees(order.discountTotal)}`);
  }
  lines.push(`*Total: ${formatRupees(order.total)}*`);
  lines.push(`Paid via ${formatPaymentsSummary(order.payments)}`);
  if (billUrl) {
    lines.push("");
    lines.push("Digital bill & download:");
    lines.push(billUrl);
  }
  lines.push("");
  lines.push(CAFE_TAGLINE);

  return lines.join("\n");
}

function PaymentStage({
  lines,
  orderType,
  customerName,
  customerPhone,
  onOrderPlaced,
}: {
  lines: CartLine[];
  orderType: OrderType;
  customerName: string;
  customerPhone: string;
  onOrderPlaced: (completed: CompletedOrder) => void;
}) {
  const { subtotal, discountTotal, total } = computeCartTotals(lines);
  const [orderId] = useState(() => crypto.randomUUID());
  const [singleMode, setSingleMode] = useState<PaymentMode>("upi");
  const [isSplit, setIsSplit] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState<Record<PaymentMode, string>>({
    cash: "",
    upi: String(total),
    card: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function parseSplit(mode: PaymentMode): number {
    const raw = splitAmounts[mode].trim();
    if (raw === "") return 0;
    const parsed = parseRupeesInput(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const splitSum = MODES.reduce((sum, m) => sum + parseSplit(m.id), 0);
  const remaining = total - splitSum;

  function fillRest(targetMode: PaymentMode) {
    const othersSum = MODES.filter((m) => m.id !== targetMode).reduce(
      (sum, m) => sum + parseSplit(m.id),
      0,
    );
    const rest = Math.max(0, total - othersSum);
    setSplitAmounts((prev) => ({ ...prev, [targetMode]: rest > 0 ? String(rest) : "" }));
  }

  function handleToggleSplit(checked: boolean) {
    setIsSplit(checked);
    setError(null);
    if (checked) {
      setSplitAmounts({
        cash: singleMode === "cash" && total > 0 ? String(total) : "",
        upi: singleMode === "upi" && total > 0 ? String(total) : "",
        card: singleMode === "card" && total > 0 ? String(total) : "",
      });
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let paymentRows: { mode: PaymentMode; amount: number }[];
    if (!isSplit) {
      paymentRows = [{ mode: singleMode, amount: total }];
    } else {
      for (const m of MODES) {
        const raw = splitAmounts[m.id].trim();
        if (raw !== "" && !Number.isFinite(parseRupeesInput(raw))) {
          setError(`Enter a valid whole-rupee amount for ${m.label}`);
          return;
        }
      }
      if (splitSum !== total) {
        setError("Payment amounts must add up to the order total");
        return;
      }
      paymentRows =
        total === 0
          ? [{ mode: "cash", amount: 0 }]
          : MODES.map((m) => ({ mode: m.id, amount: parseSplit(m.id) })).filter(
              (p) => p.amount > 0,
            );
    }

    const placedAtIso = new Date().toISOString();
    const orderItemsPayload = lines.map((line) => {
      const { appliedDiscount, lineTotal } = computeLineTotals(line);
      return {
        kind: line.kind,
        sourceId: line.sourceId,
        name: line.name,
        variantName: line.variantName,
        unitPrice: line.unitPrice,
        addons: line.addons.map((a) => ({ name: a.name, price: a.price })),
        qty: line.qty,
        discount: appliedDiscount,
        complimentary: line.complimentary,
        lineTotal,
      };
    });

    const payload: CreateOrderInput = {
      id: orderId,
      type: orderType,
      customerName,
      customerPhone,
      subtotal,
      discountTotal,
      total,
      placedAt: placedAtIso,
      items: orderItemsPayload,
      payments: paymentRows,
    };

    async function queueOfflineFallback() {
      try {
        const queued = await enqueueOfflineOrder(payload);
        onOrderPlaced({
          orderId: payload.id,
          sig: "",
          billNo: queued.localSeq,
          queuedOffline: true,
          type: orderType,
          customerName,
          customerPhone,
          subtotal,
          discountTotal,
          total,
          placedAtIso,
          items: lines,
          payments: paymentRows,
        });
      } catch {
        setError("You appear offline and local storage is unavailable.");
      }
    }

    startTransition(async () => {
      if (!navigator.onLine) {
        await queueOfflineFallback();
        return;
      }

      try {
        const result = await placeOrder(payload);

        if ("error" in result) {
          if (
            !navigator.onLine ||
            result.error.startsWith("Could not save order")
          ) {
            await queueOfflineFallback();
            return;
          }
          setError(result.error);
          return;
        }

        onOrderPlaced({
          orderId: result.orderId,
          sig: result.sig,
          shortCode: result.shortCode,
          billNo: result.billNo,
          type: orderType,
          customerName,
          customerPhone,
          subtotal,
          discountTotal,
          total,
          placedAtIso,
          items: lines,
          payments: paymentRows,
        });
      } catch {
        await queueOfflineFallback();
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="rounded-control border border-hairline bg-bg p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-ink-2">
            {orderType === "takeaway" ? "Takeaway / Parcel" : "Self-pickup"}
          </span>
          <span className="font-mono text-2xl font-medium text-ink">
            {formatRupees(total)}
          </span>
        </div>
        {customerName || customerPhone ? (
          <p className="mt-1.5 text-xs text-ink-3">
            {[customerName, customerPhone].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>

      {!isSplit ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm text-ink-2">Payment method</legend>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => {
              const selected = singleMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSingleMode(m.id)}
                  className={`min-h-12 rounded-control border text-sm font-medium transition-colors ${
                    selected
                      ? "border-accent bg-accent text-white"
                      : "border-hairline-strong bg-bg text-ink hover:border-ink-3"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-2">Enter amount for each mode</span>
            <span
              className={`font-mono font-medium ${
                remaining === 0 ? "text-positive" : "text-negative"
              }`}
            >
              {remaining === 0
                ? "Balanced"
                : remaining > 0
                  ? `${formatRupees(remaining)} left`
                  : `${formatRupees(Math.abs(remaining))} over`}
            </span>
          </div>

          {MODES.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <label htmlFor={`split-${m.id}`} className="w-14 text-sm font-medium">
                {m.label}
              </label>
              <div className="relative flex-1">
                <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-3">
                  ₹
                </span>
                <input
                  id={`split-${m.id}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={total}
                  value={splitAmounts[m.id]}
                  onChange={(e) => {
                    setSplitAmounts((prev) => ({ ...prev, [m.id]: e.target.value }));
                    if (error) setError(null);
                  }}
                  placeholder="0"
                  className="field ps-7 text-right font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => fillRest(m.id)}
                className="btn btn-secondary min-h-11 px-3 text-xs"
              >
                Fill rest
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink-2">
        <input
          type="checkbox"
          checked={isSplit}
          onChange={(e) => handleToggleSplit(e.target.checked)}
          className="size-4 accent-accent"
        />
        Split across payment modes
      </label>

      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || (isSplit && remaining !== 0)}
        className="btn btn-primary w-full justify-between px-5 text-base"
      >
        <span>{pending ? "Saving order" : "Complete order"}</span>
        <span className="font-mono">{formatRupees(total)}</span>
      </button>
    </form>
  );
}

function ReceiptStage({
  order,
  onClose,
}: {
  order: CompletedOrder;
  onClose: () => void;
}) {
  const phoneInputId = useId();
  const [waPhone, setWaPhone] = useState(order.customerPhone);
  const [waError, setWaError] = useState<string | null>(null);

  const billLabel = order.queuedOffline ? `#OFF-${order.billNo}` : `#${order.billNo}`;
  const sigParam = encodeURIComponent(order.sig);
  const billPath = order.shortCode
    ? `/b/${order.shortCode}`
    : `/bill/${order.orderId}?s=${sigParam}`;
  const downloadPath = `/api/bill-image/${order.orderId}?s=${sigParam}&download=1`;

  function handleSendWhatsApp() {
    const parsed = optionalPhoneSchema.safeParse(waPhone);
    if (!parsed.success) {
      setWaError(parsed.error.issues[0]?.message ?? "Enter a valid 10-digit WhatsApp number");
      return;
    }
    setWaError(null);
    const billUrl = order.queuedOffline ? null : `${window.location.origin}${billPath}`;
    const text = buildWhatsAppBillText(order, billUrl);
    const target = parsed.data
      ? `https://wa.me/91${parsed.data}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="block text-xs text-ink-3">Bill number</span>
          <span className="font-mono text-3xl font-medium tracking-tight text-ink">
            {billLabel}
          </span>
        </div>
        {order.queuedOffline ? (
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-text">
            Queued offline · {billLabel} (will sync automatically when online)
          </span>
        ) : (
          <span className="rounded-full bg-positive/15 px-3 py-1 text-xs font-medium text-positive">
            Paid · {formatPaymentsSummary(order.payments)}
          </span>
        )}
      </div>

      <div className="rounded-control border border-hairline bg-bg p-4 font-mono text-xs leading-relaxed text-ink">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium">{CAFE_NAME}</span>
          <span className="text-ink-3">{CAFE_INSTAGRAM}</span>
        </div>
        <div className="mt-1 flex flex-wrap justify-between gap-2 text-ink-2">
          <span>
            Bill {billLabel} · {ORDER_TYPE_LABEL[order.type]}
          </span>
          <span>{formatIstDateTime(order.placedAtIso)}</span>
        </div>
        {order.customerName ? (
          <p className="mt-1 text-ink-2">Customer: {order.customerName}</p>
        ) : null}

        <div className="my-3 border-t border-dashed border-hairline-strong" />

        <ul className="flex flex-col gap-1.5">
          {order.items.map((item) => {
            const { lineTotal } = computeLineTotals(item);
            return (
              <li key={item.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <span>
                    {item.qty}x {item.name}
                    {item.variantName ? ` (${item.variantName})` : ""}
                  </span>
                  <span className="shrink-0">{formatRupees(lineTotal)}</span>
                </div>
                {item.addons.map((addon) => (
                  <div key={addon.id} className="ps-4 text-ink-3">
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
            );
          })}
        </ul>

        <div className="my-3 border-t border-dashed border-hairline-strong" />

        {order.discountTotal > 0 ? (
          <>
            <div className="flex justify-between text-ink-2">
              <span>Subtotal</span>
              <span>{formatRupees(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-2">
              <span>Discounts</span>
              <span>-{formatRupees(order.discountTotal)}</span>
            </div>
          </>
        ) : null}
        <div className="mt-1 flex justify-between text-sm font-medium">
          <span>Total</span>
          <span>{formatRupees(order.total)}</span>
        </div>
        <p className="mt-3 text-center text-ink-3">{CAFE_TAGLINE}</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={phoneInputId} className="text-xs text-ink-3">
          WhatsApp number (leave blank to pick a contact in WhatsApp)
        </label>
        <input
          id={phoneInputId}
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={waPhone}
          onChange={(e) => {
            setWaPhone(normalizePhoneInput(e.target.value).slice(0, 10));
            if (waError) setWaError(null);
          }}
          placeholder="10-digit WhatsApp number"
          className="field font-mono text-sm"
        />
        {waError ? (
          <p role="alert" className="text-xs text-negative">
            {waError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleSendWhatsApp}
          className="btn btn-primary w-full text-sm"
        >
          <MessageCircle size={18} strokeWidth={1.5} aria-hidden />
          Send bill on WhatsApp
        </button>

        {!order.queuedOffline ? (
          <div className="grid grid-cols-2 gap-2">
            <a href={downloadPath} download className="btn btn-secondary text-xs sm:text-sm">
              <Download size={16} strokeWidth={1.5} aria-hidden />
              Download PNG bill
            </a>
            <a
              href={billPath}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary text-xs sm:text-sm"
            >
              <ExternalLink size={16} strokeWidth={1.5} aria-hidden />
              Open bill link
            </a>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-hairline pt-4">
        <button
          type="button"
          onClick={() => window.print()}
          className="btn btn-secondary text-sm"
        >
          <Printer size={16} strokeWidth={1.5} aria-hidden />
          Print KOT
        </button>
        <button type="button" onClick={onClose} className="btn btn-secondary text-sm">
          New order
        </button>
      </div>
    </div>
  );
}

export function CheckoutModal({
  open,
  lines,
  orderType,
  customerName,
  customerPhone,
  completedOrder,
  onOrderPlaced,
  onClose,
}: {
  open: boolean;
  lines: CartLine[];
  orderType: OrderType;
  customerName: string;
  customerPhone: string;
  completedOrder: CompletedOrder | null;
  onOrderPlaced: (completed: CompletedOrder) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={completedOrder ? "Order complete" : "Take payment"}
    >
      {completedOrder ? (
        <ReceiptStage order={completedOrder} onClose={onClose} />
      ) : (
        <PaymentStage
          lines={lines}
          orderType={orderType}
          customerName={customerName}
          customerPhone={customerPhone}
          onOrderPlaced={onOrderPlaced}
        />
      )}
    </Modal>
  );
}

export function KotPrintSlip({ order }: { order: CompletedOrder | null }) {
  if (!order) return null;

  return (
    <div id="kot-print-slip" className="hidden font-mono text-xs text-black print:block">
      <div className="border-b border-dashed border-black pb-2">
        <p className="text-sm font-bold">{CAFE_NAME} — KOT</p>
        <p className="mt-1 text-lg font-bold">
          BILL {order.queuedOffline ? `#OFF-${order.billNo}` : `#${order.billNo}`}
        </p>
        <p className="mt-0.5 font-bold uppercase">
          {order.type === "takeaway" ? "TAKEAWAY" : "SELF-PICKUP"}
        </p>
        <p>{formatIstDateTime(order.placedAtIso)}</p>
        {order.customerName ? <p>Customer: {order.customerName}</p> : null}
      </div>

      <ul className="flex flex-col gap-1.5 py-2">
        {order.items.map((item) => (
          <li key={item.key}>
            <p className="text-sm font-bold">
              {item.qty} x {item.name}
              {item.variantName ? ` (${item.variantName})` : ""}
            </p>
            {item.addons.map((addon) => (
              <p key={addon.id} className="ps-3">
                + {addon.name}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
