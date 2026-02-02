"use client";

/**
 * Realtime Messages Hook
 *
 * Subscribes to new messages and updates for a group.
 * Handles connection state and cleanup.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useSupabase } from "./use-supabase";
import type { Message } from "@/domain/types";
import {
  asGroupId,
  asMessageId,
  asUserId,
  asSmsParticipantId,
  asTwilioMessageSid,
  type DeliveryStatus,
} from "@/domain/types";

/**
 * Maps a realtime payload to a Message object.
 * Handles both app and sms origin messages.
 */
function mapPayloadToMessage(row: any): Message | null {
  if (!row || !row.id) return null;

  const base = {
    id: asMessageId(row.id),
    groupId: asGroupId(row.group_id),
    content: row.content,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };

  if (row.origin === "app") {
    if (!row.sender_user_id) return null;
    return {
      ...base,
      origin: "app" as const,
      senderUserId: asUserId(row.sender_user_id),
      deliveryStatus: row.delivery_status as DeliveryStatus | null,
      twilioMessageSid: row.twilio_message_sid
        ? asTwilioMessageSid(row.twilio_message_sid)
        : null,
    };
  } else if (row.origin === "sms") {
    if (!row.sender_sms_participant_id || !row.twilio_message_sid) return null;
    return {
      ...base,
      origin: "sms" as const,
      senderSmsParticipantId: asSmsParticipantId(row.sender_sms_participant_id),
      twilioMessageSid: asTwilioMessageSid(row.twilio_message_sid),
    };
  }

  return null;
}

interface UseRealtimeMessagesOptions {
  groupId: string;
  initialMessages: Message[];
  onNewMessage?: (message: Message) => void;
}

interface UseRealtimeMessagesResult {
  messages: Message[];
  isConnected: boolean;
  error: Error | null;
}

export function useRealtimeMessages({
  groupId,
  initialMessages,
  onNewMessage,
}: UseRealtimeMessagesOptions): UseRealtimeMessagesResult {
  const supabase = useSupabase();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Handle new message
  const handleNewMessage = useCallback(
    (message: Message) => {
      setMessages((prev) => {
        // Check for duplicate (might already be in list from optimistic update)
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });

      onNewMessage?.(message);
    },
    [onNewMessage]
  );

  // Handle message update (delivery status change)
  const handleMessageUpdate = useCallback((updatedMessage: Message) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
    );
  }, []);

  // Subscribe to messages
  useEffect(() => {
    // Create channel for new messages - attach listeners BEFORE subscribing
    channelRef.current = supabase
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
          try {
            const row = payload.new as any;
            const message = mapPayloadToMessage(row);
            if (message) {
              handleNewMessage(message);
            }
          } catch (e) {
            console.error("Failed to process new message:", e);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          try {
            const row = payload.new as any;
            const message = mapPayloadToMessage(row);
            if (message) {
              handleMessageUpdate(message);
            }
          } catch (e) {
            console.error("Failed to process message update:", e);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          setError(null);
          console.log("Realtime connected for group:", groupId);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setIsConnected(false);
          setError(new Error(err?.message || `Realtime ${status}`));
          console.error("Realtime error:", status, err);
        }
      });

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        console.log("Cleaning up realtime channel for group:", groupId);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, groupId, handleNewMessage, handleMessageUpdate]);

  // Update messages when initial messages change
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  return {
    messages,
    isConnected,
    error,
  };
}
