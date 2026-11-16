"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Modal } from "@/components/modal";
import { formatRupees } from "@/lib/format";
import {
  addonSchema,
  categorySchema,
  comboSchema,
  itemSchema,
  parseRupeesInput,
  type AddonInput,
  type CategoryInput,
  type ComboInput,
  type ItemInput,
  type VariantInput,
} from "@/lib/validators";
import type { ActionResult } from "./actions";

export type CategoryRow = CategoryInput;
export type ItemRow = {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  soldOut: boolean;
  active: boolean;
  sort: number;
};
export type VariantRow = VariantInput;
export type AddonRow = AddonInput;
export type ComboRow = {
  id: string;
  name: string;
  price: number;
  soldOut: boolean;
  active: boolean;
  sort: number;
};
export type ComboItemRow = { comboId: string; itemId: string; qty: number };

type ModalFooterProps = {
  isEditing: boolean;
  error: string | null;
  onCancel: () => void;
  onDelete?: () => ActionResult | void;
};

function ModalFooter({ isEditing, error, onCancel, onDelete }: ModalFooterProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="mt-6 flex flex-col gap-4 border-t border-hairline pt-4">
      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {isEditing && onDelete ? (
          <button
            type="button"
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              onDelete();
            }}
            className="btn btn-danger px-4 text-sm"
          >
            <Trash2 size={16} strokeWidth={1.5} aria-hidden />
            {confirmDelete ? "Confirm delete" : "Delete"}
          </button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="btn btn-secondary px-4 text-sm">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary px-5 text-sm">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryForm({
  category,
  nextSort,
  onSave,
  onDelete,
  onClose,
}: {
  category: CategoryRow | null;
  nextSort: number;
  onSave: (data: CategoryInput) => void;
  onDelete: (id: string) => ActionResult;
  onClose: () => void;
}) {
  const nameId = useId();
  const sortId = useId();
  const [id] = useState(() => category?.id ?? crypto.randomUUID());
  const [name, setName] = useState(category?.name ?? "");
  const [sort, setSort] = useState(String(category?.sort ?? nextSort));
  const [active, setActive] = useState(category?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = categorySchema.safeParse({
      id,
      name,
      sort: parseRupeesInput(sort),
      active,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check category details");
      return;
    }
    setError(null);
    onSave(parsed.data);
  }

  function handleDelete(): ActionResult {
    if (!category) return {};
    const res = onDelete(category.id);
    if (res.error) setError(res.error);
    return res;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={nameId} className="text-sm text-ink-2">
          Category name
        </label>
        <input
          id={nameId}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Signature Fries"
          maxLength={60}
          required
          autoFocus
          className="field"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={sortId} className="text-sm text-ink-2">
          Display order
        </label>
        <input
          id={sortId}
          type="number"
          inputMode="numeric"
          min={0}
          max={999}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          required
          className="field font-mono"
        />
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4 accent-accent"
        />
        Show category on POS
      </label>

      <ModalFooter
        isEditing={Boolean(category)}
        error={error}
        onCancel={onClose}
        onDelete={category ? handleDelete : undefined}
      />
    </form>
  );
}

export function CategoryModal({
  open,
  category,
  nextSort,
  onSave,
  onDelete,
  onClose,
}: {
  open: boolean;
  category: CategoryRow | null;
  nextSort: number;
  onSave: (data: CategoryInput) => void;
  onDelete: (id: string) => ActionResult;
  onClose: () => void;
}) {
  const titleId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={category ? "Edit category" : "New category"}
    >
      <CategoryForm
        key={category?.id ?? "new-category"}
        category={category}
        nextSort={nextSort}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onClose}
      />
    </Modal>
  );
}

function AddonForm({
  addon,
  onSave,
  onDelete,
  onClose,
}: {
  addon: AddonRow | null;
  onSave: (data: AddonInput) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const nameId = useId();
  const priceId = useId();
  const [id] = useState(() => addon?.id ?? crypto.randomUUID());
  const [name, setName] = useState(addon?.name ?? "");
  const [price, setPrice] = useState(addon ? String(addon.price) : "");
  const [active, setActive] = useState(addon?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = addonSchema.safeParse({
      id,
      name,
      price: parseRupeesInput(price),
      active,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check add-on details");
      return;
    }
    setError(null);
    onSave(parsed.data);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={nameId} className="text-sm text-ink-2">
          Add-on name
        </label>
        <input
          id={nameId}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Peri-Peri Dust"
          maxLength={60}
          required
          autoFocus
          className="field"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={priceId} className="text-sm text-ink-2">
          Price (₹)
        </label>
        <input
          id={priceId}
          type="number"
          inputMode="numeric"
          min={0}
          max={100000}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="20"
          required
          className="field font-mono"
        />
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4 accent-accent"
        />
        Available on POS
      </label>

      <ModalFooter
        isEditing={Boolean(addon)}
        error={error}
        onCancel={onClose}
        onDelete={addon ? () => onDelete(addon.id) : undefined}
      />
    </form>
  );
}

export function AddonModal({
  open,
  addon,
  onSave,
  onDelete,
  onClose,
}: {
  open: boolean;
  addon: AddonRow | null;
  onSave: (data: AddonInput) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={addon ? "Edit add-on" : "New add-on"}
    >
      <AddonForm
        key={addon?.id ?? "new-addon"}
        addon={addon}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onClose}
      />
    </Modal>
  );
}

function ItemForm({
  item,
  defaultCategoryId,
  categories,
  variants,
  addons,
  selectedAddonIds,
  onSave,
  onDelete,
  onClose,
}: {
  item: ItemRow | null;
  defaultCategoryId: string;
  categories: CategoryRow[];
  variants: VariantRow[];
  addons: AddonRow[];
  selectedAddonIds: string[];
  onSave: (data: ItemInput) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const nameId = useId();
  const catId = useId();
  const priceId = useId();

  const [itemId] = useState(() => item?.id ?? crypto.randomUUID());
  const [name, setName] = useState(item?.name ?? "");
  const [categoryId, setCategoryId] = useState(
    item?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? "",
  );
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [active, setActive] = useState(item?.active ?? true);
  const [soldOut] = useState(item?.soldOut ?? false);
  const [variantRows, setVariantRows] = useState<
    { id: string; name: string; price: string }[]
  >(() => variants.map((v) => ({ id: v.id, name: v.name, price: String(v.price) })));
  const [addonIds, setAddonIds] = useState<string[]>(selectedAddonIds);
  const [error, setError] = useState<string | null>(null);

  function toggleAddon(id: string) {
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();

    const parsedVariants = variantRows.map((row, idx) => ({
      id: row.id,
      itemId,
      name: row.name,
      price: parseRupeesInput(row.price),
      sort: idx,
    }));

    const basePriceInput =
      parsedVariants.length > 0 && price.trim() === ""
        ? Math.min(
            ...parsedVariants.map((v) => (Number.isFinite(v.price) ? v.price : 0)),
          )
        : parseRupeesInput(price);

    const parsed = itemSchema.safeParse({
      id: itemId,
      categoryId,
      name,
      price: basePriceInput,
      active,
      soldOut,
      variants: parsedVariants,
      addonIds,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check item details");
      return;
    }

    const normalized: ItemInput = {
      ...parsed.data,
      price:
        parsed.data.variants.length > 0 && parsed.data.price === 0
          ? Math.min(...parsed.data.variants.map((v) => v.price))
          : parsed.data.price,
    };

    setError(null);
    onSave(normalized);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={nameId} className="text-sm text-ink-2">
          Item name
        </label>
        <input
          id={nameId}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Peri-Peri Crinkle Fries"
          maxLength={80}
          required
          autoFocus
          className="field"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={catId} className="text-sm text-ink-2">
            Category
          </label>
          <select
            id={catId}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="field"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={priceId} className="text-sm text-ink-2">
            {variantRows.length > 0 ? "Base price (₹)" : "Price (₹)"}
          </label>
          <input
            id={priceId}
            type="number"
            inputMode="numeric"
            min={0}
            max={100000}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="119"
            required={variantRows.length === 0}
            className="field font-mono"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-ink-2">Size or base variations</span>
          <button
            type="button"
            onClick={() =>
              setVariantRows((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  name: prev.length === 0 ? "Regular" : prev.length === 1 ? "Large" : "",
                  price: "",
                },
              ])
            }
            className="inline-flex min-h-9 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium text-accent-text transition-colors hover:bg-accent-soft"
          >
            <Plus size={14} strokeWidth={1.5} aria-hidden />
            Add variation
          </button>
        </div>

        {variantRows.length > 0 ? (
          <div className="flex flex-col gap-2">
            {variantRows.map((row, idx) => (
              <div key={row.id} className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label={`Variation ${idx + 1} name`}
                  placeholder="Regular"
                  maxLength={40}
                  required
                  value={row.name}
                  onChange={(e) =>
                    setVariantRows((prev) =>
                      prev.map((v, i) => (i === idx ? { ...v, name: e.target.value } : v)),
                    )
                  }
                  className="field flex-1"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100000}
                  aria-label={`Variation ${idx + 1} price in rupees`}
                  placeholder="119"
                  required
                  value={row.price}
                  onChange={(e) =>
                    setVariantRows((prev) =>
                      prev.map((v, i) => (i === idx ? { ...v, price: e.target.value } : v)),
                    )
                  }
                  className="field w-28 font-mono"
                />
                <button
                  type="button"
                  aria-label={`Remove variation ${idx + 1}`}
                  onClick={() => setVariantRows((prev) => prev.filter((_, i) => i !== idx))}
                  className="grid size-11 shrink-0 place-items-center rounded-control text-ink-3 transition-colors hover:bg-raised hover:text-negative"
                >
                  <Trash2 size={16} strokeWidth={1.5} aria-hidden />
                </button>
              </div>
            ))}
            <p className="text-xs text-ink-3">
              Variation prices replace the base price when ordering on the POS
            </p>
          </div>
        ) : null}
      </div>

      {addons.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm text-ink-2">Allowed add-ons</legend>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {addons.map((addon) => {
              const checked = addonIds.includes(addon.id);
              return (
                <label
                  key={addon.id}
                  className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-control border border-hairline bg-bg px-3 text-sm"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAddon(addon.id)}
                      className="size-4 shrink-0 accent-accent"
                    />
                    <span className="truncate">{addon.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-ink-3">
                    +{formatRupees(addon.price)}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4 accent-accent"
        />
        Show item on POS menu
      </label>

      <ModalFooter
        isEditing={Boolean(item)}
        error={error}
        onCancel={onClose}
        onDelete={item ? () => onDelete(item.id) : undefined}
      />
    </form>
  );
}

export function ItemModal({
  open,
  item,
  defaultCategoryId,
  categories,
  variants,
  addons,
  selectedAddonIds,
  onSave,
  onDelete,
  onClose,
}: {
  open: boolean;
  item: ItemRow | null;
  defaultCategoryId: string;
  categories: CategoryRow[];
  variants: VariantRow[];
  addons: AddonRow[];
  selectedAddonIds: string[];
  onSave: (data: ItemInput) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={item ? "Edit item" : "New item"}
    >
      <ItemForm
        key={item?.id ?? `new-${defaultCategoryId}`}
        item={item}
        defaultCategoryId={defaultCategoryId}
        categories={categories}
        variants={variants}
        addons={addons}
        selectedAddonIds={selectedAddonIds}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onClose}
      />
    </Modal>
  );
}

function ComboForm({
  combo,
  items,
  comboItems,
  onSave,
  onDelete,
  onClose,
}: {
  combo: ComboRow | null;
  items: ItemRow[];
  comboItems: ComboItemRow[];
  onSave: (data: ComboInput) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const nameId = useId();
  const priceId = useId();

  const [id] = useState(() => combo?.id ?? crypto.randomUUID());
  const [name, setName] = useState(combo?.name ?? "");
  const [price, setPrice] = useState(combo ? String(combo.price) : "");
  const [active, setActive] = useState(combo?.active ?? true);
  const [soldOut] = useState(combo?.soldOut ?? false);
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const ci of comboItems) map[ci.itemId] = ci.qty;
    return map;
  });
  const [error, setError] = useState<string | null>(null);

  function adjustQty(itemId: string, delta: number) {
    setQtyByItem((prev) => {
      const next = Math.max(0, Math.min(50, (prev[itemId] ?? 0) + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const chosen = Object.entries(qtyByItem)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, qty]) => ({ itemId, qty }));

    const parsed = comboSchema.safeParse({
      id,
      name,
      price: parseRupeesInput(price),
      active,
      soldOut,
      items: chosen,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check combo details");
      return;
    }
    setError(null);
    onSave(parsed.data);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={nameId} className="text-sm text-ink-2">
          Combo name
        </label>
        <input
          id={nameId}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Eat Fry Repeat Meal"
          maxLength={80}
          required
          autoFocus
          className="field"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={priceId} className="text-sm text-ink-2">
          Bundle price (₹)
        </label>
        <input
          id={priceId}
          type="number"
          inputMode="numeric"
          min={0}
          max={100000}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="269"
          required
          className="field font-mono"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-2">Included items</span>
        {items.length === 0 ? (
          <p className="text-sm text-ink-3">Add menu items first before creating a combo</p>
        ) : (
          <div className="max-h-56 divide-y divide-hairline overflow-y-auto rounded-control border border-hairline bg-bg">
            {items.map((item) => {
              const qty = qtyByItem[item.id] ?? 0;
              return (
                <div
                  key={item.id}
                  className="flex min-h-11 items-center justify-between gap-3 px-3 py-1.5"
                >
                  <span className="truncate text-sm">{item.name}</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={`Remove one ${item.name}`}
                      disabled={qty === 0}
                      onClick={() => adjustQty(item.id, -1)}
                      className="grid size-8 place-items-center rounded-lg border border-hairline bg-card text-ink-2 transition-colors hover:text-ink disabled:opacity-35"
                    >
                      <Minus size={14} strokeWidth={1.5} aria-hidden />
                    </button>
                    <span className="w-6 text-center font-mono text-sm">{qty}</span>
                    <button
                      type="button"
                      aria-label={`Add one ${item.name}`}
                      onClick={() => adjustQty(item.id, 1)}
                      className="grid size-8 place-items-center rounded-lg border border-hairline bg-card text-ink-2 transition-colors hover:text-ink"
                    >
                      <Plus size={14} strokeWidth={1.5} aria-hidden />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4 accent-accent"
        />
        Show combo on POS menu
      </label>

      <ModalFooter
        isEditing={Boolean(combo)}
        error={error}
        onCancel={onClose}
        onDelete={combo ? () => onDelete(combo.id) : undefined}
      />
    </form>
  );
}

export function ComboModal({
  open,
  combo,
  items,
  comboItems,
  onSave,
  onDelete,
  onClose,
}: {
  open: boolean;
  combo: ComboRow | null;
  items: ItemRow[];
  comboItems: ComboItemRow[];
  onSave: (data: ComboInput) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={combo ? "Edit combo" : "New combo"}
    >
      <ComboForm
        key={combo?.id ?? "new-combo"}
        combo={combo}
        items={items}
        comboItems={comboItems}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onClose}
      />
    </Modal>
  );
}
