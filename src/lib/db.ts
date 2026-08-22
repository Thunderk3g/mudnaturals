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
  if (!url) throw new Error("DATABASE_URL is not set");

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

export const sql = globalThis.__mudSql ?? connect();
if (process.env.NODE_ENV !== "production") globalThis.__mudSql = sql;

/**
 * Opens the single transaction for a request. Every module function takes the
 * transaction handle as its first argument and never opens its own — nesting
 * transaction-owning calls is what deadlocked the reference project's pool.
 */
export function withTx<T>(fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(fn) as Promise<T>;
}

export type Tx = postgres.TransactionSql;
