import { renderBrandIcon } from "@/lib/pwa-icon";

export async function GET() {
  return renderBrandIcon(192, 42, 0.08);
}
