import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMaker, listCraft, getCraft } from "@/server/queries";
import { Section, Breadcrumb, Prose, Rule } from "@/components/ui/layout";
import { SpecList } from "@/components/ui/spec";
import { ProductRail } from "@/components/story/product-rail";
import { ProcessSteps, type ProcessStep } from "@/components/story/process-steps";
import { copy } from "@/content/copy";
import { storyCopy, siteUrl } from "@/content/story-copy";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const maker = await getMaker(slug);
  if (!maker) return { title: copy.errors.notFoundTitle };

  const description = maker.craft ?? maker.bio ?? copy.makers.intro;
  return {
    title: maker.display_name,
    description,
    alternates: { canonical: `/makers/${maker.slug}` },
    openGraph: {
      type: "profile",
      title: maker.display_name,
      description,
      images: maker.portrait_image ? [maker.portrait_image] : undefined,
    },
  };
}

/**
 * Techniques this workshop actually practises, derived from the products it
 * made rather than asserted on the maker row.
 *
 * ponytail: one `getCraft` per published technique (four today), fired in
 * parallel and cached for the revalidate window. If the technique table grows
 * past a couple of dozen rows this wants a single maker→technique query in
 * `queries.ts` instead.
 *
 * The `steps` cast is deliberate: `getCraft`'s declared return type collapses
 * to the material shape, because the `material ?? technique` in queries.ts
 * erases the union. The discriminant is real at runtime.
 */
async function techniquesPractisedBy(makerSlug: string) {
  const { techniques } = await listCraft();
  const loaded = await Promise.all(techniques.map((t) => getCraft(t.slug)));

  return loaded.flatMap((craft) => {
    if (!craft || !craft.makers.some((m) => m.slug === makerSlug)) return [];
    return [
      {
        slug: craft.slug,
        name: craft.name,
        description: craft.description,
        steps: craft.steps as ProcessStep[] | null,
      },
    ];
  });
}

/** JSON-LD goes into a script tag, so `<` never survives as a literal. */
function ldJson(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function MakerPage({ params }: Params) {
  const { slug } = await params;
  const maker = await getMaker(slug);
  if (!maker) notFound();

  const techniques = await techniquesPractisedBy(maker.slug);

  const materials = [
    ...new Set(maker.products.map((p) => p.material_name).filter((m): m is string => Boolean(m))),
  ];

  // Workshop-level record, so this is an Organization. The day a maker signs
  // for a personal name, the same page emits `Person` — nothing else moves.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: maker.display_name,
    url: `${siteUrl}/makers/${maker.slug}`,
    description: maker.craft ?? maker.bio ?? undefined,
    image: maker.portrait_image ? `${siteUrl}${maker.portrait_image}` : undefined,
    address: {
      "@type": "PostalAddress",
      addressRegion: maker.district,
      addressCountry: "NP",
    },
    knowsAbout: [...materials, ...techniques.map((t) => t.name)],
    parentOrganization: { "@type": "Organization", name: copy.brand.name, url: siteUrl },
    foundingDate: maker.working_since ? String(maker.working_since) : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }}
      />

      <Section tight>
        <Breadcrumb
          trail={[
            { href: "/", label: "Home" },
            { href: "/makers", label: copy.makers.title },
            { label: maker.display_name },
          ]}
        />

        <div className="mt-10 grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-12">
          {/* The image slot is the same whether it holds a workshop photograph
              today or a consented portrait later. No layout change either way. */}
          <figure className="rise lg:col-span-5">
            <div className="relative aspect-4/5 overflow-hidden bg-paper-deep">
              {maker.portrait_image ? (
                <Image
                  src={maker.portrait_image}
                  alt=""
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
              {maker.display_name} · {maker.district}
            </figcaption>
          </figure>

          <div className="lg:col-span-7">
            <p className="spec mb-4">{storyCopy.makers.recordTitle}</p>
            <h1 className="text-4xl lg:text-5xl">{maker.display_name}</h1>

            <SpecList
              className="mt-8"
              items={[
                { label: storyCopy.makers.community, value: maker.community_name },
                { label: storyCopy.makers.district, value: maker.district },
                { label: storyCopy.makers.craft, value: maker.craft },
                { label: storyCopy.makers.materials, value: materials.join(" · ") },
                {
                  label: copy.product.technique,
                  value: techniques.map((t) => t.name).join(" · "),
                },
                { label: storyCopy.makers.workingSince, value: maker.working_since ?? null },
                { label: storyCopy.makers.objectsInShop, value: maker.products.length || null },
              ]}
            />

            {/* Rendered only when a quote exists. There is no placeholder voice
                and there will never be an invented one. */}
            {maker.quote ? (
              <figure className="mt-10 border-l-2 border-clay pl-6">
                <blockquote className="font-serif text-2xl leading-snug text-ink">
                  “{maker.quote}”
                </blockquote>
                <figcaption className="spec mt-3">{maker.display_name}</figcaption>
              </figure>
            ) : null}
          </div>
        </div>
      </Section>

      {maker.bio || maker.community_story ? (
        <Section tight className="pt-0">
          <Rule className="mb-12" />
          <div className="grid grid-cols-1 gap-x-16 gap-y-6 lg:grid-cols-12">
            <h2 className="text-2xl lg:col-span-5">{storyCopy.makers.aboutCommunity}</h2>
            <Prose className="lg:col-span-7">
              {(maker.bio ?? maker.community_story ?? "")
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((para) => (
                  <p key={para.slice(0, 24)}>{para}</p>
                ))}
            </Prose>
          </div>
        </Section>
      ) : null}

      <Section tight className="pt-0">
        <Rule className="mb-12" />
        <div className="grid grid-cols-1 gap-x-16 gap-y-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="text-2xl">{copy.makers.process}</h2>
            <p className="mt-3 max-w-sm text-ink-2">{storyCopy.makers.processIntro}</p>
          </div>
          <div className="lg:col-span-7">
            {techniques.length ? (
              techniques.map((technique) => (
                <div key={technique.slug} className="mb-12 last:mb-0">
                  <h3 className="text-xl">
                    <Link href={`/craft/${technique.slug}`} className="hover:text-clay">
                      {technique.name}
                    </Link>
                  </h3>
                  {technique.description ? (
                    <p className="mt-2 max-w-[60ch] text-ink-2">{technique.description}</p>
                  ) : null}
                  <ProcessSteps className="mt-6" steps={technique.steps} />
                </div>
              ))
            ) : (
              <p className="text-ink-2">
                {storyCopy.makers.noProcess}{" "}
                <Link href="/craft" className="underline decoration-rule-strong underline-offset-4 hover:text-clay">
                  {storyCopy.makers.seeCraft}
                </Link>
              </p>
            )}
          </div>
        </div>
      </Section>

      <Section tight className="pt-0">
        <Rule className="mb-12" />
        <ProductRail
          eyebrow={copy.product.originTrace}
          title={copy.makers.communityWork(maker.display_name)}
          products={maker.products}
          action={{ href: `/shop?makers=${maker.slug}`, label: copy.home.viewAll }}
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
