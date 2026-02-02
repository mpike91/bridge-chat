/**
 * Message Types - Discriminated Union by Origin
 *
 * Messages can originate from two sources:
 * 1. App - Sent by authenticated users through the web/mobile app
 * 2. SMS - Received from SMS participants via Twilio webhook
 *
 * Each origin has different metadata requirements, modeled as a
 * discriminated union on the `origin` field.
 */

import type {
  MessageId,
  GroupId,
  UserId,
  SmsParticipantId,
  TwilioMessageSid,
} from "./branded";

/**
 * Delivery status for outbound SMS messages.
 * Maps to Twilio's MessageStatus with our subset of relevant states.
 */
export type DeliveryStatus =
  | "pending" // Created in our system, not yet sent to Twilio
  | "queued" // Twilio accepted and queued for sending
  | "sent" // Twilio sent to carrier
  | "delivered" // Carrier confirmed delivery
  | "failed" // Twilio couldn't send (invalid number, etc.)
  | "undelivered"; // Carrier rejected (blocked, unreachable, etc.)

/**
 * Message origin discriminator
 */
export type MessageOrigin = "app" | "sms";

/**
 * Common fields shared by all message types
 */
interface BaseMessage {
  readonly id: MessageId;
  readonly groupId: GroupId;
  readonly content: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Message sent from an authenticated app user.
 * May be delivered to SMS participants in the group.
 */
export interface AppOriginMessage extends BaseMessage {
  readonly origin: "app";
  readonly senderUserId: UserId;
  /**
   * Delivery status for SMS recipients.
   * null if the group has no SMS participants.
   * For simplicity, tracks aggregate status (worst case of all recipients).
   */
  readonly deliveryStatus: DeliveryStatus | null;
  /**
   * Twilio Message SID for tracking.
   * Set after successful send to Twilio API.
   */
  readonly twilioMessageSid: TwilioMessageSid | null;
}

/**
 * Message received from an SMS participant via Twilio webhook.
 */
export interface SmsOriginMessage extends BaseMessage {
  readonly origin: "sms";
  readonly senderSmsParticipantId: SmsParticipantId;
  /**
   * Twilio's unique identifier for this inbound message.
   * Always present for SMS-origin messages.
   */
  readonly twilioMessageSid: TwilioMessageSid;
}

/**
 * Union type for any message.
 * Use the `origin` discriminator for type narrowing.
 */
export type Message = AppOriginMessage | SmsOriginMessage;

/**
 * Type guard for app-origin messages
 */
export function isAppOriginMessage(
  message: Message
): message is AppOriginMessage {
  return message.origin === "app";
}

/**
 * Type guard for SMS-origin messages
 */
export function isSmsOriginMessage(
  message: Message
): message is SmsOriginMessage {
  return message.origin === "sms";
}

/**
 * Check if a delivery status indicates a terminal failure
 */
export function isDeliveryFailed(status: DeliveryStatus): boolean {
  return status === "failed" || status === "undelivered";
}

/**
 * Check if a delivery status indicates successful delivery
 */
export function isDeliverySuccessful(status: DeliveryStatus): boolean {
  return status === "delivered";
}

/**
 * Check if a delivery status is still in progress
 */
export function isDeliveryPending(status: DeliveryStatus): boolean {
  return status === "pending" || status === "queued" || status === "sent";
}

/**
 * Input type for creating a new message from the app
 */
export interface CreateAppMessageInput {
  readonly groupId: GroupId;
  readonly senderUserId: UserId;
  readonly content: string;
}

/**
 * Input type for creating a message from an incoming SMS
 */
export interface CreateSmsMessageInput {
  readonly groupId: GroupId;
  readonly senderSmsParticipantId: SmsParticipantId;
  readonly content: string;
  readonly twilioMessageSid: TwilioMessageSid;
}
