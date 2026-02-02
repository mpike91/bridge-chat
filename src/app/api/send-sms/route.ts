/**
 * Send SMS API Route
 *
 * Sends outbound SMS to group participants via Twilio.
 * This is a simpler alternative to Supabase Edge Functions for local development.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/data/supabase/server";

interface SendSmsRequest {
  messageId: string;
  groupId: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get Twilio credentials from environment
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

    if (!twilioAccountSid || !twilioAuthToken) {
      console.error("Twilio credentials not configured");
      return NextResponse.json(
        { error: "Twilio credentials not configured" },
        { status: 500 }
      );
    }

    // Parse request
    const { messageId, groupId }: SendSmsRequest = await request.json();

    if (!messageId || !groupId) {
      return NextResponse.json(
        { error: "Missing messageId or groupId" },
        { status: 400 }
      );
    }

    console.log(`Sending SMS for message ${messageId} in group ${groupId}`);

    // Use service client to bypass RLS
    const supabase = createServiceSupabaseClient();

    // Fetch the message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("content, origin, sender_user_id")
      .eq("id", messageId)
      .single();

    if (messageError || !message) {
      console.error("Message not found:", messageId, messageError);
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Only send SMS for app-origin messages
    if (message.origin !== "app") {
      console.log("Skipping SMS for non-app message");
      return NextResponse.json({ skipped: true });
    }

    // Fetch the group's Twilio number
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("twilio_phone_number")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      console.error("Group not found:", groupId, groupError);
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
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
      console.error("Error fetching members:", membersError);
      throw membersError;
    }

    const smsParticipants = (members || [])
      .map((m: { sms_participants: { id: string; phone_number: string } | null }) => m.sms_participants)
      .filter((p): p is { id: string; phone_number: string } => p !== null);

    if (smsParticipants.length === 0) {
      console.log("No SMS participants in group");
      // Update status to delivered (nothing to send)
      await supabase
        .from("messages")
        .update({ delivery_status: "delivered" })
        .eq("id", messageId);

      return NextResponse.json({ sent: 0, message: "No SMS participants" });
    }

    // Format message with sender name
    const smsBody = `${senderName}: ${message.content}`;

    // Send SMS to each participant using Twilio REST API
    let firstSid: string | null = null;
    let worstStatus = "delivered";
    let sentCount = 0;

    for (const participant of smsParticipants) {
      try {
        console.log(`Sending SMS to ${participant.phone_number}...`);

        // Call Twilio API directly
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

        const formData = new URLSearchParams();
        formData.append("To", participant.phone_number);
        formData.append("From", group.twilio_phone_number);
        formData.append("Body", smsBody);

        const twilioResponse = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        const twilioResult = await twilioResponse.json();

        if (!twilioResponse.ok) {
          console.error("Twilio error:", twilioResult);
          worstStatus = "failed";
          continue;
        }

        console.log(`SMS sent to ${participant.phone_number}: ${twilioResult.sid}`);

        // Track first SID for the message record
        if (!firstSid) {
          firstSid = twilioResult.sid;
        }

        // Map Twilio status
        const status = mapTwilioStatus(twilioResult.status);
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

    console.log(`SMS delivery complete: ${sentCount}/${smsParticipants.length} sent, status: ${worstStatus}`);

    return NextResponse.json({
      sent: sentCount,
      total: smsParticipants.length,
      status: worstStatus,
    });
  } catch (error) {
    console.error("Send SMS error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function mapTwilioStatus(twilioStatus: string): string {
  const statusMap: Record<string, string> = {
    queued: "queued",
    sending: "queued",
    sent: "sent",
    delivered: "delivered",
    undelivered: "undelivered",
    failed: "failed",
  };
  return statusMap[twilioStatus] || "pending";
}
