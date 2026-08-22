"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart } from "@/components/cart/cart-provider";
import {
  CartLineList,
  CartSubtotal,
  DeliveryEstimate,
  useCartView,
} from "@/components/cart/cart-lines";
import { LinkButton } from "@/components/ui/button";
import { formatNpr } from "@/lib/money";
import { copy } from "@/content/copy";
import { checkoutCopy } from "@/content/checkout-copy";

/**
 * Slides in on add and stays out of the way. It never redirects to checkout on
 * its own — the shopper decides when they are finished, and `/cart` is the
 * canonical page either way.
 */
export function MiniCart() {
  const { isOpen, close, count } = useCart();
  const state = useCartView(isOpen);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  const { view, loading } = state;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={copy.nav.close}
        onClick={close}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/25"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={copy.cart.title}
        tabIndex={-1}
        className="rise absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-paper shadow-2xl focus:outline-none"
      >
        <header className="flex items-center justify-between gap-4 border-b border-rule px-6 py-5">
          <div>
            <p className="spec">{checkoutCopy.cart.miniTitle}</p>
            <h2 className="mt-1 text-2xl">{copy.cart.title}</h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="spec px-2 py-1 text-ink hover:text-clay"
          >
            {copy.nav.close}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6" aria-live="polite">
          {count === 0 ? (
            <div className="py-16 text-center">
              <p className="text-ink-2">{copy.cart.empty}</p>
              <Link
                href="/shop"
                onClick={close}
                className="spec mt-4 inline-block text-ink underline decoration-rule-strong underline-offset-4 hover:text-clay"
              >
                {copy.cart.emptyCta}
              </Link>
            </div>
          ) : !view ? (
            <p className="spec py-10">{loading ? checkoutCopy.cart.loading : copy.a11y.loading}</p>
          ) : (
            <>
              <p className="sr-only">
                {checkoutCopy.cart.summary(count, formatNpr(view.subtotalPaisa))}
              </p>
              <CartLineList state={state} compact />
              <div className="pb-6">
                <div className="mt-5">
                  <CartSubtotal view={view} />
                </div>
                <DeliveryEstimate view={view} />
              </div>
            </>
          )}
        </div>

        {count > 0 ? (
          <footer className="border-t border-rule px-6 py-5">
            {state.blocked ? (
              <p className="spec mb-3 text-warn">{checkoutCopy.cart.blocked}</p>
            ) : null}
            <LinkButton href="/cart" onClick={close} size="lg" className="w-full">
              {checkoutCopy.cart.viewCart}
            </LinkButton>
            <button
              type="button"
              onClick={close}
              className="spec mt-3 w-full text-center text-ink-2 hover:text-clay"
            >
              {copy.cart.continueShopping}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
