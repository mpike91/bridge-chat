/**
 * Domain Types - Public API
 *
 * This barrel export provides a clean interface to the domain layer.
 * Import from '@/domain/types' for all domain type needs.
 */

// Branded types for type-safe identifiers
export type {
  UserId,
  E164PhoneNumber,
  GroupId,
  MessageId,
  SmsParticipantId,
  TwilioMessageSid,
} from "./branded";

export {
  asUserId,
  asE164PhoneNumber,
  asGroupId,
  asMessageId,
  asSmsParticipantId,
  asTwilioMessageSid,
} from "./branded";

// Participant types
export type { AppUser, SmsParticipant, Participant } from "./participants";

export {
  isAppUser,
  isSmsParticipant,
  getParticipantDisplayName,
  getParticipantId,
} from "./participants";

// Message types
export type {
  DeliveryStatus,
  MessageOrigin,
  AppOriginMessage,
  SmsOriginMessage,
  Message,
  CreateAppMessageInput,
  CreateSmsMessageInput,
} from "./messages";

export {
  isAppOriginMessage,
  isSmsOriginMessage,
  isDeliveryFailed,
  isDeliverySuccessful,
  isDeliveryPending,
} from "./messages";

// Group types
export type {
  GroupMemberRole,
  Group,
  GroupWithMembers,
  GroupMember,
  AppUserMembership,
  SmsParticipantMembership,
  CreateGroupInput,
  AddAppUserToGroupInput,
  AddSmsParticipantToGroupInput,
} from "./groups";

export { canManageGroup, canRemoveMembers, canDeleteGroup } from "./groups";
