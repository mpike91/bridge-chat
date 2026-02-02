/**
 * Profile Mapper
 *
 * Transforms database profile rows to domain AppUser objects.
 */

import type { Tables } from "../supabase/database.types";
import type { AppUser } from "@/domain/types";
import { asUserId, asE164PhoneNumber } from "@/domain/types";

type ProfileRow = Tables<"profiles">;

/**
 * Maps a database profile row to a domain AppUser.
 */
export function mapProfileToAppUser(row: ProfileRow): AppUser {
  return {
    kind: "app_user",
    id: asUserId(row.id),
    email: row.email,
    displayName: row.display_name,
    phoneNumber: row.phone_number ? asE164PhoneNumber(row.phone_number) : null,
    avatarUrl: row.avatar_url,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Maps multiple profile rows to AppUser array.
 */
export function mapProfilesToAppUsers(rows: ProfileRow[]): AppUser[] {
  return rows.map(mapProfileToAppUser);
}
