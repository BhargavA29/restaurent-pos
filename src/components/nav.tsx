"use client";

import { BarChart3, LayoutGrid, ReceiptText, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/pos", label: "New order", icon: ReceiptText },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/menu", label: "Menu", icon: LayoutGrid },
];

/** One list of links. Sidebar rows on a laptop, a tab bar on a phone (see the layout). */
export function Nav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="contents">
      <ul className="flex w-full justify-around gap-1 md:flex-col md:justify-start md:gap-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const current = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1 md:flex-none">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-control text-xs text-ink-3 transition-colors hover:text-ink aria-[current=page]:bg-raised aria-[current=page]:text-ink aria-[current=page]:shadow-[inset_0_1px_0_var(--hairline)] md:min-h-9 md:flex-row md:justify-start md:gap-2.5 md:px-3 md:text-sm"
              >
                <Icon size={18} strokeWidth={1.5} aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
