"use client";

/**
 * Chat Header Component
 *
 * Shows group name, member count, and actions.
 */

import Link from "next/link";
import { cn } from "@/lib/cn";
import { Button } from "../ui/button";
import { Avatar } from "../ui/avatar";
import type { GroupWithMembers } from "@/domain/types";

interface ChatHeaderProps {
  group: GroupWithMembers;
  className?: string;
}

export function ChatHeader({ group, className }: ChatHeaderProps) {
  const memberCount = group.members.length;
  const smsCount = group.members.filter(
    (m) => m.participant.kind === "sms_participant"
  ).length;

  return (
    <header
      className={cn(
        "flex items-center gap-4 p-4 border-b bg-background",
        className
      )}
    >
      {/* Back button */}
      <Link href="/chats">
        <Button variant="ghost" size="icon">
          <ChevronLeftIcon className="h-5 w-5" />
        </Button>
      </Link>

      {/* Group avatar */}
      <Avatar fallback={group.name} size="md" />

      {/* Group info */}
      <div className="flex-1 min-w-0">
        <h1 className="font-semibold truncate">{group.name}</h1>
        <p className="text-sm text-muted-foreground">
          {memberCount} member{memberCount !== 1 ? "s" : ""}
          {smsCount > 0 && ` · ${smsCount} via SMS`}
        </p>
      </div>

      {/* Actions */}
      <Link href={`/chats/${group.id}/settings`}>
        <Button variant="ghost" size="icon">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </Link>
    </header>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 18L9 12L15 6" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" />
    </svg>
  );
}
