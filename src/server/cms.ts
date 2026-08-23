import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { sql } from "@/lib/db";
import type { Block, BlockType, PageKey } from "@/lib/blocks";
import {
  readNav,
  readSeo,
  readSite,
  type NavSettings,
  type SeoSettings,
  type SiteSettings,
} from "@/lib/site-settings";

/**
 * Everything the storefront reads that an operator can change from the console:
 * page blocks, the chrome copy, the navigation, and image metadata.
 *
 * Two rules hold this module together.
 *
 * First, every read here is cached under the `cms` tag. The header and footer
 * run on every single page, and a build renders eighteen of them at once —
 * uncached, that is eighteen concurrent round trips to Seoul before a single
 * page can stream. The console calls `revalidateCms()` after every save, so the
 * cache is invalidated by the write rather than waited out.
 *
 * Second, nothing here throws on bad data. A block whose payload is half-filled
 * renders as a missing value; a settings row someone emptied falls back to the
 * shipped copy. The console is the only writer, but a blank homepage is a worse
 * outcome than a stale one.
 */

export const CMS_TAG = "cms";

/** Called by every console action that changes something the storefront reads. */
export function revalidateCms() {
  revalidateTag(CMS_TAG);
}

/* ------------------------------------------------------------------ media -- */

export type MediaMeta = {
  id: string;
  filename: string;
  alt: string;
  width: number | null;
  height: number | null;
  content_type: string;
  bytes: number;
  focal_point: string;
  created_at: string;
};

/**
 * Media is served by /api/media/[id], never from /public. The id is the sha of
 * the bytes in all but name — a row's `data` is never updated — so the URL is
 * safe to cache forever, which is what the route handler tells the CDN.
 */
export function mediaSrc(mediaId: string | null | undefined): string | null {
  return mediaId ? `/api/media/${mediaId}` : null;
}

/**
 * Prefers an uploaded asset, falls back to the legacy `/media/...` path written
 * by the build-time crop script. Rows seeded before the console existed keep
 * their artwork until someone replaces it.
 */
export function imageSrc(
  mediaId: string | null | undefined,
  legacyPath: string | null | undefined
): string | null {
  return mediaSrc(mediaId) ?? legacyPath ?? null;
}

export const getMediaMeta = unstable_cache(
  async (ids: string[]): Promise<Record<string, MediaMeta>> => {
    if (ids.length === 0) return {};
    const rows = await sql<MediaMeta[]>`
      select id, filename, alt, width, height, content_type, bytes, focal_point, created_at
        from media_assets where id = any(${ids}::uuid[])`;
    return Object.fromEntries(rows.map((row) => [row.id, row]));
  },
  ["cms-media-meta"],
  { revalidate: 3600, tags: [CMS_TAG] }
);

/* ----------------------------------------------------------------- blocks -- */

export const getPageBlocks = unstable_cache(
  async (pageKey: PageKey): Promise<Block[]> => {
    return sql<Block[]>`
      select id, page_key, block_type, position, is_visible, data
        from page_blocks
       where page_key = ${pageKey} and is_visible
       order by position, created_at`;
  },
  ["cms-page-blocks"],
  { revalidate: 3600, tags: [CMS_TAG] }
);

/** The console needs hidden blocks too, and never wants a cached answer. */
export async function getPageBlocksForEdit(pageKey: PageKey): Promise<Block[]> {
  return sql<Block[]>`
    select id, page_key, block_type, position, is_visible, data
      from page_blocks
     where page_key = ${pageKey}
     order by position, created_at`;
}

export async function getBlockForEdit(id: string): Promise<Block | null> {
  const [row] = await sql<Block[]>`
    select id, page_key, block_type, position, is_visible, data
      from page_blocks where id = ${id}`;
  return row ?? null;
}

export function hasBlock(blocks: Block[], type: BlockType): boolean {
  return blocks.some((b) => b.block_type === type);
}

/* --------------------------------------------------------------- settings -- */

export type Chrome = { site: SiteSettings; nav: NavSettings };

export const getChrome = unstable_cache(
  async (): Promise<Chrome> => {
    const rows = await sql<{ key: string; value: Record<string, unknown> }[]>`
      select key, value from settings where key in ('site', 'nav')`;
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      site: readSite(byKey.site ?? null),
      nav: readNav(byKey.nav ?? null),
    };
  },
  ["cms-chrome"],
  { revalidate: 3600, tags: [CMS_TAG] }
);

export const getSeo = unstable_cache(
  async (): Promise<SeoSettings> => {
    const [row] = await sql<{ value: Record<string, unknown> }[]>`
      select value from settings where key = 'seo'`;
    return readSeo(row?.value ?? null);
  },
  ["cms-seo"],
  { revalidate: 3600, tags: [CMS_TAG] }
);

/** Raw read for the console's settings forms — always current, never cached. */
export async function getSettingRaw(key: string): Promise<Record<string, unknown> | null> {
  const [row] = await sql<{ value: Record<string, unknown> }[]>`
    select value from settings where key = ${key}`;
  return row?.value ?? null;
}
