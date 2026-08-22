import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { listCollections, listProducts } from "@/server/queries";
import { Section, Breadcrumb, Prose, EmptyState, Rule } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/button";
import { ProductRail } from "@/components/story/product-rail";
import { copy } from "@/content/copy";
import { storyCopy } from "@/content/story-copy";

export const revalidate = 300;

export const metadata: Metadata = {
  title: storyCopy.collections.title,
  description: storyCopy.collections.intro,
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
  const [collections, newest] = await Promise.all([
    listCollections(),
    listProducts({ sort: "newest" }),
  ]);

  return (
    <>
      <Section tight>
        <Breadcrumb trail={[{ href: "/", label: "Home" }, { label: storyCopy.collections.title }]} />

        <div className="mt-10 grid grid-cols-1 gap-x-16 gap-y-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="spec mb-4">{copy.home.collectionTitle}</p>
            <h1 className="text-4xl lg:text-5xl">{storyCopy.collections.title}</h1>
          </div>
          <Prose className="lg:col-span-7">
            <p>{storyCopy.collections.intro}</p>
          </Prose>
        </div>
      </Section>

      <Section tight className="pt-0">
        {collections.length ? (
          <ul className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <li key={collection.slug} className="rise">
                <Link href={`/collections/${collection.slug}`} className="group block">
                  <div className="relative aspect-4/5 overflow-hidden bg-paper-deep">
                    {collection.cover_image ? (
                      <Image
                        src={collection.cover_image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <p className="spec mt-4">{storyCopy.collections.objectCount(collection.count)}</p>
                  <h2 className="mt-1.5 text-2xl group-hover:text-clay">{collection.title}</h2>
                  {collection.subtitle ? (
                    <p className="mt-1.5 text-ink-2">{collection.subtitle}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={storyCopy.collections.empty}
            action={
              <LinkButton href="/shop" variant="secondary">
                {storyCopy.shared.shopEverything}
              </LinkButton>
            }
          />
        )}
      </Section>

      <Section tight className="pt-0">
        <Rule className="mb-12" />
        <ProductRail
          eyebrow={copy.shop.title}
          title="In the shop now"
          products={newest.slice(0, 3)}
          action={{ href: "/shop", label: copy.home.viewAll }}
        />
      </Section>
    </>
  );
}
