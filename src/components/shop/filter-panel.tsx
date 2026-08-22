"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { shopCopy } from "@/content/shop-copy";
import type { Facet, HiddenField } from "@/components/shop/filter-bar";

/**
 * The facet form: a real `<form method="get">` with real inputs, so filtering
 * works with JS switched off. The only thing JS adds is the mobile drawer.
 *
 * Multi-select facets are checkboxes, single-select ones radios with an
 * explicit "any" option. Options that would return nothing are already gone by
 * the time they get here — see `buildFacets`.
 */

function FacetForm({
  action,
  hidden,
  facets,
  scope,
  formKey,
}: {
  action: string;
  hidden: HiddenField[];
  facets: Facet[];
  scope: string;
  formKey: string;
}) {
  return (
    <form key={formKey} method="get" action={action} className="space-y-8">
      {hidden.map((h) => (
        <input key={`${h.name}-${h.value}`} type="hidden" name={h.name} value={h.value} />
      ))}

      {facets.map((facet) => {
        const anySelected = facet.options.some((o) => o.checked);
        return (
          <fieldset key={facet.name} className="min-w-0 border-0 p-0">
            <legend className="spec mb-3 w-full border-b border-rule pb-2">{facet.legend}</legend>
            <ul className="space-y-2.5">
              {!facet.multi ? (
                <li>
                  <label
                    htmlFor={`${scope}-${facet.name}-any`}
                    className="group flex cursor-pointer items-center gap-2.5"
                  >
                    <input
                      id={`${scope}-${facet.name}-any`}
                      type="radio"
                      name={facet.name}
                      value=""
                      defaultChecked={!anySelected}
                      className="h-4 w-4 shrink-0 accent-clay"
                    />
                    <span className="spec-value text-ink-2 group-hover:text-clay">
                      {facet.name === "price" ? shopCopy.anyPrice : shopCopy.anyCategory}
                    </span>
                  </label>
                </li>
              ) : null}

              {facet.options.map((option) => (
                <li key={option.value}>
                  <label
                    htmlFor={`${scope}-${facet.name}-${option.value}`}
                    className="group flex cursor-pointer items-center justify-between gap-4"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <input
                        id={`${scope}-${facet.name}-${option.value}`}
                        type={facet.multi ? "checkbox" : "radio"}
                        name={facet.name}
                        value={option.value}
                        defaultChecked={option.checked}
                        className="h-4 w-4 shrink-0 accent-clay"
                      />
                      <span
                        className={`spec-value truncate group-hover:text-clay ${
                          option.checked ? "text-ink" : "text-ink-2"
                        }`}
                      >
                        {option.label}
                      </span>
                    </span>
                    <span className="spec shrink-0 tabular-nums">{option.count}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        );
      })}

      <Button type="submit" variant="secondary" className="w-full">
        {copy.shop.applyFilters}
      </Button>
    </form>
  );
}

export function FilterPanel({
  action,
  hidden,
  facets,
  activeCount,
  formKey,
}: {
  action: string;
  hidden: HiddenField[];
  facets: Facet[];
  activeCount: number;
  formKey: string;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Below two live options a facet is noise, and below one facet so is the panel.
  if (!facets.length) return null;

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className="spec flex w-full items-center justify-between border border-rule-strong px-4 py-3 text-ink transition-colors hover:border-ink"
        >
          {shopCopy.filtersWithCount(activeCount)}
          <span aria-hidden>+</span>
        </button>

        {open ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={copy.shop.filters}
            className="fixed inset-0 z-50 flex flex-col bg-paper"
          >
            <div className="flex items-center justify-between border-b border-rule px-5 py-4">
              <h2 className="spec text-ink">{copy.shop.filters}</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="spec text-ink hover:text-clay"
              >
                {copy.nav.close}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-8">
              <FacetForm
                action={action}
                hidden={hidden}
                facets={facets}
                scope="drawer"
                formKey={formKey}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="hidden lg:block">
        <h2 className="spec mb-5 text-ink">{shopCopy.refine}</h2>
        <FacetForm action={action} hidden={hidden} facets={facets} scope="side" formKey={formKey} />
      </div>
    </>
  );
}
