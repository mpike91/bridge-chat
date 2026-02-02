"use server";

/**
 * Group Server Actions
 *
 * Handles group creation, updates, and membership management.
 */

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { GroupRepository, SmsParticipantRepository } from "@/data/repositories";
import {
  asUserId,
  asGroupId,
  asSmsParticipantId,
  asE164PhoneNumber,
  type Group,
  type GroupWithMembers,
  type GroupId,
} from "@/domain/types";
import { normalizeToE164 } from "@/domain/validators";
import { requireAuth } from "./auth-actions";

export interface GroupResult {
  success: boolean;
  error?: string;
  group?: Group;
}

export interface GroupMemberResult {
  success: boolean;
  error?: string;
}

/**
 * Create a new group.
 */
export async function createGroup(formData: FormData): Promise<GroupResult> {
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();
  const groupRepo = new GroupRepository(supabase);

  const name = formData.get("name") as string;
  const twilioNumber = formData.get("twilioPhoneNumber") as string;

  if (!name || !twilioNumber) {
    return { success: false, error: "Name and Twilio number are required" };
  }

  // Validate Twilio number
  const phoneResult = normalizeToE164(twilioNumber);
  if (!phoneResult.success) {
    return { success: false, error: phoneResult.error };
  }

  try {
    const group = await groupRepo.create({
      name,
      twilioPhoneNumber: phoneResult.value,
      createdByUserId: asUserId(user.id),
    });

    revalidatePath("/chats");

    return { success: true, group };
  } catch (error) {
    console.error("Create group error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create group",
    };
  }
}

/**
 * Update a group's details.
 */
export async function updateGroup(
  groupId: string,
  formData: FormData
): Promise<GroupResult> {
  await requireAuth();
  const supabase = await createServerSupabaseClient();
  const groupRepo = new GroupRepository(supabase);

  const name = formData.get("name") as string;

  try {
    const group = await groupRepo.update(asGroupId(groupId), { name });

    revalidatePath(`/chats/${groupId}`);
    revalidatePath("/chats");

    return { success: true, group };
  } catch (error) {
    console.error("Update group error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update group",
    };
  }
}

/**
 * Delete a group.
 */
export async function deleteGroup(groupId: string): Promise<GroupMemberResult> {
  await requireAuth();
  const supabase = await createServerSupabaseClient();
  const groupRepo = new GroupRepository(supabase);

  try {
    await groupRepo.delete(asGroupId(groupId));

    revalidatePath("/chats");

    return { success: true };
  } catch (error) {
    console.error("Delete group error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete group",
    };
  }
}

/**
 * Add an SMS participant to a group.
 */
export async function addSmsParticipantToGroup(
  groupId: string,
  formData: FormData
): Promise<GroupMemberResult> {
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();
  const groupRepo = new GroupRepository(supabase);
  const smsRepo = new SmsParticipantRepository(supabase);

  const phoneNumber = formData.get("phoneNumber") as string;
  const displayName = formData.get("displayName") as string;

  if (!phoneNumber) {
    return { success: false, error: "Phone number is required" };
  }

  // Validate phone number
  const phoneResult = normalizeToE164(phoneNumber);
  if (!phoneResult.success) {
    return { success: false, error: phoneResult.error };
  }

  try {
    // Find or create the SMS participant
    const { participant } = await smsRepo.findOrCreate({
      phoneNumber: phoneResult.value,
      displayName: displayName || phoneResult.value,
      createdByUserId: asUserId(user.id),
    });

    // Add to group
    await groupRepo.addSmsParticipant(
      asGroupId(groupId),
      participant.id
    );

    revalidatePath(`/chats/${groupId}`);

    return { success: true };
  } catch (error) {
    console.error("Add SMS participant error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to add participant",
    };
  }
}

/**
 * Remove an SMS participant from a group.
 */
export async function removeSmsParticipantFromGroup(
  groupId: string,
  smsParticipantId: string
): Promise<GroupMemberResult> {
  await requireAuth();
  const supabase = await createServerSupabaseClient();
  const groupRepo = new GroupRepository(supabase);

  try {
    await groupRepo.removeSmsParticipant(
      asGroupId(groupId),
      asSmsParticipantId(smsParticipantId)
    );

    revalidatePath(`/chats/${groupId}`);

    return { success: true };
  } catch (error) {
    console.error("Remove SMS participant error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to remove participant",
    };
  }
}

/**
 * Leave a group.
 */
export async function leaveGroup(groupId: string): Promise<GroupMemberResult> {
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();
  const groupRepo = new GroupRepository(supabase);

  try {
    await groupRepo.removeUser(asGroupId(groupId), asUserId(user.id));

    revalidatePath("/chats");

    return { success: true };
  } catch (error) {
    console.error("Leave group error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to leave group",
    };
  }
}

/**
 * Get a group with members.
 */
export async function getGroupWithMembers(
  groupId: string
): Promise<GroupWithMembers | null> {
  await requireAuth();
  const supabase = await createServerSupabaseClient();
  const groupRepo = new GroupRepository(supabase);

  return groupRepo.getWithMembers(asGroupId(groupId));
}

/**
 * Get all groups for current user.
 */
export async function getMyGroups(): Promise<Group[]> {
  await requireAuth();
  const supabase = await createServerSupabaseClient();
  const groupRepo = new GroupRepository(supabase);

  return groupRepo.getMyGroups();
}
