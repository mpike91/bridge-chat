/**
 * Profile Repository
 *
 * Data access for user profiles.
 */

import type { SupabaseClient } from "../supabase/client";
import type { Tables, Updates } from "../supabase/database.types";
import type { AppUser, UserId } from "@/domain/types";
import { mapProfileToAppUser, mapProfilesToAppUsers } from "../mappers";

type ProfileRow = Tables<"profiles">;

export class ProfileRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get a profile by user ID.
   */
  async getById(userId: UserId): Promise<AppUser | null> {
    const { data: rawData, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw error;
    }

    // Cast from 'never' to proper type due to RLS type inference
    return mapProfileToAppUser(rawData as unknown as ProfileRow);
  }

  /**
   * Get multiple profiles by IDs.
   */
  async getByIds(userIds: UserId[]): Promise<AppUser[]> {
    if (userIds.length === 0) return [];

    const { data: rawData, error } = await this.supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);

    if (error) throw error;

    // Cast from 'never' to proper type due to RLS type inference
    return mapProfilesToAppUsers(rawData as unknown as ProfileRow[]);
  }

  /**
   * Get the current authenticated user's profile.
   */
  async getCurrentUser(): Promise<AppUser | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) return null;

    const { data: rawData, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    // Cast from 'never' to proper type due to RLS type inference
    return mapProfileToAppUser(rawData as unknown as ProfileRow);
  }

  /**
   * Update a profile.
   */
  async update(
    userId: UserId,
    updates: {
      displayName?: string;
      phoneNumber?: string | null;
      avatarUrl?: string | null;
    }
  ): Promise<AppUser> {
    // Type assertion needed because Supabase types infer 'never' due to RLS policies
    const updateData: Updates<"profiles"> = {
      display_name: updates.displayName,
      phone_number: updates.phoneNumber,
      avatar_url: updates.avatarUrl,
    };
    const { data: rawData, error } = await this.supabase
      .from("profiles")
      .update(updateData as unknown as never)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    // Cast from 'never' to proper type due to RLS type inference
    return mapProfileToAppUser(rawData as unknown as ProfileRow);
  }

  /**
   * Search profiles by display name or email.
   */
  async search(query: string, limit: number = 10): Promise<AppUser[]> {
    const { data: rawData, error } = await this.supabase
      .from("profiles")
      .select("*")
      .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit);

    if (error) throw error;

    // Cast from 'never' to proper type due to RLS type inference
    return mapProfilesToAppUsers(rawData as unknown as ProfileRow[]);
  }
}
