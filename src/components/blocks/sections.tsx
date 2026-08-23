import Image from "next/image";
import Link from "next/link";
import { cta, id, items, s } from "@/lib/blocks";
import type { MediaMeta } from "@/server/cms";
import { imageSrc } from "@/server/cms";
import type {
  CategoryCard,
  CollectionCard,
  CommunityCard,
  JournalPost,
  ProductCard as ProductCardData,
} from "@/server/queries";
import { LinkButton } from "@/components/ui/button";
import { Prose, Section, SectionHeader } from "@/components/ui/layout";
import { ProductGrid } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { copy } from "@/content/copy";
import { blockCopy, homeCopy } from "@/content/home-copy";
import { formatSpecDate } from "@/content/story-copy";

/**
 * One component per block type. Every value arrives through the safe accessors
 * in `lib/blocks`, so a half-filled block renders as a missing value rather
 * than an empty heading or a thrown render — the console is the only writer,
 * but a blank homepage is a worse failure than a stale one.
 *
 * The rule these all follow: no string is printed unless it has content, and
 * every image carries real alt text, taken from the media library where the
 * artwork was uploaded and from the block's own copy where it was not.
 */

type Data = Record<string, unknown>;

/** Media metadata gives an uploaded image its alt and its true proportions. */
function frame(media: MediaMeta | null, fallbackRatio = "4 / 5") {
  return media?.width && media?.height ? `${media.width} / ${media.height}` : fallbackRatio;
}

function alt(media: MediaMeta | null, fallback: string) {
  return media?.alt?.trim() || fallback;
}

/** Blank lines are paragraph breaks — the console tells operators exactly that. */
function paragraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean);
}

/* -------------------------------------------------------------------- hero -- */

/**
 * The one block that is above the fold on arrival, so it keeps the CSS entry
 * animation rather than the scroll reveal: nothing here waits for hydration.
 */
export function HeroBlock({
  data,
  media,
  priority,
}: {
  data: Data;
  media: MediaMeta | null;
  priority: boolean;
}) {
  const eyebrow = s(data, "eyebrow");
  const title = s(data, "title");
  const body = s(data, "body");
  const caption = s(data, "caption");
  const primary = cta(data, "primary_cta");
  const secondary = cta(data, "secondary_cta");
  const src = imageSrc(id(data, "media_id"), homeCopy.heroFallbackImage);

  return (
    <section className="border-b border-rule">
      <div className="container-page grid grid-cols-12 items-center gap-x-8 gap-y-10 py-12 lg:py-20">
        <div className="col-span-12 rise lg:col-span-5">
          {eyebrow ? <p className="spec">{eyebrow}</p> : null}
          {title ? <h1 className="mt-4 text-4xl leading-[1.08] lg:text-6xl">{title}</h1> : null}
          {body ? (
            <p className="mt-6 max-w-[46ch] text-[1.0625rem] leading-relaxed text-ink-2">{body}</p>
          ) : null}
          {primary || secondary ? (
            <div className="mt-9 flex flex-wrap gap-3">
              {primary ? (
                <LinkButton href={primary.href} size="lg">
                  {primary.label}
                </LinkButton>
              ) : null}
              {secondary ? (
                <LinkButton href={secondary.href} variant="secondary" size="lg">
                  {secondary.label}
                </LinkButton>
              ) : null}
            </div>
          ) : null}
        </div>

        {src ? (
          <figure className="col-span-12 rise lg:col-span-6 lg:col-start-7">
            <div
              className="relative overflow-hidden bg-paper-deep"
              style={{ aspectRatio: frame(media) }}
            >
              <Image
                src={src}
                alt={alt(media, homeCopy.heroImageAlt)}
                fill
                priority={priority}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            {caption ? <figcaption className="spec mt-3">{caption}</figcaption> : null}
          </figure>
        ) : null}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- statement -- */

/** A held breath between two busy bands. Full width, centred, nothing to click. */
export function StatementBlock({ data }: { data: Data }) {
  const eyebrow = s(data, "eyebrow");
  const title = s(data, "title");
  const body = s(data, "body");
  if (!title && !body) return null;

  return (
    <section className="band-deep">
      <div className="container-page py-20 lg:py-28">
        <Reveal className="mx-auto max-w-3xl text-center">
          {eyebrow ? <p className="spec">{eyebrow}</p> : null}
          {title ? <p className="mt-5 font-serif text-3xl leading-snug lg:text-4xl">{title}</p> : null}
          {body ? (
            <p className="mx-auto mt-6 max-w-[58ch] text-[1.0625rem] leading-relaxed text-ink-2">
              {body}
            </p>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- value props -- */

export function ValuePropsBlock({ data }: { data: Data }) {
  const rows = items(data, "items").filter((item) => item.title || item.body);
  if (!rows.length) return null;
  const title = s(data, "title");

  return (
    <Section tight>
      {title ? <SectionHeader eyebrow={s(data, "eyebrow") || undefined} title={title} /> : null}
      <Reveal as="ul" stagger className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-3">
        {rows.map((item) => (
          <li key={item.title || item.body} className="border-t border-rule pt-6">
            {item.title ? <h3 className="text-xl">{item.title}</h3> : null}
            {item.body ? (
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{item.body}</p>
            ) : null}
          </li>
        ))}
      </Reveal>
    </Section>
  );
}

/* ----------------------------------------------------------- category grid -- */

export function CategoryGridBlock({
  data,
  categories,
}: {
  data: Data;
  categories: CategoryCard[];
}) {
  if (!categories.length) return null;
  const title = s(data, "title");
  const ctaLabel = s(data, "cta_label");
  const ctaHref = s(data, "cta_href");

  return (
    <Section tight>
      {title ? (
        <SectionHeader
          eyebrow={s(data, "eyebrow") || undefined}
          title={title}
          action={ctaLabel && ctaHref ? { href: ctaHref, label: ctaLabel } : undefined}
        />
      ) : null}
      <Reveal as="ul" stagger className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <li key={category.slug} className="border-t border-rule">
            <Link href={`/shop/${category.slug}`} className="group block h-full pt-6 pb-8">
              <p className="spec">{copy.shop.resultCount(category.count)}</p>
              <h3 className="mt-2 text-2xl transition-colors duration-400 group-hover:text-clay">
                {category.name}
              </h3>
              {category.description ? (
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{category.description}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </Reveal>
    </Section>
  );
}

/* ------------------------------------------------------------ product rail -- */

export function ProductRailBlock({
  data,
  products,
}: {
  data: Data;
  products: ProductCardData[];
}) {
  if (!products.length) return null;
  const title = s(data, "title");
  const ctaLabel = s(data, "cta_label");
  const ctaHref = s(data, "cta_href");

  return (
    <Section>
      {title ? (
        <SectionHeader
          eyebrow={s(data, "eyebrow") || undefined}
          title={title}
          action={ctaLabel && ctaHref ? { href: ctaHref, label: ctaLabel } : undefined}
        />
      ) : null}
      <ProductGrid products={products} />
    </Section>
  );
}

/* ------------------------------------------------------ collection feature -- */

/**
 * The full-bleed band. It is the one place the paper-deep ground runs edge to
 * edge, which is what stops the homepage reading as six identical sections.
 */
export function CollectionFeatureBlock({
  data,
  collection,
}: {
  data: Data;
  collection: CollectionCard | null;
}) {
  if (!collection) return null;
  const eyebrow = s(data, "eyebrow");
  const src = imageSrc(collection.cover_image_id, collection.cover_image);

  return (
    <section className="band-deep">
      <div className="container-page grid grid-cols-12 items-center gap-x-8 gap-y-8 py-16 lg:py-24">
        <Reveal className="col-span-12 lg:col-span-7">
          <div className="relative aspect-4/5 overflow-hidden bg-paper lg:aspect-3/2">
            {src ? (
              <Image
                src={src}
                alt={homeCopy.coverAlt(collection.title)}
                fill
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-cover"
              />
            ) : null}
          </div>
        </Reveal>

        <Reveal className="col-span-12 lg:col-span-4 lg:col-start-9">
          {eyebrow ? <p className="spec">{eyebrow}</p> : null}
          <h2 className="mt-3 text-3xl lg:text-4xl">{collection.title}</h2>
          {collection.subtitle ? (
            <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-2">{collection.subtitle}</p>
          ) : null}
          <p className="spec mt-5">{copy.shop.resultCount(collection.count)}</p>
          <LinkButton
            href={`/collections/${collection.slug}`}
            variant="secondary"
            className="mt-6"
          >
            {copy.home.viewAll}
          </LinkButton>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- community feature -- */

/**
 * What replaced the maker spotlight. It names a place and what comes out of it,
 * and routes to a page of objects — not to a profile.
 */
export function CommunityFeatureBlock({
  data,
  community,
}: {
  data: Data;
  community: CommunityCard | null;
}) {
  if (!community) return null;
  const eyebrow = s(data, "eyebrow");
  const src = imageSrc(community.cover_image_id, community.cover_image);

  const facts = [
    community.working_since ? copy.communities.workingSince(community.working_since) : null,
    community.product_count ? copy.shop.resultCount(community.product_count) : null,
  ].filter(Boolean);

  return (
    <section className="border-y border-rule">
      <div className="container-page grid grid-cols-12 gap-x-8 gap-y-8 py-16 lg:py-24">
        <Reveal className="col-span-12 sm:col-span-6 lg:col-span-5">
          <div className="relative aspect-4/5 overflow-hidden bg-paper-deep">
            {src ? (
              <Image
                src={src}
                alt={blockCopy.communityImageAlt(community.name)}
                fill
                sizes="(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            ) : null}
          </div>
        </Reveal>

        <Reveal className="col-span-12 self-center lg:col-span-6 lg:col-start-7">
          {eyebrow ? <p className="spec">{eyebrow}</p> : null}
          <h2 className="mt-3 text-3xl lg:text-4xl">{community.name}</h2>
          <p className="spec-value mt-3 text-ink-2">
            {[community.district, community.province].filter(Boolean).join(" · ")}
          </p>
          {community.summary ? (
            <p className="mt-5 max-w-[52ch] text-[1.0625rem] leading-relaxed text-ink-2">
              {community.summary}
            </p>
          ) : null}
          {facts.length ? <p className="spec mt-6">{facts.join(" · ")}</p> : null}
          <LinkButton
            href={`/communities/${community.slug}`}
            variant="secondary"
            className="mt-6"
          >
            {copy.communities.theirWork(community.name)}
          </LinkButton>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ journal rail -- */

export function JournalRailBlock({ data, posts }: { data: Data; posts: JournalPost[] }) {
  if (!posts.length) return null;
  const title = s(data, "title");

  return (
    <Section tight>
      {title ? (
        <SectionHeader
          eyebrow={s(data, "eyebrow") || undefined}
          title={title}
          action={{ href: "/journal", label: copy.home.viewAll }}
        />
      ) : null}
      <Reveal as="ul" stagger className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/journal/${post.slug}`} className="group block">
              <div className="relative aspect-4/5 overflow-hidden bg-paper-deep">
                {post.hero_image ? (
                  <Image
                    src={post.hero_image}
                    alt={homeCopy.coverAlt(post.title)}
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="img-zoom object-cover"
                  />
                ) : null}
              </div>
              <p className="spec mt-4">{formatSpecDate(post.published_at) ?? copy.journal.published}</p>
              <h3 className="mt-1.5 text-xl leading-snug transition-colors duration-400 group-hover:text-clay">
                {post.title}
              </h3>
              {post.excerpt ? (
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{post.excerpt}</p>
              ) : null}
              <p className="spec mt-3 text-ink">
                {copy.journal.readMore} <span aria-hidden className="arrow">→</span>
              </p>
            </Link>
          </li>
        ))}
      </Reveal>
    </Section>
  );
}

/* ------------------------------------------------------------ image banner -- */

const BANNER_ALIGN = {
  left: "justify-start text-left",
  center: "justify-center text-center",
  right: "justify-end text-left",
} as const;

/**
 * A wide photograph with a paper panel set into it. A panel rather than a
 * gradient scrim: the type stays on paper, which is the only ground this site
 * sets type on.
 */
export function ImageBannerBlock({ data, media }: { data: Data; media: MediaMeta | null }) {
  const src = imageSrc(id(data, "media_id"), null);
  const eyebrow = s(data, "eyebrow");
  const title = s(data, "title");
  const body = s(data, "body");
  const action = cta(data, "cta");
  const rawAlign = s(data, "align");
  const align = rawAlign in BANNER_ALIGN ? (rawAlign as keyof typeof BANNER_ALIGN) : "left";

  if (!src && !title && !body) return null;

  return (
    <section className="border-y border-rule">
      <div className="relative min-h-[22rem] bg-paper-deep lg:min-h-[30rem]">
        {src ? (
          <Image
            src={src}
            alt={alt(media, blockCopy.bannerImageAlt)}
            fill
            sizes="100vw"
            className="object-cover"
          />
        ) : null}

        <div className={`container-page relative flex py-16 lg:py-24 ${BANNER_ALIGN[align]}`}>
          {title || body || eyebrow || action ? (
            <Reveal className="max-w-md bg-paper/95 px-7 py-8 lg:px-9 lg:py-10">
              {eyebrow ? <p className="spec">{eyebrow}</p> : null}
              {title ? <h2 className="mt-3 text-3xl lg:text-4xl">{title}</h2> : null}
              {body ? <p className="mt-4 leading-relaxed text-ink-2">{body}</p> : null}
              {action ? (
                <LinkButton href={action.href} variant="secondary" className="mt-6">
                  {action.label}
                </LinkButton>
              ) : null}
            </Reveal>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- rich text -- */

export function RichTextBlock({ data }: { data: Data }) {
  const eyebrow = s(data, "eyebrow");
  const title = s(data, "title");
  const paras = paragraphs(s(data, "body"));
  if (!title && !paras.length) return null;

  return (
    <Section tight>
      <Reveal className="grid grid-cols-1 gap-x-16 gap-y-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          {eyebrow ? <p className="spec mb-4">{eyebrow}</p> : null}
          {title ? <h2 className="text-3xl lg:text-4xl">{title}</h2> : null}
        </div>
        {paras.length ? (
          <Prose className="lg:col-span-7">
            {paras.map((para) => (
              <p key={para.slice(0, 32)}>{para}</p>
            ))}
          </Prose>
        ) : null}
      </Reveal>
    </Section>
  );
}
