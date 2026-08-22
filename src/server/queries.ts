import "server-only";
import { unstable_cache } from "next/cache";
import { sql } from "@/lib/db";

/**
 * Every read the storefront makes. One module so the shape of a product is
 * decided once, and so a page can never quietly invent its own join.
 */

export type ProductImage = {
  storage_path: string;
  alt: string;
  width: number | null;
  height: number | null;
  origin: string;
  is_scale_reference: boolean;
};

export type ProductVariant = {
  id: string;
  sku: string;
  option_name: string | null;
  option_value: string | null;
  price_paisa: number;
  is_default: boolean;
  on_hand: number;
  available: number;
};

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  price_paisa: number;
  category_slug: string;
  category_name: string;
  maker_slug: string | null;
  maker_name: string | null;
  community_name: string | null;
  district: string | null;
  material_name: string | null;
  image: ProductImage | null;
  hover_image: ProductImage | null;
  available: number;
};

export type ProductDetail = ProductCard & {
  description: string | null;
  care: string | null;
  variation_note: string | null;
  labour_hours: number | null;
  maker_share_paisa: number | null;
  is_food: boolean;
  material_slug: string | null;
  technique_slug: string | null;
  technique_name: string | null;
  community_slug: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
};

const CARD_SELECT = sql`
  p.id, p.slug, p.name, p.subtitle, p.price_paisa,
  cat.slug as category_slug, cat.name as category_name,
  mk.slug as maker_slug, mk.display_name as maker_name,
  com.name as community_name, com.district,
  mat.name as material_name,
  (select coalesce(sum(sl.available), 0)
     from product_variants v join stock_levels sl on sl.variant_id = v.id
    where v.product_id = p.id) as available,
  (select to_jsonb(i) from (
     select storage_path, alt, width, height, origin, is_scale_reference
       from product_images where product_id = p.id order by sort_order limit 1
   ) i) as image,
  (select to_jsonb(i) from (
     select storage_path, alt, width, height, origin, is_scale_reference
       from product_images where product_id = p.id order by sort_order offset 1 limit 1
   ) i) as hover_image
`;

const CARD_JOINS = sql`
  from products p
  join categories cat on cat.id = p.category_id
  left join makers mk on mk.id = p.maker_id
  left join communities com on com.id = p.community_id
  left join materials mat on mat.id = p.material_id
`;

export type ShopFilters = {
  category?: string;
  materials?: string[];
  makers?: string[];
  minPaisa?: number;
  maxPaisa?: number;
  sort?: "newest" | "price-asc" | "price-desc" | "name";
  q?: string;
};

export async function listProducts(filters: ShopFilters = {}): Promise<ProductCard[]> {
  const { category, materials, makers, minPaisa, maxPaisa, sort = "newest", q } = filters;

  const rows = await sql<ProductCard[]>`
    select ${CARD_SELECT} ${CARD_JOINS}
    where p.status = 'published'
      ${category ? sql`and cat.slug = ${category}` : sql``}
      ${materials?.length ? sql`and mat.slug = any(${materials})` : sql``}
      ${makers?.length ? sql`and mk.slug = any(${makers})` : sql``}
      ${minPaisa != null ? sql`and p.price_paisa >= ${minPaisa}` : sql``}
      ${maxPaisa != null ? sql`and p.price_paisa <= ${maxPaisa}` : sql``}
      ${q ? sql`and (p.search_text % ${q} or p.search_text ilike ${"%" + q + "%"})` : sql``}
    order by ${
      sort === "price-asc"  ? sql`p.price_paisa asc` :
      sort === "price-desc" ? sql`p.price_paisa desc` :
      sort === "name"       ? sql`p.name asc` :
                              sql`p.sort_order asc, p.published_at desc nulls last`
    }
  `;
  return rows;
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  const [product] = await sql<ProductDetail[]>`
    select ${CARD_SELECT},
      p.description, p.care, p.variation_note, p.labour_hours,
      p.maker_share_paisa, p.is_food,
      mat.slug as material_slug,
      tech.slug as technique_slug, tech.name as technique_name,
      com.slug as community_slug
    ${CARD_JOINS}
    left join craft_techniques tech on tech.id = p.technique_id
    where p.slug = ${slug} and p.status = 'published'
  `;
  if (!product) return null;

  const [images, variants] = await Promise.all([
    sql<ProductImage[]>`
      select storage_path, alt, width, height, origin, is_scale_reference
        from product_images where product_id = ${product.id} order by sort_order`,
    sql<ProductVariant[]>`
      select v.id, v.sku, v.option_name, v.option_value,
             coalesce(v.price_paisa, p.price_paisa) as price_paisa,
             v.is_default,
             coalesce(sl.on_hand, 0) as on_hand,
             coalesce(sl.available, 0) as available
        from product_variants v
        join products p on p.id = v.product_id
        left join stock_levels sl on sl.variant_id = v.id
       where v.product_id = ${product.id}
       order by v.sort_order`,
  ]);

  return { ...product, images, variants };
}

export async function listCategories() {
  return sql<{ slug: string; name: string; description: string | null; count: number }[]>`
    select cat.slug, cat.name, cat.description,
           count(p.id) filter (where p.status = 'published')::int as count
      from categories cat
      left join products p on p.category_id = cat.id
     where cat.status = 'published'
     group by cat.id
     order by cat.sort_order
  `;
}

/** Facets are built from what is actually in stock, so a filter never empties the page. */
export async function listFacets() {
  const [materials, makers, priceRange] = await Promise.all([
    sql<{ slug: string; name: string; count: number }[]>`
      select m.slug, m.name, count(p.id)::int as count
        from materials m join products p on p.material_id = m.id
       where p.status = 'published'
       group by m.id having count(p.id) > 0 order by m.name`,
    sql<{ slug: string; name: string; count: number }[]>`
      select mk.slug, mk.display_name as name, count(p.id)::int as count
        from makers mk join products p on p.maker_id = mk.id
       where p.status = 'published'
       group by mk.id having count(p.id) > 0 order by mk.display_name`,
    sql<{ min: number; max: number }[]>`
      select min(price_paisa)::int as min, max(price_paisa)::int as max
        from products where status = 'published'`,
  ]);
  return { materials, makers, priceRange: priceRange[0] ?? { min: 0, max: 0 } };
}

export async function listCollections() {
  return sql<{
    slug: string; title: string; subtitle: string | null;
    cover_image: string | null; count: number;
  }[]>`
    select c.slug, c.title, c.subtitle, c.cover_image,
           count(cp.product_id)::int as count
      from collections c
      left join collection_products cp on cp.collection_id = c.id
     where c.status = 'published'
     group by c.id order by c.sort_order
  `;
}

export async function getCollection(slug: string) {
  const [collection] = await sql<{
    id: string; slug: string; title: string; subtitle: string | null;
    story: string | null; cover_image: string | null;
  }[]>`
    select id, slug, title, subtitle, story, cover_image
      from collections where slug = ${slug} and status = 'published'`;
  if (!collection) return null;

  const products = await sql<ProductCard[]>`
    select ${CARD_SELECT} ${CARD_JOINS}
    join collection_products cp on cp.product_id = p.id
    where cp.collection_id = ${collection.id} and p.status = 'published'
    order by cp.sort_order`;

  return { ...collection, products };
}

export async function listMakers() {
  return sql<{
    slug: string; display_name: string; craft: string | null;
    portrait_image: string | null; community_name: string; district: string;
    working_since: number | null; product_count: number;
  }[]>`
    select mk.slug, mk.display_name, mk.craft, mk.portrait_image,
           com.name as community_name, com.district, mk.working_since,
           count(p.id) filter (where p.status = 'published')::int as product_count
      from makers mk
      join communities com on com.id = mk.community_id
      left join products p on p.maker_id = mk.id
     where mk.status = 'published'
     group by mk.id, com.id
     order by mk.display_name
  `;
}

export async function getMaker(slug: string) {
  const [maker] = await sql<{
    id: string; slug: string; display_name: string; craft: string | null;
    bio: string | null; quote: string | null; portrait_image: string | null;
    working_since: number | null; community_slug: string; community_name: string;
    district: string; community_story: string | null;
  }[]>`
    select mk.id, mk.slug, mk.display_name, mk.craft, mk.bio, mk.quote,
           mk.portrait_image, mk.working_since,
           com.slug as community_slug, com.name as community_name,
           com.district, com.story as community_story
      from makers mk
      join communities com on com.id = mk.community_id
     where mk.slug = ${slug} and mk.status = 'published'`;
  if (!maker) return null;

  // Every story surface is shoppable: a maker page always carries its products.
  const products = await sql<ProductCard[]>`
    select ${CARD_SELECT} ${CARD_JOINS}
    where p.maker_id = ${maker.id} and p.status = 'published'
    order by p.sort_order`;

  return { ...maker, products };
}

export async function listCraft() {
  const [materials, techniques] = await Promise.all([
    sql<{ slug: string; name: string; local_name: string | null; description: string | null; count: number }[]>`
      select m.slug, m.name, m.local_name, m.description,
             count(p.id) filter (where p.status = 'published')::int as count
        from materials m left join products p on p.material_id = m.id
       where m.status = 'published' group by m.id order by m.name`,
    sql<{ slug: string; name: string; description: string | null; count: number }[]>`
      select t.slug, t.name, t.description,
             count(p.id) filter (where p.status = 'published')::int as count
        from craft_techniques t left join products p on p.technique_id = t.id
       where t.status = 'published' group by t.id order by t.name`,
  ]);
  return { materials, techniques };
}

export type CraftStep = { step: number; title: string; body: string };

/** A craft slug resolves to either a material or a technique, never both. */
export type CraftEntry =
  | {
      kind: "material";
      slug: string; name: string; local_name: string | null;
      description: string | null; origin_note: string | null;
      steps: null;
    }
  | {
      kind: "technique";
      slug: string; name: string; local_name: string | null;
      description: string | null; origin_note: null;
      steps: CraftStep[];
    };

export async function getCraft(slug: string) {
  const [material] = await sql<Extract<CraftEntry, { kind: "material" }>[]>`
    select 'material'::text as kind, slug, name, local_name, description, origin_note,
           null::jsonb as steps
      from materials where slug = ${slug} and status = 'published'`;

  const [technique] = material
    ? []
    : await sql<Extract<CraftEntry, { kind: "technique" }>[]>`
        select 'technique'::text as kind, slug, name, local_name, description,
               null::text as origin_note, steps
          from craft_techniques where slug = ${slug} and status = 'published'`;

  const entry: CraftEntry | undefined = material ?? technique;
  if (!entry) return null;

  const products = await sql<ProductCard[]>`
    select ${CARD_SELECT} ${CARD_JOINS}
    left join craft_techniques t2 on t2.id = p.technique_id
    where p.status = 'published'
      and (mat.slug = ${slug} or t2.slug = ${slug})
    order by p.sort_order`;

  const makers = await sql<{ slug: string; display_name: string; district: string }[]>`
    select distinct mk.slug, mk.display_name, com.district
      from products p
      join makers mk on mk.id = p.maker_id
      join communities com on com.id = mk.community_id
      left join materials m2 on m2.id = p.material_id
      left join craft_techniques t3 on t3.id = p.technique_id
     where p.status = 'published' and (m2.slug = ${slug} or t3.slug = ${slug})`;

  return { ...entry, products, makers };
}

export type JournalPost = {
  slug: string; title: string; excerpt: string | null;
  hero_image: string | null; author: string | null;
  published_at: string | null;
  blocks: { type: string; text: string }[];
  product_ids: string[];
};

export async function listJournal(limit?: number) {
  return sql<JournalPost[]>`
    select cp.slug, cp.title, cv.excerpt, cv.hero_image, cv.author,
           cv.published_at, cv.blocks, cv.product_ids
      from content_pages cp
      join content_versions cv on cv.id = cp.published_version_id
     where cp.kind = 'journal'
     order by cv.published_at desc nulls last
     ${limit ? sql`limit ${limit}` : sql``}
  `;
}

export async function getJournalPost(slug: string) {
  const [post] = await sql<JournalPost[]>`
    select cp.slug, cp.title, cv.excerpt, cv.hero_image, cv.author,
           cv.published_at, cv.blocks, cv.product_ids
      from content_pages cp
      join content_versions cv on cv.id = cp.published_version_id
     where cp.slug = ${slug} and cp.kind = 'journal'`;
  if (!post) return null;

  const products = post.product_ids.length
    ? await sql<ProductCard[]>`
        select ${CARD_SELECT} ${CARD_JOINS}
        where p.id = any(${post.product_ids}) and p.status = 'published'`
    : [];

  return { ...post, products };
}

/**
 * Cached deliberately. The footer renders these counts on every page, and
 * `impact_summary()` is an aggregate — running it per request meant eighteen
 * concurrent aggregates during a build, which is enough to hit Postgres'
 * statement timeout and stall the whole render. These numbers move a few times
 * a week at most, so an hour of staleness costs nothing.
 */
export const getImpactSummary = unstable_cache(
  async () => {
    const [row] = await sql<{ impact_summary: Record<string, unknown> }[]>`select impact_summary()`;
    return row?.impact_summary ?? {};
  },
  ["impact-summary"],
  { revalidate: 3600, tags: ["impact"] },
);

export const listImpactByCommunity = unstable_cache(
  async () =>
    sql<{
      community_name: string; community_slug: string; district: string;
      maker_count: number; units_sold: number; paid_to_maker_paisa: number;
    }[]>`
      select community_name, community_slug, district, maker_count,
             units_sold, paid_to_maker_paisa
        from impact_by_community order by community_name`,
  ["impact-by-community"],
  { revalidate: 3600, tags: ["impact"] },
);

/** Products by the same maker, excluding the one being viewed. */
export async function listRelatedByMaker(makerSlug: string, excludeSlug: string, limit = 4) {
  return sql<ProductCard[]>`
    select ${CARD_SELECT} ${CARD_JOINS}
    where mk.slug = ${makerSlug} and p.slug <> ${excludeSlug} and p.status = 'published'
    order by p.sort_order limit ${limit}`;
}

/** Cross-category suggestions, hand-ranked by category difference then order. */
export async function listPairsWith(productSlug: string, categorySlug: string, limit = 4) {
  return sql<ProductCard[]>`
    select ${CARD_SELECT} ${CARD_JOINS}
    where p.slug <> ${productSlug} and p.status = 'published'
    order by (cat.slug = ${categorySlug}) asc, p.sort_order asc
    limit ${limit}`;
}

/** Resolves cart line references to authoritative prices for display only. */
export async function getCartLines(variantIds: string[]) {
  if (!variantIds.length) return [];
  return sql<{
    variant_id: string; product_slug: string; product_name: string;
    option_value: string | null; sku: string; price_paisa: number;
    available: number; image: string | null; maker_name: string | null;
  }[]>`
    select v.id as variant_id, p.slug as product_slug, p.name as product_name,
           v.option_value, v.sku,
           coalesce(v.price_paisa, p.price_paisa) as price_paisa,
           coalesce(sl.available, 0) as available,
           (select storage_path from product_images
             where product_id = p.id order by sort_order limit 1) as image,
           mk.display_name as maker_name
      from product_variants v
      join products p on p.id = v.product_id
      left join stock_levels sl on sl.variant_id = v.id
      left join makers mk on mk.id = p.maker_id
     where v.id = any(${variantIds}) and p.status = 'published'`;
}

export async function getSettings<T = Record<string, unknown>>(key: string): Promise<T | null> {
  const [row] = await sql<{ value: T }[]>`select value from settings where key = ${key}`;
  return row?.value ?? null;
}
