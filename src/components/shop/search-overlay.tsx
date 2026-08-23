"use client";

import { useEffect, useRef, useState } from "react";
import { Loom } from "@/components/loaders";
import { copy } from "@/content/copy";
import { shopCopy } from "@/content/shop-copy";

/**
 * A controlled overlay over `/search`. It submits a real GET form to the real
 * page, so the overlay is only ever a shortcut — the destination works on its
 * own and nothing here is load-bearing.
 *
 * Not wired into the header: the header owns its own trigger and decides
 * whether to open this or simply link to /search.
 */
export function SearchOverlay({
  open,
  onClose,
  defaultValue = "",
}: {
  open: boolean;
  onClose: () => void;
  defaultValue?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // The form is a real GET to /search, so submitting is a document navigation
  // and this overlay keeps painting until the new page arrives. Without a mark
  // of some kind that reads as a dead click on a slow connection.
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubmitting(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.nav.search}
      className="fixed inset-0 z-50 bg-paper"
    >
      <div className="container-page pt-24">
        <div className="flex items-center justify-between">
          <p className="spec">{copy.nav.search}</p>
          <button type="button" onClick={onClose} className="spec text-ink hover:text-clay">
            {copy.nav.close}
          </button>
        </div>

        <form
          method="get"
          action="/search"
          role="search"
          onSubmit={() => setSubmitting(true)}
          className="mt-6 flex items-center gap-4 border-b border-rule-strong pb-3"
        >
          <label htmlFor="overlay-q" className="sr-only">
            {copy.shop.searchPlaceholder}
          </label>
          <input
            ref={inputRef}
            id="overlay-q"
            name="q"
            type="search"
            defaultValue={defaultValue}
            placeholder={copy.shop.searchPlaceholder}
            autoComplete="off"
            className="w-full min-w-0 bg-transparent py-2 text-xl text-ink placeholder:text-ink-3 focus:outline-none lg:text-3xl"
          />
          {submitting ? (
            <span className="shrink-0">
              <Loom size="sm" label={shopCopy.loading} />
            </span>
          ) : (
            <button type="submit" className="spec shrink-0 text-ink hover:text-clay">
              {shopCopy.searchSubmit}
            </button>
          )}
        </form>

        <p className="mt-4 spec">{shopCopy.searchPrompt}</p>
      </div>
    </div>
  );
}
