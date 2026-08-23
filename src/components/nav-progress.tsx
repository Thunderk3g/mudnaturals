"use client";

import { useEffect, useState } from "react";

/**
 * The weft bar: one clay thread drawn across the top of the page while a
 * navigation is in flight.
 *
 * The App Router has no router events, so there is nothing to subscribe to.
 * What there *is*, is a guarantee about `template.tsx`: Next remounts it on
 * every completed navigation. So the whole state machine is two halves —
 *
 *   show:  a capture-phase click on a same-origin, unmodified anchor;
 *   hide:  this component being mounted at all.
 *
 * A fresh mount means the new route has committed, so `useState(false)` is the
 * entire "navigation finished" handler. The timeout below is only a failsafe
 * for the case where the click never became a navigation (a `preventDefault`
 * further down the tree, a route that errors out) — without it the bar would
 * spin forever on a page that is going nowhere.
 *
 * Form submits are deliberately not covered: `/search` and the sort control
 * are plain GET forms, so the browser does a document navigation and shows its
 * own progress. Two indicators for one wait is worse than one.
 */
export function NavProgress() {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // Left click, unmodified, not already handled by something else.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      if (anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const next = new URL(anchor.href, window.location.href);
      if (next.origin !== window.location.origin) return;
      // Same document — a hash jump or a link back to where we already are.
      // Neither remounts the template, so the bar would never be turned off.
      if (next.href === window.location.href) return;
      if (next.pathname === window.location.pathname && next.search === window.location.search) {
        return;
      }

      setPending(true);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setPending(false), 8000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  return pending ? <div className="weft-bar" aria-hidden /> : null;
}
