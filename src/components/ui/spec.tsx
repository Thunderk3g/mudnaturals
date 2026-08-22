import type { ReactNode } from "react";

/**
 * The specimen-label register. Every piece of provenance and spec data wears
 * mono — maker, district, material, hours, SKU, dimensions. With no photography
 * budget this layer is the primary carrier of premium feel, so it is used
 * consistently and never for body copy.
 */

export type SpecItem = {
  label: string;
  value: ReactNode;
  href?: string;
};

export function SpecList({
  items,
  className = "",
  columns = 1,
}: {
  items: SpecItem[];
  className?: string;
  columns?: 1 | 2;
}) {
  const rows = items.filter((item) => item.value !== null && item.value !== undefined && item.value !== "");
  if (!rows.length) return null;

  return (
    <dl
      className={`${
        columns === 2 ? "grid grid-cols-1 gap-x-10 sm:grid-cols-2" : "block"
      } ${className}`}
    >
      {rows.map((item) => (
        <div
          key={item.label}
          className="flex items-baseline justify-between gap-6 border-b border-rule py-2.5 last:border-b-0"
        >
          <dt className="spec shrink-0">{item.label}</dt>
          <dd className="spec-value text-right">
            {item.href ? (
              <a href={item.href} className="underline decoration-rule-strong underline-offset-4 hover:text-clay hover:decoration-clay">
                {item.value}
              </a>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A single inline credit, used above a product name on cards and headers. */
export function ProvenanceLine({
  maker,
  district,
  className = "",
}: {
  maker?: string | null;
  district?: string | null;
  className?: string;
}) {
  const parts = [maker, district].filter(Boolean);
  if (!parts.length) return null;
  return <p className={`spec ${className}`}>{parts.join(" · ")}</p>;
}

export function Price({
  children,
  className = "",
  muted = false,
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return (
    <span
      className={`font-mono tabular-nums tracking-tight ${
        muted ? "text-ink-2" : "text-clay"
      } ${className}`}
    >
      {children}
    </span>
  );
}

export function StockPill({ available, className = "" }: { available: number; className?: string }) {
  const tone =
    available <= 0 ? "text-ink-3" : available <= 3 ? "text-warn" : "text-ok";
  return (
    <span className={`spec ${tone} ${className}`}>
      <span aria-hidden className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle" />
      {available <= 0 ? "Sold out" : available <= 3 ? `Only ${available} left` : "In stock"}
    </span>
  );
}
