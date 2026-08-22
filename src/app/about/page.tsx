import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { listProducts } from "@/server/queries";
import { Section, Breadcrumb, Prose, Rule } from "@/components/ui/layout";
import { ProductRail } from "@/components/story/product-rail";
import { copy } from "@/content/copy";
import { storyCopy, siteUrl } from "@/content/story-copy";

export const revalidate = 300;

export const metadata: Metadata = {
  title: copy.nav.story,
  description: copy.brand.description,
  alternates: { canonical: "/about" },
};

/** JSON-LD goes into a script tag, so `<` never survives as a literal. */
function ldJson(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function AboutPage() {
  const newest = await listProducts({ sort: "newest" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: copy.brand.name,
    url: siteUrl,
    slogan: copy.brand.philosophy,
    description: copy.brand.description,
    address: { "@type": "PostalAddress", addressLocality: "Kathmandu", addressCountry: "NP" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }}
      />

      <Section tight>
        <Breadcrumb trail={[{ href: "/", label: "Home" }, { label: copy.nav.about }]} />

        <div className="mt-10 grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="spec mb-4">{storyCopy.about.eyebrow}</p>
            <h1 className="text-4xl lg:text-5xl">{storyCopy.about.title}</h1>
            <p className="spec mt-6 border-l-2 border-clay pl-4 text-ink">
              {copy.brand.philosophy}
            </p>
          </div>

          <Prose className="lg:col-span-7 text-lg">
            {storyCopy.about.spine.map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
          </Prose>
        </div>
      </Section>

      <Section tight className="pt-0">
        <Rule className="mb-12" />
        <div className="grid grid-cols-1 gap-x-16 gap-y-8 lg:grid-cols-12">
          <h2 className="text-3xl lg:col-span-5 lg:text-4xl">
            {storyCopy.about.philosophyTitle}
          </h2>
          <dl className="lg:col-span-7 border-t border-rule">
            {storyCopy.about.philosophyItems.map((item) => (
              <div
                key={item.term}
                className="grid grid-cols-1 gap-x-8 gap-y-1 border-b border-rule py-6 sm:grid-cols-12"
              >
                <dt className="spec sm:col-span-3">{item.term}</dt>
                <dd className="text-ink-2 sm:col-span-9">{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section tight className="pt-0">
        <Rule className="mb-12" />
        <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-12">
          {/* The photography disclosure is house style, and it belongs here
              rather than buried in a footer link. */}
          <div className="lg:col-span-7 lg:order-2">
            <h2 className="text-3xl lg:text-4xl">{storyCopy.about.photographyTitle}</h2>
            <div className="mt-5 max-w-[60ch] space-y-4 text-ink-2">
              {storyCopy.about.photographyBody.map((para) => (
                <p key={para.slice(0, 24)}>{para}</p>
              ))}
            </div>
          </div>

          <figure className="rise lg:col-span-5 lg:order-1">
            <div className="relative aspect-4/5 overflow-hidden bg-paper-deep">
              <Image
                src="/media/kans-grass-growing.jpg"
                alt=""
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
            <figcaption className="spec-value mt-3 text-ink-2">
              Kans grass, before it is anything else.
            </figcaption>
          </figure>
        </div>
      </Section>

      <Section tight className="pt-0">
        <Rule className="mb-12" />
        <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <h2 className="text-2xl">{storyCopy.about.consentTitle}</h2>
            <p className="mt-4 max-w-[58ch] text-ink-2">{copy.makers.consentNote}</p>
            <p className="mt-4 max-w-[58ch] text-ink-2">{storyCopy.makers.attributionBody}</p>
            <p className="mt-5">
              <Link href="/makers" className="spec text-ink hover:text-clay">
                {copy.makers.title} →
              </Link>
            </p>
          </div>

          <div className="lg:col-span-6">
            <h2 className="text-2xl">{storyCopy.about.provenanceTitle}</h2>
            <p className="mt-4 max-w-[58ch] text-ink-2">{storyCopy.about.provenanceBody}</p>
            <p className="mt-5">
              <Link href="/impact" className="spec text-ink hover:text-clay">
                {copy.impact.title} →
              </Link>
            </p>
          </div>
        </div>
      </Section>

      <Section tight className="pt-0">
        <Rule className="mb-12" />
        <ProductRail
          eyebrow={copy.product.originTrace}
          title="Everything here earns its place"
          products={newest.slice(0, 3)}
          action={{ href: "/shop", label: copy.shop.allProducts }}
        />
      </Section>
    </>
  );
}
