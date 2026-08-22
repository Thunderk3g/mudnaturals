"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { copy } from "@/content/copy";

/**
 * Sticky catalogue masthead. Five primary items plus utilities; "Our Story" is
 * a disclosure so Impact stays page-tier and never nav-tier.
 */

const PRIMARY = [
  { href: "/shop", label: copy.nav.shop },
  { href: "/collections", label: copy.nav.collections },
  { href: "/makers", label: copy.nav.makers },
  { href: "/journal", label: copy.nav.journal },
];

const STORY = [
  { href: "/about", label: copy.nav.story },
  { href: "/impact", label: copy.nav.impact },
  { href: "/craft", label: copy.nav.craft },
  { href: "/contact", label: copy.nav.contact },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function IconSearch() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13.2 13.2 17.5 17.5" strokeLinecap="round" />
    </svg>
  );
}

function IconAccount() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="10" cy="7" r="3.2" />
      <path d="M3.8 17c.7-3.3 3.2-5 6.2-5s5.5 1.7 6.2 5" strokeLinecap="round" />
    </svg>
  );
}

function IconCart() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4.4 6.5h11.2l-1 10.2H5.4L4.4 6.5Z" strokeLinejoin="round" />
      <path d="M7.4 6.5V5.1a2.6 2.6 0 0 1 5.2 0v1.4" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { count } = useCart();
  const [storyOpen, setStoryOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const storyId = useId();
  const mobileId = useId();

  // A menu left open across a navigation is the classic disclosure bug.
  useEffect(() => {
    setStoryOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  const storyActive = STORY.some((item) => isActive(pathname, item.href));

  return (
    <header
      className="sticky top-0 z-50 border-b border-rule bg-paper"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setStoryOpen(false);
          setMobileOpen(false);
        }
      }}
    >
      <div className="container-page flex h-16 items-center justify-between gap-6 lg:h-20">
        <div className="flex items-center gap-5">
          <button
            type="button"
            className="spec text-ink lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls={mobileId}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? copy.nav.close : copy.nav.menu}
          </button>

          <Link href="/" className="shrink-0 leading-none">
            <span className="block font-serif text-xl lg:text-2xl">{copy.brand.name}</span>
            <span className="spec mt-1 hidden lg:block">{copy.brand.tagline}</span>
          </Link>
        </div>

        <nav aria-label={copy.nav.menu} className="hidden items-center gap-8 lg:flex">
          {PRIMARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={`spec hover:text-clay ${isActive(pathname, item.href) ? "text-clay" : "text-ink"}`}
            >
              {item.label}
            </Link>
          ))}

          <div
            className="relative"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setStoryOpen(false);
            }}
          >
            <button
              type="button"
              aria-expanded={storyOpen}
              aria-controls={storyId}
              onClick={() => setStoryOpen((open) => !open)}
              className={`spec flex items-center gap-1.5 hover:text-clay ${storyActive ? "text-clay" : "text-ink"}`}
            >
              {copy.nav.story}
              <span aria-hidden className="text-[0.6em] leading-none">▼</span>
            </button>

            <div
              id={storyId}
              hidden={!storyOpen}
              className="absolute right-0 top-[calc(100%+1.1rem)] w-60 border border-rule bg-surface py-2"
            >
              {STORY.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  className={`block px-5 py-2.5 text-sm hover:bg-paper-deep hover:text-clay ${
                    isActive(pathname, item.href) ? "text-clay" : "text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-4 lg:gap-6">
          <Link href="/search" aria-label={copy.nav.search} className="text-ink hover:text-clay">
            <IconSearch />
          </Link>
          <Link href="/account" aria-label={copy.nav.account} className="hidden text-ink hover:text-clay sm:block">
            <IconAccount />
          </Link>
          <Link href="/cart" aria-label={copy.a11y.openCart} className="flex items-center gap-1.5 text-ink hover:text-clay">
            <IconCart />
            {count > 0 ? <span className="spec tabular-nums text-ink">{count}</span> : null}
          </Link>
        </div>
      </div>

      <div
        id={mobileId}
        hidden={!mobileOpen}
        className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-rule bg-paper lg:hidden"
      >
        <nav aria-label={copy.nav.menu} className="container-page py-8">
          {PRIMARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={`block border-b border-rule py-4 font-serif text-2xl ${
                isActive(pathname, item.href) ? "text-clay" : "text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}

          <p className="spec pt-8 pb-2">{copy.nav.story}</p>
          {STORY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={`block border-b border-rule py-3.5 text-base ${
                isActive(pathname, item.href) ? "text-clay" : "text-ink-2"
              }`}
            >
              {item.label}
            </Link>
          ))}

          <Link href="/account" className="spec mt-8 block text-ink">
            {copy.nav.account}
          </Link>
        </nav>
      </div>
    </header>
  );
}
