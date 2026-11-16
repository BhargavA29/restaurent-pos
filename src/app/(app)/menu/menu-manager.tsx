"use client";

import { Plus, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { formatRupees } from "@/lib/format";
import type { AddonInput, CategoryInput, ComboInput, ItemInput } from "@/lib/validators";
import {
  deleteAddon,
  deleteCategory,
  deleteCombo,
  deleteItem,
  saveAddon,
  saveCategory,
  saveCombo,
  saveItem,
  seedSampleMenu,
  toggleAddonActive,
  toggleComboSoldOut,
  toggleItemSoldOut,
  type ActionResult,
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

type MenuSnapshot = {
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

function bySortAndName<T extends { sort: number; name: string }>(a: T, b: T) {
  return a.sort - b.sort || a.name.localeCompare(b.name);
}

function StatusToggle({
  isPositive,
  positiveLabel,
  negativeLabel,
  useNegativeBorder,
  onToggle,
}: {
  isPositive: boolean;
  positiveLabel: string;
  negativeLabel: string;
  useNegativeBorder?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
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

export function MenuManager(initial: MenuSnapshot) {
  const [state, setState] = useState<MenuSnapshot>(initial);
  const [modal, setModal] = useState<ActiveModal>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [seedPending, startSeedTransition] = useTransition();

  const variantsByItem = useMemo(() => {
    const map = new Map<string, VariantRow[]>();
    for (const v of state.variants) {
      const list = map.get(v.itemId) ?? [];
      list.push(v);
      map.set(v.itemId, list);
    }
    return map;
  }, [state.variants]);

  const addonMap = useMemo(
    () => new Map(state.addons.map((a) => [a.id, a])),
    [state.addons],
  );
  const itemMap = useMemo(() => new Map(state.items.map((i) => [i.id, i])), [state.items]);

  const addonIdsByItem = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const link of state.itemAddons) {
      const list = map.get(link.itemId) ?? [];
      list.push(link.addonId);
      map.set(link.itemId, list);
    }
    return map;
  }, [state.itemAddons]);

  const comboItemsByCombo = useMemo(() => {
    const map = new Map<string, ComboItemRow[]>();
    for (const ci of state.comboItems) {
      const list = map.get(ci.comboId) ?? [];
      list.push(ci);
      map.set(ci.comboId, list);
    }
    return map;
  }, [state.comboItems]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, ItemRow[]>();
    for (const item of state.items) {
      const list = map.get(item.categoryId) ?? [];
      list.push(item);
      map.set(item.categoryId, list);
    }
    return map;
  }, [state.items]);

  function runOptimistic(
    apply: (prev: MenuSnapshot) => MenuSnapshot,
    persist: () => Promise<ActionResult>,
  ) {
    const prevSnapshot = state;
    setErrorBanner(null);
    setModal(null);
    setState(apply(prevSnapshot));
    void persist()
      .then((res) => {
        if (res.error) {
          setState(prevSnapshot);
          setErrorBanner(res.error);
        }
      })
      .catch(() => {
        setState(prevSnapshot);
        setErrorBanner("Could not reach the server. Changes were reverted.");
      });
  }

  function optimisticToggle(
    patch: (revert: boolean) => void,
    persist: () => Promise<ActionResult>,
  ) {
    setErrorBanner(null);
    patch(false);
    void persist()
      .then((res) => {
        if (res.error) {
          patch(true);
          setErrorBanner(res.error);
        }
      })
      .catch(() => {
        patch(true);
        setErrorBanner("Could not reach the server. Status was reverted.");
      });
  }

  function handleSaveCategory(input: CategoryInput) {
    runOptimistic(
      (prev) => {
        const exists = prev.categories.some((c) => c.id === input.id);
        const nextCategories = (
          exists
            ? prev.categories.map((c) => (c.id === input.id ? input : c))
            : [...prev.categories, input]
        ).sort(bySortAndName);
        return { ...prev, categories: nextCategories };
      },
      () => saveCategory(input),
    );
  }

  function handleDeleteCategory(id: string): ActionResult {
    if (state.items.some((i) => i.categoryId === id)) {
      return { error: "Move or delete items in this category first" };
    }
    runOptimistic(
      (prev) => ({
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
      }),
      () => deleteCategory(id),
    );
    return {};
  }

  function handleSaveAddon(input: AddonInput) {
    runOptimistic(
      (prev) => {
        const exists = prev.addons.some((a) => a.id === input.id);
        const nextAddons = (
          exists
            ? prev.addons.map((a) => (a.id === input.id ? input : a))
            : [...prev.addons, input]
        ).sort((a, b) => a.name.localeCompare(b.name));
        return { ...prev, addons: nextAddons };
      },
      () => saveAddon(input),
    );
  }

  function handleDeleteAddon(id: string) {
    runOptimistic(
      (prev) => ({
        ...prev,
        addons: prev.addons.filter((a) => a.id !== id),
        itemAddons: prev.itemAddons.filter((l) => l.addonId !== id),
      }),
      () => deleteAddon(id),
    );
  }

  function handleSaveItem(input: ItemInput) {
    runOptimistic(
      (prev) => {
        const existing = prev.items.find((i) => i.id === input.id);
        const itemRow: ItemRow = {
          id: input.id,
          categoryId: input.categoryId,
          name: input.name,
          price: input.price,
          active: input.active,
          soldOut: input.soldOut,
          sort: existing?.sort ?? 0,
        };
        const nextItems = (
          existing
            ? prev.items.map((i) => (i.id === input.id ? itemRow : i))
            : [...prev.items, itemRow]
        ).sort(bySortAndName);

        const nextVariants = [
          ...prev.variants.filter((v) => v.itemId !== input.id),
          ...input.variants,
        ];
        const uniqueAddons = Array.from(new Set(input.addonIds));
        const nextItemAddons = [
          ...prev.itemAddons.filter((l) => l.itemId !== input.id),
          ...uniqueAddons.map((addonId) => ({ itemId: input.id, addonId })),
        ];

        return {
          ...prev,
          items: nextItems,
          variants: nextVariants,
          itemAddons: nextItemAddons,
        };
      },
      () => saveItem(input),
    );
  }

  function handleDeleteItem(id: string) {
    runOptimistic(
      (prev) => ({
        ...prev,
        items: prev.items.filter((i) => i.id !== id),
        variants: prev.variants.filter((v) => v.itemId !== id),
        itemAddons: prev.itemAddons.filter((l) => l.itemId !== id),
        comboItems: prev.comboItems.filter((ci) => ci.itemId !== id),
      }),
      () => deleteItem(id),
    );
  }

  function handleSaveCombo(input: ComboInput) {
    runOptimistic(
      (prev) => {
        const existing = prev.combos.find((c) => c.id === input.id);
        const comboRow: ComboRow = {
          id: input.id,
          name: input.name,
          price: input.price,
          active: input.active,
          soldOut: input.soldOut,
          sort: existing?.sort ?? 0,
        };
        const nextCombos = (
          existing
            ? prev.combos.map((c) => (c.id === input.id ? comboRow : c))
            : [...prev.combos, comboRow]
        ).sort(bySortAndName);

        const merged = new Map<string, number>();
        for (const row of input.items) {
          merged.set(row.itemId, (merged.get(row.itemId) ?? 0) + row.qty);
        }
        const nextComboItems = [
          ...prev.comboItems.filter((ci) => ci.comboId !== input.id),
          ...Array.from(merged.entries()).map(([itemId, qty]) => ({
            comboId: input.id,
            itemId,
            qty,
          })),
        ];

        return { ...prev, combos: nextCombos, comboItems: nextComboItems };
      },
      () => saveCombo(input),
    );
  }

  function handleDeleteCombo(id: string) {
    runOptimistic(
      (prev) => ({
        ...prev,
        combos: prev.combos.filter((c) => c.id !== id),
        comboItems: prev.comboItems.filter((ci) => ci.comboId !== id),
      }),
      () => deleteCombo(id),
    );
  }

  const firstCategoryId = state.categories[0]?.id ?? "";

  return (
    <div className="flex flex-col gap-8">
      {errorBanner ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-card border border-negative/40 bg-negative/10 px-4 py-3 text-sm text-negative"
        >
          <span>{errorBanner}</span>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setErrorBanner(null)}
            className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-negative/15"
          >
            <X size={16} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      ) : null}

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-normal leading-tight">Menu</h1>
          <p className="mt-1 font-mono text-sm text-ink-2">
            {state.items.length} {state.items.length === 1 ? "item" : "items"} ·{" "}
            {state.addons.length} {state.addons.length === 1 ? "dip" : "dips"}
            {state.combos.length > 0
              ? ` · ${state.combos.length} ${state.combos.length === 1 ? "combo" : "combos"}`
              : ""}
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
            onClick={() => setModal({ kind: "addon", addon: null })}
            className="btn btn-secondary px-4 text-sm"
          >
            New dip / add-on
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

      {state.categories.length === 0 ? (
        <section className="rounded-card border border-hairline bg-card p-6 md:p-8">
          <h2 className="text-lg font-medium">No menu items yet</h2>
          <p className="mt-1.5 max-w-xl text-sm text-ink-2">
            Load the FRY menu with all 10 fries and 5 dips, or start by adding a category.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={seedPending}
              onClick={() => startSeedTransition(() => void seedSampleMenu())}
              className="btn btn-primary px-5 text-sm"
            >
              {seedPending ? "Loading FRY menu" : "Load FRY menu"}
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
          {state.categories.map((cat) => {
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
                      className="font-medium text-accent-text hover:underline"
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
                                onToggle={() => {
                                  const next = !item.soldOut;
                                  optimisticToggle(
                                    (revert) =>
                                      setState((prev) => ({
                                        ...prev,
                                        items: prev.items.map((i) =>
                                          i.id === item.id
                                            ? { ...i, soldOut: revert ? item.soldOut : next }
                                            : i,
                                        ),
                                      })),
                                    () => toggleItemSoldOut(item.id, next),
                                  );
                                }}
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

      {state.combos.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-base font-medium">Combos</h2>
              <span className="font-mono text-xs text-ink-3">{state.combos.length}</span>
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

          <ul className="divide-y divide-hairline rounded-card border border-hairline bg-card">
            {state.combos.map((combo) => {
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
                        onToggle={() => {
                          const next = !combo.soldOut;
                          optimisticToggle(
                            (revert) =>
                              setState((prev) => ({
                                ...prev,
                                combos: prev.combos.map((c) =>
                                  c.id === combo.id
                                    ? { ...c, soldOut: revert ? combo.soldOut : next }
                                    : c,
                                ),
                              })),
                            () => toggleComboSoldOut(combo.id, next),
                          );
                        }}
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
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-base font-medium">Dips &amp; add-ons</h2>
            <span className="font-mono text-xs text-ink-3">{state.addons.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setModal({ kind: "addon", addon: null })}
            className="btn btn-secondary min-h-11 px-3 text-xs sm:min-h-9"
          >
            <Plus size={14} strokeWidth={1.5} aria-hidden />
            New dip
          </button>
        </div>

        {state.addons.length === 0 ? (
          <div className="rounded-card border border-hairline bg-card px-4 py-4 text-sm text-ink-3">
            No dips or add-ons created yet
          </div>
        ) : (
          <ul className="divide-y divide-hairline rounded-card border border-hairline bg-card">
            {state.addons.map((addon) => (
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
                      onToggle={() => {
                        const next = !addon.active;
                        optimisticToggle(
                          (revert) =>
                            setState((prev) => ({
                              ...prev,
                              addons: prev.addons.map((a) =>
                                a.id === addon.id
                                  ? { ...a, active: revert ? addon.active : next }
                                  : a,
                              ),
                            })),
                          () => toggleAddonActive(addon.id, next),
                        );
                      }}
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
        nextSort={state.categories.length}
        onSave={handleSaveCategory}
        onDelete={handleDeleteCategory}
        onClose={() => setModal(null)}
      />

      <AddonModal
        open={modal?.kind === "addon"}
        addon={modal?.kind === "addon" ? modal.addon : null}
        onSave={handleSaveAddon}
        onDelete={handleDeleteAddon}
        onClose={() => setModal(null)}
      />

      <ItemModal
        open={modal?.kind === "item"}
        item={modal?.kind === "item" ? modal.item : null}
        defaultCategoryId={
          modal?.kind === "item" ? modal.defaultCategoryId : firstCategoryId
        }
        categories={state.categories}
        variants={
          modal?.kind === "item" && modal.item
            ? variantsByItem.get(modal.item.id) ?? []
            : []
        }
        addons={state.addons}
        selectedAddonIds={
          modal?.kind === "item" && modal.item
            ? addonIdsByItem.get(modal.item.id) ?? []
            : []
        }
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
        onClose={() => setModal(null)}
      />

      <ComboModal
        open={modal?.kind === "combo"}
        combo={modal?.kind === "combo" ? modal.combo : null}
        items={state.items}
        comboItems={
          modal?.kind === "combo" && modal.combo
            ? comboItemsByCombo.get(modal.combo.id) ?? []
            : []
        }
        onSave={handleSaveCombo}
        onDelete={handleDeleteCombo}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
