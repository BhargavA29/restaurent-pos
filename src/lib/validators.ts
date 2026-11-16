import { z } from "zod";

export const uuidSchema = z.string().uuid("Invalid identifier");

export const moneySchema = z
  .number({ error: "Enter a valid amount in ₹" })
  .int("Amount must be whole rupees")
  .min(0, "Amount cannot be negative")
  .max(100_000, "Amount cannot exceed ₹1,00,000");

export function normalizePhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}

export const optionalPhoneSchema = z
  .string()
  .transform((s) => normalizePhoneInput(s))
  .refine(
    (s) => s === "" || /^[6-9]\d{9}$/.test(s),
    "Enter a valid 10-digit WhatsApp number",
  );

export const customerInfoSchema = z.object({
  customerName: z.string().trim().max(80, "Customer name cannot exceed 80 characters"),
  customerPhone: optionalPhoneSchema,
});

export const categorySchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(1, "Category name is required").max(60),
  sort: z.number().int().min(0).max(999),
  active: z.boolean(),
});

export const addonSchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(1, "Add-on name is required").max(60),
  price: moneySchema,
  active: z.boolean(),
});

export const variantSchema = z.object({
  id: uuidSchema,
  itemId: uuidSchema,
  name: z.string().trim().min(1, "Variation name is required").max(40),
  price: moneySchema,
  sort: z.number().int().min(0),
});

export const itemSchema = z.object({
  id: uuidSchema,
  categoryId: uuidSchema,
  name: z.string().trim().min(1, "Item name is required").max(80),
  price: moneySchema,
  active: z.boolean(),
  soldOut: z.boolean(),
  variants: z.array(variantSchema).max(10, "At most 10 variations allowed"),
  addonIds: z.array(uuidSchema),
});

export const comboSchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(1, "Combo name is required").max(80),
  price: moneySchema,
  active: z.boolean(),
  soldOut: z.boolean(),
  items: z
    .array(
      z.object({
        itemId: uuidSchema,
        qty: z.number().int().min(1).max(50),
      }),
    )
    .min(1, "Pick at least one item for the combo"),
});

export const paymentModeSchema = z.enum(["cash", "upi", "card"]);

export const orderLineInputSchema = z.object({
  kind: z.enum(["item", "combo"]),
  sourceId: uuidSchema,
  name: z.string().trim().min(1).max(100),
  variantName: z.string().trim().max(50).nullable(),
  unitPrice: moneySchema,
  addons: z.array(
    z.object({
      name: z.string().trim().min(1).max(60),
      price: moneySchema,
    }),
  ),
  qty: z.number().int().min(1).max(999),
  discount: moneySchema,
  complimentary: z.boolean(),
  lineTotal: moneySchema,
});

export const createOrderSchema = z
  .object({
    id: uuidSchema,
    type: z.enum(["takeaway", "pickup"]),
    customerName: z.string().trim().max(80),
    customerPhone: optionalPhoneSchema,
    subtotal: moneySchema,
    discountTotal: moneySchema,
    total: moneySchema,
    placedAt: z.string().datetime(),
    items: z.array(orderLineInputSchema).min(1, "Add at least one item"),
    payments: z
      .array(
        z.object({
          mode: paymentModeSchema,
          amount: moneySchema,
        }),
      )
      .min(1, "Select a payment method"),
  })
  .refine(
    (data) => data.payments.reduce((sum, p) => sum + p.amount, 0) === data.total,
    { message: "Payment amounts must add up to the order total" },
  );

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date");

export const expenseSchema = z.object({
  id: uuidSchema,
  spentOn: isoDateSchema,
  description: z.string().trim().min(1, "Enter what the expense was for").max(120),
  amount: z
    .number({ error: "Enter a valid amount in ₹" })
    .int("Amount must be whole rupees")
    .min(1, "Expense must be at least ₹1")
    .max(100_000, "Amount cannot exceed ₹1,00,000"),
});

/** Strict whole-rupee integer parser for form inputs; returns NaN for invalid/empty text. */
export function parseRupeesInput(raw: string): number {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return Number.NaN;
  return Number.parseInt(trimmed, 10);
}

export type CategoryInput = z.infer<typeof categorySchema>;
export type AddonInput = z.infer<typeof addonSchema>;
export type VariantInput = z.infer<typeof variantSchema>;
export type ItemInput = z.infer<typeof itemSchema>;
export type ComboInput = z.infer<typeof comboSchema>;
export type PaymentMode = z.infer<typeof paymentModeSchema>;
export type OrderLineInput = z.infer<typeof orderLineInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
