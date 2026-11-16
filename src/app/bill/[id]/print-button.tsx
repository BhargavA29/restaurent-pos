"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn btn-secondary flex-1 text-sm"
    >
      <Printer size={16} strokeWidth={1.5} aria-hidden />
      Save PDF / Print
    </button>
  );
}
