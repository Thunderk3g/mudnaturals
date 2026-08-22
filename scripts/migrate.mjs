// Applies every SQL file in supabase/migrations in filename order, once each.
// Tracks what has run in a _migrations table so re-running is safe.
//
//   node scripts/migrate.mjs          apply pending migrations
//   node scripts/migrate.mjs --status list applied / pending

import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

import { loadEnv } from "./env.mjs";

loadEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const dir = path.join("supabase", "migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  max: 1,
  connect_timeout: 30,
  idle_timeout: 20,
  // pgcrypto lives in `extensions` on Supabase; DDL defaults resolve against
  // the session search_path at CREATE TABLE time.
  connection: { search_path: "public, extensions" },
});

await sql`
  create table if not exists _migrations (
    name        text primary key,
    applied_at  timestamptz not null default now()
  )
`;

const applied = new Set((await sql`select name from _migrations`).map((r) => r.name));

if (process.argv.includes("--status")) {
  for (const f of files) console.log(`${applied.has(f) ? "applied" : "PENDING"}  ${f}`);
  await sql.end();
  process.exit(0);
}

let ran = 0;
for (const file of files) {
  if (applied.has(file)) continue;
  const body = fs.readFileSync(path.join(dir, file), "utf8");
  process.stdout.write(`applying ${file} ... `);
  try {
    // Each migration is one transaction: a half-applied schema is worse than
    // none, and every file here is written to be atomic.
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into _migrations (name) values (${file})`;
    });
    console.log("ok");
    ran++;
  } catch (err) {
    console.log("FAILED");
    console.error(`\n${file}: ${err.message}`);
    if (err.position) console.error(`  at character ${err.position}`);
    await sql.end();
    process.exit(1);
  }
}

console.log(ran === 0 ? "nothing to apply" : `applied ${ran} migration(s)`);
await sql.end();
