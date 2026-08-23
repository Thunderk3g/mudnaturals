import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { sql, withTx } from "@/lib/db";
import { BLOCK_SPECS, type BlockType, type PageKey } from "@/lib/blocks";

/**
 * Console writes for everything the storefront renders but no engineer owns:
 * the media library, page blocks, categories, collections and site settings.
 *
 * Order matters in three of these — blocks on a page, products in a collection,
 * images on a product — and in every case it is stored as an integer column
 * rewritten as a block, not inferred from insertion time. A list an operator
 * can drag has to survive a save.
 */

/**
 * postgres.js types `sql.json` against its own recursive `JSONValue`, which a
 * `Record<string, unknown>` satisfies structurally but not nominally. This is
 * the one cast in the module, kept in one place so the call sites stay honest.
 *
 * It must be `sql.json` and never `JSON.stringify`: stringifying first stores a
 * jsonb *string* scalar, and every reader then sees `"{...}"` instead of an
 * object — which is exactly how the craft-steps pages once rendered blank.
 */
const asJson = (value: unknown) => sql.json(value as Parameters<typeof sql.json>[0]);

/* ------------------------------------------------------------------ media -- */

/** Anything larger is a phone photo nobody cropped; refuse it with a clear reason. */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
/** Long edge after normalisation. Above this, `next/image` is only downscaling. */
const MAX_EDGE = 2400;

export type MediaRow = {
  id: string;
  filename: string;
  alt: string;
  content_type: string;
  bytes: number;
  width: number | null;
  height: number | null;
  focal_point: string;
  created_at: string;
  uses: number;
};

/**
 * A message written for the person at the keyboard, not for a log.
 *
 * `humanError` passes these through verbatim, which it decides by reading
 * `.name` rather than with `instanceof`: the console and the server modules are
 * separate bundles, and a class identity does not reliably survive that.
 */
export class OperatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperatorError";
  }
}

/**
 * Normalises an upload and stores it once.
 *
 * Everything is re-encoded to WebP at a sane size before it is stored, which is
 * what keeps rows in the hundreds of kilobytes rather than the megabytes a
 * phone produces. `.rotate()` bakes in the EXIF orientation — without it a
 * portrait photo from a phone lands sideways, and the metadata that would have
 * corrected it is stripped by the re-encode.
 *
 * Storage is content-addressed on the *output* bytes, so the same photo dropped
 * in twice is one row and one URL.
 */
export async function uploadMedia(file: File, alt: string): Promise<string> {
  if (!file || file.size === 0) throw new OperatorError("Choose a file to upload.");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new OperatorError(
      `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 15 MB — export it smaller and try again.`
    );
  }

  const input = Buffer.from(await file.arrayBuffer());

  let data: Buffer;
  let width: number | null = null;
  let height: number | null = null;
  try {
    const result = await sharp(input, { failOn: "error" })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    data = result.data;
    width = result.info.width;
    height = result.info.height;
  } catch {
    throw new OperatorError("That file is not an image we can read. Use a JPEG, PNG or WebP.");
  }

  const sha256 = createHash("sha256").update(data).digest("hex");
  const filename = (file.name || "image").replace(/[^\w.\- ]+/g, "").slice(0, 120) || "image";

  const [existing] = await sql<{ id: string; alt: string }[]>`
    select id, alt from media_assets where sha256 = ${sha256}`;

  if (existing) {
    // Re-uploading a file that is already in the library is how an operator
    // fixes a missing description. Never overwrite a description with a blank.
    if (alt.trim() && alt.trim() !== existing.alt) {
      await sql`update media_assets set alt = ${alt.trim()} where id = ${existing.id}::uuid`;
    }
    return existing.id;
  }

  const [row] = await sql<{ id: string }[]>`
    insert into media_assets (sha256, filename, content_type, bytes, width, height, alt, data)
    values (${sha256}, ${filename}, 'image/webp', ${data.length}, ${width}, ${height},
            ${alt.trim()}, ${data})
    returning id`;

  return row.id;
}

/**
 * The library, with a usage count so an operator can see what is safe to delete.
 * Counting the block references means scanning jsonb as text: block payloads
 * hold ids in half a dozen differently-named fields, and a containment query
 * per field would be six index-less scans instead of one.
 */
export async function listMedia(filter: { q?: string } = {}): Promise<MediaRow[]> {
  const q = filter.q?.trim();
  return sql<MediaRow[]>`
    select m.id, m.filename, m.alt, m.content_type, m.bytes, m.width, m.height,
           m.focal_point, m.created_at,
           (
             (select count(*) from categories        where image_id         = m.id) +
             (select count(*) from collections       where cover_image_id   = m.id) +
             (select count(*) from communities       where cover_image_id   = m.id) +
             (select count(*) from makers            where portrait_image_id = m.id) +
             (select count(*) from product_images    where media_id         = m.id) +
             (select count(*) from page_blocks       where data::text like '%' || m.id::text || '%') +
             (select count(*) from settings          where value::text like '%' || m.id::text || '%')
           )::int as uses
      from media_assets m
     ${q ? sql`where m.filename ilike ${"%" + q + "%"} or m.alt ilike ${"%" + q + "%"}` : sql``}
     order by m.created_at desc
     limit 300`;
}

export async function updateMedia(id: string, alt: string, focalPoint: string) {
  await sql`
    update media_assets
       set alt = ${alt.trim()}, focal_point = ${focalPoint}
     where id = ${id}::uuid`;
}

/**
 * Deleting is refused while anything points at the asset. The foreign keys are
 * `on delete set null`, so without this an operator clearing out the library
 * would silently blank images across the live site and see no error.
 */
export async function deleteMedia(id: string): Promise<void> {
  const [row] = await sql<{ uses: number }[]>`
    select (
      (select count(*) from categories     where image_id          = ${id}::uuid) +
      (select count(*) from collections    where cover_image_id    = ${id}::uuid) +
      (select count(*) from communities    where cover_image_id    = ${id}::uuid) +
      (select count(*) from makers         where portrait_image_id = ${id}::uuid) +
      (select count(*) from product_images where media_id          = ${id}::uuid) +
      (select count(*) from page_blocks    where data::text  like '%' || ${id}::text || '%') +
      (select count(*) from settings       where value::text like '%' || ${id}::text || '%')
    )::int as uses`;

  if (row && row.uses > 0) {
    throw new OperatorError(
      `That image is used in ${row.uses} place${row.uses === 1 ? "" : "s"}. Replace it there first, then delete it.`
    );
  }

  await sql`delete from media_assets where id = ${id}::uuid`;
}

/* ----------------------------------------------------------------- blocks -- */

export async function createBlock(pageKey: PageKey, type: BlockType): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into page_blocks (page_key, block_type, position, is_visible, data)
    values (
      ${pageKey}, ${type},
      coalesce((select max(position) + 10 from page_blocks where page_key = ${pageKey}), 10),
      false,
      ${asJson(BLOCK_SPECS[type].defaults)}
    )
    returning id`;
  return row.id;
}

export async function updateBlock(
  id: string,
  data: Record<string, unknown>,
  isVisible: boolean
): Promise<void> {
  // sql.json, not JSON.stringify: postgres.js stringifies a plain object into a
  // jsonb *string* scalar, and every reader then sees "\"{...}\"" instead of an
  // object. The CHECK on jsonb_typeof catches it now, but only because it bit
  // us before on craft steps.
  await sql`
    update page_blocks
       set data = ${asJson(data)}, is_visible = ${isVisible}
     where id = ${id}::uuid`;
}

export async function deleteBlock(id: string): Promise<void> {
  await sql`delete from page_blocks where id = ${id}::uuid`;
}

/** Swaps a block with its neighbour, then renumbers so positions stay sane. */
export async function moveBlock(id: string, direction: "up" | "down"): Promise<void> {
  await withTx(async (tx) => {
    const [block] = await tx<{ page_key: string }[]>`
      select page_key from page_blocks where id = ${id}::uuid`;
    if (!block) return;

    const rows = await tx<{ id: string }[]>`
      select id from page_blocks where page_key = ${block.page_key}
       order by position, created_at`;

    const index = rows.findIndex((r) => r.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= rows.length) return;

    [rows[index], rows[target]] = [rows[target], rows[index]];

    for (const [i, row] of rows.entries()) {
      await tx`update page_blocks set position = ${(i + 1) * 10} where id = ${row.id}::uuid`;
    }
  });
}

/* ------------------------------------------------------------- categories -- */

export type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_id: string | null;
  sort_order: number;
  status: string;
  product_count: number;
};

export async function listAdminCategories(): Promise<AdminCategory[]> {
  return sql<AdminCategory[]>`
    select c.id, c.slug, c.name, c.description, c.image_id, c.sort_order, c.status,
           count(p.id)::int as product_count
      from categories c
      left join products p on p.category_id = c.id
     group by c.id
     order by c.sort_order, c.name`;
}

export type CategoryInput = {
  id: string | null;
  slug: string;
  name: string;
  description: string | null;
  imageId: string | null;
  sortOrder: number;
  status: string;
};

export async function saveCategory(input: CategoryInput): Promise<string> {
  const [row] = input.id
    ? await sql<{ id: string }[]>`
        update categories set
          slug = ${input.slug}, name = ${input.name}, description = ${input.description},
          image_id = ${input.imageId}::uuid, sort_order = ${input.sortOrder},
          status = ${input.status}::publish_status
        where id = ${input.id}::uuid returning id`
    : await sql<{ id: string }[]>`
        insert into categories (slug, name, description, image_id, sort_order, status)
        values (${input.slug}, ${input.name}, ${input.description}, ${input.imageId}::uuid,
                ${input.sortOrder}, ${input.status}::publish_status)
        returning id`;
  if (!row) throw new OperatorError("That category no longer exists.");
  return row.id;
}

/**
 * `on delete restrict` on products.category_id means Postgres refuses this
 * while anything is filed under it. Translate that into a sentence rather than
 * letting a foreign-key error reach the operator.
 */
export async function deleteCategory(id: string): Promise<void> {
  const [row] = await sql<{ count: number }[]>`
    select count(*)::int as count from products where category_id = ${id}::uuid`;
  if (row && row.count > 0) {
    throw new OperatorError(
      `${row.count} product${row.count === 1 ? " is" : "s are"} in this category. Move them first.`
    );
  }
  await sql`delete from categories where id = ${id}::uuid`;
}

/* ------------------------------------------------------------ collections -- */

export type AdminCollection = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  story: string | null;
  cover_image: string | null;
  cover_image_id: string | null;
  sort_order: number;
  status: string;
  product_count: number;
};

export async function listAdminCollections(): Promise<AdminCollection[]> {
  return sql<AdminCollection[]>`
    select c.id, c.slug, c.title, c.subtitle, c.story, c.cover_image, c.cover_image_id,
           c.sort_order, c.status, count(cp.product_id)::int as product_count
      from collections c
      left join collection_products cp on cp.collection_id = c.id
     group by c.id
     order by c.sort_order, c.title`;
}

export async function getAdminCollection(id: string) {
  const [collection] = await sql<AdminCollection[]>`
    select c.id, c.slug, c.title, c.subtitle, c.story, c.cover_image, c.cover_image_id,
           c.sort_order, c.status, count(cp.product_id)::int as product_count
      from collections c
      left join collection_products cp on cp.collection_id = c.id
     where c.id = ${id}::uuid group by c.id`;
  if (!collection) return null;

  const products = await sql<{ id: string; name: string; slug: string; status: string }[]>`
    select p.id, p.name, p.slug, p.status
      from collection_products cp join products p on p.id = cp.product_id
     where cp.collection_id = ${id}::uuid
     order by cp.sort_order`;

  return { ...collection, products };
}

export type CollectionInput = {
  id: string | null;
  slug: string;
  title: string;
  subtitle: string | null;
  story: string | null;
  coverImageId: string | null;
  sortOrder: number;
  status: string;
  productIds: string[];
};

export async function saveCollection(input: CollectionInput): Promise<string> {
  return withTx(async (tx) => {
    const [row] = input.id
      ? await tx<{ id: string }[]>`
          update collections set
            slug = ${input.slug}, title = ${input.title}, subtitle = ${input.subtitle},
            story = ${input.story}, cover_image_id = ${input.coverImageId}::uuid,
            sort_order = ${input.sortOrder}, status = ${input.status}::publish_status
          where id = ${input.id}::uuid returning id`
      : await tx<{ id: string }[]>`
          insert into collections (slug, title, subtitle, story, cover_image_id, sort_order, status)
          values (${input.slug}, ${input.title}, ${input.subtitle}, ${input.story},
                  ${input.coverImageId}::uuid, ${input.sortOrder}, ${input.status}::publish_status)
          returning id`;

    if (!row) throw new OperatorError("That collection no longer exists.");

    // Replace rather than diff: the list is short, and the order the operator
    // sees is the order that has to land.
    await tx`delete from collection_products where collection_id = ${row.id}::uuid`;
    for (const [index, productId] of input.productIds.entries()) {
      await tx`
        insert into collection_products (collection_id, product_id, sort_order)
        values (${row.id}::uuid, ${productId}::uuid, ${index})
        on conflict do nothing`;
    }

    return row.id;
  });
}

export async function deleteCollection(id: string): Promise<void> {
  await sql`delete from collections where id = ${id}::uuid`;
}

/* -------------------------------------------------------- product imagery -- */

export type ProductImageRow = {
  id: string;
  media_id: string | null;
  storage_path: string | null;
  alt: string;
  origin: string;
  is_scale_reference: boolean;
  sort_order: number;
};

export async function listProductImages(productId: string): Promise<ProductImageRow[]> {
  return sql<ProductImageRow[]>`
    select id, media_id, storage_path, alt, origin, is_scale_reference, sort_order
      from product_images where product_id = ${productId}::uuid
     order by sort_order`;
}

export async function addProductImage(productId: string, mediaId: string, alt: string) {
  await sql`
    insert into product_images (product_id, media_id, alt, origin, sort_order)
    values (
      ${productId}::uuid, ${mediaId}::uuid,
      ${alt.trim() || "Product photograph"}, 'photograph',
      coalesce((select max(sort_order) + 1 from product_images where product_id = ${productId}::uuid), 0)
    )`;
}

export async function removeProductImage(imageId: string) {
  await sql`delete from product_images where id = ${imageId}::uuid`;
}

export async function moveProductImage(imageId: string, direction: "up" | "down") {
  await withTx(async (tx) => {
    const [image] = await tx<{ product_id: string }[]>`
      select product_id from product_images where id = ${imageId}::uuid`;
    if (!image) return;

    const rows = await tx<{ id: string }[]>`
      select id from product_images where product_id = ${image.product_id}::uuid
       order by sort_order, created_at`;

    const index = rows.findIndex((r) => r.id === imageId);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= rows.length) return;

    [rows[index], rows[target]] = [rows[target], rows[index]];
    for (const [i, row] of rows.entries()) {
      await tx`update product_images set sort_order = ${i} where id = ${row.id}::uuid`;
    }
  });
}

export async function updateProductImageAlt(imageId: string, alt: string) {
  const text = alt.trim();
  if (!text) throw new OperatorError("Every photograph needs a description.");
  await sql`update product_images set alt = ${text} where id = ${imageId}::uuid`;
}

/* --------------------------------------------------------------- settings -- */

export async function saveSetting(key: string, value: unknown): Promise<void> {
  await sql`
    insert into settings (key, value) values (${key}, ${asJson(value)})
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
}

/* ---------------------------------------------------------- picker options -- */

/** Everything the block editor's reference pickers offer, in one round trip. */
export async function getPickerOptions() {
  const [categories, collections, communities, products] = await Promise.all([
    sql<{ id: string; name: string }[]>`
      select id, name from categories order by sort_order, name`,
    sql<{ id: string; name: string }[]>`
      select id, title as name from collections order by sort_order, title`,
    sql<{ id: string; name: string }[]>`
      select id, name || ' · ' || district as name from communities order by name`,
    sql<{ id: string; name: string }[]>`
      select id, name from products where status <> 'archived' order by name`,
  ]);
  return { category: categories, collection: collections, community: communities, product: products };
}

export type PickerOptions = Awaited<ReturnType<typeof getPickerOptions>>;
