/**
 * Participant Types - Discriminated Union Pattern
 *
 * BridgeChat has two types of participants:
 * 1. AppUser - Authenticated users with full app access
 * 2. SmsParticipant - Phone-only participants who interact via SMS
 *
 * The discriminated union (via `kind` property) enables exhaustive
 * type checking and type narrowing in message handling.
 */

import type {
  UserId,
  E164PhoneNumber,
  SmsParticipantId,
} from "./branded";

/**
 * An authenticated app user with full access to the application.
 * Created via Supabase Auth (email/password, OAuth, etc.)
 */
export interface AppUser {
  readonly kind: "app_user";
  readonly id: UserId;
  readonly email: string;
  readonly displayName: string;
  /** Optional phone for receiving SMS notifications or linking to SMS identity */
  readonly phoneNumber: E164PhoneNumber | null;
  readonly avatarUrl: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * An SMS-only participant who interacts with the group via text messages.
 * Created by an app user when adding a phone number to a conversation.
 */
export interface SmsParticipant {
  readonly kind: "sms_participant";
  readonly id: SmsParticipantId;
  readonly phoneNumber: E164PhoneNumber;
  /** Display name assigned by the creating user */
  readonly displayName: string;
  /** The app user who added this SMS participant */
  readonly createdByUserId: UserId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Union type for any participant in a conversation.
 * Use the `kind` discriminator for type narrowing:
 *
 * @example
 * if (participant.kind === 'app_user') {
 *   console.log(participant.email); // TypeScript knows this is AppUser
 * } else {
 *   console.log(participant.phoneNumber); // TypeScript knows this is SmsParticipant
 * }
 */
export type Participant = AppUser | SmsParticipant;

/**
 * Type guard for AppUser
 */
export function isAppUser(participant: Participant): participant is AppUser {
  return participant.kind === "app_user";
}

/**
 * Type guard for SmsParticipant
 */
export function isSmsParticipant(
  participant: Participant
): participant is SmsParticipant {
  return participant.kind === "sms_participant";
}

/**
 * Get the display name for any participant type
 */
export function getParticipantDisplayName(participant: Participant): string {
  return participant.displayName;
}

/**
 * Get the unique identifier for any participant type
 */
export function getParticipantId(
  participant: Participant
): UserId | SmsParticipantId {
  return participant.kind === "app_user" ? participant.id : participant.id;
}
