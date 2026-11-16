"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { customers } from "@/db/schema";
import { requireOwner } from "@/lib/auth";
import { optionalPhoneSchema } from "@/lib/validators";

const updateCustomerNameSchema = z.object({
  phone: optionalPhoneSchema.refine(
    (s) => s.length === 10,
    "Enter a valid 10-digit WhatsApp number",
  ),
  name: z
    .string()
    .trim()
    .min(1, "Enter a customer name")
    .max(80, "Customer name cannot exceed 80 characters"),
});

export async function updateCustomerName(input: {
  phone: string;
  name: string;
}): Promise<{ error?: string }> {
  await requireOwner();
  const parsed = updateCustomerNameSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid customer details" };
  }

  try {
    const updated = await getDb()
      .update(customers)
      .set({ name: parsed.data.name })
      .where(eq(customers.phone, parsed.data.phone))
      .returning({ phone: customers.phone });
    if (updated.length === 0) {
      return { error: "Customer not found" };
    }
    return {};
  } catch {
    return { error: "Could not update customer name" };
  }
}
