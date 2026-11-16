import { asc } from "drizzle-orm";
import type { Metadata } from "next";
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
import { requireOwner } from "@/lib/auth";
import { MenuManager } from "./menu-manager";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage() {
  await requireOwner();
  const db = getDb();

  const [
    categoryRows,
    itemRows,
    variantRows,
    addonRows,
    itemAddonRows,
    comboRows,
    comboItemRows,
  ] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sort), asc(categories.name)),
    db.select().from(items).orderBy(asc(items.sort), asc(items.name)),
    db.select().from(itemVariants).orderBy(asc(itemVariants.sort)),
    db.select().from(addons).orderBy(asc(addons.name)),
    db.select().from(itemAddons),
    db.select().from(combos).orderBy(asc(combos.sort), asc(combos.name)),
    db.select().from(comboItems),
  ]);

  return (
    <MenuManager
      key={categoryRows.length === 0 ? "empty" : "seeded"}
      categories={categoryRows}
      items={itemRows}
      variants={variantRows}
      addons={addonRows}
      itemAddons={itemAddonRows}
      combos={comboRows}
      comboItems={comboItemRows}
    />
  );
}
