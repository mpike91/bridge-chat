"use server";

/**
 * Message Server Actions
 *
 * Handles sending messages and triggering SMS delivery.
 */

import { revalidatePath } from "next/cache";
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from "@/data/supabase/server";
import { MessageRepository, GroupRepository } from "@/data/repositories";
import { asUserId, asGroupId, type Message } from "@/domain/types";
import { validateMessageContent, sanitizeForSms } from "@/domain/validators";
import { requireAuth } from "./auth-actions";

export interface SendMessageResult {
  success: boolean;
  error?: string;
  message?: Message;
}

/**
 * Send a message to a group.
 * Triggers SMS delivery to SMS participants.
 */
export async function sendMessage(
  groupId: string,
  content: string
): Promise<SendMessageResult> {
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();
  const messageRepo = new MessageRepository(supabase);
  const groupRepo = new GroupRepository(supabase);

  // Validate content
  const validationResult = validateMessageContent(content);
  if (!validationResult.success) {
    return { success: false, error: validationResult.error };
  }

  // Sanitize for SMS compatibility
  const sanitizedContent = sanitizeForSms(validationResult.value);

  try {
    // Check user is a member
    const isMember = await groupRepo.isMember(
      asGroupId(groupId),
      asUserId(user.id)
    );
    if (!isMember) {
      return { success: false, error: "You are not a member of this group" };
    }

    // Create the message
    const message = await messageRepo.createAppMessage({
      groupId: asGroupId(groupId),
      senderUserId: asUserId(user.id),
      content: sanitizedContent,
    });

    // Trigger SMS delivery via edge function
    // In production, this would be done via pg_net trigger
    // For now, we'll call the edge function directly
    await triggerSmsDelivery(message.id, groupId);

    revalidatePath(`/chats/${groupId}`);

    return { success: true, message };
  } catch (error) {
    console.error("Send message error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send message",
    };
  }
}

/**
 * Trigger SMS delivery for a message.
 * Checks for SMS participants first - if none, marks as delivered directly.
 * Otherwise calls the send-sms edge function.
 */
async function triggerSmsDelivery(
  messageId: string,
  groupId: string
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const groupRepo = new GroupRepository(supabase);

  // Use service client for delivery status updates (bypasses RLS)
  let serviceClient: ReturnType<typeof createServiceSupabaseClient> | null = null;
  try {
    serviceClient = createServiceSupabaseClient();
  } catch {
    // Service key not configured - fall back to marking as delivered
    console.warn("Service role key not configured, cannot update delivery status");
  }

  const updateDeliveryStatus = async (status: "delivered" | "failed") => {
    if (serviceClient) {
      await serviceClient
        .from("messages")
        .update({ delivery_status: status })
        .eq("id", messageId);
    }
  };

  try {
    // Check if there are SMS participants in this group
    const smsMembers = await groupRepo.getSmsMembers(asGroupId(groupId));

    if (smsMembers.length === 0) {
      // No SMS participants - mark as delivered immediately
      console.log("No SMS participants in group, marking as delivered");
      await updateDeliveryStatus("delivered");
      return;
    }

    // There are SMS participants - call our local SMS API
    // Use absolute URL for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/send-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messageId, groupId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SMS delivery failed:", response.status, errorText);
      // Mark as failed if API fails
      await updateDeliveryStatus("failed");
    } else {
      const result = await response.json();
      console.log("SMS delivery result:", result);
    }
  } catch (error) {
    console.error("SMS delivery trigger error:", error);
    // Mark as failed on error
    try {
      await updateDeliveryStatus("failed");
    } catch (updateError) {
      console.error("Failed to update delivery status:", updateError);
    }
  }
}

/**
 * Get messages for a group with pagination.
 */
export async function getGroupMessages(
  groupId: string,
  options?: { limit?: number; before?: string }
): Promise<Message[]> {
  await requireAuth();
  const supabase = await createServerSupabaseClient();
  const messageRepo = new MessageRepository(supabase);

  return messageRepo.getByGroupId(asGroupId(groupId), {
    limit: options?.limit,
    before: options?.before ? new Date(options.before) : undefined,
  });
}
