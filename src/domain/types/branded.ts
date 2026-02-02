/**
 * Branded Types for Type-Safe Identifiers
 *
 * Branded types provide nominal typing in TypeScript's structural type system.
 * This prevents accidental misuse of identifiers—you can't pass a UserId
 * where a GroupId is expected, even though both are strings at runtime.
 */

declare const __brand: unique symbol;

/**
 * Creates a branded type by intersecting T with a unique brand.
 * The brand exists only at compile time and has no runtime cost.
 */
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** Unique identifier for authenticated app users (from Supabase Auth) */
export type UserId = Brand<string, "UserId">;

/** E.164 formatted phone number (e.g., +14155551234) */
export type E164PhoneNumber = Brand<string, "E164PhoneNumber">;

/** Unique identifier for conversation groups */
export type GroupId = Brand<string, "GroupId">;

/** Unique identifier for messages */
export type MessageId = Brand<string, "MessageId">;

/** Unique identifier for SMS-only participants */
export type SmsParticipantId = Brand<string, "SmsParticipantId">;

/** Twilio Message SID (starts with SM or MM) */
export type TwilioMessageSid = Brand<string, "TwilioMessageSid">;

/**
 * Type guard helpers for branded types.
 * These are used after validation to assert the brand.
 */
export function asUserId(id: string): UserId {
  return id as UserId;
}

export function asE164PhoneNumber(phone: string): E164PhoneNumber {
  return phone as E164PhoneNumber;
}

export function asGroupId(id: string): GroupId {
  return id as GroupId;
}

export function asMessageId(id: string): MessageId {
  return id as MessageId;
}

export function asSmsParticipantId(id: string): SmsParticipantId {
  return id as SmsParticipantId;
}

export function asTwilioMessageSid(sid: string): TwilioMessageSid {
  return sid as TwilioMessageSid;
}
