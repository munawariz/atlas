import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Module-level cached client built from the service-role key. This must NEVER be imported by
// a client component — every lib module that touches it starts with `import "server-only"`.

let cached: SupabaseClient | null = null;

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
