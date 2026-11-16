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
  { name: "Peri-Peri Dust", price: 20 },
  { name: "Liquid Cheese Dip", price: 40 },
  { name: "Chipotle Mayo", price: 30 },
  { name: "Jalapenos", price: 30 },
  { name: "Extra Cheese Slice", price: 35 },
] as const;

const SAMPLE_CATEGORIES: SampleCategory[] = [
  {
    name: "Signature Fries",
    items: [
      {
        name: "Classic Salted Fries",
        price: 99,
        variants: [
          { name: "Regular", price: 99 },
          { name: "Large", price: 139 },
        ],
        addons: ["Peri-Peri Dust", "Liquid Cheese Dip", "Chipotle Mayo"],
      },
      {
        name: "Peri-Peri Crinkle Fries",
        price: 119,
        variants: [
          { name: "Regular", price: 119 },
          { name: "Large", price: 159 },
        ],
        addons: ["Liquid Cheese Dip", "Chipotle Mayo", "Jalapenos"],
      },
      {
        name: "Cheesy Loaded Fries",
        price: 159,
        variants: [
          { name: "Regular", price: 159 },
          { name: "Large", price: 209 },
        ],
        addons: ["Peri-Peri Dust", "Liquid Cheese Dip", "Jalapenos"],
      },
      {
        name: "Chicken Overload Fries",
        price: 199,
        variants: [
          { name: "Regular", price: 199 },
          { name: "Large", price: 249 },
        ],
        addons: ["Peri-Peri Dust", "Liquid Cheese Dip", "Chipotle Mayo", "Jalapenos"],
      },
      {
        name: "Truffle Parm Fries",
        price: 179,
        variants: [
          { name: "Regular", price: 179 },
          { name: "Large", price: 229 },
        ],
        addons: ["Liquid Cheese Dip"],
      },
    ],
  },
  {
    name: "Crispy Tenders & Bites",
    items: [
      {
        name: "Crispy Chicken Tenders",
        price: 169,
        variants: [
          { name: "4 pc", price: 169 },
          { name: "8 pc", price: 299 },
        ],
        addons: ["Peri-Peri Dust", "Liquid Cheese Dip", "Chipotle Mayo"],
      },
      {
        name: "Hot Honey Wings",
        price: 179,
        variants: [
          { name: "4 pc", price: 179 },
          { name: "8 pc", price: 319 },
        ],
        addons: ["Chipotle Mayo", "Liquid Cheese Dip"],
      },
      {
        name: "Popcorn Chicken Cup",
        price: 139,
        variants: [
          { name: "Regular", price: 139 },
          { name: "Large", price: 189 },
        ],
        addons: ["Peri-Peri Dust", "Liquid Cheese Dip", "Chipotle Mayo"],
      },
      {
        name: "Mozzarella Cheese Sticks",
        price: 149,
        variants: [
          { name: "4 pc", price: 149 },
          { name: "8 pc", price: 269 },
        ],
        addons: ["Chipotle Mayo", "Peri-Peri Dust"],
      },
      {
        name: "Jalapeno Cheese Poppers",
        price: 139,
        variants: [
          { name: "6 pc", price: 139 },
          { name: "10 pc", price: 219 },
        ],
        addons: ["Liquid Cheese Dip", "Chipotle Mayo"],
      },
    ],
  },
  {
    name: "Smash & Crispy Burgers",
    items: [
      {
        name: "OG Crispy Chicken Burger",
        price: 179,
        addons: ["Extra Cheese Slice", "Jalapenos", "Chipotle Mayo", "Peri-Peri Dust"],
      },
      {
        name: "Nashville Hot Chicken Burger",
        price: 199,
        addons: ["Extra Cheese Slice", "Jalapenos", "Chipotle Mayo", "Liquid Cheese Dip"],
      },
      {
        name: "Crispy Paneer Zinger Burger",
        price: 169,
        addons: ["Extra Cheese Slice", "Jalapenos", "Chipotle Mayo", "Peri-Peri Dust"],
      },
    ],
  },
  {
    name: "Coolers & Shakes",
    items: [
      {
        name: "Chilled Cola",
        price: 60,
        variants: [
          { name: "Regular", price: 60 },
          { name: "Large", price: 90 },
        ],
      },
      { name: "Peach Iced Tea", price: 110 },
      { name: "Thick Chocolate Shake", price: 159 },
    ],
  },
];

const SAMPLE_COMBOS: {
  name: string;
  price: number;
  items: { name: string; qty: number }[];
}[] = [
  {
    name: "Eat Fry Repeat Meal",
    price: 269,
    items: [
      { name: "OG Crispy Chicken Burger", qty: 1 },
      { name: "Peri-Peri Crinkle Fries", qty: 1 },
    ],
  },
  {
    name: "Tender & Fries Box",
    price: 249,
    items: [
      { name: "Crispy Chicken Tenders", qty: 1 },
      { name: "Classic Salted Fries", qty: 1 },
      { name: "Chilled Cola", qty: 1 },
    ],
  },
  {
    name: "Double Fry Bucket",
    price: 289,
    items: [
      { name: "Cheesy Loaded Fries", qty: 1 },
      { name: "Popcorn Chicken Cup", qty: 1 },
    ],
  },
];

/**
 * Inserts the FRY starter menu if no categories exist yet, or replaces an
 * un-ordered menu when `replace` is true.
 */
export async function seedSampleMenuInDb(
  db: Db,
  { replace = false }: { replace?: boolean } = {},
): Promise<{ seeded: boolean; reason?: string }> {
  if (replace) {
    const existingOrders = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .limit(1);
    if (existingOrders.length > 0) {
      return { seeded: false, reason: "orders already exist" };
    }
  } else {
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
