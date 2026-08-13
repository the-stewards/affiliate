import { neon, NeonQueryFunction } from "@neondatabase/serverless";

// IMPORTANT: use the POOLED connection string from Neon (the one with
// "-pooler" in the hostname), not the direct one. On the Neon dashboard,
// toggle "Pooled connection" when copying the connection string. This is
// what keeps the app fast during an RSVP spike instead of exhausting
// direct Postgres connections.
//
// Lazily initialized so `next build`'s static page-data collection (which
// imports every route module but doesn't run requests) doesn't fail just
// because env vars aren't loaded yet in that step.
let _sql: NeonQueryFunction<false, false> | null = null;

function getSql() {
  if (_sql) return _sql;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. See .env.example.");
  }
  _sql = neon(connectionString);
  return _sql;
}

// Proxy so existing call sites can keep using `sql\`...\`` unchanged.
export const sql: NeonQueryFunction<false, false> = ((...args: Parameters<NeonQueryFunction<false, false>>) =>
  getSql()(...args)) as NeonQueryFunction<false, false>;
