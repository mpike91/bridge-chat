/**
 * Contacts Page
 *
 * Lists SMS participants created by the user.
 */

import { Suspense } from "react";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { SmsParticipantRepository } from "@/data/repositories";
import { requireAuth } from "@/application/actions";
import { PageHeader } from "@/presentation/components/layout/page-header";
import { Avatar } from "@/presentation/components/ui/avatar";
import { Badge } from "@/presentation/components/ui/badge";
import { Spinner } from "@/presentation/components/ui/spinner";
import { asUserId } from "@/domain/types";
import { formatPhoneForDisplay } from "@/domain/validators";

export default async function ContactsPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Contacts"
        description="SMS participants you've added"
      />

      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <Spinner />
          </div>
        }
      >
        <ContactsListContent />
      </Suspense>
    </div>
  );
}

async function ContactsListContent() {
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();

  const smsRepo = new SmsParticipantRepository(supabase);
  const participants = await smsRepo.getByCreator(asUserId(user.id));

  if (participants.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-muted-foreground mb-4">No contacts yet</p>
        <p className="text-sm text-muted-foreground">
          Add SMS participants to groups to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {participants.map((participant) => (
        <div
          key={participant.id}
          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
        >
          <Avatar fallback={participant.displayName} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{participant.displayName}</p>
            <p className="text-sm text-muted-foreground">
              {formatPhoneForDisplay(participant.phoneNumber)}
            </p>
          </div>
          <Badge variant="outline">SMS</Badge>
        </div>
      ))}
    </div>
  );
}
