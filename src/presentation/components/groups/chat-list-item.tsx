"use client";

/**
 * Chat List Item Component
 *
 * A single row in the chat list showing group preview.
 */

import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatChatListTime } from "@/lib/date";
import { getMessagePreview } from "@/domain/validators";
import { Avatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import type { Group, Message } from "@/domain/types";

interface ChatListItemProps {
  group: Group;
  lastMessage?: Message | null;
  unreadCount?: number;
  isActive?: boolean;
  className?: string;
}

export function ChatListItem({
  group,
  lastMessage,
  unreadCount = 0,
  isActive = false,
  className,
}: ChatListItemProps) {
  return (
    <Link
      href={`/chats/${group.id}`}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-colors",
        "hover:bg-accent",
        isActive && "bg-accent",
        className
      )}
    >
      {/* Group avatar */}
      <Avatar fallback={group.name} size="lg" />

      {/* Group info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium truncate">{group.name}</h3>
          {lastMessage && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatChatListTime(lastMessage.createdAt)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground truncate">
            {lastMessage ? (
              <>
                {lastMessage.origin === "sms" && (
                  <span className="text-primary">SMS: </span>
                )}
                {getMessagePreview(lastMessage.content)}
              </>
            ) : (
              <span className="italic">No messages yet</span>
            )}
          </p>

          {unreadCount > 0 && (
            <Badge className="flex-shrink-0">{unreadCount}</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
