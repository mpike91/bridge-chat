/**
 * Chat Page
 *
 * Individual group conversation view.
 */

import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { GroupRepository, MessageRepository } from "@/data/repositories";
import { requireAuth } from "@/application/actions";
import { ChatView } from "@/presentation/components/chat/chat-view";
import { asGroupId, asUserId } from "@/domain/types";

interface ChatPageProps {
  params: Promise<{ groupId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { groupId } = await params;
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();

  const groupRepo = new GroupRepository(supabase);
  const messageRepo = new MessageRepository(supabase);

  // Fetch group with members
  const group = await groupRepo.getWithMembers(asGroupId(groupId));

  if (!group) {
    notFound();
  }

  // Fetch initial messages
  const messages = await messageRepo.getByGroupId(asGroupId(groupId), {
    limit: 50,
  });

  return (
    <ChatView
      group={group}
      initialMessages={messages}
      currentUserId={asUserId(user.id)}
    />
  );
}
