/**
 * Group Mapper
 *
 * Transforms database group rows to domain objects.
 */

import type { Tables } from "../supabase/database.types";
import type { Group, GroupMember, GroupMemberRole, Participant } from "@/domain/types";
import { asGroupId, asUserId, asE164PhoneNumber } from "@/domain/types";
import { mapProfileToAppUser } from "./profile-mapper";
import { mapRowToSmsParticipant } from "./sms-participant-mapper";

type GroupRow = Tables<"groups">;
type GroupMemberRow = Tables<"group_members">;
type ProfileRow = Tables<"profiles">;
type SmsParticipantRow = Tables<"sms_participants">;

/**
 * Maps a database group row to a domain Group.
 */
export function mapRowToGroup(row: GroupRow): Group {
  return {
    id: asGroupId(row.id),
    name: row.name,
    twilioPhoneNumber: asE164PhoneNumber(row.twilio_phone_number),
    createdByUserId: asUserId(row.created_by_user_id),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Maps multiple group rows to Group array.
 */
export function mapRowsToGroups(rows: GroupRow[]): Group[] {
  return rows.map(mapRowToGroup);
}

/**
 * Extended row type with joined profile or SMS participant.
 */
export type GroupMemberRowWithRelations = GroupMemberRow & {
  profiles?: ProfileRow | null;
  sms_participants?: SmsParticipantRow | null;
};

/**
 * Maps a group member row with joined relations to a domain GroupMember.
 */
export function mapRowToGroupMember(
  row: GroupMemberRowWithRelations
): GroupMember | null {
  let participant: Participant | null = null;

  if (row.user_id && row.profiles) {
    participant = mapProfileToAppUser(row.profiles);
  } else if (row.sms_participant_id && row.sms_participants) {
    participant = mapRowToSmsParticipant(row.sms_participants);
  }

  if (!participant) {
    return null;
  }

  return {
    groupId: asGroupId(row.group_id),
    participant,
    role: row.role as GroupMemberRole,
    joinedAt: new Date(row.joined_at),
  };
}

/**
 * Maps multiple group member rows to GroupMember array.
 * Filters out any null results (missing relations).
 */
export function mapRowsToGroupMembers(
  rows: GroupMemberRowWithRelations[]
): GroupMember[] {
  return rows.map(mapRowToGroupMember).filter((m): m is GroupMember => m !== null);
}
