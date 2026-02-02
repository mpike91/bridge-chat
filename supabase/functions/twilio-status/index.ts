/**
 * Twilio Status Callback Edge Function
 *
 * Handles delivery status updates from Twilio.
 *
 * Flow:
 * 1. Validate Twilio signature
 * 2. Parse status callback payload
 * 3. Find message by Twilio SID
 * 4. Update message delivery status
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import {
  validateTwilioSignature,
  parseFormBody,
  mapTwilioStatus,
} from "../_shared/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Twilio auth token for signature validation
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!twilioAuthToken) {
      console.error("TWILIO_AUTH_TOKEN not configured");
      return new Response("Server configuration error", { status: 500 });
    }

    // Parse request
    const body = await req.text();
    const params = parseFormBody(body);

    // Validate Twilio signature (skip in development)
    const signature = req.headers.get("x-twilio-signature") || "";
    const webhookUrl = Deno.env.get("TWILIO_STATUS_CALLBACK_URL") || req.url;

    if (Deno.env.get("ENVIRONMENT") !== "development") {
      if (!validateTwilioSignature(signature, webhookUrl, params, twilioAuthToken)) {
        console.error("Invalid Twilio signature");
        return new Response("Unauthorized", { status: 401 });
      }
    }

    // Extract status callback fields
    const messageSid = params.MessageSid;
    const messageStatus = params.MessageStatus;
    const errorCode = params.ErrorCode;
    const errorMessage = params.ErrorMessage;

    if (!messageSid || !messageStatus) {
      console.error("Missing required status fields", { messageSid, messageStatus });
      return new Response("Bad Request", { status: 400 });
    }

    console.log(`Status update: ${messageSid} -> ${messageStatus}`);

    if (errorCode) {
      console.log(`Error: ${errorCode} - ${errorMessage}`);
    }

    // Map Twilio status to our enum
    const deliveryStatus = mapTwilioStatus(messageStatus);

    // Update message in database
    const supabase = createSupabaseClient();

    const { data: message, error: findError } = await supabase
      .from("messages")
      .select("id")
      .eq("twilio_message_sid", messageSid)
      .single();

    if (findError || !message) {
      // Message not found - might be a duplicate or old message
      console.log(`Message not found for SID ${messageSid}`);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Update the status
    const { error: updateError } = await supabase
      .from("messages")
      .update({ delivery_status: deliveryStatus })
      .eq("id", message.id);

    if (updateError) {
      console.error("Failed to update message status:", updateError);
      throw updateError;
    }

    console.log(`Updated message ${message.id} to status ${deliveryStatus}`);

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Status callback error:", error);
    return new Response("Internal Server Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
