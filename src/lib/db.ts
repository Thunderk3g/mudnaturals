import "server-only";
import postgres from "postgres";

// One pooled client for the whole server. Next.js hot-reloads modules in dev,
// so the instance is cached on globalThis to avoid opening a new pool per edit.
declare global {
  // eslint-disable-next-line no-var
  var __mudSql: ReturnType<typeof postgres> | undefined;
}

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Thrown on first query rather than at import. Next collects page config by
    // importing modules during the build, so throwing at module scope turns a
    // missing variable into "failed to collect configuration for /_not-found",
    // which says nothing useful about the actual cause.
    throw new Error(
      "DATABASE_URL is not set. On Vercel, check that it is not marked Sensitive — " +
        "sensitive variables are withheld during the build, and pages that prerender " +
        "from the database need it then."
    );
  }

  // DATABASE_URL points at Supabase's **session** pooler (port 5432).
  //
  // Not the direct host: it resolves to IPv6 only, and Vercel has no IPv6
  // egress, so connecting there fails with ENETUNREACH.
  //
  // Not the transaction pooler (6543) either, despite that being the usual
  // serverless advice. Measured repeatedly against this project: roughly one
  // query per client succeeds and every subsequent one hangs to the timeout —
  // 12 of 36 across twelve clients, unchanged by `prepare: false`,
  // `fetch_types: false`, or dropping the search_path startup parameter. The
  // same load in session mode returns 45/45 in about two seconds.
  //
  // `max` is 1, and that number is load-bearing. Session mode holds one
  // upstream connection per client connection, and this project's pooler caps
  // them at 15 — so the budget is not per instance, it is shared across every
  // serverless instance alive at once. At `max: 4` twelve instances ask for 48,
  // and Supabase answers with
  //
  //     (EMAXCONNSESSION) max clients reached in session mode
  //
  // which is a FATAL, so the page 500s. That is what took /impact and /admin
  // down in production. Measured: max 4 × 12 instances → 15/36 succeed;
  // max 1 × 15 instances → 45/45; max 1 × 20 instances → the first 15 succeed
  // and the rest fail fast rather than hang.
  //
  // The ceiling is therefore ~15 concurrent instances *that are mid-query*.
  // Raising it is a dashboard change on Supabase (Database → Connection
  // pooling → Pool size), not a code change. Until then, keep this at 1: a
  // request's queries serialise, which costs a Seoul round trip each, but
  // almost every storefront page is ISR'd and never reaches here at all.
  return postgres(url, {
    ssl: "require",
    max: 1,
    // Short, so an instance between requests hands its connection back to the
    // shared budget quickly. A busy instance keeps resetting the timer, so this
    // costs reconnects only where they are cheap.
    idle_timeout: 3,
    connect_timeout: 15,
    connection: { search_path: "public, extensions" },
    transform: { undefined: null },
  });
}

// postgres.js does not dial on construction — it connects on the first query —
// so building the client at module scope is already lazy where it matters, and
// it avoids wrapping the tagged-template callable in a proxy that every module
// inspector would trip over.
export const sql = globalThis.__mudSql ?? connect();
globalThis.__mudSql = sql;

/**
 * Opens the single transaction for a request. Every module function takes the
 * transaction handle as its first argument and never opens its own — nesting
 * transaction-owning calls is what deadlocked the reference project's pool.
 */
export function withTx<T>(fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(fn) as Promise<T>;
}

export type Tx = postgres.TransactionSql;
