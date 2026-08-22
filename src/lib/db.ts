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

  // DATABASE_URL points at Supabase's transaction pooler (port 6543), not the
  // direct host. Two reasons, and the first one is not optional: the direct
  // host resolves to IPv6 only, and Vercel's build and runtime networks have no
  // IPv6 egress, so it fails with ENETUNREACH. The pooler is also simply the
  // right shape for serverless — many short-lived callers, one shared pool.
  //
  // Transaction mode does not support prepared statements, hence `prepare: false`.
  return postgres(url, {
    ssl: "require",
    prepare: false,
    // Small, but not one. The pooler does the real pooling, yet a single
    // connection serialises every query in the process, so one stalled socket
    // blocks everything behind it — and `withTx` holding the only connection
    // while anything else reaches for `sql` would deadlock outright.
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
