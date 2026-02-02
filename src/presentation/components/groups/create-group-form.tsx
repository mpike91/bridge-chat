"use client";

/**
 * Create Group Form Component
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { createGroup } from "@/application/actions";

interface CreateGroupFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateGroupForm({ onSuccess, onCancel }: CreateGroupFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    const result = await createGroup(formData);

    setIsLoading(false);

    if (result.success && result.group) {
      onSuccess?.();
      router.push(`/chats/${result.group.id}`);
    } else {
      setError(result.error || "Failed to create group");
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Group Name
        </label>
        <Input
          id="name"
          name="name"
          placeholder="My Group"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label
          htmlFor="twilioPhoneNumber"
          className="block text-sm font-medium mb-1"
        >
          Twilio Phone Number
        </label>
        <Input
          id="twilioPhoneNumber"
          name="twilioPhoneNumber"
          type="tel"
          placeholder="+14155551234"
          required
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground mt-1">
          The Twilio number to use for SMS in this group
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Group"}
        </Button>
      </div>
    </form>
  );
}
