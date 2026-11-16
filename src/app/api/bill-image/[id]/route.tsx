import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { loadSignedOrder } from "@/lib/bill-share";
import { CAFE_INSTAGRAM, CAFE_NAME, CAFE_TAGLINE } from "@/lib/brand";
import {
  formatIstDateTime,
  formatPaymentsSummary,
  formatRupees,
  ORDER_TYPE_LABEL,
} from "@/lib/format";

const DARK = {
  bg: "#131211",
  card: "#191817",
  hairline: "#2e2c2a",
  hairlineStrong: "#423f3b",
  ink: "#f2efeb",
  ink2: "#a6a09a",
  ink3: "#8a837c",
  accent: "#f73e00",
} as const;

function computeDownloadHeight(
  order: { customerName: string | null; discountTotal: number },
  items: {
    qty: number;
    name: string;
    variantName: string | null;
    addons: { name: string; price: number }[];
    complimentary: boolean;
    discount: number;
  }[],
): number {
  let height = 320;
  if (order.customerName) height += 28;
  if (order.discountTotal > 0) height += 54;

  for (const item of items) {
    const label = `${item.qty}x ${item.name}${item.variantName ? ` (${item.variantName})` : ""}`;
    const titleLines = Math.max(1, Math.ceil(label.length / 32));
    height += titleLines * 26 + 14;
    height += item.addons.length * 22;
    if (item.complimentary || item.discount > 0) height += 22;
  }

  return Math.max(520, height);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sig = request.nextUrl.searchParams.get("s");
  const download = request.nextUrl.searchParams.get("download") === "1";

  const loaded = await loadSignedOrder(id, sig);
  if (loaded.status !== "ok") {
    return new Response("Bill not found", { status: 404 });
  }

  const { order, items, payments } = loaded;
  const maxOgItems = order.discountTotal > 0 || order.customerName ? 4 : 5;
  const shownItems = download ? items : items.slice(0, maxOgItems);
  const remainingCount = download ? 0 : items.length - shownItems.length;
  const paymentText = formatPaymentsSummary(payments);

  const width = download ? 720 : 1200;
  const height = download ? computeDownloadHeight(order, items) : 630;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: DARK.bg,
          padding: download ? "32px" : "36px",
          color: DARK.ink,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: DARK.card,
            borderRadius: "24px",
            border: `1px solid ${DARK.hairline}`,
            padding: download ? "36px 36px 32px" : "36px 44px 30px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "24px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    width: "46px",
                    height: "46px",
                    borderRadius: "10px",
                    backgroundColor: DARK.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" />
                  </svg>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: download ? "24px" : "28px",
                      fontWeight: 600,
                      lineHeight: 1.15,
                      color: DARK.ink,
                    }}
                  >
                    {CAFE_NAME}
                  </span>
                  <span
                    style={{
                      fontSize: download ? "15px" : "17px",
                      color: DARK.ink3,
                    }}
                  >
                    {CAFE_INSTAGRAM}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                }}
              >
                <span style={{ fontSize: "14px", color: DARK.ink3 }}>Bill number</span>
                <span
                  style={{
                    fontSize: download ? "32px" : "36px",
                    fontWeight: 600,
                    lineHeight: 1.1,
                    color: DARK.ink,
                  }}
                >
                  #{order.billNo}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "20px",
                fontSize: download ? "15px" : "17px",
                color: DARK.ink2,
              }}
            >
              <span>{ORDER_TYPE_LABEL[order.type]}</span>
              <span>{formatIstDateTime(order.placedAt)}</span>
            </div>

            {order.customerName ? (
              <div
                style={{
                  display: "flex",
                  marginTop: "6px",
                  fontSize: download ? "15px" : "17px",
                  color: DARK.ink2,
                }}
              >
                <span>Customer: {order.customerName}</span>
              </div>
            ) : null}

            <div
              style={{
                marginTop: "20px",
                marginBottom: "20px",
                borderTop: `1px dashed ${DARK.hairlineStrong}`,
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {shownItems.map((item) => (
                <div
                  key={item.id}
                  style={{ display: "flex", flexDirection: "column", gap: "3px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: "16px",
                      fontSize: download ? "19px" : "21px",
                    }}
                  >
                    <span style={{ color: DARK.ink }}>
                      {item.qty}x {item.name}
                      {item.variantName ? ` (${item.variantName})` : ""}
                    </span>
                    <span style={{ fontWeight: 600, color: DARK.ink, flexShrink: 0 }}>
                      {formatRupees(item.lineTotal)}
                    </span>
                  </div>

                  {download
                    ? item.addons.map((addon, idx) => (
                        <span
                          key={`${item.id}-addon-${idx}`}
                          style={{
                            paddingLeft: "18px",
                            fontSize: "15px",
                            color: DARK.ink3,
                          }}
                        >
                          + {addon.name}
                        </span>
                      ))
                    : null}

                  {download && item.complimentary ? (
                    <span
                      style={{
                        paddingLeft: "18px",
                        fontSize: "15px",
                        color: DARK.ink3,
                      }}
                    >
                      On the house
                    </span>
                  ) : download && item.discount > 0 ? (
                    <span
                      style={{
                        paddingLeft: "18px",
                        fontSize: "15px",
                        color: DARK.ink3,
                      }}
                    >
                      Discount -{formatRupees(item.discount)}
                    </span>
                  ) : null}
                </div>
              ))}

              {remainingCount > 0 ? (
                <span style={{ fontSize: "17px", color: DARK.ink3 }}>
                  + {remainingCount} more {remainingCount === 1 ? "item" : "items"}
                </span>
              ) : null}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                marginTop: "20px",
                marginBottom: "20px",
                borderTop: `1px dashed ${DARK.hairlineStrong}`,
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {order.discountTotal > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: download ? "15px" : "17px",
                      color: DARK.ink2,
                    }}
                  >
                    <span>Subtotal</span>
                    <span>{formatRupees(order.subtotal)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: download ? "15px" : "17px",
                      color: DARK.ink2,
                    }}
                  >
                    <span>Discounts</span>
                    <span>-{formatRupees(order.discountTotal)}</span>
                  </div>
                </div>
              ) : null}

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginTop: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: download ? "22px" : "24px",
                    fontWeight: 600,
                    color: DARK.ink,
                  }}
                >
                  Total
                </span>
                <span
                  style={{
                    fontSize: download ? "28px" : "32px",
                    fontWeight: 600,
                    color: DARK.ink,
                  }}
                >
                  {formatRupees(order.total)}
                </span>
              </div>

              <span
                style={{
                  fontSize: download ? "15px" : "17px",
                  color: DARK.ink2,
                }}
              >
                Paid via {paymentText}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "24px",
                fontSize: download ? "14px" : "16px",
                color: DARK.ink3,
              }}
            >
              <span>{CAFE_TAGLINE}</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
      headers: {
        ...(download
          ? {
              "Content-Disposition": `attachment; filename="FRY-Bill-${order.billNo}.png"`,
              "Cache-Control": "private, no-store",
            }
          : {
              "Cache-Control": "public, max-age=300",
            }),
      },
    },
  );
}
