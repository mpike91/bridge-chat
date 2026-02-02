/**
 * SMS Participant Mapper
 *
 * Transforms database SMS participant rows to domain objects.
 */

import type { Tables } from "../supabase/database.types";
import type { SmsParticipant } from "@/domain/types";
import { asSmsParticipantId, asUserId, asE164PhoneNumber } from "@/domain/types";

type SmsParticipantRow = Tables<"sms_participants">;

/**
 * Maps a database SMS participant row to a domain SmsParticipant.
 */
export function mapRowToSmsParticipant(row: SmsParticipantRow): SmsParticipant {
  return {
    kind: "sms_participant",
    id: asSmsParticipantId(row.id),
    phoneNumber: asE164PhoneNumber(row.phone_number),
    displayName: row.display_name,
    createdByUserId: asUserId(row.created_by_user_id),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Maps multiple rows to SmsParticipant array.
 */
export function mapRowsToSmsParticipants(
  rows: SmsParticipantRow[]
): SmsParticipant[] {
  return rows.map(mapRowToSmsParticipant);
}
