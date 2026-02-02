"use client";

/**
 * Current User Hook
 *
 * Provides the current authenticated user with realtime updates.
 */

import { useEffect, useState } from "react";
import { useSupabase } from "./use-supabase";
import type { User } from "@supabase/supabase-js";

interface UseCurrentUserResult {
  user: User | null;
  isLoading: boolean;
}

export function useCurrentUser(): UseCurrentUserResult {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return { user, isLoading };
}
