export type OrderType = "takeaway" | "pickup";

export type CartAddon = {
  id: string;
  name: string;
  price: number;
};

export type CartLine = {
  key: string;
  kind: "item" | "combo";
  sourceId: string;
  name: string;
  variantName: string | null;
  unitPrice: number;
  addons: CartAddon[];
  subtitle?: string;
  qty: number;
  discount: number;
  complimentary: boolean;
};

/** Deterministic key so tapping the same item + variation + add-ons increments qty. */
export function buildCartKey(
  kind: "item" | "combo",
  sourceId: string,
  variantId: string | null,
  addonIds: string[],
): string {
  const sortedAddons = [...addonIds].sort().join(",");
  return `${kind}:${sourceId}:${variantId ?? "base"}:${sortedAddons}`;
}

export function computeLineTotals(line: CartLine) {
  const addonUnitTotal = line.addons.reduce((sum, addon) => sum + addon.price, 0);
  const effectiveUnitPrice = line.unitPrice + addonUnitTotal;
  const gross = effectiveUnitPrice * line.qty;
  const rawDiscount = Number.isFinite(line.discount) ? Math.floor(line.discount) : 0;
  const appliedDiscount = line.complimentary
    ? gross
    : Math.min(gross, Math.max(0, rawDiscount));
  const lineTotal = gross - appliedDiscount;

  return { effectiveUnitPrice, gross, appliedDiscount, lineTotal };
}

export function computeCartTotals(lines: CartLine[]) {
  let itemCount = 0;
  let subtotal = 0;
  let discountTotal = 0;
  let total = 0;

  for (const line of lines) {
    const lineTotals = computeLineTotals(line);
    itemCount += line.qty;
    subtotal += lineTotals.gross;
    discountTotal += lineTotals.appliedDiscount;
    total += lineTotals.lineTotal;
  }

  return { itemCount, subtotal, discountTotal, total };
}
