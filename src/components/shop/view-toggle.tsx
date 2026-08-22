import Link from "next/link";
import { copy } from "@/content/copy";
import { shopCopy } from "@/content/shop-copy";

/**
 * Grid or ledger. Two links, no JS: the mode is a URL fact like every other
 * piece of shop state, so it survives a share and a back button.
 */
export function ViewToggle({
  view,
  gridHref,
  ledgerHref,
}: {
  view: "grid" | "ledger";
  gridHref: string;
  ledgerHref: string;
}) {
  const options = [
    { key: "grid" as const, href: gridHref, label: copy.shop.grid },
    { key: "ledger" as const, href: ledgerHref, label: copy.shop.ledger },
  ];

  return (
    <div className="flex items-center gap-2.5">
      <span id="shop-view-label" className="spec">
        {shopCopy.view}
      </span>
      <div
        role="group"
        aria-labelledby="shop-view-label"
        className="flex items-center border border-rule-strong"
      >
        {options.map((option) => {
          const active = view === option.key;
          return (
            <Link
              key={option.key}
              href={option.href}
              aria-current={active ? "true" : undefined}
              className={`spec px-3 py-1.5 transition-colors ${
                active ? "bg-paper-deep text-ink" : "text-ink-3 hover:text-ink"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
