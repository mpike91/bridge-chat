/**
 * Supabase Browser Client
 *
 * Client-side Supabase client for React components.
 * This file is safe to import from "use client" components.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Creates a Supabase client for browser/client components.
 * Uses the anon key with RLS enforced.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Type helper for browser Supabase client.
 */
export type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;
