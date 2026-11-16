import { asc, desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { getDb } from "@/db";
import {
  addons,
  categories,
  comboItems,
  combos,
  customers,
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
    itemType: "fries",
    kind: "item",
    sourceId: item.id,
    name: item.name,
    variantId: defaultVariant?.id ?? null,
    variantName: defaultVariant?.name ?? null,
    price: defaultVariant ? defaultVariant.price : item.price,
    orderCount,
  };
}

function addonToShortcut(addon: PosAddon, orderCount: number): PopularShortcut {
  return {
    id: `dip:${addon.id}`,
    itemType: "dip",
    kind: "item",
    sourceId: addon.id,
    name: addon.name,
    variantId: null,
    variantName: "Dip",
    price: addon.price,
    orderCount,
  };
}

function comboToShortcut(combo: PosCombo, orderCount: number): PopularShortcut {
  return {
    id: `combo:${combo.id}`,
    itemType: "combo",
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
    topAddonResult,
    customerRows,
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
        variantName: orderItems.variantName,
        totalQty: sql<number>`coalesce(sum(${orderItems.qty}), 0)::int`,
      })
      .from(orderItems)
      .groupBy(orderItems.kind, orderItems.name, orderItems.variantName)
      .orderBy(sql`sum(${orderItems.qty}) desc`)
      .limit(20),
    db.execute<{ name: string; totalQty: number }>(
      sql`select elem->>'name' as name, coalesce(sum(${orderItems.qty}), 0)::int as "totalQty"
          from ${orderItems}, jsonb_array_elements(${orderItems.addons}) as elem
          group by elem->>'name'
          order by sum(${orderItems.qty}) desc
          limit 10`,
    ),
    db
      .select({
        phone: customers.phone,
        name: customers.name,
        orderCount: customers.orderCount,
        totalSpent: customers.totalSpent,
      })
      .from(customers)
      .orderBy(desc(customers.lastOrderAt))
      .limit(5000),
  ]);

  const activeCategoryIds = new Set(categoryRows.map((c) => c.id));
  const addonById = new Map<string, PosAddon>(addonRows.map((a) => [a.id, a]));
  const addonByName = new Map<string, PosAddon>(addonRows.map((a) => [a.name, a]));
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

  // Aggregate popular items and dips strictly from order history (no un-ordered fallback items).
  const itemCounts = new Map<string, number>();
  const comboCounts = new Map<string, number>();
  const dipCounts = new Map<string, number>();

  for (const row of topAddonResult.rows) {
    if (row.name && row.totalQty > 0) {
      dipCounts.set(row.name, (dipCounts.get(row.name) ?? 0) + Number(row.totalQty));
    }
  }

  for (const row of topOrderedRows) {
    if (row.totalQty <= 0) continue;
    if (row.kind === "combo") {
      if (availableCombosByName.has(row.name)) {
        comboCounts.set(row.name, (comboCounts.get(row.name) ?? 0) + row.totalQty);
      }
      continue;
    }

    const isDipOrder =
      row.variantName === "Dip" ||
      (addonByName.has(row.name) && !availableItemsByName.has(row.name));

    if (isDipOrder) {
      if (addonByName.has(row.name)) {
        dipCounts.set(row.name, (dipCounts.get(row.name) ?? 0) + row.totalQty);
      }
    } else if (availableItemsByName.has(row.name)) {
      itemCounts.set(row.name, (itemCounts.get(row.name) ?? 0) + row.totalQty);
    }
  }

  const popularFries: PopularShortcut[] = [
    ...Array.from(itemCounts.entries())
      .map(([name, qty]) => {
        const item = availableItemsByName.get(name);
        return item ? itemToShortcut(item, qty) : null;
      })
      .filter((s): s is PopularShortcut => s !== null),
    ...Array.from(comboCounts.entries())
      .map(([name, qty]) => {
        const combo = availableCombosByName.get(name);
        return combo ? comboToShortcut(combo, qty) : null;
      })
      .filter((s): s is PopularShortcut => s !== null),
  ]
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 4);

  const popularDips: PopularShortcut[] = Array.from(dipCounts.entries())
    .map(([name, qty]) => {
      const addon = addonByName.get(name);
      return addon && qty > 0 ? addonToShortcut(addon, qty) : null;
    })
    .filter((s): s is PopularShortcut => s !== null)
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 3);

  const popular: PopularShortcut[] = [...popularFries, ...popularDips].sort(
    (a, b) => b.orderCount - a.orderCount,
  );

  return (
    <PosTerminal
      categories={categoryRows}
      items={posItems}
      combos={posCombos}
      addons={addonRows}
      initialPopular={popular}
      initialCustomers={customerRows}
    />
  );
}
