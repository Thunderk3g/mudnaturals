// Moves the shipped photography in public/media into the media library, then
// points everything that referenced it by path at the library row instead.
//
// Run once after migration 011. It is idempotent: storage is content-addressed,
// so a second run finds every file already there and re-links nothing new.
//
// Why bother, when the old paths still work? Because the console can only offer
// what is in the library. With an empty library every picker is empty, the
// homepage hero has no photo to point at, and the CMS reads as broken on the
// first screen an operator opens.

import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import postgres from "postgres";
import { loadEnv } from "./env.mjs";

loadEnv();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, {
  ssl: "require",
  max: 2,
  connection: { search_path: "public, extensions" },
});

const MEDIA_DIR = path.join(process.cwd(), "public", "media");
const IMAGE = /\.(jpe?g|png|webp|avif)$/i;

/** Same normalisation the console upload does, so hashes line up either way. */
async function normalise(buffer) {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** "ring-handle-tote-detail.jpg" -> "Ring handle tote detail" */
function describe(filename) {
  return path
    .basename(filename, path.extname(filename))
    .replace(/[-_]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

const files = (await readdir(MEDIA_DIR)).filter((f) => IMAGE.test(f)).sort();
console.log(`found ${files.length} file(s) in public/media`);

let added = 0;
let existed = 0;

for (const filename of files) {
  const storagePath = `/media/${filename}`;
  const raw = await readFile(path.join(MEDIA_DIR, filename));
  const { data, width, height } = await normalise(raw);
  const sha256 = createHash("sha256").update(data).digest("hex");

  // Prefer alt text somebody already wrote for this exact photograph over a
  // description derived from the file name.
  const [existingAlt] = await sql`
    select alt from product_images where storage_path = ${storagePath} and alt <> '' limit 1`;
  const alt = existingAlt?.alt ?? describe(filename);

  const [row] = await sql`
    insert into media_assets (sha256, filename, content_type, bytes, width, height, alt, data)
    values (${sha256}, ${filename}, 'image/webp', ${data.length}, ${width}, ${height}, ${alt}, ${data})
    on conflict (sha256) do update set filename = excluded.filename
    returning id, (xmax = 0) as inserted`;

  if (row.inserted) added += 1;
  else existed += 1;

  // Re-point every reference that used the path.
  await sql`
    update product_images set media_id = ${row.id}::uuid
     where storage_path = ${storagePath} and media_id is null`;
  await sql`
    update collections set cover_image_id = ${row.id}::uuid
     where cover_image = ${storagePath} and cover_image_id is null`;
  await sql`
    update communities set cover_image_id = ${row.id}::uuid
     where cover_image = ${storagePath} and cover_image_id is null`;
  await sql`
    update makers set portrait_image_id = ${row.id}::uuid
     where portrait_image = ${storagePath} and portrait_image_id is null`;
  await sql`
    update content_versions set hero_image = ${`/api/media/${row.id}`}
     where hero_image = ${storagePath}`;
}

// The seeded homepage hero has no photo of its own — give it the one the
// hand-written homepage used, so applying all of this changes nothing visible.
const [hero] = await sql`
  select id from page_blocks
   where page_key = 'home' and block_type = 'hero' and data->>'media_id' is null
   limit 1`;

if (hero) {
  const [moon] = await sql`
    select id from media_assets where filename = 'moon-bag-magenta.jpg' limit 1`;
  const [fallback] = moon ? [moon] : await sql`select id from media_assets order by filename limit 1`;
  if (fallback) {
    await sql`
      update page_blocks
         set data = jsonb_set(data, '{media_id}', to_jsonb(${fallback.id}::text))
       where id = ${hero.id}::uuid`;
    console.log("homepage hero now points at the library");
  }
}

const [{ n }] = await sql`select count(*)::int as n from media_assets`;
console.log(`added ${added}, already present ${existed}; library now holds ${n}`);

await sql.end();
