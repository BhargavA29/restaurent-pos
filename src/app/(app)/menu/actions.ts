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
import {
  addonSchema,
  categorySchema,
  comboSchema,
  itemSchema,
  uuidSchema,
  type AddonInput,
  type CategoryInput,
  type ComboInput,
  type ItemInput,
} from "@/lib/validators";

export type ActionResult = { error?: string };

const boolSchema = z.boolean();

function revalidatePos() {
  revalidatePath("/pos");
}

export async function saveCategory(input: CategoryInput): Promise<ActionResult> {
  await requireOwner();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid category" };

  const { id, name, sort, active } = parsed.data;
  try {
    await getDb()
      .insert(categories)
      .values({ id, name, sort, active })
      .onConflictDoUpdate({
        target: categories.id,
        set: { name, sort, active },
      });
    revalidatePos();
    return {};
  } catch {
    return { error: "Could not save category" };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireOwner();
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid category" };

  const db = getDb();
  try {
    const existing = await db
      .select({ id: items.id })
      .from(items)
      .where(eq(items.categoryId, id))
      .limit(1);

    if (existing.length > 0) {
      return { error: "Move or delete items in this category first" };
    }

    await db.delete(categories).where(eq(categories.id, id));
    revalidatePos();
    return {};
  } catch {
    return { error: "Could not delete category" };
  }
}

export async function saveAddon(input: AddonInput): Promise<ActionResult> {
  await requireOwner();
  const parsed = addonSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid add-on" };

  const { id, name, price, active } = parsed.data;
  try {
    await getDb()
      .insert(addons)
      .values({ id, name, price, active })
      .onConflictDoUpdate({
        target: addons.id,
        set: { name, price, active },
      });
    revalidatePos();
    return {};
  } catch {
    return { error: "Could not save add-on" };
  }
}

export async function toggleAddonActive(id: string, active: boolean): Promise<ActionResult> {
  await requireOwner();
  if (!uuidSchema.safeParse(id).success || !boolSchema.safeParse(active).success) {
    return { error: "Invalid add-on update" };
  }

  try {
    await getDb().update(addons).set({ active }).where(eq(addons.id, id));
    revalidatePos();
    return {};
  } catch {
    return { error: "Could not update add-on status" };
  }
}

export async function deleteAddon(id: string): Promise<ActionResult> {
  await requireOwner();
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid add-on" };

  try {
    await getDb().delete(addons).where(eq(addons.id, id));
    revalidatePos();
    return {};
  } catch {
    return { error: "Could not delete add-on" };
  }
}

export async function saveItem(input: ItemInput): Promise<ActionResult> {
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

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(items)
        .values({ id, categoryId, name, price, active, soldOut })
        .onConflictDoUpdate({
          target: items.id,
          set: { categoryId, name, price, active, soldOut },
        });

      await tx.delete(itemVariants).where(eq(itemVariants.itemId, id));
      if (variants.length > 0) {
        await tx.insert(itemVariants).values(
          variants.map((v, index) => ({
            id: v.id,
            itemId: id,
            name: v.name,
            price: v.price,
            sort: index,
          })),
        );
      }

      await tx.delete(itemAddons).where(eq(itemAddons.itemId, id));
      if (uniqueAddonIds.length > 0) {
        await tx.insert(itemAddons).values(
          uniqueAddonIds.map((addonId) => ({ itemId: id, addonId })),
        );
      }
    });

    revalidatePos();
    return {};
  } catch {
    return { error: "Could not save item" };
  }
}

export async function toggleItemSoldOut(id: string, soldOut: boolean): Promise<ActionResult> {
  await requireOwner();
  if (!uuidSchema.safeParse(id).success || !boolSchema.safeParse(soldOut).success) {
    return { error: "Invalid item update" };
  }

  try {
    await getDb().update(items).set({ soldOut }).where(eq(items.id, id));
    revalidatePos();
    return {};
  } catch {
    return { error: "Could not update item stock" };
  }
}

export async function deleteItem(id: string): Promise<ActionResult> {
  await requireOwner();
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid item" };

  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx.delete(comboItems).where(eq(comboItems.itemId, id));
      await tx.delete(items).where(eq(items.id, id));
    });

    revalidatePos();
    return {};
  } catch {
    return { error: "Could not delete item" };
  }
}

export async function saveCombo(input: ComboInput): Promise<ActionResult> {
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
  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(combos)
        .values({ id, name, price, active, soldOut })
        .onConflictDoUpdate({
          target: combos.id,
          set: { name, price, active, soldOut },
        });

      await tx.delete(comboItems).where(eq(comboItems.comboId, id));
      await tx.insert(comboItems).values(
        Array.from(merged.entries()).map(([itemId, qty]) => ({ comboId: id, itemId, qty })),
      );
    });

    revalidatePos();
    return {};
  } catch {
    return { error: "Could not save combo" };
  }
}

export async function toggleComboSoldOut(
  id: string,
  soldOut: boolean,
): Promise<ActionResult> {
  await requireOwner();
  if (!uuidSchema.safeParse(id).success || !boolSchema.safeParse(soldOut).success) {
    return { error: "Invalid combo update" };
  }

  try {
    await getDb().update(combos).set({ soldOut }).where(eq(combos.id, id));
    revalidatePos();
    return {};
  } catch {
    return { error: "Could not update combo stock" };
  }
}

export async function deleteCombo(id: string): Promise<ActionResult> {
  await requireOwner();
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid combo" };

  try {
    await getDb().delete(combos).where(eq(combos.id, id));
    revalidatePos();
    return {};
  } catch {
    return { error: "Could not delete combo" };
  }
}

export async function seedSampleMenu(): Promise<ActionResult> {
  await requireOwner();
  await seedSampleMenuInDb(getDb());
  revalidatePath("/menu");
  revalidatePos();
  return {};
}
