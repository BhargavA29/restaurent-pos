import type { OrderType } from "./cart";
import type { PaymentMode } from "./validators";

const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const istDateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  dateStyle: "medium",
  timeStyle: "short",
});

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  takeaway: "Takeaway / Parcel",
  pickup: "Self-pickup",
};

const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
};

/** Formats whole-rupee amounts with Indian grouping, e.g. ₹1,25,000. */
export function formatRupees(amount: number): string {
  return `₹${rupeeFormatter.format(amount)}`;
}

export function formatIstDateTime(date: Date | string): string {
  return istDateTimeFormatter.format(typeof date === "string" ? new Date(date) : date);
}

export function formatPaymentsSummary(
  payments: { mode: PaymentMode; amount: number }[],
): string {
  return payments
    .map((p) => `${PAYMENT_MODE_LABEL[p.mode]} ${formatRupees(p.amount)}`)
    .join(" + ");
}
