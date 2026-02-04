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
import {
  RemoveMemberButton,
  AddAppUserForm,
  EditTwilioNumberForm,
  DeleteGroupButton,
} from "@/presentation/components/groups/group-settings-client";
import { Button } from "@/presentation/components/ui/button";
import { Avatar } from "@/presentation/components/ui/avatar";
import { Badge } from "@/presentation/components/ui/badge";
import { asGroupId, asUserId } from "@/domain/types";
import { formatPhoneForDisplay } from "@/domain/validators";

interface GroupSettingsPageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupSettingsPage({
  params,
}: GroupSettingsPageProps) {
  const { groupId } = await params;
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();

  const groupRepo = new GroupRepository(supabase);
  const group = await groupRepo.getWithMembers(asGroupId(groupId));

  if (!group) {
    notFound();
  }

  // Get current user's role
  const currentUserRole = await groupRepo.getUserRole(
    asGroupId(groupId),
    asUserId(user.id)
  );
  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "admin";
  const canManageMembers = isOwner || isAdmin;

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
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{group.name}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Twilio: {formatPhoneForDisplay(group.twilioPhoneNumber)}</span>
                {isOwner && (
                  <EditTwilioNumberForm
                    groupId={groupId}
                    currentNumber={group.twilioPhoneNumber}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Members */}
        <section className="space-y-4">
          <h3 className="font-medium">Members ({group.members.length})</h3>

          <div className="space-y-2">
            {group.members.map((member) => {
              const memberId = member.participant.id;
              const memberType = member.participant.kind;
              const isCurrentUser =
                memberType === "app_user" && memberId === user.id;
              const isMemberOwner = member.role === "owner";
              const canRemove =
                canManageMembers && !isCurrentUser && !isMemberOwner;

              return (
                <div
                  key={memberId}
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
                      {isCurrentUser && (
                        <span className="text-muted-foreground"> (you)</span>
                      )}
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
                    {canRemove && (
                      <RemoveMemberButton
                        groupId={groupId}
                        memberId={memberId}
                        memberType={memberType}
                        memberName={member.participant.displayName}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Add App User (Owner/Admin only) */}
        {canManageMembers && (
          <section className="space-y-4">
            <h3 className="font-medium">Add App User</h3>
            <AddAppUserForm groupId={groupId} />
          </section>
        )}

        {/* Add SMS Participant (Owner/Admin only) */}
        {canManageMembers && (
          <section className="space-y-4">
            <h3 className="font-medium">Add SMS Participant</h3>
            <AddParticipantForm groupId={groupId} />
          </section>
        )}

        {/* Danger Zone (Owner only) */}
        {isOwner && (
          <section className="space-y-4 pt-6 border-t border-destructive/20">
            <h3 className="font-medium text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground">
              Permanently delete this group and all its messages.
            </p>
            <DeleteGroupButton groupId={groupId} groupName={group.name} />
          </section>
        )}
      </div>
    </div>
  );
}
