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
  // serverless advice. Measured against this project, postgres.js stalls on it
  // under concurrency — 20 parallel queries returned 8 and hung the rest until
  // the two-minute statement timeout, which is exactly how the first builds
  // failed. The same test against session mode returns 20/20 in about two
  // seconds. Session mode also behaves like a real connection, so prepared
  // statements work and stay on.
  return postgres(url, {
    ssl: "require",
    // Modest: session mode holds an upstream connection per client connection,
    // so this multiplies across serverless instances.
    max: 4,
    idle_timeout: 10,
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
