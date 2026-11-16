"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { expenses } from "@/db/schema";
import { requireOwner } from "@/lib/auth";
import { expenseSchema, uuidSchema, type ExpenseInput } from "@/lib/validators";

export type ExpenseActionResult = { error?: string };

export async function saveExpense(input: ExpenseInput): Promise<ExpenseActionResult> {
  const owner = await requireOwner();
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid expense details" };
  }

  const { id, spentOn, description, amount } = parsed.data;
  try {
    await getDb()
      .insert(expenses)
      .values({ id, spentOn, description, amount, createdBy: owner.ownerId })
      .onConflictDoUpdate({
        target: expenses.id,
        set: { spentOn, description, amount },
      });
    return {};
  } catch {
    return { error: "Could not save expense" };
  }
}

export async function deleteExpense(id: string): Promise<ExpenseActionResult> {
  await requireOwner();
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid expense" };

  try {
    await getDb().delete(expenses).where(eq(expenses.id, id));
    return {};
  } catch {
    return { error: "Could not delete expense" };
  }
}
