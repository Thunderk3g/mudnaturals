"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { priceCart } from "@/app/checkout/actions";
import { formatNpr } from "@/lib/money";
import { Price } from "@/components/ui/spec";
import { EmptyState } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { checkoutCopy, shippingFor, type CartView } from "@/content/checkout-copy";

/**
 * Every line is re-priced from the database on view. The cart itself stores no
 * money, so this is the only place a price is ever read — and if one moved
 * since the object was added, the customer is told before they pay, not after.
 */

const SEEN_KEY = "mud.cart.seen.v1";

function readSeen(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeSeen(view: CartView) {
  try {
    window.localStorage.setItem(
      SEEN_KEY,
      JSON.stringify(Object.fromEntries(view.lines.map((line) => [line.variantId, line.unitPaisa]))),
    );
  } catch {
    // Nothing to do: without a record we simply cannot detect the next change.
  }
}

export type CartState = {
  view: CartView | null;
  loading: boolean;
  /** Repricings noticed since this cart was last looked at, keyed by variant. */
  repriced: Record<string, number>;
  /** True while a line exceeds its stock or has left the shop. */
  blocked: boolean;
};

export function useCartView(enabled = true): CartState {
  const { items, mounted } = useCart();
  const [view, setView] = useState<CartView | null>(null);
  const [repriced, setRepriced] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  // The dependency is the serialised cart, not the array identity: re-rendering
  // the provider must not fire another round trip.
  const key = JSON.stringify(items);

  useEffect(() => {
    if (!mounted || !enabled) return;
    const parsed: { variantId: string; quantity: number }[] = JSON.parse(key);
    if (!parsed.length) {
      setView(null);
      setRepriced({});
      return;
    }

    let cancelled = false;
    setLoading(true);
    priceCart(parsed)
      .then((next) => {
        if (cancelled) return;
        const seen = readSeen();
        const changed: Record<string, number> = {};
        for (const line of next.lines) {
          const before = seen[line.variantId];
          if (before != null && before !== line.unitPaisa) changed[line.variantId] = before;
        }
        writeSeen(next);
        setView(next);
        setRepriced(changed);
      })
      .catch(() => {
        if (!cancelled) setView(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, mounted, enabled]);

  const blocked = Boolean(
    view && (view.missingVariantIds.length > 0 || view.lines.some((l) => l.quantity > l.available)),
  );

  return { view, loading, repriced, blocked };
}

// ------------------------------------------------------------ the lines ----

function Stepper({ variantId, quantity, max }: { variantId: string; quantity: number; max: number }) {
  const { setQuantity } = useCart();
  const ceiling = Math.max(max, 0);

  return (
    <div className="inline-flex items-center border border-rule-strong">
      <button
        type="button"
        onClick={() => setQuantity(variantId, quantity - 1)}
        aria-label={`${copy.cart.quantity}, decrease`}
        className="px-2.5 py-1 text-ink-2 hover:bg-paper-deep hover:text-ink"
      >
        <span aria-hidden>−</span>
      </button>
      <span className="spec-value w-9 text-center tabular-nums" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => setQuantity(variantId, quantity + 1)}
        disabled={quantity >= ceiling}
        aria-label={`${copy.cart.quantity}, increase`}
        className="px-2.5 py-1 text-ink-2 hover:bg-paper-deep hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden>+</span>
      </button>
    </div>
  );
}

export function CartLineList({
  state,
  compact = false,
}: {
  state: CartState;
  compact?: boolean;
}) {
  const { remove } = useCart();
  const { view, repriced } = state;
  if (!view) return null;

  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {view.lines.map((line) => {
        const short = line.quantity > line.available;
        const wasPaisa = repriced[line.variantId];
        return (
          <li key={line.variantId} className="flex gap-4 py-5">
            <Link
              href={`/products/${line.slug}`}
              className="relative block shrink-0 overflow-hidden bg-paper-deep"
              style={{ width: compact ? 64 : 88, height: compact ? 80 : 110 }}
            >
              {line.image ? (
                <Image
                  src={line.image}
                  alt={line.name}
                  fill
                  sizes="88px"
                  className="object-cover"
                />
              ) : null}
            </Link>

            <div className="min-w-0 flex-1">
              {line.makerName ? <p className="spec truncate">{line.makerName}</p> : null}
              <Link href={`/products/${line.slug}`} className="block hover:text-clay">
                <span className={compact ? "text-base leading-snug" : "text-lg leading-snug"}>
                  {line.name}
                </span>
              </Link>
              {line.variantLabel ? (
                <p className="spec-value mt-0.5 text-ink-2">{line.variantLabel}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Stepper variantId={line.variantId} quantity={line.quantity} max={line.available} />
                <button
                  type="button"
                  onClick={() => remove(line.variantId)}
                  className="spec text-ink-3 underline decoration-rule-strong underline-offset-4 hover:text-clay"
                >
                  {copy.cart.remove}
                </button>
              </div>

              {short ? (
                <p className="spec mt-2 text-warn">
                  {line.available > 0
                    ? checkoutCopy.cart.stockShort(line.available)
                    : checkoutCopy.cart.stockGone}
                </p>
              ) : null}
              {wasPaisa != null ? (
                <p className="spec mt-2 text-warn">
                  {checkoutCopy.cart.pricedAt(formatNpr(wasPaisa), formatNpr(line.unitPaisa))}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 text-right">
              <Price>{formatNpr(line.lineTotalPaisa)}</Price>
              {line.quantity > 1 ? (
                <p className="spec mt-1">{formatNpr(line.unitPaisa)} each</p>
              ) : null}
            </div>
          </li>
        );
      })}

      {view.missingVariantIds.map((variantId) => (
        <li key={variantId} className="flex items-center justify-between gap-4 py-5">
          <p className="text-ink-2">{checkoutCopy.cart.lineUnavailable}</p>
          <button
            type="button"
            onClick={() => remove(variantId)}
            className="spec text-ink underline decoration-rule-strong underline-offset-4 hover:text-clay"
          >
            {checkoutCopy.cart.removeUnavailable}
          </button>
        </li>
      ))}
    </ul>
  );
}

// -------------------------------------------------------------- totals ----

/**
 * Delivery is shown here, in the cart, at the worst-case rate — a courier
 * charge first revealed at the payment step is the single largest cause of an
 * abandoned Nepali cart.
 */
export function DeliveryEstimate({
  view,
  district = null,
}: {
  view: CartView;
  district?: string | null;
}) {
  const { subtotalPaisa, shipping } = view;
  const cost = shippingFor(subtotalPaisa, district, shipping);
  const remaining = shipping.free_over_paisa - subtotalPaisa;
  const progress = Math.min(100, Math.round((subtotalPaisa / shipping.free_over_paisa) * 100));
  const free = cost === 0 && subtotalPaisa > 0;

  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-6 border-b border-rule py-2.5">
        <span className="spec">
          {district ? copy.cart.shipping : checkoutCopy.cart.estimatedDelivery}
        </span>
        <span className="spec-value tabular-nums">
          {free ? copy.cart.shippingFree : formatNpr(cost)}
        </span>
      </div>

      {district ? (
        <p className="spec mt-2">
          {shipping.valley_districts.includes(district)
            ? checkoutCopy.cart.deliveryInsideValley
            : checkoutCopy.cart.deliveryOutsideValley}
          {" · "}
          {district}
        </p>
      ) : (
        <p className="spec mt-2">{checkoutCopy.cart.estimateNote}</p>
      )}

      {remaining > 0 ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className="spec">{checkoutCopy.cart.freeProgressLabel}</span>
            <span className="spec-value tabular-nums text-ink-2">
              {copy.cart.freeShippingProgress(formatNpr(remaining))}
            </span>
          </div>
          <div className="mt-2 h-1 w-full bg-rule" role="presentation">
            <div className="h-1 bg-clay" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : subtotalPaisa > 0 ? (
        <p className="spec mt-4 text-ok">{copy.cart.freeShippingReached}</p>
      ) : null}
    </div>
  );
}

export function CartTotals({ view, district = null }: { view: CartView; district?: string | null }) {
  const shippingPaisa = shippingFor(view.subtotalPaisa, district, view.shipping);
  return (
    <div className="flex items-baseline justify-between gap-6 border-t border-rule-strong pt-4">
      <span className="spec text-ink">{copy.cart.total}</span>
      <Price className="text-lg">{formatNpr(view.subtotalPaisa + shippingPaisa)}</Price>
    </div>
  );
}

export function CartSubtotal({ view }: { view: CartView }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-rule py-2.5">
      <span className="spec">{copy.cart.subtotal}</span>
      <span className="spec-value tabular-nums">{formatNpr(view.subtotalPaisa)}</span>
    </div>
  );
}

// ------------------------------------------------------------ /cart body ----

/** The canonical cart. Lives here so `/cart/page.tsx` can stay a server page. */
export function CartPageBody() {
  const { count, mounted } = useCart();
  const state = useCartView();
  const { view, loading, blocked } = state;

  if (!mounted || (loading && !view)) {
    return <p className="spec py-16">{checkoutCopy.cart.loading}</p>;
  }

  if (count === 0 || !view) {
    return (
      <EmptyState
        title={copy.cart.empty}
        action={<LinkButton href="/shop" size="lg">{copy.cart.emptyCta}</LinkButton>}
      />
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
      <div aria-live="polite">
        <p className="sr-only">{checkoutCopy.cart.summary(count, formatNpr(view.subtotalPaisa))}</p>
        <CartLineList state={state} />
        <Link
          href="/shop"
          className="spec mt-6 inline-block text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-clay"
        >
          {copy.cart.continueShopping}
        </Link>
      </div>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        <h2 className="spec border-b border-rule-strong pb-3 text-ink">{copy.checkout.orderSummary}</h2>
        <div className="mt-4">
          <CartSubtotal view={view} />
        </div>
        <DeliveryEstimate view={view} />
        <div className="mt-6">
          <CartTotals view={view} />
        </div>

        {blocked ? (
          <p className="spec mt-4 text-warn" role="alert">
            {checkoutCopy.cart.blocked}
          </p>
        ) : null}

        <LinkButton
          href="/checkout"
          size="lg"
          className={`mt-6 w-full ${blocked ? "pointer-events-none opacity-45" : ""}`}
          aria-disabled={blocked || undefined}
          tabIndex={blocked ? -1 : undefined}
        >
          {copy.cart.checkout}
        </LinkButton>
        <p className="spec mt-3">{copy.checkout.guestNote}</p>
      </aside>
    </div>
  );
}
