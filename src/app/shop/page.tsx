import type { Metadata } from "next";
import { listCategories, listFacets, listProducts } from "@/server/queries";
import { ProductGrid, ProductLedger } from "@/components/product-card";
import { Breadcrumb, EmptyState, Section } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/button";
import {
  FilterBar,
  activeFilterCount,
  buildFacets,
  hiddenFields,
  parseShopParams,
  toFilters,
  toQuery,
  type RawSearchParams,
} from "@/components/shop/filter-bar";
import { FilterPanel } from "@/components/shop/filter-panel";
import { copy } from "@/content/copy";
import { shopCopy } from "@/content/shop-copy";

export const revalidate = 300;

export const metadata: Metadata = {
  title: copy.shop.title,
  description: shopCopy.intro,
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = parseShopParams(await searchParams);

  const [base, products, facetData, categories] = await Promise.all([
    // The unfiltered scope: what the facet counts are measured against.
    listProducts({}),
    listProducts(toFilters(params)),
    listFacets(),
    listCategories(),
  ]);

  const facets = buildFacets({
    base,
    params,
    categories,
    materials: facetData.materials,
    makers: facetData.makers,
    include: ["category", "material", "maker", "price"],
  });

  return (
    <Section>
      <Breadcrumb trail={[{ href: "/", label: copy.brand.name }, { label: copy.shop.title }]} />

      <header className="mt-6 max-w-2xl">
        <h1 className="text-4xl lg:text-5xl">{copy.shop.allProducts}</h1>
        <p className="mt-4 text-ink-2">{shopCopy.intro}</p>
      </header>

      <div className="mt-12 gap-x-12 lg:grid lg:grid-cols-[15rem_1fr] lg:items-start">
        <div className="lg:sticky lg:top-8">
          <FilterPanel
            action="/shop"
            hidden={hiddenFields(params, ["category", "material", "maker", "price"])}
            facets={facets}
            activeCount={activeFilterCount(params)}
            formKey={toQuery(params)}
          />
        </div>

        <div className="mt-8 lg:mt-0">
          <FilterBar
            path="/shop"
            params={params}
            labels={{
              categories,
              materials: facetData.materials,
              makers: facetData.makers,
            }}
            count={products.length}
          />

          <div className="rise mt-10">
            {products.length === 0 ? (
              <EmptyState
                title={copy.shop.empty}
                body={copy.shop.emptyHelp}
                action={
                  <LinkButton href="/shop" variant="secondary">
                    {copy.shop.clearFilters}
                  </LinkButton>
                }
              />
            ) : params.view === "ledger" ? (
              <ProductLedger products={products} />
            ) : (
              <ProductGrid products={products} />
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
