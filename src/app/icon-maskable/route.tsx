import { renderBrandIcon } from "@/lib/pwa-icon";

export async function GET() {
  return renderBrandIcon(512, 0, 0.14);
}
