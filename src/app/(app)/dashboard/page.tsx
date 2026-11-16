import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <>
      <h1 className="text-3xl font-normal leading-tight">Dashboard</h1>
      <p className="mt-2 text-ink-2">Revenue, top sellers and expenses arrive in phase 6</p>
    </>
  );
}
