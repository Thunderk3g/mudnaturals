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

  return postgres(url, {
    ssl: "require",
    // Serverless functions are short-lived and concurrent; a small pool per
    // instance keeps us well under Supabase's connection ceiling.
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    connection: { search_path: "public, extensions" },
    transform: { undefined: null },
  });
}

// Connect lazily on first use. The proxy keeps the ergonomic `sql\`…\`` call
// shape while deferring the connection past module import.
function client() {
  if (!globalThis.__mudSql) globalThis.__mudSql = connect();
  return globalThis.__mudSql;
}

export const sql = new Proxy((() => {}) as unknown as ReturnType<typeof postgres>, {
  apply: (_t, _this, args) => (client() as unknown as (...a: unknown[]) => unknown)(...args),
  get: (_t, prop) => Reflect.get(client() as object, prop),
  has: (_t, prop) => Reflect.has(client() as object, prop),
}) as ReturnType<typeof postgres>;

/**
 * Opens the single transaction for a request. Every module function takes the
 * transaction handle as its first argument and never opens its own — nesting
 * transaction-owning calls is what deadlocked the reference project's pool.
 */
export function withTx<T>(fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(fn) as Promise<T>;
}

export type Tx = postgres.TransactionSql;
