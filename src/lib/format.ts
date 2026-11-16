const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** Formats whole-rupee amounts with Indian grouping, e.g. ₹1,25,000. */
export function formatRupees(amount: number): string {
  return `₹${rupeeFormatter.format(amount)}`;
}
