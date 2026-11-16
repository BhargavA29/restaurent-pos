import type { Metadata } from "next";
import { Coffee } from "lucide-react";
import { CAFE_NAME } from "@/lib/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-control bg-accent text-accent-ink">
            <Coffee size={20} strokeWidth={1.5} aria-hidden />
          </span>
          <span className="text-lg font-medium">{CAFE_NAME}</span>
        </div>

        <h1 className="mb-1 text-3xl font-normal leading-tight">Sign in</h1>
        <p className="mb-8 text-ink-2">Use the owner account for this cafe</p>

        <LoginForm />
      </div>
    </main>
  );
}
