"use client";

import { useEffect, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/spec";
import { copy } from "@/content/copy";

/**
 * Appears once the real Add to cart has scrolled off the top. Reduced motion is
 * honoured twice over — `motion-reduce:transition-none` here, and the global
 * transition kill-switch in globals.css.
 */
export function StickyBuyBar({
  watch,
  name,
  variantLabel,
  price,
  disabled,
  adding,
  onAdd,
}: {
  watch: RefObject<HTMLElement | null>;
  name: string;
  variantLabel: string | null;
  price: string;
  disabled: boolean;
  adding: boolean;
  onAdd: () => void;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = watch.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [watch]);

  return (
    <div
      inert={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper/95 backdrop-blur transition-transform duration-300 motion-reduce:transition-none lg:hidden ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="container-page flex items-center gap-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-tight">{name}</p>
          <p className="spec mt-0.5 truncate">
            {variantLabel ? `${variantLabel} · ` : ""}
            <Price className="text-[0.6875rem]">{price}</Price>
          </p>
        </div>
        <Button onClick={onAdd} disabled={disabled || adding} className="shrink-0">
          {adding ? copy.product.adding : disabled ? copy.product.soldOut : copy.product.addToCart}
        </Button>
      </div>
    </div>
  );
}
