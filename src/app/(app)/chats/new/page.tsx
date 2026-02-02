/**
 * New Group Page
 */

import Link from "next/link";
import { PageHeader } from "@/presentation/components/layout/page-header";
import { CreateGroupForm } from "@/presentation/components/groups/create-group-form";
import { Button } from "@/presentation/components/ui/button";

export default function NewGroupPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="New Group"
        actions={
          <Link href="/chats">
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto">
          <CreateGroupForm />
        </div>
      </div>
    </div>
  );
}
