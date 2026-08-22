import Image from "next/image";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/layout";
import { ProductGrid } from "@/components/product-card";
import { copy } from "@/content/copy";
import { homeCopy } from "@/content/home-copy";
import {
  listCategories,
  listCollections,
  listJournal,
  listMakers,
  listProducts,
} from "@/server/queries";

/** Catalogue dates: 12 MAR 2025, set by the .spec class. */
function specDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function HomePage() {
  const [categories, collections, products, makers, journal] = await Promise.all([
    listCategories(),
    listCollections(),
    listProducts({ sort: "newest" }),
    listMakers(),
    listJournal(3),
  ]);

  const collection = collections[0];
  const maker = makers[0];
  const featured = products.slice(0, 6);

  return (
    <>
      {/* 1 · Hero — compact editorial split, never full-screen. */}
      <section className="border-b border-rule">
        <div className="container-page grid grid-cols-12 items-center gap-x-8 gap-y-10 py-12 lg:py-20">
          <div className="col-span-12 rise lg:col-span-5">
            <p className="spec">{copy.home.heroEyebrow}</p>
            <h1 className="mt-4 text-4xl leading-[1.08] lg:text-6xl">{copy.home.heroTitle}</h1>
            <p className="mt-6 max-w-[46ch] text-[1.0625rem] leading-relaxed text-ink-2">
              {copy.home.heroBody}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <LinkButton href="/shop" size="lg">
                {copy.home.heroCta}
              </LinkButton>
              <LinkButton href="/makers" variant="secondary" size="lg">
                {copy.home.heroSecondary}
              </LinkButton>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6 lg:col-start-7">
            <div className="relative aspect-4/5 overflow-hidden bg-paper-deep">
              <Image
                src="/media/moon-bag-magenta.jpg"
                alt={homeCopy.heroImageAlt}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <p className="spec mt-3">{copy.brand.philosophy}</p>
          </div>
        </div>
      </section>

      {/* 2 · The store. */}
      {categories.length > 0 ? (
        <Section tight>
          <SectionHeader
            eyebrow={copy.home.heroEyebrow}
            title={copy.home.categoriesTitle}
            action={{ href: "/shop", label: copy.home.viewAll }}
          />
          <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category.slug} className="border-t border-rule">
                <Link href={`/shop/${category.slug}`} className="group block h-full pt-6 pb-8">
                  <p className="spec">{copy.shop.resultCount(category.count)}</p>
                  <h3 className="mt-2 text-2xl group-hover:text-clay">{category.name}</h3>
                  {category.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-ink-2">{category.description}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* 3 · Featured collection. */}
      {collection ? (
        <section className="border-y border-rule bg-paper-deep">
          <div className="container-page grid grid-cols-12 items-center gap-x-8 gap-y-8 py-16 lg:py-24">
            <div className="col-span-12 lg:col-span-7">
              <div className="relative aspect-4/5 overflow-hidden bg-paper lg:aspect-3/2">
                {collection.cover_image ? (
                  <Image
                    src={collection.cover_image}
                    alt={homeCopy.coverAlt(collection.title)}
                    fill
                    sizes="(min-width: 1024px) 58vw, 100vw"
                    className="object-cover"
                  />
                ) : null}
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 lg:col-start-9">
              <p className="spec">{copy.home.collectionTitle}</p>
              <h2 className="mt-3 text-3xl lg:text-4xl">{collection.title}</h2>
              {collection.subtitle ? (
                <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-2">{collection.subtitle}</p>
              ) : null}
              <p className="spec mt-5">{copy.shop.resultCount(collection.count)}</p>
              <LinkButton href={`/collections/${collection.slug}`} variant="secondary" className="mt-6">
                {copy.home.viewAll}
              </LinkButton>
            </div>
          </div>
        </section>
      ) : null}

      {/* 4 · New objects. */}
      {featured.length > 0 ? (
        <Section>
          <SectionHeader
            eyebrow={copy.shop.sortNewest}
            title={homeCopy.newObjectsTitle}
            action={{ href: "/shop", label: copy.home.viewAll }}
          />
          <ProductGrid products={featured} />
        </Section>
      ) : null}

      {/* 5 · Maker spotlight. */}
      {maker ? (
        <section className="border-y border-rule">
          <div className="container-page grid grid-cols-12 gap-x-8 gap-y-8 py-16 lg:py-24">
            <div className="col-span-12 sm:col-span-6 lg:col-span-5">
              <div className="relative aspect-4/5 overflow-hidden bg-paper-deep">
                {maker.portrait_image ? (
                  <Image
                    src={maker.portrait_image}
                    alt={homeCopy.portraitAlt(maker.display_name)}
                    fill
                    sizes="(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : null}
              </div>
            </div>
            <div className="col-span-12 self-center lg:col-span-6 lg:col-start-7">
              <p className="spec">{copy.home.makerTitle}</p>
              <h2 className="mt-3 text-3xl lg:text-4xl">{maker.display_name}</h2>
              <p className="spec-value mt-3 text-ink-2">
                {maker.community_name} · {maker.district}
              </p>
              {maker.craft ? (
                <p className="mt-5 max-w-[52ch] text-[1.0625rem] leading-relaxed text-ink-2">{maker.craft}</p>
              ) : null}
              {maker.working_since || maker.product_count ? (
                <p className="spec mt-6">
                  {[
                    maker.working_since ? copy.makers.workingSince(maker.working_since) : null,
                    maker.product_count ? copy.shop.resultCount(maker.product_count) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              <LinkButton href={`/makers/${maker.slug}`} variant="secondary" className="mt-6">
                {copy.makers.theirWork(maker.display_name)}
              </LinkButton>
            </div>
          </div>
        </section>
      ) : null}

      {/* 6 · Journal teaser. */}
      {journal.length > 0 ? (
        <Section tight>
          <SectionHeader
            eyebrow={copy.journal.title}
            title={copy.home.journalTitle}
            action={{ href: "/journal", label: copy.home.viewAll }}
          />
          <ul className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-3">
            {journal.map((post) => (
              <li key={post.slug}>
                <Link href={`/journal/${post.slug}`} className="group block">
                  <div className="relative aspect-4/5 overflow-hidden bg-paper-deep">
                    {post.hero_image ? (
                      <Image
                        src={post.hero_image}
                        alt={homeCopy.coverAlt(post.title)}
                        fill
                        sizes="(min-width: 640px) 33vw, 100vw"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <p className="spec mt-4">{specDate(post.published_at) ?? copy.journal.published}</p>
                  <h3 className="mt-1.5 text-xl leading-snug group-hover:text-clay">{post.title}</h3>
                  {post.excerpt ? (
                    <p className="mt-2 text-sm leading-relaxed text-ink-2">{post.excerpt}</p>
                  ) : null}
                  <p className="spec mt-3 text-ink">{copy.journal.readMore} →</p>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
