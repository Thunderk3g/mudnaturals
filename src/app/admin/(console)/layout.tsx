import type { ReactNode } from "react";
import { requireSession } from "@/lib/admin-auth";
import { getConsoleCounts } from "@/server/admin";
import { getChrome } from "@/server/cms";
import { logoutAction } from "../actions";
import { ConsoleShell, type NavGroup } from "../shell";

/**
 * Everything under this group is behind the session. Middleware already turned
 * away requests with no cookie; this verifies the signature, which middleware
 * cannot do on the Edge runtime.
 *
 * The rail is grouped by the job being done rather than by the table being
 * touched — "Website", "Shop", "Communities" — because the person using this is
 * a shop manager, and the first question they have is always "where do I go to
 * change X", never "which table is X in".
 */
export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  await requireSession();

  const [counts, chrome] = await Promise.all([getConsoleCounts(), getChrome()]);

  const nav: NavGroup[] = [
    {
      group: "Today",
      items: [{ href: "/admin", label: "Dashboard" }],
    },
    {
      group: "Orders",
      items: [
        { href: "/admin/orders", label: "All orders", badge: counts.orders_open },
        { href: "/admin/orders/cod", label: "Phone confirmations", badge: counts.cod_pending },
        { href: "/admin/orders/reconciliation", label: "Payments to check", badge: counts.to_reconcile },
      ],
    },
    {
      group: "Website",
      items: [
        { href: "/admin/website", label: "Pages & sections" },
        { href: "/admin/media", label: "Photos" },
        { href: "/admin/settings", label: "Menu & site text" },
      ],
    },
    {
      group: "Shop",
      items: [
        { href: "/admin/products", label: "Products" },
        { href: "/admin/categories", label: "Categories" },
        { href: "/admin/collections", label: "Collections" },
        { href: "/admin/stock", label: "Stock" },
      ],
    },
    {
      group: "Communities",
      items: [
        { href: "/admin/communities", label: "Communities" },
        { href: "/admin/makers", label: "Makers" },
        { href: "/admin/impact", label: "Impact" },
      ],
    },
    {
      group: "Stories",
      items: [{ href: "/admin/journal", label: "Journal" }],
    },
  ];

  return (
    <ConsoleShell
      nav={nav}
      storeName={chrome.site.brand_name}
      storeUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "/"}
      signOut={
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-sm border border-white/15 px-3 py-2 text-left text-[0.8125rem] text-paper/70 transition-colors hover:border-white/40 hover:text-paper"
          >
            Sign out
          </button>
        </form>
      }
    >
      {/* No top padding: `PageHeader` is the sticky bar and paints its own. */}
      <main id="console" className="px-5 pb-20 lg:px-8">
        {children}
      </main>
    </ConsoleShell>
  );
}
