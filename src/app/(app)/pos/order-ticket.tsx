"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useId } from "react";
import {
  computeCartTotals,
  computeLineTotals,
  type CartLine,
  type OrderType,
} from "@/lib/cart";
import { formatRupees } from "@/lib/format";
import { normalizePhoneInput } from "@/lib/validators";

type OrderTicketProps = {
  lines: CartLine[];
  orderType: OrderType;
  customerName: string;
  customerPhone: string;
  customerError?: string | null;
  onOrderTypeChange: (type: OrderType) => void;
  onCustomerNameChange: (name: string) => void;
  onCustomerPhoneChange: (phone: string) => void;
  onUpdateQty: (key: string, delta: number) => void;
  onSetDiscount: (key: string, discount: number) => void;
  onToggleComplimentary: (key: string) => void;
  onClearCart: () => void;
  onCharge: () => void;
  inModal?: boolean;
};

export function OrderTicket({
  lines,
  orderType,
  customerName,
  customerPhone,
  customerError = null,
  onOrderTypeChange,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onUpdateQty,
  onSetDiscount,
  onToggleComplimentary,
  onClearCart,
  onCharge,
  inModal = false,
}: OrderTicketProps) {
  const nameId = useId();
  const phoneId = useId();
  const totals = computeCartTotals(lines);

  return (
    <div className="flex flex-col gap-4">
      {!inModal ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-medium">Current order</h2>
            {totals.itemCount > 0 ? (
              <span className="font-mono text-xs text-ink-3">{totals.itemCount}</span>
            ) : null}
          </div>
          {lines.length > 0 ? (
            <button
              type="button"
              onClick={onClearCart}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-control px-2.5 text-xs text-ink-3 transition-colors hover:bg-raised hover:text-negative"
            >
              <Trash2 size={14} strokeWidth={1.5} aria-hidden />
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        role="group"
        aria-label="Order type"
        className="grid grid-cols-2 gap-1 rounded-control border border-hairline bg-bg p-1"
      >
        {(
          [
            { value: "takeaway", label: "Takeaway / Parcel" },
            { value: "pickup", label: "Self-pickup" },
          ] as const
        ).map((option) => {
          const active = orderType === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onOrderTypeChange(option.value)}
              className={`min-h-11 rounded-lg px-2 text-xs font-medium transition-colors sm:text-sm ${
                active
                  ? "bg-card text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                  : "text-ink-3 hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={nameId} className="text-xs text-ink-3">
            Customer name (optional)
          </label>
          <input
            id={nameId}
            type="text"
            maxLength={80}
            autoComplete="off"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder="Name for counter callout"
            className="field text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={phoneId} className="text-xs text-ink-3">
            WhatsApp phone (optional)
          </label>
          <input
            id={phoneId}
            type="tel"
            inputMode="numeric"
            maxLength={10}
            autoComplete="off"
            aria-invalid={customerError ? "true" : "false"}
            value={customerPhone}
            onChange={(e) => {
              onCustomerPhoneChange(normalizePhoneInput(e.target.value).slice(0, 10));
            }}
            placeholder="10-digit number"
            className="field font-mono text-sm"
          />
        </div>
      </div>

      {customerError ? (
        <p role="alert" className="-mt-2 text-xs text-negative">
          {customerError}
        </p>
      ) : null}

      {lines.length === 0 ? (
        <div className="rounded-control border border-dashed border-hairline px-4 py-8 text-center text-sm text-ink-3">
          Tap any item on the menu to start an order
        </div>
      ) : (
        <ul className="divide-y divide-hairline rounded-control border border-hairline bg-bg">
          {lines.map((line) => {
            const { gross, appliedDiscount, lineTotal } = computeLineTotals(line);
            const metaParts = [
              line.variantName,
              ...line.addons.map((a) => `+${a.name}`),
              line.subtitle,
            ].filter(Boolean);

            return (
              <li key={line.key} className="flex flex-col gap-2.5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug text-ink">{line.name}</p>
                    {metaParts.length > 0 ? (
                      <p className="mt-0.5 text-xs text-ink-3">{metaParts.join(", ")}</p>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-right font-mono text-sm">
                    {appliedDiscount > 0 ? (
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-ink-3 line-through">
                          {formatRupees(gross)}
                        </span>
                        <span className="font-medium text-ink">
                          {line.complimentary ? "₹0" : formatRupees(lineTotal)}
                        </span>
                      </div>
                    ) : (
                      <span className="font-medium text-ink">{formatRupees(lineTotal)}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={`Decrease ${line.name} quantity`}
                      onClick={() => onUpdateQty(line.key, -1)}
                      className="grid size-10 place-items-center rounded-lg border border-hairline-strong bg-card text-ink-2 transition-colors hover:text-ink"
                    >
                      <Minus size={14} strokeWidth={1.5} aria-hidden />
                    </button>
                    <span className="w-7 text-center font-mono text-sm font-medium">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase ${line.name} quantity`}
                      onClick={() => onUpdateQty(line.key, 1)}
                      className="grid size-10 place-items-center rounded-lg border border-hairline-strong bg-card text-ink-2 transition-colors hover:text-ink"
                    >
                      <Plus size={14} strokeWidth={1.5} aria-hidden />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-pressed={line.complimentary}
                      onClick={() => onToggleComplimentary(line.key)}
                      className={`min-h-10 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                        line.complimentary
                          ? "border-accent bg-accent-soft text-accent-text"
                          : "border-hairline bg-card text-ink-3 hover:text-ink"
                      }`}
                    >
                      On the house
                    </button>

                    <div className="flex items-center rounded-lg border border-hairline bg-card px-2">
                      <span className="font-mono text-xs text-ink-3">-₹</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={gross}
                        disabled={line.complimentary}
                        aria-label={`Discount in rupees for ${line.name}`}
                        value={line.discount > 0 ? String(line.discount) : ""}
                        placeholder="0"
                        onChange={(e) => {
                          const val = Number.parseInt(e.target.value, 10);
                          onSetDiscount(
                            line.key,
                            Number.isFinite(val) ? Math.min(gross, Math.max(0, val)) : 0,
                          );
                        }}
                        className="min-h-10 w-12 bg-transparent ps-1 text-right font-mono text-xs text-ink outline-none disabled:opacity-40"
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col gap-2 border-t border-hairline pt-3">
        <div className="flex items-center justify-between text-sm text-ink-2">
          <span>Subtotal</span>
          <span className="font-mono">{formatRupees(totals.subtotal)}</span>
        </div>
        {totals.discountTotal > 0 ? (
          <div className="flex items-center justify-between text-sm text-positive">
            <span>Item discounts</span>
            <span className="font-mono">-{formatRupees(totals.discountTotal)}</span>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between pt-1">
          <span className="text-base font-medium">Total</span>
          <span className="font-mono text-xl font-medium text-ink">
            {formatRupees(totals.total)}
          </span>
        </div>

        <button
          type="button"
          disabled={lines.length === 0}
          onClick={onCharge}
          className="btn btn-primary mt-2 w-full justify-between px-5 text-base"
        >
          <span>Charge</span>
          <span className="font-mono">{formatRupees(totals.total)}</span>
        </button>

        {inModal && lines.length > 0 ? (
          <button
            type="button"
            onClick={onClearCart}
            className="btn btn-secondary w-full text-sm"
          >
            Clear order
          </button>
        ) : null}
      </div>
    </div>
  );
}
