"use client";

/**
 * Chat List Component
 *
 * Displays list of all user's groups.
 */

import { cn } from "@/lib/cn";
import { ChatListItem } from "./chat-list-item";
import type { Group, Message, GroupId } from "@/domain/types";

interface ChatListProps {
  groups: Group[];
  lastMessages: Map<GroupId, Message>;
  activeGroupId?: string;
  className?: string;
}

export function ChatList({
  groups,
  lastMessages,
  activeGroupId,
  className,
}: ChatListProps) {
  if (groups.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 text-center",
          className
        )}
      >
        <p className="text-muted-foreground mb-4">No conversations yet</p>
        <p className="text-sm text-muted-foreground">
          Create a new group to start messaging
        </p>
      </div>
    );
  }

  // Sort by last message time (most recent first)
  const sortedGroups = [...groups].sort((a, b) => {
    const aMessage = lastMessages.get(a.id as GroupId);
    const bMessage = lastMessages.get(b.id as GroupId);

    if (!aMessage && !bMessage) return 0;
    if (!aMessage) return 1;
    if (!bMessage) return -1;

    return bMessage.createdAt.getTime() - aMessage.createdAt.getTime();
  });

  return (
    <div className={cn("space-y-1 p-2", className)}>
      {sortedGroups.map((group) => (
        <ChatListItem
          key={group.id}
          group={group}
          lastMessage={lastMessages.get(group.id as GroupId)}
          isActive={group.id === activeGroupId}
        />
      ))}
    </div>
  );
}
