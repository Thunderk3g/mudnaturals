"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Lives here rather than in the layout: a route file may only export the
 * members Next expects, and a stray `export const TABS` from layout.tsx fails
 * the build's route-type check.
 */
export const TABS = [
  { href: "/admin/settings", label: "Site text" },
  { href: "/admin/settings/navigation", label: "Menu" },
  { href: "/admin/settings/seo", label: "Search & sharing" },
  { href: "/admin/settings/commerce", label: "Delivery & payment" },
];

export function SettingsTabs({ tabs = TABS }: { tabs?: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings" className="mb-5 flex flex-wrap gap-1 border-b border-rule">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active ? "border-clay text-ink" : "border-transparent text-ink-2 hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
