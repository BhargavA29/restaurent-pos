"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  children: React.ReactNode;
};

/**
 * Native modal <dialog> with light-dismiss (`closedby="any"`) and fallback
 * for browsers without `HTMLDialogElement.prototype.closedBy`.
 */
export function Modal({ open, onClose, titleId, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    function handleClick(event: MouseEvent) {
      if (!dialog || event.target !== dialog) return;
      if (event.detail === 0 && event.clientX === 0 && event.clientY === 0) return;
      const rect = dialog.getBoundingClientRect();
      const inside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!inside) dialog.close();
    }

    dialog.addEventListener("click", handleClick);
    return () => dialog.removeEventListener("click", handleClick);
  }, []);

  function handleClose(event: React.SyntheticEvent<HTMLDialogElement>) {
    event.currentTarget.returnValue = "";
    onClose();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={handleClose}
      {...({ closedby: "any" } as Record<string, string>)}
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-lg font-medium leading-snug">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-11 shrink-0 place-items-center rounded-control text-ink-3 transition-colors hover:bg-raised hover:text-ink"
        >
          <X size={18} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
      {open ? children : null}
    </dialog>
  );
}
