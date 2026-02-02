"use client";

/**
 * Supabase Client Hook
 *
 * Provides a memoized Supabase client for client components.
 */

import { useMemo } from "react";
import { createBrowserSupabaseClient } from "@/data/supabase/client";

export function useSupabase() {
  return useMemo(() => createBrowserSupabaseClient(), []);
}
