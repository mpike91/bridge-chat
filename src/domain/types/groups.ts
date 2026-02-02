/**
 * Group Types - Conversation Containers
 *
 * Groups are the central entity for conversations. Each group:
 * - Has one or more app user members
 * - May have SMS participant members
 * - Has a dedicated Twilio phone number for SMS routing
 */

import type {
  GroupId,
  UserId,
  SmsParticipantId,
  E164PhoneNumber,
} from "./branded";
import type { Participant } from "./participants";

/**
 * Role within a group - determines permissions
 */
export type GroupMemberRole = "owner" | "admin" | "member";

/**
 * A conversation group that bridges app users and SMS participants
 */
export interface Group {
  readonly id: GroupId;
  readonly name: string;
  /**
   * Dedicated Twilio phone number for this group.
   * All outbound SMS to participants comes from this number.
   * Inbound SMS to this number routes to this group.
   */
  readonly twilioPhoneNumber: E164PhoneNumber;
  readonly createdByUserId: UserId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * A group with its members loaded
 */
export interface GroupWithMembers extends Group {
  readonly members: GroupMember[];
}

/**
 * Junction record linking a participant to a group
 */
export interface GroupMember {
  readonly groupId: GroupId;
  readonly participant: Participant;
  readonly role: GroupMemberRole;
  readonly joinedAt: Date;
}

/**
 * App user membership in a group (used for type-specific queries)
 */
export interface AppUserMembership {
  readonly groupId: GroupId;
  readonly userId: UserId;
  readonly role: GroupMemberRole;
  readonly joinedAt: Date;
}

/**
 * SMS participant membership in a group
 */
export interface SmsParticipantMembership {
  readonly groupId: GroupId;
  readonly smsParticipantId: SmsParticipantId;
  readonly joinedAt: Date;
}

/**
 * Input for creating a new group
 */
export interface CreateGroupInput {
  readonly name: string;
  readonly createdByUserId: UserId;
  /** If not provided, a Twilio number will be provisioned */
  readonly twilioPhoneNumber?: E164PhoneNumber;
}

/**
 * Input for adding an app user to a group
 */
export interface AddAppUserToGroupInput {
  readonly groupId: GroupId;
  readonly userId: UserId;
  readonly role: GroupMemberRole;
}

/**
 * Input for adding an SMS participant to a group
 */
export interface AddSmsParticipantToGroupInput {
  readonly groupId: GroupId;
  readonly smsParticipantId: SmsParticipantId;
}

/**
 * Check if user has admin privileges in group
 */
export function canManageGroup(role: GroupMemberRole): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Check if user can remove members from group
 */
export function canRemoveMembers(role: GroupMemberRole): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Check if user can delete the group
 */
export function canDeleteGroup(role: GroupMemberRole): boolean {
  return role === "owner";
}
