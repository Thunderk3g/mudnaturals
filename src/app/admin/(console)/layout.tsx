import Link from "next/link";
import type { ReactNode } from "react";
import { requireSession } from "@/lib/admin-auth";
import { logoutAction } from "../actions";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/orders/cod", label: "COD queue" },
  { href: "/admin/orders/reconciliation", label: "Reconciliation" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/makers", label: "Makers" },
  { href: "/admin/communities", label: "Communities" },
  { href: "/admin/impact", label: "Impact" },
  { href: "/admin/journal", label: "Journal" },
];

/**
 * Everything under this group is behind the session. Middleware already turned
 * away requests with no cookie; this verifies the signature, which middleware
 * cannot do on the Edge runtime.
 */
export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  await requireSession();

  return (
    <div className="min-h-screen">
      {/* Deliberately not sticky: the sticky slot at the top of the viewport
          belongs to table headers, which matter more when scanning long lists. */}
      <header className="border-b border-rule-strong bg-paper-deep">
        <div className="mx-auto flex max-w-[100rem] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <Link href="/admin" className="spec whitespace-nowrap text-ink">
            MUD · OPS
          </Link>
          <nav aria-label="Console" className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-ink-2 hover:text-clay hover:underline underline-offset-4"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={logoutAction}>
            <button
              type="submit"
              className="border border-rule-strong px-2 py-1 text-xs text-ink-2 hover:border-ink hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-[100rem] px-4 py-6">{children}</main>
    </div>
  );
}
