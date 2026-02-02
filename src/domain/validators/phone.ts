/**
 * Phone Number Validation
 *
 * E.164 is the international standard format for phone numbers:
 * - Starts with +
 * - Country code (1-3 digits)
 * - Subscriber number
 * - Total 8-15 digits (not counting the +)
 *
 * Examples: +14155551234, +442071234567, +81312345678
 */

import { type E164PhoneNumber, asE164PhoneNumber } from "../types/branded";

/**
 * Strict E.164 format regex.
 * Allows 8-15 digits after the + sign.
 */
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

/**
 * Result type for validation operations
 */
export type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; error: string };

/**
 * Validates and returns an E.164 formatted phone number.
 * Returns a validation result with either the branded type or an error.
 */
export function validateE164PhoneNumber(
  input: string
): ValidationResult<E164PhoneNumber> {
  const trimmed = input.trim();

  if (!trimmed) {
    return { success: false, error: "Phone number is required" };
  }

  if (!trimmed.startsWith("+")) {
    return {
      success: false,
      error: "Phone number must start with + (E.164 format)",
    };
  }

  if (!E164_REGEX.test(trimmed)) {
    return {
      success: false,
      error: "Invalid phone number format. Expected E.164 format (e.g., +14155551234)",
    };
  }

  return { success: true, value: asE164PhoneNumber(trimmed) };
}

/**
 * Attempts to normalize a phone number to E.164 format.
 * Handles common input formats and converts to E.164.
 *
 * Supported input formats:
 * - E.164: +14155551234 (returned as-is)
 * - US 10-digit: 4155551234 (assumes +1)
 * - US with 1: 14155551234 (adds +)
 * - Parentheses/dashes: (415) 555-1234 (strips formatting)
 *
 * @param input - Raw phone number input
 * @param defaultCountryCode - Country code to use if not present (default: "1" for US)
 */
export function normalizeToE164(
  input: string,
  defaultCountryCode: string = "1"
): ValidationResult<E164PhoneNumber> {
  // Strip all non-digit characters except leading +
  const hasPlus = input.trim().startsWith("+");
  const digits = input.replace(/\D/g, "");

  if (!digits) {
    return { success: false, error: "Phone number contains no digits" };
  }

  let normalized: string;

  if (hasPlus) {
    // Already has +, just reconstruct
    normalized = `+${digits}`;
  } else if (digits.length === 10 && defaultCountryCode === "1") {
    // US 10-digit number
    normalized = `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    // US 11-digit with leading 1
    normalized = `+${digits}`;
  } else {
    // Try with default country code
    normalized = `+${defaultCountryCode}${digits}`;
  }

  return validateE164PhoneNumber(normalized);
}

/**
 * Type guard that validates and narrows to E164PhoneNumber.
 * Useful in conditional contexts.
 */
export function isValidE164(input: string): input is E164PhoneNumber {
  return E164_REGEX.test(input.trim());
}

/**
 * Formats an E.164 number for display.
 * Currently supports US numbers; extend for international.
 */
export function formatPhoneForDisplay(phone: E164PhoneNumber): string {
  // US number formatting: +1 (415) 555-1234
  if (phone.startsWith("+1") && phone.length === 12) {
    const area = phone.slice(2, 5);
    const prefix = phone.slice(5, 8);
    const line = phone.slice(8, 12);
    return `+1 (${area}) ${prefix}-${line}`;
  }

  // For other countries, just add spaces for readability
  return phone.replace(/(\+\d{1,3})(\d{3})(\d+)/, "$1 $2 $3");
}

/**
 * Masks a phone number for privacy (e.g., +1 (***) ***-1234)
 */
export function maskPhoneNumber(phone: E164PhoneNumber): string {
  if (phone.length < 8) return phone;
  const lastFour = phone.slice(-4);
  const masked = phone.slice(0, -4).replace(/\d/g, "*");
  return masked + lastFour;
}
