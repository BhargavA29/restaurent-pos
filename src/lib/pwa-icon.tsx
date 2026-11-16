import { ImageResponse } from "next/og";
import { FryMascotSvg } from "@/components/brand-logo";

export function renderBrandIcon(px: number, radius: number, paddingRatio = 0.08) {
  const pad = Math.round(px * paddingRatio);
  const mascotPx = px - pad * 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ff6600",
          borderRadius: `${radius}px`,
          padding: `${pad}px`,
        }}
      >
        <FryMascotSvg size={mascotPx} />
      </div>
    ),
    { width: px, height: px },
  );
}
