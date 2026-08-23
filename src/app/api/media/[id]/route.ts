import { sql } from "@/lib/db";

/**
 * Serves an uploaded image out of the media library.
 *
 * A row's bytes are never updated — re-uploading the same file finds the
 * existing row by hash, and uploading a different file makes a new row with a
 * new id — so the response is genuinely immutable and says so. The CDN then
 * runs this function roughly once per image per region, and `next/image`
 * resizes from it rather than hitting it on every render.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // Postgres raises 22P02 on a malformed uuid, which would be a 500. A bad path
  // segment is a 404.
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const [asset] = await sql<{ data: Buffer; content_type: string; bytes: number }[]>`
    select data, content_type, bytes from media_assets where id = ${id}`;

  if (!asset) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.content_type,
      "Content-Length": String(asset.bytes),
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
