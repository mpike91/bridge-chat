/**
 * SMS Participant Repository
 *
 * Data access for SMS-only participants.
 */

import type { SupabaseClient } from "../supabase/client";
import type { Inserts, Tables, Updates } from "../supabase/database.types";

type SmsParticipantRow = Tables<"sms_participants">;
import type {
  SmsParticipant,
  SmsParticipantId,
  UserId,
  E164PhoneNumber,
} from "@/domain/types";
import { asSmsParticipantId } from "@/domain/types";
import {
  mapRowToSmsParticipant,
  mapRowsToSmsParticipants,
} from "../mappers";

export class SmsParticipantRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get an SMS participant by ID.
   */
  async getById(id: SmsParticipantId): Promise<SmsParticipant | null> {
    const { data: rawData, error } = await this.supabase
      .from("sms_participants")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    // Cast from 'never' to proper type due to RLS type inference
    return mapRowToSmsParticipant(rawData as unknown as SmsParticipantRow);
  }

  /**
   * Get SMS participant by phone number.
   */
  async getByPhoneNumber(
    phoneNumber: E164PhoneNumber
  ): Promise<SmsParticipant | null> {
    const { data: rawData, error } = await this.supabase
      .from("sms_participants")
      .select("*")
      .eq("phone_number", phoneNumber)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    // Cast from 'never' to proper type due to RLS type inference
    return mapRowToSmsParticipant(rawData as unknown as SmsParticipantRow);
  }

  /**
   * Get all SMS participants created by a user.
   */
  async getByCreator(creatorId: UserId): Promise<SmsParticipant[]> {
    const { data: rawData, error } = await this.supabase
      .from("sms_participants")
      .select("*")
      .eq("created_by_user_id", creatorId)
      .order("display_name");

    if (error) throw error;

    // Cast from 'never' to proper type due to RLS type inference
    return mapRowsToSmsParticipants(rawData as unknown as SmsParticipantRow[]);
  }

  /**
   * Create a new SMS participant.
   */
  async create(input: {
    phoneNumber: E164PhoneNumber;
    displayName: string;
    createdByUserId: UserId;
  }): Promise<SmsParticipant> {
    // Type assertion needed because Supabase types infer 'never' due to RLS policies
    const insertData: Inserts<"sms_participants"> = {
      phone_number: input.phoneNumber,
      display_name: input.displayName,
      created_by_user_id: input.createdByUserId,
    };
    const { data: rawData, error } = await this.supabase
      .from("sms_participants")
      .insert(insertData as unknown as never)
      .select()
      .single();

    if (error) throw error;

    return mapRowToSmsParticipant(rawData as unknown as SmsParticipantRow);
  }

  /**
   * Find or create an SMS participant by phone number.
   * If the participant exists, updates the display name if different and returns it.
   * Otherwise creates a new one.
   */
  async findOrCreate(input: {
    phoneNumber: E164PhoneNumber;
    displayName: string;
    createdByUserId: UserId;
  }): Promise<{ participant: SmsParticipant; created: boolean }> {
    // First try to find existing
    const existing = await this.getByPhoneNumber(input.phoneNumber);
    if (existing) {
      // Update display name if different
      if (existing.displayName !== input.displayName) {
        const updated = await this.update(existing.id, { displayName: input.displayName });
        return { participant: updated, created: false };
      }
      return { participant: existing, created: false };
    }

    // Create new
    const created = await this.create(input);
    return { participant: created, created: true };
  }

  /**
   * Update an SMS participant.
   */
  async update(
    id: SmsParticipantId,
    updates: { displayName?: string }
  ): Promise<SmsParticipant> {
    // Type assertion needed because Supabase types infer 'never' due to RLS policies
    const updateData: Updates<"sms_participants"> = { display_name: updates.displayName };
    const { data: rawData, error } = await this.supabase
      .from("sms_participants")
      .update(updateData as unknown as never)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Cast from 'never' to proper type due to RLS type inference
    return mapRowToSmsParticipant(rawData as unknown as SmsParticipantRow);
  }

  /**
   * Delete an SMS participant.
   */
  async delete(id: SmsParticipantId): Promise<void> {
    const { error } = await this.supabase
      .from("sms_participants")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  /**
   * Get multiple SMS participants by IDs.
   */
  async getByIds(ids: SmsParticipantId[]): Promise<SmsParticipant[]> {
    if (ids.length === 0) return [];

    const { data: rawData, error } = await this.supabase
      .from("sms_participants")
      .select("*")
      .in("id", ids);

    if (error) throw error;

    // Cast from 'never' to proper type due to RLS type inference
    return mapRowsToSmsParticipants(rawData as unknown as SmsParticipantRow[]);
  }
}
