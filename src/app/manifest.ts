import type { MetadataRoute } from "next";
import { CAFE_INSTAGRAM, CAFE_NAME } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/live",
    name: `${CAFE_NAME} Counter POS`,
    short_name: CAFE_NAME,
    description: `Counter POS and billing for ${CAFE_NAME} (${CAFE_INSTAGRAM})`,
    start_url: "/live",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#131211",
    theme_color: "#f73e00",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
