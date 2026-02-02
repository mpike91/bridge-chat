/**
 * Group Settings Page
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { GroupRepository } from "@/data/repositories";
import { requireAuth } from "@/application/actions";
import { PageHeader } from "@/presentation/components/layout/page-header";
import { AddParticipantForm } from "@/presentation/components/groups/add-participant-form";
import { Button } from "@/presentation/components/ui/button";
import { Avatar } from "@/presentation/components/ui/avatar";
import { Badge } from "@/presentation/components/ui/badge";
import { asGroupId } from "@/domain/types";
import { formatPhoneForDisplay } from "@/domain/validators";

interface GroupSettingsPageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupSettingsPage({
  params,
}: GroupSettingsPageProps) {
  const { groupId } = await params;
  await requireAuth();
  const supabase = await createServerSupabaseClient();

  const groupRepo = new GroupRepository(supabase);
  const group = await groupRepo.getWithMembers(asGroupId(groupId));

  if (!group) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Group Settings"
        actions={
          <Link href={`/chats/${groupId}`}>
            <Button variant="ghost" size="sm">
              Done
            </Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Group Info */}
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar fallback={group.name} size="lg" />
            <div>
              <h2 className="text-lg font-semibold">{group.name}</h2>
              <p className="text-sm text-muted-foreground">
                Twilio: {formatPhoneForDisplay(group.twilioPhoneNumber)}
              </p>
            </div>
          </div>
        </section>

        {/* Members */}
        <section className="space-y-4">
          <h3 className="font-medium">Members ({group.members.length})</h3>

          <div className="space-y-2">
            {group.members.map((member) => (
              <div
                key={
                  member.participant.kind === "app_user"
                    ? member.participant.id
                    : member.participant.id
                }
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
              >
                <Avatar
                  src={
                    member.participant.kind === "app_user"
                      ? member.participant.avatarUrl
                      : null
                  }
                  fallback={member.participant.displayName}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {member.participant.displayName}
                  </p>
                  {member.participant.kind === "sms_participant" && (
                    <p className="text-sm text-muted-foreground">
                      {formatPhoneForDisplay(member.participant.phoneNumber)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {member.role !== "member" && (
                    <Badge variant="secondary">{member.role}</Badge>
                  )}
                  {member.participant.kind === "sms_participant" && (
                    <Badge variant="outline">SMS</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Add SMS Participant */}
        <section className="space-y-4">
          <h3 className="font-medium">Add SMS Participant</h3>
          <AddParticipantForm groupId={groupId} />
        </section>
      </div>
    </div>
  );
}
