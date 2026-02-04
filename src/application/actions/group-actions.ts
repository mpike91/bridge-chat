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
 * Update a group's details (including Twilio number).
 */
export async function updateGroup(
  groupId: string,
  formData: FormData
): Promise<GroupResult> {
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();
  const groupRepo = new GroupRepository(supabase);

  // Check ownership for Twilio number changes
  const role = await groupRepo.getUserRole(asGroupId(groupId), asUserId(user.id));
  if (role !== "owner" && role !== "admin") {
    return { success: false, error: "Only group owners can update group settings" };
  }

  const name = formData.get("name") as string;
  const twilioNumber = formData.get("twilioPhoneNumber") as string | null;

  const updates: { name?: string; twilioPhoneNumber?: string } = {};
  if (name) updates.name = name;

  // Validate and add Twilio number if provided
  if (twilioNumber) {
    const phoneResult = normalizeToE164(twilioNumber);
    if (!phoneResult.success) {
      return { success: false, error: phoneResult.error };
    }
    updates.twilioPhoneNumber = phoneResult.value;
  }

  try {
    const group = await groupRepo.update(asGroupId(groupId), updates);

    revalidatePath(`/chats/${groupId}`);
    revalidatePath("/chats");

    return { success: true, group };
  } catch (error) {
    console.error("Update group error:", error);
    // Handle unique constraint violation for Twilio number
    if (error instanceof Error && error.message.includes("unique")) {
      return { success: false, error: "This Twilio number is already in use by another group" };
    }
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

/**
 * Search for app users that can be added to a group.
 * Returns users not already in the group.
 */
export async function searchUsersToAdd(
  groupId: string,
  searchTerm: string
): Promise<{
  success: boolean;
  users?: Array<{ id: string; email: string; displayName: string }>;
  error?: string;
}> {
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();
  const groupRepo = new GroupRepository(supabase);

  // Check caller has permission to add members
  const role = await groupRepo.getUserRole(asGroupId(groupId), asUserId(user.id));
  if (role !== "owner" && role !== "admin") {
    return { success: false, error: "Only owners and admins can add members" };
  }

  try {
    // Get existing member user IDs
    const members = await groupRepo.getMembers(asGroupId(groupId));
    const existingUserIds = members
      .filter((m) => m.participant.kind === "app_user")
      .map((m) => m.participant.id);

    // Search profiles excluding existing members
    let query = supabase
      .from("profiles")
      .select("id, email, display_name")
      .limit(10);

    if (searchTerm) {
      query = query.or(
        `email.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`
      );
    }

    if (existingUserIds.length > 0) {
      query = query.not("id", "in", `(${existingUserIds.join(",")})`);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Type assertion needed due to Supabase RLS type inference
    const rows = (data || []) as Array<{
      id: string;
      email: string;
      display_name: string;
    }>;

    const users = rows.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
    }));

    return { success: true, users };
  } catch (error) {
    console.error("Search users error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search users",
    };
  }
}

/**
 * Add an app user to a group.
 */
export async function addAppUserToGroup(
  groupId: string,
  userIdToAdd: string
): Promise<GroupMemberResult> {
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();
  const groupRepo = new GroupRepository(supabase);

  // Check caller has permission
  const role = await groupRepo.getUserRole(asGroupId(groupId), asUserId(user.id));
  if (role !== "owner" && role !== "admin") {
    return { success: false, error: "Only owners and admins can add members" };
  }

  try {
    await groupRepo.addUser(asGroupId(groupId), asUserId(userIdToAdd), "member");

    revalidatePath(`/chats/${groupId}`);

    return { success: true };
  } catch (error) {
    console.error("Add app user error:", error);
    // Handle duplicate member
    if (error instanceof Error && error.message.includes("duplicate")) {
      return { success: false, error: "User is already a member of this group" };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add user",
    };
  }
}

/**
 * Remove a member (app user or SMS participant) from a group.
 */
export async function removeMemberFromGroup(
  groupId: string,
  memberId: string,
  memberType: "app_user" | "sms_participant"
): Promise<GroupMemberResult> {
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();
  const groupRepo = new GroupRepository(supabase);

  // Check caller has permission
  const role = await groupRepo.getUserRole(asGroupId(groupId), asUserId(user.id));
  if (role !== "owner" && role !== "admin") {
    return { success: false, error: "Only owners and admins can remove members" };
  }

  // Prevent owner from removing themselves
  if (memberType === "app_user" && memberId === user.id) {
    return { success: false, error: "You cannot remove yourself from the group" };
  }

  // Prevent removing other owners (only owners can remove, but can't remove each other)
  if (memberType === "app_user") {
    const memberRole = await groupRepo.getUserRole(asGroupId(groupId), asUserId(memberId));
    if (memberRole === "owner") {
      return { success: false, error: "Cannot remove the group owner" };
    }
  }

  try {
    if (memberType === "app_user") {
      await groupRepo.removeUser(asGroupId(groupId), asUserId(memberId));
    } else {
      await groupRepo.removeSmsParticipant(asGroupId(groupId), asSmsParticipantId(memberId));
    }

    revalidatePath(`/chats/${groupId}`);

    return { success: true };
  } catch (error) {
    console.error("Remove member error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove member",
    };
  }
}
