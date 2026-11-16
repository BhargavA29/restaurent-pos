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

const SAMPLE_ADDONS = [
  { name: "Extra Espresso Shot", price: 40 },
  { name: "Almond Milk", price: 50 },
  { name: "Oat Milk", price: 50 },
  { name: "Extra Cheese", price: 30 },
] as const;

const SAMPLE_CATEGORIES: SampleCategory[] = [
  {
    name: "Hot Coffee",
    items: [
      {
        name: "Espresso",
        price: 110,
        variants: [
          { name: "Single", price: 110 },
          { name: "Double", price: 150 },
        ],
        addons: ["Extra Espresso Shot"],
      },
      {
        name: "Americano",
        price: 130,
        variants: [
          { name: "Regular", price: 130 },
          { name: "Large", price: 160 },
        ],
        addons: ["Extra Espresso Shot"],
      },
      {
        name: "Cappuccino",
        price: 150,
        variants: [
          { name: "Regular", price: 150 },
          { name: "Large", price: 190 },
        ],
        addons: ["Extra Espresso Shot", "Almond Milk", "Oat Milk"],
      },
      {
        name: "Cafe Latte",
        price: 160,
        variants: [
          { name: "Regular", price: 160 },
          { name: "Large", price: 200 },
        ],
        addons: ["Extra Espresso Shot", "Almond Milk", "Oat Milk"],
      },
      {
        name: "Mocha",
        price: 180,
        variants: [
          { name: "Regular", price: 180 },
          { name: "Large", price: 220 },
        ],
        addons: ["Extra Espresso Shot", "Almond Milk", "Oat Milk"],
      },
    ],
  },
  {
    name: "Iced & Cold Brew",
    items: [
      {
        name: "Classic Cold Brew",
        price: 160,
        variants: [
          { name: "Regular", price: 160 },
          { name: "Large", price: 200 },
        ],
        addons: ["Extra Espresso Shot", "Oat Milk"],
      },
      {
        name: "Iced Americano",
        price: 140,
        variants: [
          { name: "Regular", price: 140 },
          { name: "Large", price: 170 },
        ],
        addons: ["Extra Espresso Shot"],
      },
      {
        name: "Iced Latte",
        price: 170,
        variants: [
          { name: "Regular", price: 170 },
          { name: "Large", price: 210 },
        ],
        addons: ["Extra Espresso Shot", "Almond Milk", "Oat Milk"],
      },
      {
        name: "Vietnamese Iced Coffee",
        price: 190,
        addons: ["Extra Espresso Shot"],
      },
    ],
  },
  {
    name: "Tea & Matcha",
    items: [
      {
        name: "Masala Chai",
        price: 90,
        variants: [
          { name: "Regular", price: 90 },
          { name: "Large", price: 120 },
        ],
      },
      {
        name: "Iced Matcha Latte",
        price: 210,
        variants: [
          { name: "Regular", price: 210 },
          { name: "Large", price: 250 },
        ],
        addons: ["Almond Milk", "Oat Milk"],
      },
      { name: "Lemon Iced Tea", price: 120 },
    ],
  },
  {
    name: "Sandwiches & Bites",
    items: [
      {
        name: "Grilled Cheese Toastie",
        price: 150,
        addons: ["Extra Cheese"],
      },
      {
        name: "Pesto Veg Sandwich",
        price: 180,
        addons: ["Extra Cheese"],
      },
      { name: "Butter Croissant", price: 130 },
      { name: "Chocolate Brownie", price: 140 },
    ],
  },
];

const SAMPLE_COMBOS: {
  name: string;
  price: number;
  items: { name: string; qty: number }[];
}[] = [
  {
    name: "Coffee + Sandwich Combo",
    price: 249,
    items: [
      { name: "Cappuccino", qty: 1 },
      { name: "Grilled Cheese Toastie", qty: 1 },
    ],
  },
  {
    name: "Two Cold Brews Combo",
    price: 299,
    items: [{ name: "Classic Cold Brew", qty: 2 }],
  },
];

/** Inserts the starter menu only if the database has no categories yet. */
export async function seedSampleMenuInDb(db: Db): Promise<{ seeded: boolean }> {
  const existing = await db.select({ id: schema.categories.id }).from(schema.categories).limit(1);
  if (existing.length > 0) return { seeded: false };

  await db.transaction(async (tx) => {
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
