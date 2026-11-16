import { asc, eq, sql } from "drizzle-orm";
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
  orderItems,
} from "@/db/schema";
import { requireOwner } from "@/lib/auth";
import type { PosAddon, PosItem, PosVariant } from "./customize-modal";
import { PosTerminal, type PopularShortcut, type PosCombo } from "./pos-terminal";

export const metadata: Metadata = { title: "New order" };

function itemToShortcut(item: PosItem, orderCount: number): PopularShortcut {
  const defaultVariant = item.variants[0] ?? null;
  return {
    id: `item:${item.id}`,
    kind: "item",
    sourceId: item.id,
    name: item.name,
    variantId: defaultVariant?.id ?? null,
    variantName: defaultVariant?.name ?? null,
    price: defaultVariant ? defaultVariant.price : item.price,
    orderCount,
  };
}

function comboToShortcut(combo: PosCombo, orderCount: number): PopularShortcut {
  return {
    id: `combo:${combo.id}`,
    kind: "combo",
    sourceId: combo.id,
    name: combo.name,
    variantId: null,
    variantName: null,
    price: combo.price,
    subtitle: combo.membersSummary,
    orderCount,
  };
}

export default async function PosPage() {
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
    topOrderedRows,
  ] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.active, true))
      .orderBy(asc(categories.sort), asc(categories.name)),
    db.select().from(items).orderBy(asc(items.sort), asc(items.name)),
    db.select().from(itemVariants).orderBy(asc(itemVariants.sort)),
    db
      .select({ id: addons.id, name: addons.name, price: addons.price })
      .from(addons)
      .where(eq(addons.active, true))
      .orderBy(asc(addons.name)),
    db.select().from(itemAddons),
    db
      .select()
      .from(combos)
      .where(eq(combos.active, true))
      .orderBy(asc(combos.sort), asc(combos.name)),
    db.select().from(comboItems),
    db
      .select({
        kind: orderItems.kind,
        name: orderItems.name,
        totalQty: sql<number>`coalesce(sum(${orderItems.qty}), 0)::int`,
      })
      .from(orderItems)
      .groupBy(orderItems.kind, orderItems.name)
      .orderBy(sql`sum(${orderItems.qty}) desc`)
      .limit(10),
  ]);

  const activeCategoryIds = new Set(categoryRows.map((c) => c.id));
  const addonById = new Map<string, PosAddon>(addonRows.map((a) => [a.id, a]));
  const itemNameById = new Map(itemRows.map((i) => [i.id, i.name]));

  const variantsByItem = new Map<string, PosVariant[]>();
  for (const v of variantRows) {
    const list = variantsByItem.get(v.itemId) ?? [];
    list.push({ id: v.id, itemId: v.itemId, name: v.name, price: v.price });
    variantsByItem.set(v.itemId, list);
  }

  const addonsByItem = new Map<string, PosAddon[]>();
  for (const link of itemAddonRows) {
    const addon = addonById.get(link.addonId);
    if (!addon) continue;
    const list = addonsByItem.get(link.itemId) ?? [];
    list.push(addon);
    addonsByItem.set(link.itemId, list);
  }

  const posItems: PosItem[] = itemRows
    .filter((item) => item.active && activeCategoryIds.has(item.categoryId))
    .map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      price: item.price,
      soldOut: item.soldOut,
      variants: variantsByItem.get(item.id) ?? [],
      addons: addonsByItem.get(item.id) ?? [],
    }));

  const membersByCombo = new Map<string, string[]>();
  for (const ci of comboItemRows) {
    const itemName = itemNameById.get(ci.itemId);
    if (!itemName) continue;
    const list = membersByCombo.get(ci.comboId) ?? [];
    list.push(`${ci.qty}× ${itemName}`);
    membersByCombo.set(ci.comboId, list);
  }

  const posCombos: PosCombo[] = comboRows.map((combo) => ({
    id: combo.id,
    name: combo.name,
    price: combo.price,
    soldOut: combo.soldOut,
    membersSummary: (membersByCombo.get(combo.id) ?? []).join(", "),
  }));

  const availableItemsByName = new Map(
    posItems.filter((i) => !i.soldOut).map((i) => [i.name, i]),
  );
  const availableCombosByName = new Map(
    posCombos.filter((c) => !c.soldOut).map((c) => [c.name, c]),
  );

  const popular: PopularShortcut[] = [];
  const seen = new Set<string>();

  for (const top of topOrderedRows) {
    if (popular.length >= 6) break;
    if (top.kind === "combo") {
      const combo = availableCombosByName.get(top.name);
      if (combo && !seen.has(`combo:${combo.id}`)) {
        seen.add(`combo:${combo.id}`);
        popular.push(comboToShortcut(combo, top.totalQty));
      }
    } else {
      const item = availableItemsByName.get(top.name);
      if (item && !seen.has(`item:${item.id}`)) {
        seen.add(`item:${item.id}`);
        popular.push(itemToShortcut(item, top.totalQty));
      }
    }
  }

  const fallbackPool: PopularShortcut[] = [
    ...posCombos.filter((c) => !c.soldOut).slice(0, 2).map((c) => comboToShortcut(c, 0)),
    ...posItems.filter((i) => !i.soldOut).map((i) => itemToShortcut(i, 0)),
  ];

  for (const shortcut of fallbackPool) {
    if (popular.length >= 6) break;
    if (!seen.has(shortcut.id)) {
      seen.add(shortcut.id);
      popular.push(shortcut);
    }
  }

  return (
    <PosTerminal
      categories={categoryRows}
      items={posItems}
      combos={posCombos}
      initialPopular={popular}
    />
  );
}
