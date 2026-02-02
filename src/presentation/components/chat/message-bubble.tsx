"use client";

/**
 * Message Bubble Component
 *
 * Renders a single message with origin-based styling.
 * App messages appear on the right, SMS messages on the left.
 */

import { cn } from "@/lib/cn";
import { formatMessageTime } from "@/lib/date";
import { Avatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import type { Message, AppUser, SmsParticipant, UserId, DeliveryStatus } from "@/domain/types";
import { isAppOriginMessage, isDeliveryFailed, isDeliveryPending } from "@/domain/types";

interface MessageBubbleProps {
  message: Message;
  sender: AppUser | SmsParticipant | null;
  currentUserId: UserId;
  showSender?: boolean;
}

export function MessageBubble({
  message,
  sender,
  currentUserId,
  showSender = true,
}: MessageBubbleProps) {
  const isOwn = isAppOriginMessage(message) && message.senderUserId === currentUserId;
  const isFromSms = !isAppOriginMessage(message);

  return (
    <div
      className={cn("flex gap-2 max-w-[85%]", {
        "ml-auto flex-row-reverse": isOwn,
        "mr-auto": !isOwn,
      })}
    >
      {/* Avatar */}
      {showSender && !isOwn && sender && (
        <Avatar
          src={sender.kind === "app_user" ? sender.avatarUrl : null}
          fallback={sender.displayName}
          size="sm"
          className="flex-shrink-0 mt-1"
        />
      )}

      {/* Message content */}
      <div className={cn("flex flex-col", { "items-end": isOwn })}>
        {/* Sender name */}
        {showSender && !isOwn && sender && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground">
              {sender.displayName}
            </span>
            {isFromSms && (
              <Badge variant="secondary" className="text-xs">
                SMS
              </Badge>
            )}
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2 break-words",
            {
              "bg-primary text-primary-foreground rounded-tr-sm": isOwn,
              "bg-secondary text-secondary-foreground rounded-tl-sm": !isOwn,
            }
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Timestamp and status */}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{formatMessageTime(message.createdAt)}</span>

          {/* Delivery status for own messages */}
          {isOwn && isAppOriginMessage(message) && message.deliveryStatus && (
            <DeliveryStatusIndicator status={message.deliveryStatus} />
          )}
        </div>
      </div>
    </div>
  );
}

function DeliveryStatusIndicator({
  status,
}: {
  status: DeliveryStatus;
}) {
  if (isDeliveryPending(status)) {
    return <span className="text-muted-foreground">Sending...</span>;
  }

  if (isDeliveryFailed(status)) {
    return <span className="text-destructive">Failed</span>;
  }

  if (status === "delivered") {
    return (
      <span className="text-green-600 dark:text-green-400">✓ Delivered</span>
    );
  }

  if (status === "sent") {
    return <span className="text-muted-foreground">✓ Sent</span>;
  }

  return null;
}
