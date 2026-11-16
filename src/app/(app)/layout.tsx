import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { BrandLogo } from "@/components/brand-logo";
import { Nav } from "@/components/nav";
import { OfflineSyncBar } from "@/components/offline-sync-bar";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireOwner } from "@/lib/auth";
import { CAFE_INSTAGRAM, CAFE_NAME } from "@/lib/brand";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const owner = await requireOwner();

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      {/* Laptop: fixed sidebar. Phone: this same block becomes a bottom tab bar. */}
      <aside className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline bg-sidebar pb-[env(safe-area-inset-bottom)] md:sticky md:inset-auto md:top-0 md:flex md:h-dvh md:flex-col md:border-t-0 md:border-e md:p-4 md:pb-4">
        <div className="mb-6 hidden items-center gap-3 px-3 pt-1 md:flex">
          <BrandLogo size={34} />
          <div className="leading-tight">
            <span className="block text-base font-medium tracking-tight">{CAFE_NAME}</span>
            <span className="block font-mono text-xs text-ink-3">{CAFE_INSTAGRAM}</span>
          </div>
        </div>

        <div className="px-2 py-1 md:p-0">
          <Nav />
        </div>

        <div className="mt-auto hidden flex-col gap-1 md:flex">
          <p className="truncate px-3 pb-1 text-xs text-ink-3">{owner.name}</p>
          <PwaInstallButton />
          <ThemeToggle />
          <form action={logout}>
            <button
              type="submit"
              className="flex min-h-9 w-full items-center gap-2.5 rounded-control px-3 text-sm text-ink-3 transition-colors hover:bg-raised hover:text-ink"
            >
              <LogOut size={18} strokeWidth={1.5} aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between border-b border-hairline bg-sidebar px-4 py-2.5 md:hidden">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={34} />
            <div className="flex items-baseline gap-2">
              <span className="text-base font-medium tracking-tight">{CAFE_NAME}</span>
              <span className="font-mono text-xs text-ink-3">{CAFE_INSTAGRAM}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <PwaInstallButton compact />
            <ThemeToggle compact />
            <form action={logout}>
              <button
                type="submit"
                className="flex min-h-11 items-center gap-2 rounded-control px-3 text-sm text-ink-2 transition-colors hover:bg-raised hover:text-ink"
              >
                <LogOut size={16} strokeWidth={1.5} aria-hidden />
                Sign out
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 md:px-8 md:pb-10 md:pt-8">
          <OfflineSyncBar />
          {children}
        </main>
      </div>
    </div>
  );
}
