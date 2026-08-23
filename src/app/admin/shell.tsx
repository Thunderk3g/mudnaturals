"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * The console shell: a fixed left rail, a sticky bar, and the page.
 *
 * The rail is the whole information architecture made visible — an operator
 * should never have to remember where something lives, and every destination in
 * the console is one click from every other. Labels are the words a shop
 * manager would use, not the words the schema uses: "Photos", not "Media
 * assets"; "Phone confirmations", not "COD queue".
 *
 * Client-side only because of two things: the active link needs `usePathname`,
 * and the rail slides away on a phone.
 */

export type NavItem = { href: string; label: string; hint?: string; badge?: number };
export type NavGroup = { group: string; items: NavItem[] };

const icons: Record<string, ReactNode> = {
  "/admin": (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="11" width="7" height="10" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
    </>
  ),
  "/admin/orders": (
    <>
      <path d="M6 4h9l3 3v13H6z" />
      <path d="M9 9h6M9 13h6M9 17h4" />
    </>
  ),
  "/admin/orders/cod": (
    <>
      <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4h-2A14 14 0 0 1 5 6z" />
    </>
  ),
  "/admin/orders/reconciliation": (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  "/admin/website": (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 9v11" />
    </>
  ),
  "/admin/media": (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4 18 5-4 4 3 3-2 4 3" />
    </>
  ),
  "/admin/settings": (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  "/admin/products": (
    <>
      <path d="M12 3 4 7v10l8 4 8-4V7z" />
      <path d="m4 7 8 4 8-4M12 11v10" />
    </>
  ),
  "/admin/categories": (
    <>
      <path d="m12 3 9 5-9 5-9-5z" />
      <path d="m3 13 9 5 9-5" />
    </>
  ),
  "/admin/collections": (
    <>
      <path d="M3 12 12 3h6a3 3 0 0 1 3 3v6l-9 9z" />
      <circle cx="16.5" cy="7.5" r="1.3" />
    </>
  ),
  "/admin/stock": (
    <>
      <path d="M3 7h18v13H3z" />
      <path d="M3 7 6 3h12l3 4M10 12h4" />
    </>
  ),
  "/admin/communities": (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5M21 20a6 6 0 0 0-4-5.6" />
    </>
  ),
  "/admin/makers": (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  "/admin/impact": (
    <>
      <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
    </>
  ),
  "/admin/journal": (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4M10 12h5M10 16h4" />
    </>
  ),
};

function Icon({ href }: { href: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[17px] w-[17px] shrink-0 opacity-80"
      aria-hidden="true"
    >
      {icons[href] ?? icons["/admin"]}
    </svg>
  );
}

/**
 * Exactly one item in the rail is highlighted: the one whose address is the
 * longest prefix of where you are.
 *
 * A plain prefix test would light up both `/admin/orders` and
 * `/admin/orders/cod` while you stand on the second, and an exact test would
 * light up nothing at all while you read one order. Longest-match gives the
 * right answer to both without listing special cases.
 */
function bestMatch(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (best === null || href.length > best.length)) best = href;
  }
  return best;
}

export function ConsoleShell({
  nav,
  storeName,
  storeUrl,
  children,
  signOut,
}: {
  nav: NavGroup[];
  storeName: string;
  storeUrl: string;
  children: ReactNode;
  signOut: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // A tap in the rail on a phone should close it; without this the panel stays
  // over the page you just navigated to.
  useEffect(() => setOpen(false), [pathname]);

  const active = bestMatch(
    pathname,
    nav.flatMap((group) => group.items.map((item) => item.href))
  );

  return (
    <div className="min-h-screen bg-paper-deep">
      <a href="#console" className="skip-link">
        Skip to content
      </a>

      {/* Scrim, phone only. */}
      <button
        type="button"
        aria-hidden={!open}
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-ink/40 transition-opacity duration-200 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col bg-ink text-paper transition-transform duration-200 ease-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <Link href="/admin" className="font-mono text-[0.8125rem] tracking-[0.22em] text-paper">
            MUD
          </Link>
          <span className="rounded-full border border-white/20 px-2 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-clay-soft">
            Console
          </span>
        </div>

        <a
          href={storeUrl}
          target="_blank"
          rel="noreferrer"
          className="mx-3 mt-3 flex items-center gap-2.5 rounded-sm bg-white/5 px-3 py-2.5 transition-colors hover:bg-white/10"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-clay text-xs font-bold text-white">
            M
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.8125rem] font-semibold text-paper">{storeName}</span>
            <span className="block truncate text-[0.6875rem] text-paper/50">View the live site ↗</span>
          </span>
        </a>

        <nav aria-label="Console" className="flex-1 overflow-y-auto px-3 pt-2 pb-6">
          {nav.map((group) => (
            <div key={group.group}>
              <p className="px-3 pt-4 pb-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-paper/40">
                {group.group}
              </p>
              {group.items.map((item) => {
                const here = item.href === active;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={here ? "page" : undefined}
                    className={`mb-px flex items-center gap-3 rounded-sm px-3 py-2 text-[0.8125rem] font-medium transition-colors ${
                      here ? "bg-clay text-white" : "text-paper/70 hover:bg-white/[0.07] hover:text-paper"
                    }`}
                  >
                    <Icon href={item.href} />
                    <span className="truncate">{item.label}</span>
                    {item.badge ? (
                      <span
                        className={`ml-auto rounded-full px-1.5 py-px font-mono text-[0.625rem] font-bold ${
                          here ? "bg-white/25 text-white" : "bg-white/15 text-paper"
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">{signOut}</div>
      </aside>

      <div className="lg:ml-[248px]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 left-4 z-30 flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper shadow-lg lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Menu
        </button>
        {children}
      </div>
    </div>
  );
}

