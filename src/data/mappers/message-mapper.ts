/**
 * Message Mapper
 *
 * Transforms database message rows to domain Message objects.
 * Handles the discriminated union based on origin field.
 */

import type { Tables } from "../supabase/database.types";
import type {
  Message,
  AppOriginMessage,
  SmsOriginMessage,
  DeliveryStatus,
} from "@/domain/types";
import {
  asMessageId,
  asGroupId,
  asUserId,
  asSmsParticipantId,
  asTwilioMessageSid,
} from "@/domain/types";

type MessageRow = Tables<"messages">;

/**
 * Maps a database message row to a domain Message.
 * Returns the appropriate discriminated union variant based on origin.
 */
export function mapRowToMessage(row: MessageRow): Message {
  const base = {
    id: asMessageId(row.id),
    groupId: asGroupId(row.group_id),
    content: row.content,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };

  if (row.origin === "app") {
    // App origin message
    if (!row.sender_user_id) {
      throw new Error(`App origin message ${row.id} missing sender_user_id`);
    }

    const appMessage: AppOriginMessage = {
      ...base,
      origin: "app",
      senderUserId: asUserId(row.sender_user_id),
      deliveryStatus: row.delivery_status as DeliveryStatus | null,
      twilioMessageSid: row.twilio_message_sid
        ? asTwilioMessageSid(row.twilio_message_sid)
        : null,
    };

    return appMessage;
  } else {
    // SMS origin message
    if (!row.sender_sms_participant_id) {
      throw new Error(
        `SMS origin message ${row.id} missing sender_sms_participant_id`
      );
    }
    if (!row.twilio_message_sid) {
      throw new Error(`SMS origin message ${row.id} missing twilio_message_sid`);
    }

    const smsMessage: SmsOriginMessage = {
      ...base,
      origin: "sms",
      senderSmsParticipantId: asSmsParticipantId(row.sender_sms_participant_id),
      twilioMessageSid: asTwilioMessageSid(row.twilio_message_sid),
    };

    return smsMessage;
  }
}

/**
 * Maps multiple message rows to Message array.
 */
export function mapRowsToMessages(rows: MessageRow[]): Message[] {
  return rows.map(mapRowToMessage);
}

/**
 * Safely maps a row to message, returning null on error.
 * Useful for realtime updates where data might be incomplete.
 */
export function safeMapRowToMessage(row: MessageRow): Message | null {
  try {
    return mapRowToMessage(row);
  } catch {
    console.error("Failed to map message row:", row);
    return null;
  }
}
