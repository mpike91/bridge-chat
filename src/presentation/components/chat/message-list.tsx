"use client";

/**
 * Message List Component
 *
 * Displays a scrollable list of messages with realtime updates.
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { MessageBubble } from "./message-bubble";
import type { Message, Participant, UserId } from "@/domain/types";

interface MessageListProps {
  messages: Message[];
  participants: Map<string, Participant>;
  currentUserId: UserId;
  className?: string;
}

export function MessageList({
  messages,
  participants,
  currentUserId,
  className,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div
        className={cn(
          "flex-1 flex items-center justify-center text-muted-foreground",
          className
        )}
      >
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  // Group consecutive messages from same sender
  const groupedMessages = groupMessagesBySender(messages);

  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto p-4 space-y-4 chat-scroll",
        className
      )}
    >
      {groupedMessages.map((group, groupIndex) => (
        <div key={group[0].id} className="space-y-1">
          {group.map((message, messageIndex) => {
            const senderId =
              message.origin === "app"
                ? message.senderUserId
                : message.senderSmsParticipantId;
            const sender = participants.get(senderId) || null;

            return (
              <MessageBubble
                key={message.id}
                message={message}
                sender={sender}
                currentUserId={currentUserId}
                showSender={messageIndex === 0}
              />
            );
          })}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

/**
 * Groups consecutive messages from the same sender.
 */
function groupMessagesBySender(messages: Message[]): Message[][] {
  const groups: Message[][] = [];
  let currentGroup: Message[] = [];
  let currentSenderId: string | null = null;

  for (const message of messages) {
    const senderId =
      message.origin === "app"
        ? message.senderUserId
        : message.senderSmsParticipantId;

    if (senderId !== currentSenderId) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [message];
      currentSenderId = senderId;
    } else {
      currentGroup.push(message);
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}
