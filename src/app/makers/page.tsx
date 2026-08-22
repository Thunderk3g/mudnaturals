import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { listMakers, listProducts } from "@/server/queries";
import { Section, Breadcrumb, Prose, EmptyState } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/button";
import { SpecList } from "@/components/ui/spec";
import { ProductRail } from "@/components/story/product-rail";
import { copy } from "@/content/copy";
import { storyCopy } from "@/content/story-copy";

export const revalidate = 300;

export const metadata: Metadata = {
  title: copy.makers.title,
  description: copy.makers.intro,
  alternates: { canonical: "/makers" },
};

export default async function MakersPage() {
  // The closing rail exists so the index is not a leaf either: three clicks
  // deep is a competitor's problem, not ours.
  const [makers, newest] = await Promise.all([listMakers(), listProducts({ sort: "newest" })]);

  return (
    <>
      <Section tight>
        <Breadcrumb trail={[{ href: "/", label: "Home" }, { label: copy.makers.title }]} />

        <div className="mt-10 grid grid-cols-1 gap-x-16 gap-y-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="spec mb-4">{storyCopy.makers.eyebrow}</p>
            <h1 className="text-4xl lg:text-5xl">{copy.makers.title}</h1>
          </div>
          <div className="lg:col-span-5">
            <Prose>
              <p>{copy.makers.intro}</p>
            </Prose>
            {/* The consent note is not a footnote. It is the reason these pages
                carry community names rather than people's names. */}
            <p className="spec mt-8 border-l-2 border-clay pl-4 leading-relaxed">
              {copy.makers.consentNote}
            </p>
          </div>
        </div>
      </Section>

      <Section tight className="pt-0">
        {makers.length ? (
          <ul className="border-t border-rule">
            {makers.map((maker) => (
              <li
                key={maker.slug}
                className="rise grid grid-cols-1 gap-x-16 gap-y-6 border-b border-rule py-12 lg:grid-cols-12 lg:py-16"
              >
                <div className="lg:col-span-5">
                  <Link
                    href={`/makers/${maker.slug}`}
                    className="relative block aspect-4/5 overflow-hidden bg-paper-deep"
                    tabIndex={-1}
                    aria-hidden
                  >
                    {maker.portrait_image ? (
                      <Image
                        src={maker.portrait_image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 40vw, 100vw"
                        className="object-cover"
                      />
                    ) : (
                      <span className="spec absolute inset-0 flex items-center justify-center">
                        No image
                      </span>
                    )}
                  </Link>
                </div>

                <div className="lg:col-span-7 lg:pt-2">
                  <h2 className="text-3xl lg:text-4xl">
                    <Link href={`/makers/${maker.slug}`} className="hover:text-clay">
                      {maker.display_name}
                    </Link>
                  </h2>

                  <SpecList
                    className="mt-6 max-w-xl"
                    items={[
                      { label: storyCopy.makers.district, value: maker.district },
                      { label: storyCopy.makers.craft, value: maker.craft },
                      {
                        label: storyCopy.makers.workingSince,
                        value: maker.working_since ?? null,
                      },
                      {
                        label: storyCopy.makers.objectsInShop,
                        value: maker.product_count || null,
                      },
                    ]}
                  />

                  <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <LinkButton href={`/makers/${maker.slug}`} variant="secondary">
                      {storyCopy.makers.recordTitle}
                    </LinkButton>
                    <Link
                      href={`/shop?makers=${maker.slug}`}
                      className="spec text-ink hover:text-clay"
                    >
                      {copy.makers.communityWork(maker.display_name)} →
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={copy.shop.empty}
            action={
              <LinkButton href="/shop" variant="secondary">
                {storyCopy.shared.shopEverything}
              </LinkButton>
            }
          />
        )}
      </Section>

      <Section tight className="pt-0">
        <ProductRail
          eyebrow={copy.product.originTrace}
          title="Objects from these workshops"
          products={newest.slice(0, 3)}
          action={{ href: "/shop", label: copy.home.viewAll }}
        />
      </Section>
    </>
  );
}
