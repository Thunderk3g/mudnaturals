import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, listRelatedByMaker, listPairsWith, type ProductDetail } from "@/server/queries";
import { Breadcrumb, Prose, Section, SectionHeader } from "@/components/ui/layout";
import { ProvenanceLine, SpecList, type SpecItem } from "@/components/ui/spec";
import { ProductGrid } from "@/components/product-card";
import { Gallery } from "@/components/product/gallery";
import { BuyPanel } from "@/components/product/buy-panel";
import { OriginTrace } from "@/components/product/origin-trace";
import { formatNpr } from "@/lib/money";
import { copy } from "@/content/copy";
import { productCopy } from "@/content/product-copy";

export const revalidate = 300;

type PageProps = { params: Promise<{ slug: string }> };

/** generateMetadata and the page both need the product; one round trip serves both. */
const load = cache(getProduct);

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function summarise(product: ProductDetail) {
  return product.subtitle ?? product.description?.slice(0, 160) ?? copy.brand.description;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await load(slug);
  if (!product) return { title: copy.errors.notFoundTitle };

  const description = summarise(product);
  const hero = product.images[0];

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      url: `/products/${product.slug}`,
      images: hero ? [{ url: hero.storage_path, alt: hero.alt }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await load(slug);
  if (!product) notFound();

  const [related, pairs] = await Promise.all([
    product.maker_slug ? listRelatedByMaker(product.maker_slug, product.slug, 3) : [],
    listPairsWith(product.slug, product.category_slug, 3),
  ]);

  const defaultVariant = product.variants.find((v) => v.is_default) ?? product.variants[0];

  // The food columns (ingredients, batch, expiry) are not in the schema yet.
  // Reading them optionally means the rows appear the day they land, and the
  // page renders nothing — not a placeholder — until then.
  const food = product as Partial<
    Record<"ingredients" | "batch_code" | "expiry_date", string | null>
  >;

  const specs: SpecItem[] = [
    {
      label: copy.product.material,
      value: product.material_name,
      href: product.material_slug ? `/craft/${product.material_slug}` : undefined,
    },
    {
      label: copy.product.technique,
      value: product.technique_name,
      href: product.technique_slug ? `/craft/${product.technique_slug}` : undefined,
    },
    { label: copy.product.labour, value: product.labour_hours },
    { label: copy.product.sku, value: defaultVariant?.sku },
    { label: copy.product.care, value: product.care },
    ...(product.is_food
      ? [
          { label: copy.product.ingredients, value: food.ingredients },
          { label: productCopy.batch, value: food.batch_code },
          { label: productCopy.expiry, value: food.expiry_date },
        ]
      : []),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: summarise(product),
    image: product.images.map((image) => image.storage_path),
    sku: defaultVariant?.sku,
    material: product.material_name ?? undefined,
    brand: { "@type": "Brand", name: copy.brand.name },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/products/${product.slug}`,
      priceCurrency: "NPR",
      price: (product.price_paisa / 100).toFixed(2),
      availability:
        product.available > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: copy.brand.name },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Escaped so a name carrying "</script>" cannot break out of the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="container-page pt-8 lg:pt-12">
        <Breadcrumb
          trail={[
            { href: "/", label: "Home" },
            { href: "/shop", label: copy.nav.shop },
            { href: `/shop/${product.category_slug}`, label: product.category_name },
            { label: product.name },
          ]}
        />

        <div className="mt-6 grid items-start gap-10 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
          <Gallery images={product.images} />

          <div className="rise">
            <ProvenanceLine
              community={product.community_name}
              maker={product.maker_name}
              district={product.district}
            />
            <h1 className="mt-2 text-3xl leading-tight lg:text-4xl">{product.name}</h1>
            {product.subtitle ? (
              <p className="mt-2 text-lg text-ink-2">{product.subtitle}</p>
            ) : null}

            <BuyPanel
              productName={product.name}
              variants={product.variants}
              fallbackPricePaisa={product.price_paisa}
            />

            <OriginTrace product={product} />

            {product.maker_share_paisa != null ? (
              <p className="spec-value mt-4 text-ink-2">
                {copy.product.makerShare(formatNpr(product.maker_share_paisa))}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <Section tight>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
          <div>
            {product.description ? (
              <Prose>
                {product.description
                  .split(/\n{2,}/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean)
                  .map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
              </Prose>
            ) : null}

            <section aria-labelledby="variation" className="mt-12 border-l-2 border-clay pl-5">
              <h2 id="variation" className="text-xl">
                {copy.product.variationTitle}
              </h2>
              <p className="mt-2 max-w-[60ch] text-ink-2">
                {product.variation_note ?? copy.product.variationDefault}
              </p>
            </section>
          </div>

          <section aria-labelledby="details">
            <h2 id="details" className="spec border-b border-rule-strong pb-3 text-ink">
              {copy.product.details}
            </h2>
            <SpecList items={specs} className="mt-1" />
          </section>
        </div>
      </Section>

      <Section tight className="border-t border-rule">
        <SectionHeader title={copy.product.reviews} />
        <p className="text-ink-2">{copy.product.noReviews}</p>
      </Section>

      {related.length ? (
        <Section tight className="border-t border-rule">
          <SectionHeader
            title={copy.product.moreFromMaker(product.maker_name ?? copy.brand.name)}
            action={
              product.maker_slug
                ? { href: `/makers/${product.maker_slug}`, label: copy.home.viewAll }
                : undefined
            }
          />
          <ProductGrid products={related} />
        </Section>
      ) : null}

      {pairs.length ? (
        <Section tight className="border-t border-rule">
          <SectionHeader title={copy.product.pairsWith} />
          <ProductGrid products={pairs} />
        </Section>
      ) : null}
    </>
  );
}
