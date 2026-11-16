"use client";

import { Minus, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Modal } from "@/components/modal";
import { buildCartKey, type CartAddon, type CartLine } from "@/lib/cart";
import { formatRupees } from "@/lib/format";

export type PosVariant = {
  id: string;
  itemId: string;
  name: string;
  price: number;
};

export type PosAddon = {
  id: string;
  name: string;
  price: number;
};

export type PosItem = {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  soldOut: boolean;
  variants: PosVariant[];
  addons: PosAddon[];
};

function CustomizeForm({
  item,
  onAdd,
}: {
  item: PosItem;
  onAdd: (line: Omit<CartLine, "discount" | "complimentary">) => void;
}) {
  const [variantId, setVariantId] = useState<string | null>(item.variants[0]?.id ?? null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);

  const selectedVariant = item.variants.find((v) => v.id === variantId) ?? null;
  const basePrice = selectedVariant ? selectedVariant.price : item.price;

  const chosenAddons: CartAddon[] = item.addons.filter((a) =>
    selectedAddonIds.includes(a.id),
  );
  const addonSum = chosenAddons.reduce((s, a) => s + a.price, 0);
  const total = (basePrice + addonSum) * qty;

  function toggleAddon(id: string) {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onAdd({
      key: buildCartKey("item", item.id, selectedVariant?.id ?? null, selectedAddonIds),
      kind: "item",
      sourceId: item.id,
      name: item.name,
      variantName: selectedVariant?.name ?? null,
      unitPrice: basePrice,
      addons: chosenAddons,
      qty,
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {item.variants.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm text-ink-2">Size or portion</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {item.variants.map((variant) => {
              const checked = variant.id === selectedVariant?.id;
              return (
                <label
                  key={variant.id}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-control border px-3.5 text-sm transition-colors ${
                    checked
                      ? "border-accent bg-accent-soft font-medium text-ink"
                      : "border-hairline-strong bg-bg text-ink hover:border-ink-3"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="variant"
                      value={variant.id}
                      checked={checked}
                      onChange={() => setVariantId(variant.id)}
                      className="size-4 accent-accent"
                    />
                    <span>{variant.name}</span>
                  </span>
                  <span className="font-mono text-sm">{formatRupees(variant.price)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {item.addons.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm text-ink-2">Dips &amp; add-ons</legend>
          <div className="flex flex-col gap-2">
            {item.addons.map((addon) => {
              const checked = selectedAddonIds.includes(addon.id);
              return (
                <label
                  key={addon.id}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-control border px-3.5 text-sm transition-colors ${
                    checked
                      ? "border-accent bg-accent-soft font-medium text-ink"
                      : "border-hairline-strong bg-bg text-ink hover:border-ink-3"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAddon(addon.id)}
                      className="size-4 accent-accent"
                    />
                    <span>{addon.name}</span>
                  </span>
                  <span className="font-mono text-sm text-ink-2">
                    +{formatRupees(addon.price)}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="flex items-center justify-between border-t border-hairline pt-4">
        <span className="text-sm text-ink-2">Quantity</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={qty <= 1}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="grid size-11 place-items-center rounded-control border border-hairline-strong bg-raised text-ink transition-colors hover:border-ink-3 disabled:opacity-40"
          >
            <Minus size={16} strokeWidth={1.5} aria-hidden />
          </button>
          <span className="w-8 text-center font-mono text-base font-medium">{qty}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => q + 1)}
            className="grid size-11 place-items-center rounded-control border border-hairline-strong bg-raised text-ink transition-colors hover:border-ink-3"
          >
            <Plus size={16} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </div>

      <button type="submit" className="btn btn-primary w-full justify-between px-5 text-sm">
        <span>Add to order</span>
        <span className="font-mono">{formatRupees(total)}</span>
      </button>
    </form>
  );
}

export function CustomizeItemModal({
  item,
  onClose,
  onAdd,
}: {
  item: PosItem | null;
  onClose: () => void;
  onAdd: (line: Omit<CartLine, "discount" | "complimentary">) => void;
}) {
  const titleId = useId();
  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      titleId={titleId}
      title={item?.name ?? "Customize item"}
    >
      {item ? (
        <CustomizeForm
          key={item.id}
          item={item}
          onAdd={(line) => {
            onAdd(line);
            onClose();
          }}
        />
      ) : null}
    </Modal>
  );
}
