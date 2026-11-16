import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

type Db = NeonDatabase<typeof schema>;

type SampleItem = {
  name: string;
  price: number;
  variants?: { name: string; price: number }[];
  addons?: string[];
};

type SampleCategory = {
  name: string;
  items: SampleItem[];
};

const ALL_DIPS = [
  "Cheese Sauce",
  "BBQ Dip",
  "Creamy Jalapeno Dip",
  "Peri Peri Mayo",
  "Chipotle Dip",
];

const SAMPLE_ADDONS = [
  { name: "Cheese Sauce", price: 25 },
  { name: "BBQ Dip", price: 20 },
  { name: "Creamy Jalapeno Dip", price: 20 },
  { name: "Peri Peri Mayo", price: 20 },
  { name: "Chipotle Dip", price: 20 },
] as const;

const SAMPLE_CATEGORIES: SampleCategory[] = [
  {
    name: "Fries",
    items: [
      { name: "Classic Salted Fries", price: 79, addons: ALL_DIPS },
      { name: "Peri Peri Fries", price: 99, addons: ALL_DIPS },
      { name: "BBQ Fries", price: 99, addons: ALL_DIPS },
      { name: "Tandoori Fries", price: 99, addons: ALL_DIPS },
      { name: "Korean Fries", price: 119, addons: ALL_DIPS },
      { name: "Chili Cheese Fries", price: 129, addons: ALL_DIPS },
      { name: "Mexican Salsa Fries", price: 129, addons: ALL_DIPS },
      { name: "Loaded Cheese Fries", price: 139, addons: ALL_DIPS },
      { name: "Desi Loaded Fries", price: 139, addons: ALL_DIPS },
      { name: "Spicy Dirty Fries", price: 149, addons: ALL_DIPS },
    ],
  },
];

const SAMPLE_COMBOS: {
  name: string;
  price: number;
  items: { name: string; qty: number }[];
}[] = [];

/**
 * Inserts the FRY starter menu if no categories exist yet, or replaces the
 * existing catalog cleanly when `replace` is true.
 */
export async function seedSampleMenuInDb(
  db: Db,
  { replace = false }: { replace?: boolean } = {},
): Promise<{ seeded: boolean; reason?: string }> {
  if (!replace) {
    const existing = await db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .limit(1);
    if (existing.length > 0) return { seeded: false, reason: "categories already exist" };
  }

  await db.transaction(async (tx) => {
    if (replace) {
      await tx.delete(schema.comboItems);
      await tx.delete(schema.combos);
      await tx.delete(schema.itemAddons);
      await tx.delete(schema.itemVariants);
      await tx.delete(schema.items);
      await tx.delete(schema.addons);
      await tx.delete(schema.categories);
    }

    const addonIds = new Map<string, string>();
    const insertedAddons = await tx
      .insert(schema.addons)
      .values(SAMPLE_ADDONS.map((a) => ({ name: a.name, price: a.price, active: true })))
      .returning({ id: schema.addons.id, name: schema.addons.name });

    for (const row of insertedAddons) addonIds.set(row.name, row.id);

    const itemIds = new Map<string, string>();

    for (const [catIndex, cat] of SAMPLE_CATEGORIES.entries()) {
      const [insertedCat] = await tx
        .insert(schema.categories)
        .values({ name: cat.name, sort: catIndex, active: true })
        .returning({ id: schema.categories.id });

      for (const [itemIndex, item] of cat.items.entries()) {
        const [insertedItem] = await tx
          .insert(schema.items)
          .values({
            categoryId: insertedCat.id,
            name: item.name,
            price: item.price,
            sort: itemIndex,
            active: true,
            soldOut: false,
          })
          .returning({ id: schema.items.id });

        itemIds.set(item.name, insertedItem.id);

        if (item.variants && item.variants.length > 0) {
          await tx.insert(schema.itemVariants).values(
            item.variants.map((v, vIndex) => ({
              itemId: insertedItem.id,
              name: v.name,
              price: v.price,
              sort: vIndex,
            })),
          );
        }

        if (item.addons && item.addons.length > 0) {
          const pairs = item.addons
            .map((addonName) => addonIds.get(addonName))
            .filter((addonId): addonId is string => Boolean(addonId))
            .map((addonId) => ({ itemId: insertedItem.id, addonId }));

          if (pairs.length > 0) {
            await tx.insert(schema.itemAddons).values(pairs);
          }
        }
      }
    }

    for (const [comboIndex, combo] of SAMPLE_COMBOS.entries()) {
      const [insertedCombo] = await tx
        .insert(schema.combos)
        .values({
          name: combo.name,
          price: combo.price,
          sort: comboIndex,
          active: true,
          soldOut: false,
        })
        .returning({ id: schema.combos.id });

      const links = combo.items
        .map((ci) => {
          const itemId = itemIds.get(ci.name);
          return itemId ? { comboId: insertedCombo.id, itemId, qty: ci.qty } : null;
        })
        .filter((v): v is { comboId: string; itemId: string; qty: number } => v !== null);

      if (links.length > 0) {
        await tx.insert(schema.comboItems).values(links);
      }
    }
  });

  return { seeded: true };
}
