import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJournalPost } from "@/server/queries";
import { Section, Breadcrumb, Rule } from "@/components/ui/layout";
import { ProductRail } from "@/components/story/product-rail";
import { copy } from "@/content/copy";
import { storyCopy, siteUrl, formatSpecDate, isoDate } from "@/content/story-copy";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

/** JSON-LD goes into a script tag, so `<` never survives as a literal. */
function ldJson(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getJournalPost(slug);
  if (!post) return { title: copy.errors.notFoundTitle };

  const description = post.excerpt ?? post.blocks.find((b) => b.text)?.text ?? copy.journal.intro;
  return {
    title: post.title,
    description,
    alternates: { canonical: `/journal/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      publishedTime: isoDate(post.published_at),
      authors: post.author ? [post.author] : undefined,
      images: post.hero_image ? [post.hero_image] : undefined,
    },
  };
}

export default async function JournalPostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getJournalPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? undefined,
    datePublished: isoDate(post.published_at),
    author: { "@type": "Organization", name: post.author ?? copy.brand.name },
    publisher: { "@type": "Organization", name: copy.brand.name, url: siteUrl },
    image: post.hero_image ? `${siteUrl}${post.hero_image}` : undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}/journal/${post.slug}` },
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
            { href: "/journal", label: copy.journal.title },
            { label: post.title },
          ]}
        />

        <article className="mt-10">
          <header className="grid grid-cols-1 gap-x-16 gap-y-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              {post.published_at ? (
                <time className="spec mb-4 block" dateTime={isoDate(post.published_at)}>
                  {copy.journal.published} {formatSpecDate(post.published_at)}
                </time>
              ) : null}
              <h1 className="text-4xl lg:text-5xl">{post.title}</h1>
              {post.excerpt ? (
                <p className="mt-5 max-w-[52ch] text-xl text-ink-2">{post.excerpt}</p>
              ) : null}
              {post.author ? (
                <p className="spec mt-6">
                  {storyCopy.journal.author} {post.author}
                </p>
              ) : null}
            </div>

            {post.hero_image ? (
              <figure className="rise lg:col-span-5">
                <div className="relative aspect-4/5 overflow-hidden bg-paper-deep">
                  <Image
                    src={post.hero_image}
                    alt=""
                    fill
                    priority
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover"
                  />
                </div>
              </figure>
            ) : null}
          </header>

          <Rule className="my-12" />

          <div className="grid grid-cols-1 gap-x-16 lg:grid-cols-12">
            <div className="lg:col-span-7 lg:col-start-1">
              <div className="max-w-[65ch] space-y-6 text-[1.0625rem] leading-relaxed text-ink-2">
                {post.blocks
                  .filter((block) => block.type === "paragraph" && block.text)
                  .map((block, i) => (
                    <p key={i}>{block.text}</p>
                  ))}
              </div>
            </div>
          </div>
        </article>
      </Section>

      {/* The explicit end of every post. A journal entry that does not reach an
          object is the defect this whole site is built to avoid. */}
      <Section tight className="pt-0">
        <Rule className="mb-12" />
        <ProductRail
          eyebrow={copy.journal.title}
          title={copy.journal.shopThisStory}
          body={post.products.length ? storyCopy.journal.shopThisStoryBody : storyCopy.journal.noProducts}
          products={post.products}
          action={{ href: "/shop", label: copy.shop.allProducts }}
        />

        <p className="mt-12">
          <Link href="/journal" className="spec text-ink hover:text-clay">
            ← {storyCopy.journal.backToJournal}
          </Link>
        </p>
      </Section>
    </>
  );
}
