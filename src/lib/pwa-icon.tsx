import { ImageResponse } from "next/og";

export function renderBrandIcon(px: number, radius: number, fontSize: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f73e00",
          color: "#ffffff",
          borderRadius: `${radius}px`,
          fontSize: `${fontSize}px`,
          fontWeight: 700,
          letterSpacing: "-0.04em",
        }}
      >
        FRY
      </div>
    ),
    { width: px, height: px },
  );
}
