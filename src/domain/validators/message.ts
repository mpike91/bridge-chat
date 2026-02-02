/**
 * Message Validation
 *
 * Validates message content before sending. Enforces:
 * - Content length limits
 * - Character encoding compatibility with SMS
 * - Basic sanitization
 */

import type { ValidationResult } from "./phone";

/**
 * Maximum message length.
 * SMS limit is 160 chars for GSM-7, 70 for UCS-2.
 * We allow longer messages (Twilio will segment them).
 */
export const MAX_MESSAGE_LENGTH = 1600;

/**
 * Minimum message length (empty messages not allowed)
 */
export const MIN_MESSAGE_LENGTH = 1;

/**
 * Characters that might cause issues in SMS
 * (smart quotes, special Unicode, etc.)
 */
const PROBLEMATIC_CHARS: Record<string, string> = {
  "\u2018": "'", // Left single quote
  "\u2019": "'", // Right single quote
  "\u201C": '"', // Left double quote
  "\u201D": '"', // Right double quote
  "\u2013": "-", // En dash
  "\u2014": "-", // Em dash
  "\u2026": "...", // Ellipsis
};

/**
 * Validates message content for sending.
 */
export function validateMessageContent(
  content: string
): ValidationResult<string> {
  if (!content || content.trim().length === 0) {
    return { success: false, error: "Message cannot be empty" };
  }

  const trimmed = content.trim();

  if (trimmed.length < MIN_MESSAGE_LENGTH) {
    return { success: false, error: "Message is too short" };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      success: false,
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
    };
  }

  return { success: true, value: trimmed };
}

/**
 * Sanitizes message content for SMS delivery.
 * Replaces problematic Unicode characters with ASCII equivalents.
 */
export function sanitizeForSms(content: string): string {
  let sanitized = content;

  for (const [unicode, ascii] of Object.entries(PROBLEMATIC_CHARS)) {
    sanitized = sanitized.replace(new RegExp(unicode, "g"), ascii);
  }

  // Remove null bytes and other control characters (except newlines)
  sanitized = sanitized.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return sanitized;
}

/**
 * Estimates SMS segment count for a message.
 * GSM-7 encoding: 160 chars per segment (or 153 for multi-part)
 * UCS-2 encoding: 70 chars per segment (or 67 for multi-part)
 */
export function estimateSmsSegments(content: string): number {
  const isGsm7 = isGsm7Compatible(content);

  if (isGsm7) {
    if (content.length <= 160) return 1;
    return Math.ceil(content.length / 153);
  } else {
    if (content.length <= 70) return 1;
    return Math.ceil(content.length / 67);
  }
}

/**
 * Checks if content can be encoded in GSM-7 (7-bit) encoding.
 * GSM-7 is more efficient but supports limited characters.
 */
export function isGsm7Compatible(content: string): boolean {
  // GSM-7 basic character set
  const gsm7Chars =
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ" +
    '!"#¤%&\'()*+,-./0123456789:;<=>?' +
    "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§" +
    "¿abcdefghijklmnopqrstuvwxyzäöñüà";

  // GSM-7 extension characters (count as 2)
  const gsm7Extension = "^{}\\[~]|€";

  for (const char of content) {
    if (!gsm7Chars.includes(char) && !gsm7Extension.includes(char)) {
      return false;
    }
  }

  return true;
}

/**
 * Truncates a message to fit within segment limits.
 * Adds ellipsis if truncated.
 */
export function truncateMessage(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength - 3) + "...";
}

/**
 * Extracts a preview snippet from message content.
 * Useful for notification previews.
 */
export function getMessagePreview(content: string, maxLength: number = 50): string {
  const singleLine = content.replace(/\n+/g, " ").trim();
  return truncateMessage(singleLine, maxLength);
}
