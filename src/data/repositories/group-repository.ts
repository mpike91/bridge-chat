/**
 * Group Repository
 *
 * Data access for conversation groups and memberships.
 */

import type { SupabaseClient } from "../supabase/client";
import type { Inserts, Tables, Updates } from "../supabase/database.types";
import type {
  Group,
  GroupWithMembers,
  GroupMember,
  GroupMemberRole,
  GroupId,
  UserId,
  SmsParticipantId,
  E164PhoneNumber,
} from "@/domain/types";
import { asGroupId } from "@/domain/types";
import {
  mapRowToGroup,
  mapRowsToGroups,
  mapRowsToGroupMembers,
} from "../mappers";

export class GroupRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get a group by ID.
   */
  async getById(id: GroupId): Promise<Group | null> {
    const { data, error } = await this.supabase
      .from("groups")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return mapRowToGroup(data);
  }

  /**
   * Get a group by its Twilio phone number.
   * Used for routing incoming SMS.
   */
  async getByTwilioNumber(
    twilioNumber: E164PhoneNumber
  ): Promise<Group | null> {
    const { data, error } = await this.supabase
      .from("groups")
      .select("*")
      .eq("twilio_phone_number", twilioNumber)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return mapRowToGroup(data);
  }

  /**
   * Get all groups the current user is a member of.
   */
  async getMyGroups(): Promise<Group[]> {
    const { data, error } = await this.supabase
      .from("groups")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return mapRowsToGroups(data);
  }

  /**
   * Get a group with all its members loaded.
   */
  async getWithMembers(id: GroupId): Promise<GroupWithMembers | null> {
    const group = await this.getById(id);
    if (!group) return null;

    const members = await this.getMembers(id);

    return {
      ...group,
      members,
    };
  }

  /**
   * Get all members of a group.
   */
  async getMembers(groupId: GroupId): Promise<GroupMember[]> {
    const { data, error } = await this.supabase
      .from("group_members")
      .select(
        `
        *,
        profiles (*),
        sms_participants (*)
      `
      )
      .eq("group_id", groupId);

    if (error) throw error;

    return mapRowsToGroupMembers(data);
  }

  /**
   * Get SMS participant members of a group.
   * Used when sending outbound SMS.
   */
  async getSmsMembers(groupId: GroupId): Promise<SmsParticipantId[]> {
    const { data, error } = await this.supabase
      .from("group_members")
      .select("sms_participant_id")
      .eq("group_id", groupId)
      .not("sms_participant_id", "is", null);

    if (error) throw error;
    if (!data) return [];

    // Type assertion needed because Supabase types infer 'never' due to RLS
    const rows = data as Array<{ sms_participant_id: string | null }>;
    return rows
      .map((row) => row.sms_participant_id)
      .filter((id): id is string => id !== null) as SmsParticipantId[];
  }

  /**
   * Create a new group.
   * Automatically adds the creator as owner.
   */
  async create(input: {
    name: string;
    twilioPhoneNumber: E164PhoneNumber;
    createdByUserId: UserId;
  }): Promise<Group> {
    // Create the group
    // Type assertion needed because Supabase types infer 'never' due to RLS policies
    const insertData: Inserts<"groups"> = {
      name: input.name,
      twilio_phone_number: input.twilioPhoneNumber,
      created_by_user_id: input.createdByUserId,
    };
    const { data: rawGroupData, error: groupError } = await this.supabase
      .from("groups")
      .insert(insertData as unknown as never)
      .select()
      .single();

    if (groupError) throw groupError;

    // Cast result from 'never' to proper type
    const groupData = rawGroupData as unknown as Tables<"groups">;

    // Add creator as owner
    // Type assertion needed because Supabase types infer 'never' due to RLS policies
    const memberData: Inserts<"group_members"> = {
      group_id: groupData.id,
      user_id: input.createdByUserId,
      role: "owner",
    };
    const { error: memberError } = await this.supabase.from("group_members").insert(memberData as unknown as never);

    if (memberError) throw memberError;

    return mapRowToGroup(groupData);
  }

  /**
   * Update a group.
   */
  async update(
    id: GroupId,
    updates: { name?: string; twilioPhoneNumber?: string }
  ): Promise<Group> {
    // Type assertion needed because Supabase types infer 'never' due to RLS policies
    const updateData: Updates<"groups"> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.twilioPhoneNumber !== undefined) {
      updateData.twilio_phone_number = updates.twilioPhoneNumber;
    }

    const { data: rawData, error } = await this.supabase
      .from("groups")
      .update(updateData as unknown as never)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return mapRowToGroup(rawData as unknown as Tables<"groups">);
  }

  /**
   * Delete a group.
   */
  async delete(id: GroupId): Promise<void> {
    const { error } = await this.supabase
      .from("groups")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  /**
   * Add an app user to a group.
   */
  async addUser(
    groupId: GroupId,
    userId: UserId,
    role: GroupMemberRole = "member"
  ): Promise<void> {
    // Type assertion needed because Supabase types infer 'never' due to RLS policies
    const insertData: Inserts<"group_members"> = {
      group_id: groupId,
      user_id: userId,
      role,
    };
    const { error } = await this.supabase.from("group_members").insert(insertData as unknown as never);

    if (error) throw error;
  }

  /**
   * Add an SMS participant to a group.
   */
  async addSmsParticipant(
    groupId: GroupId,
    smsParticipantId: SmsParticipantId
  ): Promise<void> {
    // Type assertion needed because Supabase types infer 'never' due to RLS policies
    const insertData: Inserts<"group_members"> = {
      group_id: groupId,
      sms_participant_id: smsParticipantId,
      role: "member",
    };
    const { error } = await this.supabase.from("group_members").insert(insertData as unknown as never);

    if (error) throw error;
  }

  /**
   * Remove an app user from a group.
   */
  async removeUser(groupId: GroupId, userId: UserId): Promise<void> {
    const { error } = await this.supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) throw error;
  }

  /**
   * Remove an SMS participant from a group.
   */
  async removeSmsParticipant(
    groupId: GroupId,
    smsParticipantId: SmsParticipantId
  ): Promise<void> {
    const { error } = await this.supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("sms_participant_id", smsParticipantId);

    if (error) throw error;
  }

  /**
   * Get a user's role in a group.
   */
  async getUserRole(
    groupId: GroupId,
    userId: UserId
  ): Promise<GroupMemberRole | null> {
    const { data: rawData, error } = await this.supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    // Cast from 'never' to proper type due to RLS type inference
    const data = rawData as unknown as { role: GroupMemberRole };
    return data.role;
  }

  /**
   * Check if a user is a member of a group.
   */
  async isMember(groupId: GroupId, userId: UserId): Promise<boolean> {
    const role = await this.getUserRole(groupId, userId);
    return role !== null;
  }
}
