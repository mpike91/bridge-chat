/**
 * Settings Page
 */

import { Suspense } from "react";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { ProfileRepository } from "@/data/repositories";
import { requireAuth, signOut } from "@/application/actions";
import { PageHeader } from "@/presentation/components/layout/page-header";
import { ProfileForm } from "@/presentation/components/settings/profile-form";
import { Avatar } from "@/presentation/components/ui/avatar";
import { Button } from "@/presentation/components/ui/button";
import { Spinner } from "@/presentation/components/ui/spinner";
import { asUserId } from "@/domain/types";
import { APP_NAME } from "@/lib/constants";

export default async function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Settings" />

      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <Spinner />
          </div>
        }
      >
        <SettingsContent />
      </Suspense>
    </div>
  );
}

async function SettingsContent() {
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();

  const profileRepo = new ProfileRepository(supabase);
  const profile = await profileRepo.getById(asUserId(user.id));

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Profile Section */}
      <section className="space-y-4">
        <h2 className="font-medium">Profile</h2>

        <div className="flex items-center gap-4">
          <Avatar
            src={profile.avatarUrl}
            fallback={profile.displayName}
            size="lg"
          />
          <div>
            <p className="font-medium">{profile.displayName}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        <ProfileForm
          defaultDisplayName={profile.displayName}
          defaultPhoneNumber={profile.phoneNumber}
        />
      </section>

      {/* Account Section */}
      <section className="space-y-4">
        <h2 className="font-medium">Account</h2>

        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sign Out
          </Button>
        </form>
      </section>

      {/* About Section */}
      <section className="space-y-2">
        <h2 className="font-medium">About</h2>
        <p className="text-sm text-muted-foreground">
          {APP_NAME} bridges conversations between app users and SMS
          participants.
        </p>
        <p className="text-xs text-muted-foreground">Version 0.1.0</p>
      </section>
    </div>
  );
}
