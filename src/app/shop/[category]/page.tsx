import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const found = (await listCategories()).find((c) => c.slug === category);
  if (!found) return {};
  return { title: found.name, description: found.description ?? shopCopy.intro };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const shopParams = parseShopParams(await searchParams);
  const path = `/shop/${category}`;

  const [categories, base, products, facetData] = await Promise.all([
    listCategories(),
    // The category is the scope here, so it is not a facet — the route holds it.
    listProducts({ category }),
    listProducts(toFilters(shopParams, category)),
    listFacets(),
  ]);

  const current = categories.find((c) => c.slug === category);
  if (!current) notFound();

  const facets = buildFacets({
    base,
    params: shopParams,
    categories,
    materials: facetData.materials,
    makers: facetData.makers,
    include: ["material", "maker", "price"],
  });

  return (
    <Section>
      <Breadcrumb
        trail={[
          { href: "/", label: copy.brand.name },
          { href: "/shop", label: copy.shop.title },
          { label: current.name },
        ]}
      />

      <header className="mt-6 max-w-2xl">
        <h1 className="text-4xl lg:text-5xl">{current.name}</h1>
        {current.description ? <p className="mt-4 text-ink-2">{current.description}</p> : null}
      </header>

      <div className="mt-12 gap-x-12 lg:grid lg:grid-cols-[15rem_1fr] lg:items-start">
        <div className="lg:sticky lg:top-8">
          <FilterPanel
            action={path}
            hidden={hiddenFields(shopParams, ["category", "material", "maker", "price"])}
            facets={facets}
            activeCount={activeFilterCount(shopParams)}
            formKey={toQuery(shopParams)}
          />
        </div>

        <div className="mt-8 lg:mt-0">
          <FilterBar
            path={path}
            params={shopParams}
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
                  <LinkButton href={path} variant="secondary">
                    {copy.shop.clearFilters}
                  </LinkButton>
                }
              />
            ) : shopParams.view === "ledger" ? (
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
