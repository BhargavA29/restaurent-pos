"use client";

import { Plus } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { formatRupees } from "@/lib/format";
import {
  seedSampleMenu,
  toggleAddonActive,
  toggleComboSoldOut,
  toggleItemSoldOut,
} from "./actions";
import {
  AddonModal,
  CategoryModal,
  ComboModal,
  ItemModal,
  type AddonRow,
  type CategoryRow,
  type ComboItemRow,
  type ComboRow,
  type ItemRow,
  type VariantRow,
} from "./menu-modals";

type MenuManagerProps = {
  categories: CategoryRow[];
  items: ItemRow[];
  variants: VariantRow[];
  addons: AddonRow[];
  itemAddons: { itemId: string; addonId: string }[];
  combos: ComboRow[];
  comboItems: ComboItemRow[];
};

type ActiveModal =
  | { kind: "category"; category: CategoryRow | null }
  | { kind: "addon"; addon: AddonRow | null }
  | { kind: "item"; item: ItemRow | null; defaultCategoryId: string }
  | { kind: "combo"; combo: ComboRow | null }
  | null;

function StatusToggle({
  isPositive,
  positiveLabel,
  negativeLabel,
  useNegativeBorder,
  pending,
  onToggle,
}: {
  isPositive: boolean;
  positiveLabel: string;
  negativeLabel: string;
  useNegativeBorder?: boolean;
  pending: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onToggle}
      aria-pressed={!isPositive}
      className={`inline-flex min-h-11 items-center gap-2 rounded-control border px-3 text-xs font-medium transition-colors sm:min-h-9 ${
        isPositive
          ? "border-hairline-strong bg-raised text-ink hover:border-ink-3"
          : useNegativeBorder
            ? "border-negative/35 bg-negative/10 text-negative hover:border-negative"
            : "border-hairline bg-bg text-ink-3 hover:text-ink"
      }`}
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${
          isPositive ? "bg-positive" : useNegativeBorder ? "bg-negative" : "bg-ink-3"
        }`}
      />
      {isPositive ? positiveLabel : negativeLabel}
    </button>
  );
}

export function MenuManager({
  categories,
  items,
  variants,
  addons,
  itemAddons,
  combos,
  comboItems,
}: MenuManagerProps) {
  const [modal, setModal] = useState<ActiveModal>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [seedPending, startSeedTransition] = useTransition();

  const variantsByItem = useMemo(() => {
    const map = new Map<string, VariantRow[]>();
    for (const v of variants) {
      const list = map.get(v.itemId) ?? [];
      list.push(v);
      map.set(v.itemId, list);
    }
    return map;
  }, [variants]);

  const addonMap = useMemo(() => new Map(addons.map((a) => [a.id, a])), [addons]);
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const addonIdsByItem = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const link of itemAddons) {
      const list = map.get(link.itemId) ?? [];
      list.push(link.addonId);
      map.set(link.itemId, list);
    }
    return map;
  }, [itemAddons]);

  const comboItemsByCombo = useMemo(() => {
    const map = new Map<string, ComboItemRow[]>();
    for (const ci of comboItems) {
      const list = map.get(ci.comboId) ?? [];
      list.push(ci);
      map.set(ci.comboId, list);
    }
    return map;
  }, [comboItems]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, ItemRow[]>();
    for (const item of items) {
      const list = map.get(item.categoryId) ?? [];
      list.push(item);
      map.set(item.categoryId, list);
    }
    return map;
  }, [items]);

  async function runToggle(id: string, fn: () => Promise<unknown>) {
    setPendingId(id);
    try {
      await fn();
    } finally {
      setPendingId(null);
    }
  }

  const firstCategoryId = categories[0]?.id ?? "";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-normal leading-tight">Menu</h1>
          <p className="mt-1 font-mono text-sm text-ink-2">
            {items.length} {items.length === 1 ? "item" : "items"},{" "}
            {combos.length} {combos.length === 1 ? "combo" : "combos"},{" "}
            {addons.length} {addons.length === 1 ? "add-on" : "add-ons"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!firstCategoryId}
            onClick={() =>
              setModal({ kind: "item", item: null, defaultCategoryId: firstCategoryId })
            }
            className="btn btn-primary px-4 text-sm"
          >
            <Plus size={16} strokeWidth={1.5} aria-hidden />
            New item
          </button>
          <button
            type="button"
            onClick={() => setModal({ kind: "combo", combo: null })}
            className="btn btn-secondary px-4 text-sm"
          >
            New combo
          </button>
          <button
            type="button"
            onClick={() => setModal({ kind: "addon", addon: null })}
            className="btn btn-secondary px-4 text-sm"
          >
            New add-on
          </button>
          <button
            type="button"
            onClick={() => setModal({ kind: "category", category: null })}
            className="btn btn-secondary px-4 text-sm"
          >
            New category
          </button>
        </div>
      </header>

      {categories.length === 0 ? (
        <section className="rounded-card border border-hairline bg-card p-6 md:p-8">
          <h2 className="text-lg font-medium">No menu items yet</h2>
          <p className="mt-1.5 max-w-xl text-sm text-ink-2">
            Load a sample cafe menu with coffee, cold brew, tea, bites, size variations,
            add-ons, and combos to edit, or start by adding your first category.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={seedPending}
              onClick={() => startSeedTransition(() => void seedSampleMenu())}
              className="btn btn-primary px-5 text-sm"
            >
              {seedPending ? "Loading sample menu" : "Load sample cafe menu"}
            </button>
            <button
              type="button"
              onClick={() => setModal({ kind: "category", category: null })}
              className="btn btn-secondary px-4 text-sm"
            >
              New category
            </button>
          </div>
        </section>
      ) : (
        <div className="flex flex-col gap-8">
          {categories.map((cat) => {
            const catItems = itemsByCategory.get(cat.id) ?? [];
            return (
              <section key={cat.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2.5">
                    <h2 className="text-base font-medium">{cat.name}</h2>
                    <span className="font-mono text-xs text-ink-3">{catItems.length}</span>
                    {!cat.active ? (
                      <span className="rounded bg-raised px-2 py-0.5 text-xs text-ink-3">
                        Hidden
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModal({ kind: "category", category: cat })}
                      className="btn btn-secondary min-h-11 px-3 text-xs sm:min-h-9"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setModal({ kind: "item", item: null, defaultCategoryId: cat.id })
                      }
                      className="btn btn-secondary min-h-11 px-3 text-xs sm:min-h-9"
                    >
                      <Plus size={14} strokeWidth={1.5} aria-hidden />
                      Add item
                    </button>
                  </div>
                </div>

                {catItems.length === 0 ? (
                  <div className="flex items-center justify-between gap-4 rounded-card border border-hairline bg-card px-4 py-4 text-sm text-ink-3">
                    <span>No items in this category</span>
                    <button
                      type="button"
                      onClick={() =>
                        setModal({ kind: "item", item: null, defaultCategoryId: cat.id })
                      }
                      className="font-medium text-accent hover:underline"
                    >
                      Add item
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-hairline rounded-card border border-hairline bg-card">
                    {catItems.map((item) => {
                      const itemVariants = variantsByItem.get(item.id) ?? [];
                      const allowedAddons = (addonIdsByItem.get(item.id) ?? [])
                        .map((id) => addonMap.get(id)?.name)
                        .filter((n): n is string => Boolean(n));

                      return (
                        <li
                          key={item.id}
                          className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-ink">{item.name}</span>
                              {!item.active ? (
                                <span className="rounded bg-raised px-2 py-0.5 text-xs text-ink-3">
                                  Hidden
                                </span>
                              ) : null}
                            </div>
                            {allowedAddons.length > 0 ? (
                              <p className="mt-0.5 truncate text-xs text-ink-3">
                                Add-ons: {allowedAddons.join(", ")}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end sm:gap-4">
                            <div className="font-mono text-sm text-ink sm:text-right">
                              {itemVariants.length > 0 ? (
                                <span className="flex flex-wrap gap-x-3 gap-y-0.5 sm:justify-end">
                                  {itemVariants.map((v) => (
                                    <span key={v.id} className="text-ink-2">
                                      {v.name}{" "}
                                      <span className="text-ink">{formatRupees(v.price)}</span>
                                    </span>
                                  ))}
                                </span>
                              ) : (
                                formatRupees(item.price)
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <StatusToggle
                                isPositive={!item.soldOut}
                                positiveLabel="In stock"
                                negativeLabel="Sold out"
                                useNegativeBorder
                                pending={pendingId === item.id}
                                onToggle={() =>
                                  void runToggle(item.id, () =>
                                    toggleItemSoldOut(item.id, !item.soldOut),
                                  )
                                }
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setModal({
                                    kind: "item",
                                    item,
                                    defaultCategoryId: item.categoryId,
                                  })
                                }
                                className="btn btn-secondary min-h-11 px-3 text-xs sm:min-h-9"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-base font-medium">Combos</h2>
            <span className="font-mono text-xs text-ink-3">{combos.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setModal({ kind: "combo", combo: null })}
            className="btn btn-secondary min-h-11 px-3 text-xs sm:min-h-9"
          >
            <Plus size={14} strokeWidth={1.5} aria-hidden />
            New combo
          </button>
        </div>

        {combos.length === 0 ? (
          <div className="rounded-card border border-hairline bg-card px-4 py-4 text-sm text-ink-3">
            No combos created yet
          </div>
        ) : (
          <ul className="divide-y divide-hairline rounded-card border border-hairline bg-card">
            {combos.map((combo) => {
              const members = (comboItemsByCombo.get(combo.id) ?? [])
                .map((ci) => {
                  const item = itemMap.get(ci.itemId);
                  return item ? `${ci.qty}× ${item.name}` : null;
                })
                .filter((s): s is string => Boolean(s));

              return (
                <li
                  key={combo.id}
                  className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{combo.name}</span>
                      {!combo.active ? (
                        <span className="rounded bg-raised px-2 py-0.5 text-xs text-ink-3">
                          Hidden
                        </span>
                      ) : null}
                    </div>
                    {members.length > 0 ? (
                      <p className="mt-0.5 truncate text-xs text-ink-3">{members.join(", ")}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end sm:gap-4">
                    <span className="font-mono text-sm text-ink">{formatRupees(combo.price)}</span>
                    <div className="flex items-center gap-2">
                      <StatusToggle
                        isPositive={!combo.soldOut}
                        positiveLabel="In stock"
                        negativeLabel="Sold out"
                        useNegativeBorder
                        pending={pendingId === combo.id}
                        onToggle={() =>
                          void runToggle(combo.id, () =>
                            toggleComboSoldOut(combo.id, !combo.soldOut),
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setModal({ kind: "combo", combo })}
                        className="btn btn-secondary min-h-11 px-3 text-xs sm:min-h-9"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-base font-medium">Add-ons</h2>
            <span className="font-mono text-xs text-ink-3">{addons.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setModal({ kind: "addon", addon: null })}
            className="btn btn-secondary min-h-11 px-3 text-xs sm:min-h-9"
          >
            <Plus size={14} strokeWidth={1.5} aria-hidden />
            New add-on
          </button>
        </div>

        {addons.length === 0 ? (
          <div className="rounded-card border border-hairline bg-card px-4 py-4 text-sm text-ink-3">
            No add-ons created yet
          </div>
        ) : (
          <ul className="divide-y divide-hairline rounded-card border border-hairline bg-card">
            {addons.map((addon) => (
              <li
                key={addon.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
              >
                <span className="font-medium text-ink">{addon.name}</span>

                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="font-mono text-sm text-ink">
                    +{formatRupees(addon.price)}
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusToggle
                      isPositive={addon.active}
                      positiveLabel="Active"
                      negativeLabel="Hidden"
                      pending={pendingId === addon.id}
                      onToggle={() =>
                        void runToggle(addon.id, () =>
                          toggleAddonActive(addon.id, !addon.active),
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setModal({ kind: "addon", addon })}
                      className="btn btn-secondary min-h-11 px-3 text-xs sm:min-h-9"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CategoryModal
        open={modal?.kind === "category"}
        category={modal?.kind === "category" ? modal.category : null}
        nextSort={categories.length}
        onClose={() => setModal(null)}
      />

      <AddonModal
        open={modal?.kind === "addon"}
        addon={modal?.kind === "addon" ? modal.addon : null}
        onClose={() => setModal(null)}
      />

      <ItemModal
        open={modal?.kind === "item"}
        item={modal?.kind === "item" ? modal.item : null}
        defaultCategoryId={
          modal?.kind === "item" ? modal.defaultCategoryId : firstCategoryId
        }
        categories={categories}
        variants={
          modal?.kind === "item" && modal.item
            ? variantsByItem.get(modal.item.id) ?? []
            : []
        }
        addons={addons}
        selectedAddonIds={
          modal?.kind === "item" && modal.item
            ? addonIdsByItem.get(modal.item.id) ?? []
            : []
        }
        onClose={() => setModal(null)}
      />

      <ComboModal
        open={modal?.kind === "combo"}
        combo={modal?.kind === "combo" ? modal.combo : null}
        items={items}
        comboItems={
          modal?.kind === "combo" && modal.combo
            ? comboItemsByCombo.get(modal.combo.id) ?? []
            : []
        }
        onClose={() => setModal(null)}
      />
    </div>
  );
}
