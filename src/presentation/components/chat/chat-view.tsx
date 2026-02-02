"use client";

/**
 * Chat View Component
 *
 * Main chat interface combining header, message list, and input.
 */

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { useRealtimeMessages, useSendMessage } from "@/application/hooks";
import type { Message, GroupWithMembers, Participant, UserId } from "@/domain/types";

interface ChatViewProps {
  group: GroupWithMembers;
  initialMessages: Message[];
  currentUserId: UserId;
  className?: string;
}

export function ChatView({
  group,
  initialMessages,
  currentUserId,
  className,
}: ChatViewProps) {
  // Realtime messages
  const { messages, isConnected, error } = useRealtimeMessages({
    groupId: group.id,
    initialMessages,
  });

  // Send message
  const { send, isSending, error: sendError } = useSendMessage({
    groupId: group.id,
  });

  // Build participants map
  const participants = useMemo(() => {
    const map = new Map<string, Participant>();
    for (const member of group.members) {
      const id =
        member.participant.kind === "app_user"
          ? member.participant.id
          : member.participant.id;
      map.set(id, member.participant);
    }
    return map;
  }, [group.members]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <ChatHeader group={group} />

      {/* Connection status */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm text-center">
          Connection error. Trying to reconnect...
        </div>
      )}

      <MessageList
        messages={messages}
        participants={participants}
        currentUserId={currentUserId}
        className="flex-1"
      />

      {/* Send error */}
      {sendError && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm text-center">
          {sendError}
        </div>
      )}

      <MessageInput
        onSend={send}
        isSending={isSending}
        placeholder={`Message ${group.name}`}
      />
    </div>
  );
}
