"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import { formatRupees } from "@/lib/format";
import {
  deleteAddon,
  deleteCategory,
  deleteCombo,
  deleteItem,
  saveAddon,
  saveCategory,
  saveCombo,
  saveItem,
  type ActionResult,
} from "./actions";

export type CategoryRow = { id: string; name: string; sort: number; active: boolean };
export type ItemRow = {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  soldOut: boolean;
  active: boolean;
  sort: number;
};
export type VariantRow = { id: string; itemId: string; name: string; price: number; sort: number };
export type AddonRow = { id: string; name: string; price: number; active: boolean };
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
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onDelete?: () => Promise<ActionResult>;
};

function ModalFooter({ isEditing, pending, error, onCancel, onDelete }: ModalFooterProps) {
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
            disabled={pending}
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              void onDelete();
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
          <button type="submit" disabled={pending} className="btn btn-primary px-5 text-sm">
            {pending ? "Saving" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryForm({
  category,
  nextSort,
  onClose,
}: {
  category: CategoryRow | null;
  nextSort: number;
  onClose: () => void;
}) {
  const nameId = useId();
  const sortId = useId();
  const [name, setName] = useState(category?.name ?? "");
  const [sort, setSort] = useState(String(category?.sort ?? nextSort));
  const [active, setActive] = useState(category?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveCategory({
        id: category?.id,
        name,
        sort: Number.parseInt(sort, 10) || 0,
        active,
      });
      if (res.error) setError(res.error);
      else onClose();
    });
  }

  async function handleDelete(): Promise<ActionResult> {
    if (!category) return {};
    setError(null);
    const res = await deleteCategory(category.id);
    if (res.error) setError(res.error);
    else onClose();
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
          value={sort}
          onChange={(e) => setSort(e.target.value)}
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
        pending={pending}
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
  onClose,
}: {
  open: boolean;
  category: CategoryRow | null;
  nextSort: number;
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
        onClose={onClose}
      />
    </Modal>
  );
}

function AddonForm({ addon, onClose }: { addon: AddonRow | null; onClose: () => void }) {
  const nameId = useId();
  const priceId = useId();
  const [name, setName] = useState(addon?.name ?? "");
  const [price, setPrice] = useState(addon ? String(addon.price) : "");
  const [active, setActive] = useState(addon?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveAddon({
        id: addon?.id,
        name,
        price: Number.parseInt(price, 10) || 0,
        active,
      });
      if (res.error) setError(res.error);
      else onClose();
    });
  }

  async function handleDelete(): Promise<ActionResult> {
    if (!addon) return {};
    setError(null);
    const res = await deleteAddon(addon.id);
    if (res.error) setError(res.error);
    else onClose();
    return res;
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
        pending={pending}
        error={error}
        onCancel={onClose}
        onDelete={addon ? handleDelete : undefined}
      />
    </form>
  );
}

export function AddonModal({
  open,
  addon,
  onClose,
}: {
  open: boolean;
  addon: AddonRow | null;
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
      <AddonForm key={addon?.id ?? "new-addon"} addon={addon} onClose={onClose} />
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
  onClose,
}: {
  item: ItemRow | null;
  defaultCategoryId: string;
  categories: CategoryRow[];
  variants: VariantRow[];
  addons: AddonRow[];
  selectedAddonIds: string[];
  onClose: () => void;
}) {
  const nameId = useId();
  const catId = useId();
  const priceId = useId();

  const [name, setName] = useState(item?.name ?? "");
  const [categoryId, setCategoryId] = useState(
    item?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? "",
  );
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [active, setActive] = useState(item?.active ?? true);
  const [soldOut] = useState(item?.soldOut ?? false);
  const [variantRows, setVariantRows] = useState<{ name: string; price: string }[]>(
    variants.map((v) => ({ name: v.name, price: String(v.price) })),
  );
  const [addonIds, setAddonIds] = useState<string[]>(selectedAddonIds);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleAddon(id: string) {
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedVariants = variantRows
      .filter((v) => v.name.trim().length > 0)
      .map((v) => ({ name: v.name.trim(), price: Number.parseInt(v.price, 10) || 0 }));

    startTransition(async () => {
      const res = await saveItem({
        id: item?.id,
        categoryId,
        name,
        price: Number.parseInt(price, 10) || 0,
        active,
        soldOut,
        variants: parsedVariants,
        addonIds,
      });
      if (res.error) setError(res.error);
      else onClose();
    });
  }

  async function handleDelete(): Promise<ActionResult> {
    if (!item) return {};
    setError(null);
    const res = await deleteItem(item.id);
    if (res.error) setError(res.error);
    else onClose();
    return res;
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
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label={`Variation ${idx + 1} name`}
                  placeholder="Regular"
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
                  aria-label={`Variation ${idx + 1} price in rupees`}
                  placeholder="119"
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
        pending={pending}
        error={error}
        onCancel={onClose}
        onDelete={item ? handleDelete : undefined}
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
  onClose,
}: {
  open: boolean;
  item: ItemRow | null;
  defaultCategoryId: string;
  categories: CategoryRow[];
  variants: VariantRow[];
  addons: AddonRow[];
  selectedAddonIds: string[];
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
        onClose={onClose}
      />
    </Modal>
  );
}

function ComboForm({
  combo,
  items,
  comboItems,
  onClose,
}: {
  combo: ComboRow | null;
  items: ItemRow[];
  comboItems: ComboItemRow[];
  onClose: () => void;
}) {
  const nameId = useId();
  const priceId = useId();

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
  const [pending, startTransition] = useTransition();

  function adjustQty(itemId: string, delta: number) {
    setQtyByItem((prev) => {
      const next = Math.max(0, (prev[itemId] ?? 0) + delta);
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
    setError(null);
    const chosen = Object.entries(qtyByItem)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, qty]) => ({ itemId, qty }));

    startTransition(async () => {
      const res = await saveCombo({
        id: combo?.id,
        name,
        price: Number.parseInt(price, 10) || 0,
        active,
        soldOut,
        items: chosen,
      });
      if (res.error) setError(res.error);
      else onClose();
    });
  }

  async function handleDelete(): Promise<ActionResult> {
    if (!combo) return {};
    setError(null);
    const res = await deleteCombo(combo.id);
    if (res.error) setError(res.error);
    else onClose();
    return res;
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
        pending={pending}
        error={error}
        onCancel={onClose}
        onDelete={combo ? handleDelete : undefined}
      />
    </form>
  );
}

export function ComboModal({
  open,
  combo,
  items,
  comboItems,
  onClose,
}: {
  open: boolean;
  combo: ComboRow | null;
  items: ItemRow[];
  comboItems: ComboItemRow[];
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
        onClose={onClose}
      />
    </Modal>
  );
}
