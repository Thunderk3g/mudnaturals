import { cache, Fragment } from "react";
import { id, ids, n, s, type Block, type PageKey } from "@/lib/blocks";
import { getMediaMeta, getPageBlocks, type MediaMeta } from "@/server/cms";
import {
  listCategories,
  listCollections,
  listCommunities,
  listJournal,
  listProductsForRail,
  type CategoryCard,
  type CollectionCard,
  type CommunityCard,
  type JournalPost,
  type ProductCard as ProductCardData,
} from "@/server/queries";
import {
  CategoryGridBlock,
  CollectionFeatureBlock,
  CommunityFeatureBlock,
  HeroBlock,
  ImageBannerBlock,
  JournalRailBlock,
  ProductRailBlock,
  RichTextBlock,
  StatementBlock,
  ValuePropsBlock,
} from "@/components/blocks/sections";

/**
 * Renders a page from whatever the console has put on it.
 *
 * The performance shape matters more than anything else here. The database is
 * in Seoul and a build renders eighteen pages at once, so this module holds to
 * three rules:
 *
 *   1. Every block's data is fetched in one `Promise.all` across all blocks.
 *      Awaiting inside the render loop would serialise a homepage into six
 *      sequential cross-Pacific round trips.
 *   2. Two blocks of the same kind share one query. `cache()` dedupes the list
 *      reads for the length of a single render, so a page with two product
 *      rails and two category grids still issues one categories query.
 *   3. Nothing aggregates. Counts come from the list queries the storefront
 *      already runs; no block adds a per-render aggregate of its own.
 */

/* --------------------------------------------------------------- loading -- */

// Request-scoped dedupe. These are plain queries rather than cached ones, so
// two blocks asking the same question would otherwise ask it twice.
const categoriesOnce = cache(listCategories);
const collectionsOnce = cache(listCollections);
const communitiesOnce = cache(listCommunities);

type Payload =
  | { kind: "none" }
  | { kind: "categories"; categories: CategoryCard[] }
  | { kind: "products"; products: ProductCardData[] }
  | { kind: "collection"; collection: CollectionCard | null }
  | { kind: "community"; community: CommunityCard | null }
  | { kind: "journal"; posts: JournalPost[] };

async function load(block: Block): Promise<Payload> {
  const { data } = block;

  switch (block.block_type) {
    case "category_grid": {
      const picked = ids(data, "category_ids");
      const all = await categoriesOnce();
      // An empty picker means all of them, in their own order. A populated one
      // means exactly these, in the order the operator dragged them into.
      const categories = picked.length
        ? picked.flatMap((wanted) => all.filter((category) => category.id === wanted))
        : all;
      return { kind: "categories", categories };
    }

    case "product_rail":
      return {
        kind: "products",
        products: await listProductsForRail({
          source: s(data, "source") || "newest",
          collectionId: id(data, "collection_id"),
          categoryId: id(data, "category_id"),
          productIds: ids(data, "product_ids"),
          limit: n(data, "limit", 6),
        }),
      };

    case "collection_feature": {
      const all = await collectionsOnce();
      const wanted = id(data, "collection_id");
      const collection = (wanted ? all.find((row) => row.id === wanted) : all[0]) ?? null;
      return { kind: "collection", collection };
    }

    case "community_feature": {
      // `listCommunities` is already ordered by how much of their work is live,
      // so an unset picker features whoever has the fullest shelf.
      const all = await communitiesOnce();
      const wanted = id(data, "community_id");
      const community = (wanted ? all.find((row) => row.id === wanted) : all[0]) ?? null;
      return { kind: "community", community };
    }

    case "journal_rail":
      return { kind: "journal", posts: await listJournal(n(data, "limit", 3)) };

    default:
      return { kind: "none" };
  }
}

/* -------------------------------------------------------------- rendering -- */

function render(
  block: Block,
  payload: Payload,
  media: Record<string, MediaMeta>,
  first: boolean,
) {
  const { data } = block;
  const asset = (key: string) => {
    const mediaId = id(data, key);
    return mediaId ? (media[mediaId] ?? null) : null;
  };

  switch (block.block_type) {
    case "hero":
      return <HeroBlock data={data} media={asset("media_id")} priority={first} />;
    case "statement":
      return <StatementBlock data={data} />;
    case "value_props":
      return <ValuePropsBlock data={data} />;
    case "category_grid":
      return payload.kind === "categories" ? (
        <CategoryGridBlock data={data} categories={payload.categories} />
      ) : null;
    case "product_rail":
      return payload.kind === "products" ? (
        <ProductRailBlock data={data} products={payload.products} />
      ) : null;
    case "collection_feature":
      return payload.kind === "collection" ? (
        <CollectionFeatureBlock data={data} collection={payload.collection} />
      ) : null;
    case "community_feature":
      return payload.kind === "community" ? (
        <CommunityFeatureBlock data={data} community={payload.community} />
      ) : null;
    case "journal_rail":
      return payload.kind === "journal" ? (
        <JournalRailBlock data={data} posts={payload.posts} />
      ) : null;
    case "image_banner":
      return <ImageBannerBlock data={data} media={asset("media_id")} />;
    case "rich_text":
      return <RichTextBlock data={data} />;
  }
}

export async function PageBlocks({ pageKey }: { pageKey: PageKey }) {
  const blocks = await getPageBlocks(pageKey);
  if (!blocks.length) return null;

  const mediaIds = [
    ...new Set(
      blocks.flatMap((block) => {
        const mediaId = id(block.data, "media_id");
        return mediaId ? [mediaId] : [];
      }),
    ),
  ];

  // The media ids are readable straight off the payloads, so the metadata read
  // goes out alongside the block data rather than after it.
  const [media, payloads] = await Promise.all([
    getMediaMeta(mediaIds),
    Promise.all(blocks.map(load)),
  ]);

  return (
    <>
      {blocks.map((block, i) => (
        <Fragment key={block.id}>{render(block, payloads[i], media, i === 0)}</Fragment>
      ))}
    </>
  );
}
