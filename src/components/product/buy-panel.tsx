"use client";

import { useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { Price, StockPill } from "@/components/ui/spec";
import { formatNpr } from "@/lib/money";
import { copy } from "@/content/copy";
import { productCopy } from "@/content/product-copy";
import type { ProductVariant } from "@/server/queries";
import { StickyBuyBar } from "./sticky-buy-bar";

/** First available default, else first available, else the first row. */
function initialVariant(variants: ProductVariant[]) {
  return (
    variants.find((v) => v.is_default && v.available > 0) ??
    variants.find((v) => v.available > 0) ??
    variants[0]
  );
}

export function BuyPanel({
  productName,
  variants,
  fallbackPricePaisa,
}: {
  productName: string;
  variants: ProductVariant[];
  fallbackPricePaisa: number;
}) {
  const { add } = useCart();
  const [selectedId, setSelectedId] = useState(() => initialVariant(variants)?.id ?? "");
  const [adding, setAdding] = useState(false);
  // Counter, not a boolean: re-keying the live region makes a second add announce again.
  const [added, setAdded] = useState(0);
  const anchorRef = useRef<HTMLDivElement>(null);

  const selected = variants.find((v) => v.id === selectedId) ?? null;
  const pricePaisa = selected?.price_paisa ?? fallbackPricePaisa;
  const available = selected?.available ?? 0;
  const soldOut = available <= 0;

  async function onAdd() {
    if (!selected || selected.available <= 0 || adding) return;
    setAdding(true);
    try {
      await add(selected.id, 1);
      setAdded((n) => n + 1);
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <p className="mt-5">
        <Price className="text-2xl" muted={soldOut}>
          {formatNpr(pricePaisa)}
        </Price>
      </p>

      {variants.length > 1 ? (
        <fieldset className="mt-7">
          <legend className="spec mb-2.5">
            {variants[0].option_name ?? productCopy.option}
          </legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => {
              const out = variant.available <= 0;
              return (
                <label
                  key={variant.id}
                  className={`spec-value inline-flex items-center border px-4 py-2 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-clay ${
                    out
                      ? "cursor-not-allowed border-rule text-ink-3 line-through decoration-rule-strong"
                      : "cursor-pointer border-rule-strong hover:border-ink has-[:checked]:border-ink has-[:checked]:bg-paper-deep"
                  }`}
                >
                  <input
                    type="radio"
                    name="variant"
                    className="sr-only"
                    value={variant.id}
                    checked={variant.id === selectedId}
                    disabled={out}
                    onChange={() => setSelectedId(variant.id)}
                  />
                  {variant.option_value ?? variant.sku}
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <p className="mt-6">
        <StockPill available={available} />
      </p>

      <div ref={anchorRef} className="mt-4">
        <Button
          size="lg"
          className="w-full"
          onClick={onAdd}
          disabled={soldOut || adding || !selected}
        >
          {adding ? copy.product.adding : soldOut ? copy.product.soldOut : copy.product.addToCart}
        </Button>
      </div>

      <div aria-live="polite" role="status" className="mt-2 min-h-5">
        {added > 0 ? (
          <p key={added} className="spec text-ok">
            {copy.product.added}
          </p>
        ) : null}
      </div>

      <div className="mt-5 space-y-1 text-sm text-ink-2">
        <p>{copy.product.shippingNote}</p>
        <p>{copy.product.deliveryEstimate}</p>
      </div>

      <StickyBuyBar
        watch={anchorRef}
        name={productName}
        variantLabel={variants.length > 1 ? (selected?.option_value ?? null) : null}
        price={formatNpr(pricePaisa)}
        disabled={soldOut || !selected}
        adding={adding}
        onAdd={onAdd}
      />
    </>
  );
}
