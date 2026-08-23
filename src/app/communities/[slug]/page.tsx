import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommunity } from "@/server/queries";
import { imageSrc } from "@/server/cms";
import { Section, Breadcrumb, Prose, Rule } from "@/components/ui/layout";
import { SpecList } from "@/components/ui/spec";
import { ProductRail } from "@/components/story/product-rail";
import { Reveal } from "@/components/reveal";
import { copy } from "@/content/copy";
import { blockCopy } from "@/content/home-copy";
import { storyCopy, siteUrl } from "@/content/story-copy";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

/** generateMetadata and the page both need the record; one round trip serves both. */
const load = cache(getCommunity);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const community = await load(slug);
  if (!community) return { title: copy.errors.notFoundTitle };

  const description = community.summary ?? community.story ?? copy.communities.intro;
  const cover = imageSrc(community.cover_image_id, community.cover_image);

  return {
    title: community.name,
    description,
    alternates: { canonical: `/communities/${community.slug}` },
    openGraph: {
      type: "website",
      title: community.name,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

/** JSON-LD goes into a script tag, so `<` never survives as a literal. */
function ldJson(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * A place, its work, and the objects from it.
 *
 * The makers are named — that is a matter of credit, and consent has been given
 * for it — but as a line of text under the record, not as cards. There are no
 * portraits here, nothing to follow, and no route from a person to a feed. The
 * community is the unit; a maker's own page is one click on from a name.
 */
export default async function CommunityPage({ params }: Params) {
  const { slug } = await params;
  const community = await load(slug);
  if (!community) notFound();

  const cover = imageSrc(community.cover_image_id, community.cover_image);
  const materials = [
    ...new Set(community.products.map((p) => p.material_name).filter((m): m is string => Boolean(m))),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: community.name,
    url: `${siteUrl}/communities/${community.slug}`,
    description: community.summary ?? undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: community.district,
      addressRegion: community.province ?? undefined,
      addressCountry: "NP",
    },
    knowsAbout: materials,
    parentOrganization: { "@type": "Organization", name: copy.brand.name, url: siteUrl },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }} />

      <Section tight>
        <Breadcrumb
          trail={[
            { href: "/", label: "Home" },
            { href: "/communities", label: copy.communities.title },
            { label: community.name },
          ]}
        />

        <div className="mt-10 grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-12">
          <figure className="rise lg:col-span-5">
            <div className="relative aspect-4/5 overflow-hidden bg-paper-deep">
              {cover ? (
                <Image
                  src={cover}
                  alt={blockCopy.communityImageAlt(community.name)}
                  fill
                  priority
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <span className="spec absolute inset-0 flex items-center justify-center">
                  No image
                </span>
              )}
            </div>
            <figcaption className="spec-value mt-3 text-ink-2">
              {community.name} · {community.district}
            </figcaption>
          </figure>

          <div className="lg:col-span-7">
            <p className="spec mb-4">{copy.communities.recordTitle}</p>
            <h1 className="text-4xl lg:text-5xl">{community.name}</h1>

            <SpecList
              className="mt-8"
              items={[
                { label: copy.communities.district, value: community.district },
                { label: copy.communities.province, value: community.province },
                {
                  label: storyCopy.makers.workingSince,
                  value: community.working_since ?? null,
                },
                { label: copy.product.material, value: materials.join(" · ") },
                { label: copy.nav.makers, value: community.makers.length || null },
                {
                  label: storyCopy.makers.objectsInShop,
                  value: community.products.length || null,
                },
              ]}
            />

            {/* The credit line. Not a roster, not a grid of faces — one
                sentence, in the same register as the rest of the record. */}
            {community.makers.length ? (
              <p className="spec-value mt-8 leading-relaxed text-ink-2">
                {copy.communities.makersLead}{" "}
                {community.makers.map((maker, i) => (
                  <span key={maker.slug}>
                    {i > 0 ? <span aria-hidden>, </span> : null}
                    <Link
                      href={`/makers/${maker.slug}`}
                      className="link-wipe text-ink transition-colors duration-300 hover:text-clay"
                    >
                      {maker.display_name}
                    </Link>
                  </span>
                ))}
                <span aria-hidden>.</span>
              </p>
            ) : null}
          </div>
        </div>
      </Section>

      {community.story ? (
        <Section tight className="pt-0">
          <Rule className="mb-12" />
          <Reveal className="grid grid-cols-1 gap-x-16 gap-y-6 lg:grid-cols-12">
            <h2 className="text-2xl lg:col-span-5">{copy.communities.story}</h2>
            <Prose className="lg:col-span-7">
              {community.story
                .split(/\n{2,}/)
                .map((para) => para.trim())
                .filter(Boolean)
                .map((para) => (
                  <p key={para.slice(0, 32)}>{para}</p>
                ))}
            </Prose>
          </Reveal>
        </Section>
      ) : null}

      <Section tight className="pt-0">
        <Rule className="mb-12" />
        <ProductRail
          eyebrow={copy.product.originTrace}
          title={copy.communities.objectsHere}
          products={community.products}
          action={{ href: "/shop", label: copy.shop.allProducts }}
        />
      </Section>

      <Section tight className="pt-0">
        <Rule className="mb-10" />
        <div className="grid grid-cols-1 gap-x-16 gap-y-4 lg:grid-cols-12">
          <h2 className="spec lg:col-span-5">{storyCopy.makers.attributionTitle}</h2>
          <div className="lg:col-span-7">
            <p className="max-w-[60ch] text-ink-2">{storyCopy.makers.attributionBody}</p>
            <p className="spec mt-4">{copy.makers.consentNote}</p>
          </div>
        </div>
      </Section>
    </>
  );
}
