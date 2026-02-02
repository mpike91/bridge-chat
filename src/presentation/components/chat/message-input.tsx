"use client";

/**
 * Message Input Component
 *
 * Text input with send button for composing messages.
 */

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { Button } from "../ui/button";
import { MAX_MESSAGE_LENGTH } from "@/lib/constants";

interface MessageInputProps {
  onSend: (content: string) => void;
  isSending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MessageInput({
  onSend,
  isSending = false,
  disabled = false,
  placeholder = "Type a message...",
  className,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [content]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (content.trim() && !isSending && !disabled) {
      onSend(content.trim());
      setContent("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isOverLimit = content.length > MAX_MESSAGE_LENGTH;
  const charsRemaining = MAX_MESSAGE_LENGTH - content.length;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex items-end gap-2 p-4 border-t bg-background", className)}
    >
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          rows={1}
          className={cn(
            "w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            { "border-destructive": isOverLimit }
          )}
        />

        {/* Character count warning */}
        {content.length > MAX_MESSAGE_LENGTH * 0.9 && (
          <span
            className={cn(
              "absolute right-2 bottom-2 text-xs",
              isOverLimit ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {charsRemaining}
          </span>
        )}
      </div>

      <Button
        type="submit"
        disabled={!content.trim() || isSending || disabled || isOverLimit}
        size="icon"
        className="flex-shrink-0"
      >
        {isSending ? (
          <span className="animate-pulse">...</span>
        ) : (
          <SendIcon className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
}

function SendIcon({ className }: { className?: string }) {
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
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}
