// Anon-key smoke test — a launch blocker if anything here fails.
//
// With ONLY the publishable key (which ships in the page source by design),
// attempt to read every table. Public catalogue tables may return rows. Anything
// carrying customer, order, payment, cost or consent data must return nothing.
//
// The reference project this build replaces shipped to production with
// GET /rest/v1/users returning email addresses and password hashes.

import fs from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

// Public catalogue: readable by design, filtered to published rows by RLS.
const PUBLIC_OK = new Set([
  "products", "product_variants", "product_images",
  "categories", "collections", "collection_products",
  "makers", "communities", "materials", "craft_techniques",
  "stock_levels", "content_pages", "content_versions", "reviews",
]);

// Must never return a row to the anon key.
const MUST_BE_EMPTY = [
  "orders", "order_items", "order_events",
  "payment_attempts", "payment_events", "refunds", "shipments",
  "customers", "staff_users", "consent_records",
  "stock_intake", "stock_ledger",
  "coupons", "coupon_redemptions",
  "settings", "audit_log",
  "impact_by_maker", "impact_by_community",
];

async function probe(table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON body */ }
  const rows = Array.isArray(body) ? body.length : 0;
  return { status: res.status, rows, body };
}

let failures = 0;
console.log("probing with the publishable key only\n");

for (const table of MUST_BE_EMPTY) {
  const { status, rows, body } = await probe(table);
  // 401/403/404 (blocked or invisible) and 200-with-zero-rows are both fine.
  const leaked = status === 200 && rows > 0;
  if (leaked) {
    failures++;
    console.log(`  LEAK   ${table.padEnd(22)} ${status}  returned ${rows} row(s)`);
    console.log(`         sample keys: ${Object.keys(body[0] ?? {}).join(", ")}`);
  } else {
    console.log(`  ok     ${table.padEnd(22)} ${status}${rows ? `  ${rows} rows` : ""}`);
  }
}

console.log("\npublic catalogue (rows here are expected):\n");
for (const table of PUBLIC_OK) {
  const { status, rows } = await probe(table);
  console.log(`  ${status === 200 ? "read " : "blkd "} ${table.padEnd(22)} ${status}${rows ? `  ${rows} row(s)` : "  empty"}`);
}

// Privileged functions must not be callable by the anon role either.
console.log("\nRPC exposure:\n");
for (const fn of ["place_order", "confirm_payment", "get_order_by_token", "impact_summary", "record_intake"]) {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: "{}",
  });
  // 404 = not exposed, 401/403 = denied, 400/404 both acceptable. 200 is a leak.
  const exposed = res.status === 200;
  if (exposed) { failures++; console.log(`  LEAK   ${fn} is callable by anon`); }
  else console.log(`  ok     ${fn.padEnd(22)} ${res.status}`);
}

console.log(
  failures === 0
    ? "\nPASS — no table or function leaks to the publishable key."
    : `\nFAIL — ${failures} leak(s). This is a launch blocker.`
);
process.exit(failures === 0 ? 0 : 1);
