/**
 * Chats List Page
 */

import { Suspense } from "react";
import Link from "next/link";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { GroupRepository, MessageRepository } from "@/data/repositories";
import { requireAuth } from "@/application/actions";
import { PageHeader } from "@/presentation/components/layout/page-header";
import { ChatList } from "@/presentation/components/groups/chat-list";
import { Button } from "@/presentation/components/ui/button";
import { Spinner } from "@/presentation/components/ui/spinner";
import type { GroupId } from "@/domain/types";

export default async function ChatsPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Chats"
        actions={
          <Link href="/chats/new">
            <Button size="sm">New Group</Button>
          </Link>
        }
      />

      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <Spinner />
          </div>
        }
      >
        <ChatsListContent />
      </Suspense>
    </div>
  );
}

async function ChatsListContent() {
  await requireAuth();
  const supabase = await createServerSupabaseClient();

  const groupRepo = new GroupRepository(supabase);
  const messageRepo = new MessageRepository(supabase);

  const groups = await groupRepo.getMyGroups();
  const lastMessages = await messageRepo.getLatestByGroups(
    groups.map((g) => g.id as GroupId)
  );

  return (
    <ChatList
      groups={groups}
      lastMessages={lastMessages}
      className="flex-1 overflow-y-auto"
    />
  );
}
