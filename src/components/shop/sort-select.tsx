"use client";

import { copy } from "@/content/copy";
import { shopCopy } from "@/content/shop-copy";

/**
 * A plain GET form. With JS the select submits itself on change; without it,
 * the noscript button does the same job. No router, no state, no props back
 * into the URL module — everything it must preserve arrives as hidden fields.
 */
export function SortSelect({
  action,
  value,
  hidden,
}: {
  action: string;
  value: string;
  hidden: { name: string; value: string }[];
}) {
  return (
    <form method="get" action={action} className="flex items-center gap-2.5">
      {hidden.map((h) => (
        <input key={`${h.name}-${h.value}`} type="hidden" name={h.name} value={h.value} />
      ))}
      <label htmlFor="shop-sort" className="spec">
        {copy.shop.sortBy}
      </label>
      <select
        id="shop-sort"
        name="sort"
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="spec-value cursor-pointer border-b border-rule-strong bg-transparent py-1 pr-1 text-ink hover:border-ink focus-visible:outline-offset-4"
      >
        {shopCopy.sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <noscript>
        <button
          type="submit"
          className="spec border border-rule-strong px-2 py-1 text-ink hover:border-ink"
        >
          {shopCopy.apply}
        </button>
      </noscript>
    </form>
  );
}
