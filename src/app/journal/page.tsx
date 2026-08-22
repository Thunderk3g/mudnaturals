import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { listJournal, listProducts } from "@/server/queries";
import { Section, Breadcrumb, Prose, Rule, EmptyState } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/button";
import { ProductRail } from "@/components/story/product-rail";
import { copy } from "@/content/copy";
import { storyCopy, formatSpecDate, isoDate } from "@/content/story-copy";

export const revalidate = 300;

export const metadata: Metadata = {
  title: copy.journal.title,
  description: copy.journal.intro,
  alternates: { canonical: "/journal" },
};

export default async function JournalPage() {
  const [posts, newest] = await Promise.all([listJournal(), listProducts({ sort: "newest" })]);

  return (
    <>
      <Section tight>
        <Breadcrumb trail={[{ href: "/", label: "Home" }, { label: copy.journal.title }]} />

        <div className="mt-10 grid grid-cols-1 gap-x-16 gap-y-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="spec mb-4">{copy.home.journalTitle}</p>
            <h1 className="text-4xl lg:text-5xl">{copy.journal.title}</h1>
          </div>
          <Prose className="lg:col-span-7">
            <p>{copy.journal.intro}</p>
          </Prose>
        </div>
      </Section>

      <Section tight className="pt-0">
        {posts.length ? (
          <ul className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.slug} className="rise">
                <article>
                  <Link href={`/journal/${post.slug}`} className="group block">
                    <div className="relative aspect-4/5 overflow-hidden bg-paper-deep">
                      {post.hero_image ? (
                        <Image
                          src={post.hero_image}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                        />
                      ) : null}
                    </div>

                    {post.published_at ? (
                      <time className="spec mt-4 block" dateTime={isoDate(post.published_at)}>
                        {formatSpecDate(post.published_at)}
                      </time>
                    ) : null}
                    <h2 className="mt-1.5 text-2xl leading-snug group-hover:text-clay">
                      {post.title}
                    </h2>
                    {post.excerpt ? (
                      <p className="mt-2 text-ink-2">{post.excerpt}</p>
                    ) : null}
                    <p className="spec mt-3 text-ink">{copy.journal.readMore} →</p>
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={copy.journal.title}
            body={copy.journal.intro}
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
