import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollection } from "@/server/queries";
import { Section, Breadcrumb, Prose, Rule } from "@/components/ui/layout";
import { SpecList } from "@/components/ui/spec";
import { ProductRail } from "@/components/story/product-rail";
import { copy } from "@/content/copy";
import { storyCopy } from "@/content/story-copy";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) return { title: copy.errors.notFoundTitle };

  const description = collection.subtitle ?? collection.story ?? storyCopy.collections.intro;
  return {
    title: collection.title,
    description,
    alternates: { canonical: `/collections/${collection.slug}` },
    openGraph: {
      type: "website",
      title: collection.title,
      description,
      images: collection.cover_image ? [collection.cover_image] : undefined,
    },
  };
}

export default async function CollectionPage({ params }: Params) {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) notFound();

  // Every collection page routes back out to the workshops behind it, so the
  // story runs both ways: object → maker, maker → object.
  const workshops = [
    ...new Map(
      collection.products
        .filter((p) => p.maker_slug && p.maker_name)
        .map((p) => [p.maker_slug, { slug: p.maker_slug!, name: p.maker_name!, district: p.district }]),
    ).values(),
  ];

  const materials = [
    ...new Set(collection.products.map((p) => p.material_name).filter((m): m is string => Boolean(m))),
  ];

  return (
    <>
      <Section tight>
        <Breadcrumb
          trail={[
            { href: "/", label: "Home" },
            { href: "/collections", label: storyCopy.collections.title },
            { label: collection.title },
          ]}
        />

        <div className="mt-10 grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-12">
          <div className="rise lg:col-span-5">
            <div className="relative aspect-4/5 overflow-hidden bg-paper-deep">
              {collection.cover_image ? (
                <Image
                  src={collection.cover_image}
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-7">
            <p className="spec mb-4">{copy.home.collectionTitle}</p>
            <h1 className="text-4xl lg:text-5xl">{collection.title}</h1>
            {collection.subtitle ? (
              <p className="mt-4 max-w-[52ch] text-xl text-ink-2">{collection.subtitle}</p>
            ) : null}

            {collection.story ? (
              <Prose className="mt-8">
                {collection.story
                  .split(/\n{2,}/)
                  .filter(Boolean)
                  .map((para) => (
                    <p key={para.slice(0, 24)}>{para}</p>
                  ))}
              </Prose>
            ) : null}

            <SpecList
              className="mt-10 max-w-xl"
              items={[
                {
                  label: storyCopy.collections.inThisCollection,
                  value: storyCopy.collections.objectCount(collection.products.length),
                },
                { label: copy.product.material, value: materials.join(" · ") },
                {
                  label: copy.nav.makers,
                  value: workshops.map((w) => w.name).join(" · "),
                },
              ]}
            />
          </div>
        </div>
      </Section>

      <Section tight className="pt-0">
        <Rule className="mb-12" />
        <ProductRail
          eyebrow={copy.product.originTrace}
          title={storyCopy.collections.inThisCollection}
          products={collection.products}
          action={{ href: "/shop", label: copy.shop.allProducts }}
        />
      </Section>

      {workshops.length ? (
        <Section tight className="pt-0">
          <Rule className="mb-10" />
          <h2 className="text-2xl">{copy.craft.practisedBy}</h2>
          <ul className="mt-6 border-t border-rule">
            {workshops.map((workshop) => (
              <li key={workshop.slug} className="border-b border-rule">
                <Link
                  href={`/makers/${workshop.slug}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 py-4 hover:text-clay"
                >
                  <span className="text-lg">{workshop.name}</span>
                  <span className="spec">{workshop.district}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
