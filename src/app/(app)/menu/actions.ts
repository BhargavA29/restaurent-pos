"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import {
  addons,
  categories,
  comboItems,
  combos,
  itemAddons,
  items,
  itemVariants,
} from "@/db/schema";
import { seedSampleMenuInDb } from "@/db/seed-data";
import { requireOwner } from "@/lib/auth";

export type ActionResult = { error?: string };

const uuidSchema = z.string().uuid();
const moneySchema = z.number().int().min(0, "Price must be ₹0 or more");

const categorySchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().trim().min(1, "Category name is required").max(80),
  sort: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

const addonSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().trim().min(1, "Add-on name is required").max(80),
  price: moneySchema,
  active: z.boolean().default(true),
});

const itemSchema = z.object({
  id: uuidSchema.optional(),
  categoryId: uuidSchema,
  name: z.string().trim().min(1, "Item name is required").max(100),
  price: moneySchema,
  active: z.boolean(),
  soldOut: z.boolean(),
  variants: z.array(
    z.object({
      name: z.string().trim().min(1, "Variation name is required").max(50),
      price: moneySchema,
    }),
  ),
  addonIds: z.array(uuidSchema),
});

const comboSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().trim().min(1, "Combo name is required").max(100),
  price: moneySchema,
  active: z.boolean(),
  soldOut: z.boolean(),
  items: z
    .array(
      z.object({
        itemId: uuidSchema,
        qty: z.number().int().min(1),
      }),
    )
    .min(1, "Pick at least one item for the combo"),
});

function revalidateMenu() {
  revalidatePath("/menu");
  revalidatePath("/pos");
}

export async function saveCategory(
  input: z.input<typeof categorySchema>,
): Promise<ActionResult> {
  await requireOwner();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid category" };

  const db = getDb();
  const { id, name, sort, active } = parsed.data;

  if (id) {
    await db.update(categories).set({ name, sort, active }).where(eq(categories.id, id));
  } else {
    await db.insert(categories).values({ name, sort, active });
  }

  revalidateMenu();
  return {};
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireOwner();
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid category" };

  const db = getDb();
  const existing = await db
    .select({ id: items.id })
    .from(items)
    .where(eq(items.categoryId, id))
    .limit(1);

  if (existing.length > 0) {
    return { error: "Move or delete items in this category first" };
  }

  await db.delete(categories).where(eq(categories.id, id));
  revalidateMenu();
  return {};
}

export async function saveAddon(
  input: z.input<typeof addonSchema>,
): Promise<ActionResult> {
  await requireOwner();
  const parsed = addonSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid add-on" };

  const db = getDb();
  const { id, name, price, active } = parsed.data;

  if (id) {
    await db.update(addons).set({ name, price, active }).where(eq(addons.id, id));
  } else {
    await db.insert(addons).values({ name, price, active });
  }

  revalidateMenu();
  return {};
}

export async function toggleAddonActive(id: string, active: boolean): Promise<ActionResult> {
  await requireOwner();
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid add-on" };

  await getDb().update(addons).set({ active }).where(eq(addons.id, id));
  revalidateMenu();
  return {};
}

export async function deleteAddon(id: string): Promise<ActionResult> {
  await requireOwner();
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid add-on" };

  await getDb().delete(addons).where(eq(addons.id, id));
  revalidateMenu();
  return {};
}

export async function saveItem(input: z.input<typeof itemSchema>): Promise<ActionResult> {
  await requireOwner();
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid item" };

  const { id, categoryId, name, active, soldOut, variants, addonIds } = parsed.data;
  const price =
    variants.length > 0 && parsed.data.price === 0
      ? Math.min(...variants.map((v) => v.price))
      : parsed.data.price;

  const uniqueAddonIds = Array.from(new Set(addonIds));
  const db = getDb();

  await db.transaction(async (tx) => {
    let itemId = id;
    if (itemId) {
      await tx
        .update(items)
        .set({ categoryId, name, price, active, soldOut })
        .where(eq(items.id, itemId));
    } else {
      const [inserted] = await tx
        .insert(items)
        .values({ categoryId, name, price, active, soldOut })
        .returning({ id: items.id });
      itemId = inserted.id;
    }

    await tx.delete(itemVariants).where(eq(itemVariants.itemId, itemId));
    if (variants.length > 0) {
      await tx.insert(itemVariants).values(
        variants.map((v, index) => ({
          itemId,
          name: v.name,
          price: v.price,
          sort: index,
        })),
      );
    }

    await tx.delete(itemAddons).where(eq(itemAddons.itemId, itemId));
    if (uniqueAddonIds.length > 0) {
      await tx.insert(itemAddons).values(
        uniqueAddonIds.map((addonId) => ({ itemId, addonId })),
      );
    }
  });

  revalidateMenu();
  return {};
}

export async function toggleItemSoldOut(id: string, soldOut: boolean): Promise<ActionResult> {
  await requireOwner();
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid item" };

  await getDb().update(items).set({ soldOut }).where(eq(items.id, id));
  revalidateMenu();
  return {};
}

export async function deleteItem(id: string): Promise<ActionResult> {
  await requireOwner();
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid item" };

  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(comboItems).where(eq(comboItems.itemId, id));
    await tx.delete(items).where(eq(items.id, id));
  });

  revalidateMenu();
  return {};
}

export async function saveCombo(input: z.input<typeof comboSchema>): Promise<ActionResult> {
  await requireOwner();
  const parsed = comboSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid combo" };

  const { id, name, price, active, soldOut } = parsed.data;

  // Merge duplicate itemIds cleanly before inserting against the composite PK.
  const merged = new Map<string, number>();
  for (const row of parsed.data.items) {
    merged.set(row.itemId, (merged.get(row.itemId) ?? 0) + row.qty);
  }

  const db = getDb();
  await db.transaction(async (tx) => {
    let comboId = id;
    if (comboId) {
      await tx
        .update(combos)
        .set({ name, price, active, soldOut })
        .where(eq(combos.id, comboId));
    } else {
      const [inserted] = await tx
        .insert(combos)
        .values({ name, price, active, soldOut })
        .returning({ id: combos.id });
      comboId = inserted.id;
    }

    await tx.delete(comboItems).where(eq(comboItems.comboId, comboId));
    await tx.insert(comboItems).values(
      Array.from(merged.entries()).map(([itemId, qty]) => ({ comboId, itemId, qty })),
    );
  });

  revalidateMenu();
  return {};
}

export async function toggleComboSoldOut(
  id: string,
  soldOut: boolean,
): Promise<ActionResult> {
  await requireOwner();
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid combo" };

  await getDb().update(combos).set({ soldOut }).where(eq(combos.id, id));
  revalidateMenu();
  return {};
}

export async function deleteCombo(id: string): Promise<ActionResult> {
  await requireOwner();
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid combo" };

  await getDb().delete(combos).where(eq(combos.id, id));
  revalidateMenu();
  return {};
}

export async function seedSampleMenu(): Promise<ActionResult> {
  await requireOwner();
  await seedSampleMenuInDb(getDb());
  revalidateMenu();
  return {};
}
