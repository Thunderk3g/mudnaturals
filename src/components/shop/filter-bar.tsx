import Link from "next/link";
import type { ProductCard as ProductCardData, ShopFilters } from "@/server/queries";
import { formatNpr } from "@/lib/money";
import { copy } from "@/content/copy";
import { shopCopy } from "@/content/shop-copy";
import { SortSelect } from "@/components/shop/sort-select";
import { ViewToggle } from "@/components/shop/view-toggle";

/**
 * The shop's URL contract and the row that sits above the results.
 *
 * All shop state lives in `searchParams`, so a filtered view is a shareable
 * link and back/forward is free:
 *
 *   ?category=<slug>            single   (only on /shop — the route carries it elsewhere)
 *   ?material=<slug>&material=… repeated (OR within the facet)
 *   ?maker=<slug>&maker=…       repeated (OR within the facet)
 *   ?price=<minPaisa>-<maxPaisa|"">  single bracket
 *   ?sort=newest|price-asc|price-desc|name   default newest
 *   ?view=grid|ledger                        default grid
 *   ?q=<text>                   /search only
 *
 * Category and price are single-select because `listProducts` takes one
 * category and one min/max pair; material and maker are true multi-select.
 * This module is deliberately the only one holding URL logic — the three leaf
 * controls take plain props so nothing has to import back into it.
 */

export type SortKey = NonNullable<ShopFilters["sort"]>;
export type ViewKey = "grid" | "ledger";
export type FacetName = "category" | "material" | "maker" | "price";

export type ShopParams = {
  category?: string;
  materials: string[];
  makers: string[];
  price?: string;
  sort: SortKey;
  view: ViewKey;
  q?: string;
};

export type FacetOption = { value: string; label: string; count: number; checked: boolean };
export type Facet = { name: FacetName; legend: string; multi: boolean; options: FacetOption[] };

export type ShopLabels = {
  categories: { slug: string; name: string }[];
  materials: { slug: string; name: string }[];
  makers: { slug: string; name: string }[];
};

export type HiddenField = { name: string; value: string };

/* -------------------------------------------------------------------------- */
/* Price brackets — brackets, never a slider. Bounds are paisa, max exclusive. */
/* -------------------------------------------------------------------------- */

export type PriceBracket = { value: string; min: number; max: number | null };

export const PRICE_BRACKETS: PriceBracket[] = [
  { value: "0-100000", min: 0, max: 100000 },
  { value: "100000-250000", min: 100000, max: 250000 },
  { value: "250000-500000", min: 250000, max: 500000 },
  { value: "500000-", min: 500000, max: null },
];

export function priceBracket(value?: string): PriceBracket | undefined {
  return PRICE_BRACKETS.find((b) => b.value === value);
}

export function priceLabel(b: PriceBracket): string {
  if (b.max == null) return shopCopy.priceOver(formatNpr(b.min));
  if (b.min === 0) return shopCopy.priceUnder(formatNpr(b.max));
  return shopCopy.priceBetween(formatNpr(b.min), formatNpr(b.max));
}

function inBracket(paisa: number, b: PriceBracket): boolean {
  return paisa >= b.min && (b.max == null || paisa < b.max);
}

/* -------------------------------------------------------------------------- */
/* Params                                                                      */
/* -------------------------------------------------------------------------- */

export type RawSearchParams = Record<string, string | string[] | undefined>;

const SORTS: SortKey[] = ["newest", "price-asc", "price-desc", "name"];

const many = (v: string | string[] | undefined): string[] =>
  Array.isArray(v) ? v.filter(Boolean) : v ? [v] : [];
const one = (v: string | string[] | undefined): string | undefined =>
  (Array.isArray(v) ? v[0] : v) || undefined;

export function parseShopParams(sp: RawSearchParams): ShopParams {
  const sort = one(sp.sort);
  return {
    category: one(sp.category),
    materials: many(sp.material),
    makers: many(sp.maker),
    price: priceBracket(one(sp.price))?.value,
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : "newest",
    view: one(sp.view) === "ledger" ? "ledger" : "grid",
    q: one(sp.q)?.trim() || undefined,
  };
}

/** Params → the shape `listProducts` wants. `scope` pins a route-level category. */
export function toFilters(p: ShopParams, scope?: string): ShopFilters {
  const b = priceBracket(p.price);
  return {
    category: scope ?? p.category,
    materials: p.materials.length ? p.materials : undefined,
    makers: p.makers.length ? p.makers : undefined,
    minPaisa: b?.min,
    maxPaisa: b && b.max != null ? b.max - 1 : undefined,
    sort: p.sort,
    q: p.q,
  };
}

export function toQuery(p: ShopParams): string {
  const q = new URLSearchParams();
  if (p.q) q.set("q", p.q);
  if (p.category) q.set("category", p.category);
  for (const m of p.materials) q.append("material", m);
  for (const m of p.makers) q.append("maker", m);
  if (p.price) q.set("price", p.price);
  if (p.sort !== "newest") q.set("sort", p.sort);
  if (p.view !== "grid") q.set("view", p.view);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function hrefWith(path: string, p: ShopParams, patch: Partial<ShopParams>): string {
  return path + toQuery({ ...p, ...patch });
}

/** The same state as `toQuery`, as hidden inputs, so a plain GET form keeps it. */
export function hiddenFields(p: ShopParams, omit: readonly string[] = []): HiddenField[] {
  const out: HiddenField[] = [];
  const add = (name: string, value?: string) => {
    if (value && !omit.includes(name)) out.push({ name, value });
  };
  add("q", p.q);
  add("category", p.category);
  if (!omit.includes("material")) for (const m of p.materials) out.push({ name: "material", value: m });
  if (!omit.includes("maker")) for (const m of p.makers) out.push({ name: "maker", value: m });
  add("price", p.price);
  if (p.sort !== "newest") add("sort", p.sort);
  if (p.view !== "grid") add("view", p.view);
  return out;
}

export function activeFilterCount(p: ShopParams): number {
  return (p.category ? 1 : 0) + p.materials.length + p.makers.length + (p.price ? 1 : 0);
}

/* -------------------------------------------------------------------------- */
/* Facets                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Counts are computed in JS over the unfiltered scope, holding every *other*
 * facet — the standard OR-within / AND-across model. At this catalogue size
 * that is one small array scan and it buys exact counts, plus the guarantee
 * that follows: an option that would return nothing is never rendered, so a
 * filter can never empty the page. A facet with fewer than two live options is
 * dropped whole.
 */
export function buildFacets(input: {
  base: ProductCardData[];
  params: ShopParams;
  categories: { slug: string; name: string }[];
  materials: { slug: string; name: string }[];
  makers: { slug: string; name: string }[];
  include: FacetName[];
}): Facet[] {
  const { base, params, categories, materials, makers, include } = input;

  // ProductCard carries the material's name but not its slug, so map back.
  const slugByMaterialName = new Map(materials.map((m) => [m.name, m.slug]));
  const materialSlug = (r: ProductCardData) =>
    (r.material_name && slugByMaterialName.get(r.material_name)) || null;

  const passes = (r: ProductCardData, except: FacetName): boolean => {
    if (except !== "category" && params.category && r.category_slug !== params.category) return false;
    if (except !== "material" && params.materials.length) {
      const s = materialSlug(r);
      if (!s || !params.materials.includes(s)) return false;
    }
    if (
      except !== "maker" &&
      params.makers.length &&
      (!r.maker_slug || !params.makers.includes(r.maker_slug))
    ) {
      return false;
    }
    if (except !== "price") {
      const b = priceBracket(params.price);
      if (b && !inBracket(r.price_paisa, b)) return false;
    }
    return true;
  };

  const facet = (
    name: FacetName,
    legend: string,
    multi: boolean,
    selected: string[],
    defs: { value: string; label: string; test: (r: ProductCardData) => boolean }[],
  ): Facet | null => {
    const pool = base.filter((r) => passes(r, name));
    const options = defs
      .map((d) => ({
        value: d.value,
        label: d.label,
        count: pool.filter(d.test).length,
        checked: selected.includes(d.value),
      }))
      // A checked option stays visible even at zero so it can be un-checked.
      .filter((o) => o.count > 0 || o.checked);
    return options.length >= 2 ? { name, legend, multi, options } : null;
  };

  const built: (Facet | null)[] = [
    include.includes("category")
      ? facet(
          "category",
          copy.shop.facetCategory,
          false,
          params.category ? [params.category] : [],
          categories.map((c) => ({
            value: c.slug,
            label: c.name,
            test: (r: ProductCardData) => r.category_slug === c.slug,
          })),
        )
      : null,
    include.includes("material")
      ? facet(
          "material",
          copy.shop.facetMaterial,
          true,
          params.materials,
          materials.map((m) => ({
            value: m.slug,
            label: m.name,
            test: (r: ProductCardData) => materialSlug(r) === m.slug,
          })),
        )
      : null,
    include.includes("maker")
      ? facet(
          "maker",
          copy.shop.facetMaker,
          true,
          params.makers,
          makers.map((m) => ({
            value: m.slug,
            label: m.name,
            test: (r: ProductCardData) => r.maker_slug === m.slug,
          })),
        )
      : null,
    include.includes("price")
      ? facet(
          "price",
          copy.shop.facetPrice,
          false,
          params.price ? [params.price] : [],
          PRICE_BRACKETS.map((b) => ({
            value: b.value,
            label: priceLabel(b),
            test: (r: ProductCardData) => inBracket(r.price_paisa, b),
          })),
        )
      : null,
  ];

  return built.filter((f): f is Facet => f !== null);
}

/* -------------------------------------------------------------------------- */
/* The bar                                                                     */
/* -------------------------------------------------------------------------- */

function labelFor(list: { slug: string; name: string }[], slug: string) {
  return list.find((x) => x.slug === slug)?.name ?? slug;
}

type Chip = { key: string; label: string; href: string };

function chipsFor(path: string, p: ShopParams, labels: ShopLabels): Chip[] {
  const chips: Chip[] = [];
  if (p.category) {
    chips.push({
      key: `category:${p.category}`,
      label: labelFor(labels.categories, p.category),
      href: hrefWith(path, p, { category: undefined }),
    });
  }
  for (const slug of p.materials) {
    chips.push({
      key: `material:${slug}`,
      label: labelFor(labels.materials, slug),
      href: hrefWith(path, p, { materials: p.materials.filter((x) => x !== slug) }),
    });
  }
  for (const slug of p.makers) {
    chips.push({
      key: `maker:${slug}`,
      label: labelFor(labels.makers, slug),
      href: hrefWith(path, p, { makers: p.makers.filter((x) => x !== slug) }),
    });
  }
  const b = priceBracket(p.price);
  if (b) {
    chips.push({ key: "price", label: priceLabel(b), href: hrefWith(path, p, { price: undefined }) });
  }
  return chips;
}

export function FilterBar({
  path,
  params,
  labels,
  count,
}: {
  path: string;
  params: ShopParams;
  labels: ShopLabels;
  count: number;
}) {
  const chips = chipsFor(path, params, labels);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-b border-rule pb-4">
        <p className="spec" aria-live="polite">
          {copy.shop.resultCount(count)}
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <SortSelect
            action={path}
            value={params.sort}
            hidden={hiddenFields(params, ["sort"])}
          />
          <ViewToggle
            view={params.view}
            gridHref={hrefWith(path, params, { view: "grid" })}
            ledgerHref={hrefWith(path, params, { view: "ledger" })}
          />
        </div>
      </div>

      {chips.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="spec">{shopCopy.appliedFilters}</span>
          <ul className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <li key={chip.key}>
                <Link
                  href={chip.href}
                  aria-label={shopCopy.removeFilter(chip.label)}
                  className="spec inline-flex items-center gap-2 border border-clay/45 bg-clay-soft/50 px-2.5 py-1 text-ink transition-colors hover:border-clay hover:text-clay"
                >
                  {chip.label}
                  <span aria-hidden>×</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={hrefWith(path, params, {
              category: undefined,
              materials: [],
              makers: [],
              price: undefined,
            })}
            className="spec underline decoration-rule-strong underline-offset-4 hover:text-clay hover:decoration-clay"
          >
            {copy.shop.clearFilters}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
