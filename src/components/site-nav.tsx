"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import type { NavLink } from "@/lib/site-settings";
import { useCart } from "@/components/cart/cart-provider";
import { copy } from "@/content/copy";

/**
 * The interactive half of the masthead: the mobile disclosure, the active-route
 * marking, and the scroll state that tightens the bar.
 *
 * The links themselves are settings, passed down from the server component that
 * reads them. Nothing about the navigation is decided in here.
 */

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

function IconTrackOrder() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M10 2.6 17 6v8l-7 3.4L3 14V6l7-3.4Z" strokeLinejoin="round" />
      <path d="M3 6l7 3.4L17 6M10 9.4v8" strokeLinejoin="round" />
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

/**
 * Scroll state, read once per frame.
 *
 * A raw scroll handler that touches the DOM fires far more often than the
 * browser paints; this coalesces to one read per animation frame and only
 * re-renders on the single frame the boolean actually flips.
 */
function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      setScrolled(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return scrolled;
}

export function SiteNav({
  brandName,
  tagline,
  primary,
}: {
  brandName: string;
  tagline: string;
  primary: NavLink[];
}) {
  const pathname = usePathname();
  const { count } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileId = useId();
  const scrolled = useScrolled();

  // A menu left open across a navigation is the classic disclosure bug.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      data-scrolled={scrolled ? "true" : "false"}
      className="masthead sticky top-0 z-50 border-b border-rule bg-paper"
      onKeyDown={(event) => {
        if (event.key === "Escape") setMobileOpen(false);
      }}
    >
      <div className="container-page masthead-row flex items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <button
            type="button"
            className="spec text-ink transition-colors duration-300 hover:text-clay lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls={mobileId}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? copy.nav.close : copy.nav.menu}
          </button>

          <Link href="/" className="shrink-0 leading-none">
            <span className="block font-serif text-xl lg:text-2xl">{brandName}</span>
            {tagline ? <span className="spec masthead-sub mt-1 hidden lg:block">{tagline}</span> : null}
          </Link>
        </div>

        <nav aria-label={copy.nav.menu} className="hidden items-center gap-8 lg:flex">
          {primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={`spec link-wipe transition-colors duration-300 hover:text-clay ${
                isActive(pathname, item.href) ? "text-clay" : "text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 lg:gap-6">
          <Link
            href="/search"
            aria-label={copy.nav.search}
            className="text-ink transition-colors duration-300 hover:text-clay"
          >
            <IconSearch />
          </Link>
          <Link
            href="/order/lookup"
            aria-label={copy.nav.trackOrder}
            className="hidden text-ink transition-colors duration-300 hover:text-clay sm:block"
          >
            <IconTrackOrder />
          </Link>
          <Link
            href="/cart"
            aria-label={copy.a11y.openCart}
            className="flex items-center gap-1.5 text-ink transition-colors duration-300 hover:text-clay"
          >
            <IconCart />
            {count > 0 ? <span className="spec tabular-nums text-ink">{count}</span> : null}
          </Link>
        </div>
      </div>

      {/* Anchored to the unscrolled header height, which is why the bar only
          tightens from `lg` up — on mobile it stays 4rem and this stays flush. */}
      <div
        id={mobileId}
        hidden={!mobileOpen}
        className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-rule bg-paper lg:hidden"
      >
        <nav aria-label={copy.nav.menu} className="container-page py-8">
          {primary.map((item) => (
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

          <Link href="/order/lookup" className="spec mt-8 block text-ink">
            {copy.nav.trackOrder}
          </Link>
        </nav>
      </div>
    </header>
  );
}
