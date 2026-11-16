import type { Metadata } from "next";

export const metadata: Metadata = { title: "New order" };

export default function Page() {
  return (
    <>
      <h1 className="text-3xl font-normal leading-tight">New order</h1>
      <p className="mt-2 text-ink-2">The order screen arrives in phase 3</p>
    </>
  );
}
