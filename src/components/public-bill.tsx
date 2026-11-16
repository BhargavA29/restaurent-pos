import { Download } from "lucide-react";
import type { Metadata } from "next";
import { PrintButton } from "@/app/bill/[id]/print-button";
import { BrandLogo } from "@/components/brand-logo";
import type { LoadedSignedBill } from "@/lib/bill-share";
import { CAFE_INSTAGRAM, CAFE_NAME, CAFE_TAGLINE } from "@/lib/brand";
import {
  formatIstDateTime,
  formatPaymentsSummary,
  formatRupees,
  ORDER_TYPE_LABEL,
} from "@/lib/format";

export function buildPublicBillMetadata(loaded: LoadedSignedBill): Metadata {
  if (loaded.status !== "ok") {
    return {
      title: `Bill unavailable · ${CAFE_NAME}`,
      description: "This digital bill link is invalid or could not be found.",
      robots: { index: false, follow: false },
    };
  }

  const { order, items, payments, sig } = loaded;
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
  const title = `${CAFE_NAME} · Bill #${order.billNo} — ${formatRupees(order.total)}`;
  const description = `${ORDER_TYPE_LABEL[order.type]} · ${itemCount} ${
    itemCount === 1 ? "item" : "items"
  } · Paid via ${formatPaymentsSummary(payments)}`;
  const imageUrl = `/api/bill-image/${order.id}?s=${encodeURIComponent(sig)}`;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export function PublicBillView({ loaded }: { loaded: LoadedSignedBill }) {
  if (loaded.status !== "ok") {
    return (
      <main className="grid min-h-dvh place-items-center p-6">
        <div className="w-full max-w-md rounded-card border border-hairline bg-card p-6 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <BrandLogo size={38} />
            <div className="leading-tight">
              <span className="block text-base font-medium tracking-tight">
                {CAFE_NAME}
              </span>
              <span className="block font-mono text-xs text-ink-3">{CAFE_INSTAGRAM}</span>
            </div>
          </div>

          <h1 className="text-xl font-medium">Bill not found</h1>
          <p className="mt-2 text-sm text-ink-2">
            This digital bill link is invalid or could not be found.
          </p>
        </div>
      </main>
    );
  }

  const { order, items, payments, sig } = loaded;
  const sigParam = encodeURIComponent(sig);
  const downloadHref = `/api/bill-image/${order.id}?s=${sigParam}&download=1`;

  return (
    <main className="min-h-dvh px-4 py-8 md:py-12">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <div className="rounded-card border border-hairline bg-card p-6 print:border-0 print:p-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <BrandLogo size={38} />
              <div className="leading-tight">
                <span className="block text-base font-medium tracking-tight">
                  {CAFE_NAME}
                </span>
                <span className="block font-mono text-xs text-ink-3">
                  {CAFE_INSTAGRAM}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="block text-xs text-ink-3">Bill number</span>
              <span className="font-mono text-2xl font-medium">#{order.billNo}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-ink-2">
            <span>{ORDER_TYPE_LABEL[order.type]}</span>
            <span className="font-mono">{formatIstDateTime(order.placedAt)}</span>
          </div>

          {order.customerName ? (
            <p className="mt-1 text-xs text-ink-2">Customer: {order.customerName}</p>
          ) : null}

          <div className="my-4 border-t border-dashed border-hairline-strong" />

          <ul className="flex flex-col gap-2.5 font-mono text-xs">
            {items.map((item) => (
              <li key={item.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>
                    {item.qty}x {item.name}
                    {item.variantName ? ` (${item.variantName})` : ""}
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatRupees(item.lineTotal)}
                  </span>
                </div>
                {item.addons.map((addon, idx) => (
                  <div key={`${item.id}-addon-${idx}`} className="mt-0.5 ps-4 text-ink-3">
                    + {addon.name}
                  </div>
                ))}
                {item.complimentary ? (
                  <div className="mt-0.5 ps-4 text-ink-3">On the house</div>
                ) : item.discount > 0 ? (
                  <div className="mt-0.5 ps-4 text-ink-3">
                    Discount -{formatRupees(item.discount)}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="my-4 border-t border-dashed border-hairline-strong" />

          <div className="flex flex-col gap-1.5 font-mono text-xs">
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
            <div className="mt-1 flex items-baseline justify-between text-base font-medium">
              <span>Total</span>
              <span className="font-mono text-xl">{formatRupees(order.total)}</span>
            </div>
            <p className="mt-1 text-ink-2">
              Paid via {formatPaymentsSummary(payments)}
            </p>
          </div>

          <p className="mt-5 text-center text-xs text-ink-3">{CAFE_TAGLINE}</p>
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          <a href={downloadHref} download className="btn btn-primary flex-1 text-sm">
            <Download size={16} strokeWidth={1.5} aria-hidden />
            Download image (PNG)
          </a>
          <PrintButton />
        </div>
      </div>
    </main>
  );
}
