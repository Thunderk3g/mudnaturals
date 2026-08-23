import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { listCommunities, listProducts } from "@/server/queries";
import { imageSrc } from "@/server/cms";
import { Section, Breadcrumb, Prose, EmptyState, Rule } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/button";
import { ProductRail } from "@/components/story/product-rail";
import { Reveal } from "@/components/reveal";
import { copy } from "@/content/copy";
import { blockCopy } from "@/content/home-copy";
import { storyCopy } from "@/content/story-copy";

export const revalidate = 300;

export const metadata: Metadata = {
  title: copy.communities.title,
  description: copy.communities.intro,
  alternates: { canonical: "/communities" },
};

/**
 * The browse axis the store leads with: places, not people.
 *
 * Deliberately a set of plates rather than a directory of profiles — a
 * photograph, where it is, and what of it is in the shop. There is nothing to
 * follow and nobody to friend.
 */
export default async function CommunitiesPage() {
  // The closing rail exists so the index is not a leaf either.
  const [communities, newest] = await Promise.all([
    listCommunities(),
    listProducts({ sort: "newest" }),
  ]);

  return (
    <>
      <Section tight>
        <Breadcrumb trail={[{ href: "/", label: "Home" }, { label: copy.communities.title }]} />

        <div className="mt-10 grid grid-cols-1 gap-x-16 gap-y-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="spec mb-4">{copy.home.communityTitle}</p>
            <h1 className="text-4xl lg:text-5xl">{copy.communities.title}</h1>
          </div>
          <div className="lg:col-span-6">
            <Prose>
              <p>{copy.communities.intro}</p>
            </Prose>
            <p className="spec mt-8 border-l-2 border-clay pl-4 leading-relaxed">
              {copy.makers.consentNote}
            </p>
          </div>
        </div>
      </Section>

      <Section tight className="pt-0">
        {communities.length ? (
          <Reveal as="ul" stagger className="grid grid-cols-1 gap-x-12 gap-y-16 sm:grid-cols-2">
            {communities.map((community) => {
              const cover = imageSrc(community.cover_image_id, community.cover_image);
              const facts = [
                community.working_since
                  ? copy.communities.workingSince(community.working_since)
                  : null,
                community.product_count ? copy.shop.resultCount(community.product_count) : null,
              ].filter(Boolean);

              return (
                <li key={community.slug}>
                  <Link href={`/communities/${community.slug}`} className="group block">
                    <div className="relative aspect-3/2 overflow-hidden bg-paper-deep">
                      {cover ? (
                        <Image
                          src={cover}
                          alt={blockCopy.communityImageAlt(community.name)}
                          fill
                          sizes="(min-width: 640px) 45vw, 100vw"
                          className="img-zoom object-cover"
                        />
                      ) : (
                        <span className="spec absolute inset-0 flex items-center justify-center">
                          No image
                        </span>
                      )}
                    </div>

                    <p className="spec mt-4">
                      {[community.district, community.province].filter(Boolean).join(" · ")}
                    </p>
                    <h2 className="mt-1.5 text-2xl transition-colors duration-400 group-hover:text-clay lg:text-3xl">
                      {community.name}
                    </h2>
                    {community.summary ? (
                      <p className="mt-2 max-w-[52ch] leading-relaxed text-ink-2">
                        {community.summary}
                      </p>
                    ) : null}
                    {facts.length ? <p className="spec mt-4">{facts.join(" · ")}</p> : null}
                  </Link>
                </li>
              );
            })}
          </Reveal>
        ) : (
          <EmptyState
            title={copy.communities.empty}
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
          eyebrow={copy.product.originTrace}
          title={copy.shop.allProducts}
          products={newest.slice(0, 3)}
          action={{ href: "/shop", label: copy.home.viewAll }}
        />
      </Section>
    </>
  );
}
