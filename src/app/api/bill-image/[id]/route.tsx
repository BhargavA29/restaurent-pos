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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sig = request.nextUrl.searchParams.get("s");
  const download = request.nextUrl.searchParams.get("download") === "1";

  const loaded = await loadSignedOrder(id, sig);
  if (loaded.status !== "ok") {
    return new Response("Bill link expired or not found", { status: 410 });
  }

  const { order, items, payments } = loaded;
  const shownItems = items.slice(0, 5);
  const remainingCount = items.length - shownItems.length;
  const paymentText = formatPaymentsSummary(payments);

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f3f1ed",
          padding: "40px",
          color: "#161514",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#ffffff",
            borderRadius: "24px",
            border: "2px solid #e4dfd7",
            padding: "40px 48px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "14px",
                    backgroundColor: "#f73e00",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    fontWeight: 700,
                  }}
                >
                  F
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "34px", fontWeight: 700, lineHeight: 1.05 }}>
                    {CAFE_NAME}
                  </span>
                  <span style={{ fontSize: "18px", color: "#6e6963" }}>
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
                <span style={{ fontSize: "16px", color: "#6e6963" }}>Bill number</span>
                <span style={{ fontSize: "34px", fontWeight: 700, lineHeight: 1.1 }}>
                  #{order.billNo}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "18px",
                color: "#524e4a",
                borderBottom: "2px dashed #ded8ce",
                paddingBottom: "14px",
              }}
            >
              <span>
                {ORDER_TYPE_LABEL[order.type]}
                {order.customerName ? ` · ${order.customerName}` : ""}
              </span>
              <span>{formatIstDateTime(order.placedAt)}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {shownItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    fontSize: "22px",
                  }}
                >
                  <span style={{ color: "#161514" }}>
                    {item.qty}x {item.name}
                    {item.variantName ? ` (${item.variantName})` : ""}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {formatRupees(item.lineTotal)}
                  </span>
                </div>
              ))}
              {remainingCount > 0 ? (
                <span style={{ fontSize: "18px", color: "#6e6963" }}>
                  + {remainingCount} more {remainingCount === 1 ? "item" : "items"}
                </span>
              ) : null}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              borderTop: "2px dashed #ded8ce",
              paddingTop: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "24px", fontWeight: 600 }}>Total paid</span>
              <span style={{ fontSize: "40px", fontWeight: 700, color: "#f73e00" }}>
                {formatRupees(order.total)}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "17px",
                color: "#6e6963",
              }}
            >
              <span>Paid via {paymentText}</span>
              <span>
                Valid for 48 hours · {CAFE_TAGLINE}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
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

  return image;
}
