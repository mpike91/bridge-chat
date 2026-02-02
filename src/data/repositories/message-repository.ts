/**
 * Message Repository
 *
 * Data access for messages with realtime subscription support.
 */

import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SupabaseClient } from "../supabase/client";
import type { Tables, Inserts, Updates } from "../supabase/database.types";
import type {
  Message,
  GroupId,
  MessageId,
  UserId,
  SmsParticipantId,
  TwilioMessageSid,
  DeliveryStatus,
} from "@/domain/types";
import { asMessageId } from "@/domain/types";
import { mapRowToMessage, mapRowsToMessages, safeMapRowToMessage } from "../mappers";

type MessageRow = Tables<"messages">;

export class MessageRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get a message by ID.
   */
  async getById(id: MessageId): Promise<Message | null> {
    const { data, error } = await this.supabase
      .from("messages")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return mapRowToMessage(data);
  }

  /**
   * Get messages for a group with pagination.
   */
  async getByGroupId(
    groupId: GroupId,
    options: {
      limit?: number;
      before?: Date;
      after?: Date;
    } = {}
  ): Promise<Message[]> {
    const { limit = 50, before, after } = options;

    let query = this.supabase
      .from("messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before.toISOString());
    }

    if (after) {
      query = query.gt("created_at", after.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    // Reverse to get chronological order
    return mapRowsToMessages(data).reverse();
  }

  /**
   * Get the latest message for each group.
   * Used for chat list previews.
   */
  async getLatestByGroups(groupIds: GroupId[]): Promise<Map<GroupId, Message>> {
    if (groupIds.length === 0) return new Map();

    // Get latest message per group using distinct on
    const { data: rawData, error } = await this.supabase
      .from("messages")
      .select("*")
      .in("group_id", groupIds)
      .order("group_id")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Cast from 'never' to proper type due to RLS type inference
    const data = rawData as unknown as MessageRow[];

    // Group by group_id and take first (latest) for each
    const latestMap = new Map<GroupId, Message>();
    for (const row of data) {
      const groupId = row.group_id as GroupId;
      if (!latestMap.has(groupId)) {
        const message = safeMapRowToMessage(row);
        if (message) {
          latestMap.set(groupId, message);
        }
      }
    }

    return latestMap;
  }

  /**
   * Create an app-origin message.
   */
  async createAppMessage(input: {
    groupId: GroupId;
    senderUserId: UserId;
    content: string;
  }): Promise<Message> {
    // Type assertion needed because Supabase types infer 'never' due to RLS policies
    const insertData: Inserts<"messages"> = {
      group_id: input.groupId,
      origin: "app",
      content: input.content,
      sender_user_id: input.senderUserId,
      delivery_status: "pending",
    };
    const { data: rawData, error } = await this.supabase
      .from("messages")
      .insert(insertData as unknown as never)
      .select()
      .single();

    if (error) throw error;

    return mapRowToMessage(rawData as unknown as MessageRow);
  }

  /**
   * Create an SMS-origin message.
   * Used by the Twilio webhook.
   */
  async createSmsMessage(input: {
    groupId: GroupId;
    senderSmsParticipantId: SmsParticipantId;
    content: string;
    twilioMessageSid: TwilioMessageSid;
  }): Promise<Message> {
    // Type assertion needed because Supabase types infer 'never' due to RLS policies
    const insertData: Inserts<"messages"> = {
      group_id: input.groupId,
      origin: "sms",
      content: input.content,
      sender_sms_participant_id: input.senderSmsParticipantId,
      twilio_message_sid: input.twilioMessageSid,
    };
    const { data: rawData, error } = await this.supabase
      .from("messages")
      .insert(insertData as unknown as never)
      .select()
      .single();

    if (error) throw error;

    return mapRowToMessage(rawData as unknown as MessageRow);
  }

  /**
   * Update delivery status for a message.
   */
  async updateDeliveryStatus(
    id: MessageId,
    status: DeliveryStatus,
    twilioMessageSid?: TwilioMessageSid
  ): Promise<void> {
    // Type assertion needed because Supabase types infer 'never' due to RLS policies
    const updateData: Updates<"messages"> = {
      delivery_status: status,
    };

    if (twilioMessageSid) {
      updateData.twilio_message_sid = twilioMessageSid;
    }

    const { error } = await this.supabase
      .from("messages")
      .update(updateData as unknown as never)
      .eq("id", id);

    if (error) throw error;
  }

  /**
   * Find a message by Twilio Message SID.
   * Used for status callbacks.
   */
  async getByTwilioSid(sid: TwilioMessageSid): Promise<Message | null> {
    const { data, error } = await this.supabase
      .from("messages")
      .select("*")
      .eq("twilio_message_sid", sid)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return mapRowToMessage(data);
  }

  /**
   * Subscribe to new messages in a group.
   * Returns a channel that can be used to unsubscribe.
   */
  subscribeToGroup(
    groupId: GroupId,
    onMessage: (message: Message) => void
  ): RealtimeChannel {
    return this.supabase
      .channel(`messages:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const message = safeMapRowToMessage(payload.new as MessageRow);
          if (message) {
            onMessage(message);
          }
        }
      )
      .subscribe();
  }

  /**
   * Subscribe to message updates in a group (for delivery status).
   */
  subscribeToUpdates(
    groupId: GroupId,
    onUpdate: (message: Message) => void
  ): RealtimeChannel {
    return this.supabase
      .channel(`message-updates:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const message = safeMapRowToMessage(payload.new as MessageRow);
          if (message) {
            onUpdate(message);
          }
        }
      )
      .subscribe();
  }
}
