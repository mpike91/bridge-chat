/**
 * Shared Twilio Utilities for Edge Functions
 *
 * Provides signature validation and API client helpers.
 */

import { createHmac } from "node:crypto";

/**
 * Validates Twilio webhook signature using HMAC-SHA1.
 *
 * Twilio signs requests with your Auth Token to prove authenticity.
 * The signature is computed over: webhook URL + sorted POST params.
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
  authToken: string
): boolean {
  // Sort params alphabetically and concatenate
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => key + params[key])
    .join("");

  // Create HMAC-SHA1 of url + params
  const expectedSignature = createHmac("sha1", authToken)
    .update(url + sortedParams)
    .digest("base64");

  return signature === expectedSignature;
}

/**
 * Parses form-urlencoded body (Twilio's default format).
 */
export function parseFormBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  const pairs = body.split("&");

  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (key && value !== undefined) {
      params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, " "));
    }
  }

  return params;
}

/**
 * Creates an empty TwiML response.
 * Used for webhook acknowledgment without sending a reply.
 */
export function emptyTwimlResponse(): Response {
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    {
      headers: { "Content-Type": "application/xml" },
    }
  );
}

/**
 * Creates basic auth header for Twilio API.
 */
export function createTwilioAuthHeader(
  accountSid: string,
  authToken: string
): string {
  const credentials = btoa(`${accountSid}:${authToken}`);
  return `Basic ${credentials}`;
}

/**
 * Sends an SMS via Twilio API.
 */
export async function sendSms(options: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
  statusCallback?: string;
}): Promise<{ sid: string; status: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${options.accountSid}/Messages.json`;

  const params = new URLSearchParams({
    From: options.from,
    To: options.to,
    Body: options.body,
  });

  if (options.statusCallback) {
    params.append("StatusCallback", options.statusCallback);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: createTwilioAuthHeader(options.accountSid, options.authToken),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return { sid: data.sid, status: data.status };
}

/**
 * Maps Twilio message status to our DeliveryStatus enum.
 */
export function mapTwilioStatus(
  twilioStatus: string
): "pending" | "queued" | "sent" | "delivered" | "failed" | "undelivered" {
  switch (twilioStatus.toLowerCase()) {
    case "accepted":
    case "queued":
    case "sending":
      return "queued";
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "failed":
      return "failed";
    case "undelivered":
      return "undelivered";
    default:
      return "pending";
  }
}
