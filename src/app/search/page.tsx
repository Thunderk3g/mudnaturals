import type { Metadata } from "next";
import Link from "next/link";
import { listCategories, listFacets, listProducts } from "@/server/queries";
import { ProductGrid, ProductLedger } from "@/components/product-card";
import { Breadcrumb, Rule, Section, SectionHeader } from "@/components/ui/layout";
import {
  FilterBar,
  hiddenFields,
  parseShopParams,
  type RawSearchParams,
  type ShopParams,
} from "@/components/shop/filter-bar";
import { copy } from "@/content/copy";
import { shopCopy } from "@/content/shop-copy";

export const revalidate = 300;

export const metadata: Metadata = {
  title: shopCopy.searchTitle,
  description: shopCopy.searchPrompt,
  robots: { index: false, follow: true },
};

/**
 * Zero results is a merchandising surface, not an error state. The query is
 * echoed, then the store is laid back out underneath it — categories first,
 * then the whole catalogue. There is no dead end on this page.
 *
 * `listProducts` matches products only, so makers and materials are matched
 * here against `listFacets()` and linked out to their own pages. That is what
 * makes a fourteen-object catalogue feel like it has depth.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = parseShopParams(await searchParams);
  const q = params.q ?? "";

  const [facetData, categories] = await Promise.all([listFacets(), listCategories()]);
  const results = q ? await listProducts({ q, sort: params.sort }) : [];

  const needle = q.toLowerCase();
  const makerHits = q ? facetData.makers.filter((m) => m.name.toLowerCase().includes(needle)) : [];
  const materialHits = q
    ? facetData.materials.filter((m) => m.name.toLowerCase().includes(needle))
    : [];

  // Nothing found (or nothing asked for) — put the store back on the page.
  const catalogue = results.length === 0 ? await listProducts({}) : [];
  const liveCategories = categories.filter((c) => c.count > 0);

  return (
    <Section>
      <Breadcrumb
        trail={[{ href: "/", label: copy.brand.name }, { label: shopCopy.searchTitle }]} />

      <header className="mt-6 max-w-2xl">
        <h1 className="text-4xl lg:text-5xl">{shopCopy.searchTitle}</h1>
        <p className="mt-4 text-ink-2">{shopCopy.searchPrompt}</p>
      </header>

      <SearchForm params={params} />

      {q && results.length > 0 ? (
        <section className="mt-16" aria-labelledby="search-results-heading">
          <h2 id="search-results-heading" className="sr-only">
            {shopCopy.searchResultsFor(q)}
          </h2>
          <FilterBar
            path="/search"
            params={params}
            labels={{ categories, materials: facetData.materials, makers: facetData.makers }}
            count={results.length}
          />
          <div className="rise mt-10">
            {params.view === "ledger" ? (
              <ProductLedger products={results} />
            ) : (
              <ProductGrid products={results} />
            )}
          </div>
        </section>
      ) : null}

      {q && results.length === 0 ? (
        <div className="mt-12 border-l-2 border-clay pl-5">
          <p className="text-xl">{copy.shop.searchNoResults(q)}</p>
          <p className="mt-2 text-ink-2">{copy.shop.searchNoResultsHelp}</p>
        </div>
      ) : null}

      {makerHits.length || materialHits.length ? (
        <div className="mt-14 grid gap-10 sm:grid-cols-2">
          <Matches
            title={shopCopy.searchMakersTitle}
            items={makerHits.map((m) => ({
              slug: m.slug,
              name: m.name,
              count: m.count,
              href: `/makers/${m.slug}`,
            }))}
          />
          <Matches
            title={shopCopy.searchMaterialsTitle}
            items={materialHits.map((m) => ({
              slug: m.slug,
              name: m.name,
              count: m.count,
              href: `/craft/${m.slug}`,
            }))}
          />
        </div>
      ) : null}

      {results.length === 0 ? (
        <>
          {liveCategories.length ? (
            <div className="mt-20">
              <Rule className="mb-10" />
              <SectionHeader title={shopCopy.searchBrowseTitle} />
              <ul className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
                {liveCategories.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/shop/${category.slug}`}
                      className="group flex h-full flex-col justify-between gap-8 bg-paper p-6 transition-colors hover:bg-paper-deep"
                    >
                      <span>
                        <span className="block font-serif text-xl group-hover:text-clay">
                          {category.name}
                        </span>
                        {category.description ? (
                          <span className="mt-2 block text-sm text-ink-2">
                            {category.description}
                          </span>
                        ) : null}
                      </span>
                      <span className="spec">{shopCopy.objectCount(category.count)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {catalogue.length ? (
            <div className="mt-20">
              <SectionHeader
                title={shopCopy.searchEverythingTitle}
                body={shopCopy.searchEverythingBody}
                action={{ href: "/shop", label: copy.home.viewAll }}
              />
              <ProductGrid products={catalogue} />
            </div>
          ) : null}
        </>
      ) : null}
    </Section>
  );
}

function SearchForm({ params }: { params: ShopParams }) {
  return (
    <form
      method="get"
      action="/search"
      role="search"
      className="mt-10 flex items-center gap-4 border-b border-rule-strong pb-3"
    >
      {hiddenFields(params, ["q", "category", "material", "maker", "price"]).map((h) => (
        <input key={`${h.name}-${h.value}`} type="hidden" name={h.name} value={h.value} />
      ))}
      <label htmlFor="search-q" className="sr-only">
        {copy.shop.searchPlaceholder}
      </label>
      <input
        id="search-q"
        name="q"
        type="search"
        defaultValue={params.q ?? ""}
        placeholder={copy.shop.searchPlaceholder}
        autoComplete="off"
        className="w-full min-w-0 bg-transparent py-2 text-xl text-ink placeholder:text-ink-3 focus:outline-none lg:text-2xl"
      />
      <button type="submit" className="spec shrink-0 text-ink hover:text-clay">
        {shopCopy.searchSubmit}
      </button>
    </form>
  );
}

function Matches({
  title,
  items,
}: {
  title: string;
  items: { slug: string; name: string; count: number; href: string }[];
}) {
  if (!items.length) return null;
  return (
    <section aria-labelledby={`matches-${title}`}>
      <h2 id={`matches-${title}`} className="spec border-b border-rule pb-2">
        {title}
      </h2>
      <ul>
        {items.map((item) => (
          <li key={item.slug} className="border-b border-rule">
            <Link
              href={item.href}
              className="flex items-baseline justify-between gap-6 py-3 hover:text-clay"
            >
              <span className="spec-value">{item.name}</span>
              <span className="spec shrink-0 tabular-nums">{shopCopy.objectCount(item.count)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
