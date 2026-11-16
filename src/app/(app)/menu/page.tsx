import type { Metadata } from "next";

export const metadata: Metadata = { title: "Menu" };

export default function Page() {
  return (
    <>
      <h1 className="text-3xl font-normal leading-tight">Menu</h1>
      <p className="mt-2 text-ink-2">Menu management arrives in phase 2</p>
    </>
  );
}
