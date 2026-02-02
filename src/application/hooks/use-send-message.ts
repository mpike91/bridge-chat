"use client";

/**
 * Send Message Hook
 *
 * Handles message sending with optimistic updates.
 */

import { useState, useCallback } from "react";
import { sendMessage } from "../actions";
import type { Message } from "@/domain/types";

interface UseSendMessageOptions {
  groupId: string;
  onOptimisticAdd?: (message: Message) => void;
  onSuccess?: (message: Message) => void;
  onError?: (error: string) => void;
}

interface UseSendMessageResult {
  send: (content: string) => Promise<void>;
  isSending: boolean;
  error: string | null;
}

export function useSendMessage({
  groupId,
  onOptimisticAdd,
  onSuccess,
  onError,
}: UseSendMessageOptions): UseSendMessageResult {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (content: string) => {
      if (!content.trim() || isSending) return;

      setIsSending(true);
      setError(null);

      try {
        const result = await sendMessage(groupId, content);

        if (result.success && result.message) {
          onSuccess?.(result.message);
        } else {
          const errorMessage = result.error || "Failed to send message";
          setError(errorMessage);
          onError?.(errorMessage);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsSending(false);
      }
    },
    [groupId, isSending, onOptimisticAdd, onSuccess, onError]
  );

  return {
    send,
    isSending,
    error,
  };
}
