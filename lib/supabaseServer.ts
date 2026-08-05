import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Module-level cached client built from the service-role key. This must NEVER be imported by
// a client component — every lib module that touches it starts with `import "server-only"`.

let cached: SupabaseClient | null = null;

// Set ATLAS_QUERY_LOG=1 to count and log every PostgREST round trip — the number this app's
// perf work optimizes for. The counter resets per process, not per request; watch the deltas.
let queryCount = 0;

function loggingFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  queryCount += 1;
  console.log(`[sb] #${queryCount} ${init?.method ?? "GET"} ${url.pathname}${url.search}`);
  return fetch(input, init);
}

export function supabaseServer(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "SUPABASE_URL is not set. Copy .example.env to .env.local and fill in your Supabase project URL."
    );
  }
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Copy .example.env to .env.local and fill in your service-role key."
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(process.env.ATLAS_QUERY_LOG === "1" ? { global: { fetch: loggingFetch } } : {}),
  });
  return cached;
}

/**
 * True when a PostgREST error means "table does not exist" — tolerated on newer tables so the
 * app still boots against a partially migrated database (ATLAS.md §14.4).
 */
export function isMissingTable(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42P01";
}

/**
 * True when a PostgREST error means "function does not exist" — PGRST202 is PostgREST's
 * schema-cache miss, 42883 is Postgres itself. Callers of the perf RPCs (0002_perf_rpc.sql)
 * fall back to their legacy JS scans on this, so an un-migrated database keeps working.
 */
export function isMissingFunction(
  error: { code?: string } | null | undefined
): boolean {
  return error?.code === "PGRST202" || error?.code === "42883";
}
