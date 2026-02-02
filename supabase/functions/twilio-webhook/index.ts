/**
 * Twilio Webhook Edge Function
 *
 * Handles incoming SMS messages from Twilio.
 *
 * Flow:
 * 1. Validate Twilio signature
 * 2. Parse SMS payload (From, To, Body)
 * 3. Find group by Twilio number (To field)
 * 4. Find or create SMS participant by phone (From field)
 * 5. Insert message with origin='sms'
 * 6. Return empty TwiML
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import {
  validateTwilioSignature,
  parseFormBody,
  emptyTwimlResponse,
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
    const webhookUrl = Deno.env.get("TWILIO_WEBHOOK_URL") || req.url;

    if (Deno.env.get("ENVIRONMENT") !== "development") {
      if (!validateTwilioSignature(signature, webhookUrl, params, twilioAuthToken)) {
        console.error("Invalid Twilio signature");
        return new Response("Unauthorized", { status: 401 });
      }
    }

    // Extract SMS fields
    const from = params.From; // Sender phone (E.164)
    const to = params.To; // Our Twilio number (E.164)
    const messageBody = params.Body || "";
    const twilioMessageSid = params.MessageSid;

    if (!from || !to || !twilioMessageSid) {
      console.error("Missing required SMS fields", { from, to, twilioMessageSid });
      return new Response("Bad Request", { status: 400 });
    }

    console.log(`Incoming SMS: ${from} -> ${to}: ${messageBody.substring(0, 50)}...`);

    // Initialize Supabase client with service role
    const supabase = createSupabaseClient();

    // Find group by Twilio number
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("id")
      .eq("twilio_phone_number", to)
      .single();

    if (groupError || !group) {
      console.error("Group not found for Twilio number:", to);
      // Return 200 to acknowledge - Twilio will retry on non-2xx
      return emptyTwimlResponse();
    }

    // Find SMS participant by phone
    let { data: smsParticipant, error: participantError } = await supabase
      .from("sms_participants")
      .select("id")
      .eq("phone_number", from)
      .single();

    if (participantError && participantError.code !== "PGRST116") {
      throw participantError;
    }

    // If participant doesn't exist, we can't process the message
    // (they need to be added by an app user first)
    if (!smsParticipant) {
      console.log(`Unknown sender ${from} - participant not registered`);
      // Could optionally create a "pending" record or notify group admins
      return emptyTwimlResponse();
    }

    // Check if participant is a member of this group
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", group.id)
      .eq("sms_participant_id", smsParticipant.id)
      .single();

    if (membershipError || !membership) {
      console.log(`SMS participant ${from} is not a member of group ${group.id}`);
      return emptyTwimlResponse();
    }

    // Insert the message
    const { error: insertError } = await supabase.from("messages").insert({
      group_id: group.id,
      origin: "sms",
      content: messageBody,
      sender_sms_participant_id: smsParticipant.id,
      twilio_message_sid: twilioMessageSid,
    });

    if (insertError) {
      console.error("Failed to insert message:", insertError);
      throw insertError;
    }

    console.log(`Message inserted for group ${group.id}`);

    // Return empty TwiML (no auto-reply)
    return emptyTwimlResponse();
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal Server Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
