"use server";

/**
 * Profile Server Actions
 *
 * Handles profile updates.
 */

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { ProfileRepository } from "@/data/repositories";
import { asUserId, type AppUser } from "@/domain/types";
import { normalizeToE164 } from "@/domain/validators";
import { requireAuth } from "./auth-actions";

export interface ProfileUpdateResult {
  success: boolean;
  error?: string;
  profile?: AppUser;
}

/**
 * Update the current user's profile.
 */
export async function updateProfile(
  formData: FormData
): Promise<ProfileUpdateResult> {
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();
  const profileRepo = new ProfileRepository(supabase);

  const displayName = formData.get("displayName") as string;
  const phoneNumber = formData.get("phoneNumber") as string;

  // Validate phone number if provided
  let validatedPhone: string | null = null;
  if (phoneNumber && phoneNumber.trim()) {
    const result = normalizeToE164(phoneNumber);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    validatedPhone = result.value;
  }

  try {
    const profile = await profileRepo.update(asUserId(user.id), {
      displayName: displayName || undefined,
      phoneNumber: validatedPhone,
    });

    revalidatePath("/settings");

    return { success: true, profile };
  } catch (error) {
    console.error("Profile update error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update profile",
    };
  }
}

/**
 * Get the current user's profile.
 */
export async function getMyProfile(): Promise<AppUser | null> {
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();
  const profileRepo = new ProfileRepository(supabase);

  return profileRepo.getById(asUserId(user.id));
}
