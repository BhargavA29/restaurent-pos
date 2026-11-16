import type { MetadataRoute } from "next";
import { CAFE_INSTAGRAM, CAFE_NAME } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${CAFE_NAME} Counter POS`,
    short_name: `${CAFE_NAME} POS`,
    description: `Counter POS and billing for ${CAFE_NAME} (${CAFE_INSTAGRAM})`,
    start_url: "/pos",
    display: "standalone",
    background_color: "#131211",
    theme_color: "#f73e00",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
