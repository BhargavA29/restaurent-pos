import type { Metadata } from "next";
import { Flame } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CAFE_INSTAGRAM, CAFE_NAME } from "@/lib/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="relative grid min-h-dvh place-items-center p-6">
      <div className="absolute end-4 top-4">
        <ThemeToggle compact />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-control bg-accent text-white">
            <Flame size={20} strokeWidth={1.5} aria-hidden />
          </span>
          <div className="leading-tight">
            <span className="block text-lg font-medium tracking-tight">{CAFE_NAME}</span>
            <span className="block font-mono text-xs text-ink-3">{CAFE_INSTAGRAM}</span>
          </div>
        </div>

        <h1 className="mb-1 text-3xl font-normal leading-tight">Sign in</h1>
        <p className="mb-8 text-ink-2">Sign in to the FRY counter POS</p>

        <LoginForm />
      </div>
    </main>
  );
}
