/**
 * Domain Validators - Public API
 *
 * Pure validation functions with no external dependencies.
 * Used for input validation before data enters the system.
 */

export type { ValidationResult } from "./phone";

export {
  validateE164PhoneNumber,
  normalizeToE164,
  isValidE164,
  formatPhoneForDisplay,
  maskPhoneNumber,
} from "./phone";

export {
  validateMessageContent,
  sanitizeForSms,
  estimateSmsSegments,
  isGsm7Compatible,
  truncateMessage,
  getMessagePreview,
  MAX_MESSAGE_LENGTH,
  MIN_MESSAGE_LENGTH,
} from "./message";
