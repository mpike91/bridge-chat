/**
 * Send SMS Edge Function
 *
 * Sends outbound SMS to group participants.
 * Called via pg_net from a database trigger or via HTTP.
 *
 * Flow:
 * 1. Receive message ID and group ID
 * 2. Fetch group's Twilio number
 * 3. Fetch SMS participant members
 * 4. Send SMS to each participant via Twilio
 * 5. Update message with Twilio SID and status
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import { sendSms, mapTwilioStatus } from "../_shared/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendSmsRequest {
  messageId: string;
  groupId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const statusCallbackUrl = Deno.env.get("TWILIO_STATUS_CALLBACK_URL");

    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error("Twilio credentials not configured");
    }

    // Parse request
    const { messageId, groupId }: SendSmsRequest = await req.json();

    if (!messageId || !groupId) {
      return new Response("Missing messageId or groupId", {
        status: 400,
        headers: corsHeaders,
      });
    }

    console.log(`Sending SMS for message ${messageId} in group ${groupId}`);

    const supabase = createSupabaseClient();

    // Fetch the message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("content, origin, sender_user_id")
      .eq("id", messageId)
      .single();

    if (messageError || !message) {
      console.error("Message not found:", messageId);
      return new Response("Message not found", {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Only send SMS for app-origin messages
    if (message.origin !== "app") {
      console.log("Skipping SMS for non-app message");
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the group's Twilio number
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("twilio_phone_number")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      console.error("Group not found:", groupId);
      return new Response("Group not found", {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Fetch sender profile for display name
    const { data: sender } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", message.sender_user_id)
      .single();

    const senderName = sender?.display_name || "Someone";

    // Fetch SMS participant members
    const { data: members, error: membersError } = await supabase
      .from("group_members")
      .select(`
        sms_participants (
          id,
          phone_number
        )
      `)
      .eq("group_id", groupId)
      .not("sms_participant_id", "is", null);

    if (membersError) {
      throw membersError;
    }

    const smsParticipants = members
      .map((m) => m.sms_participants)
      .filter((p): p is { id: string; phone_number: string } => p !== null);

    if (smsParticipants.length === 0) {
      console.log("No SMS participants in group");
      // Update status to delivered (nothing to send)
      await supabase
        .from("messages")
        .update({ delivery_status: "delivered" })
        .eq("id", messageId);

      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format message with sender name
    const smsBody = `${senderName}: ${message.content}`;

    // Send SMS to each participant
    let firstSid: string | null = null;
    let worstStatus = "delivered";
    let sentCount = 0;

    for (const participant of smsParticipants) {
      try {
        const result = await sendSms({
          accountSid: twilioAccountSid,
          authToken: twilioAuthToken,
          from: group.twilio_phone_number,
          to: participant.phone_number,
          body: smsBody,
          statusCallback: statusCallbackUrl,
        });

        console.log(`SMS sent to ${participant.phone_number}: ${result.sid}`);

        // Track first SID for the message record
        if (!firstSid) {
          firstSid = result.sid;
        }

        // Track worst status
        const status = mapTwilioStatus(result.status);
        if (status === "failed" || status === "undelivered") {
          worstStatus = status;
        } else if (worstStatus === "delivered" && status !== "delivered") {
          worstStatus = status;
        }

        sentCount++;
      } catch (error) {
        console.error(`Failed to send SMS to ${participant.phone_number}:`, error);
        worstStatus = "failed";
      }
    }

    // Update message with Twilio SID and status
    await supabase
      .from("messages")
      .update({
        twilio_message_sid: firstSid,
        delivery_status: worstStatus,
      })
      .eq("id", messageId);

    return new Response(
      JSON.stringify({
        sent: sentCount,
        total: smsParticipants.length,
        status: worstStatus,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Send SMS error:", error);
    return new Response("Internal Server Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
