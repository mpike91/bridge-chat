"use client";

/**
 * Add SMS Participant Form Component
 */

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { addSmsParticipantToGroup } from "@/application/actions";

interface AddParticipantFormProps {
  groupId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AddParticipantForm({
  groupId,
  onSuccess,
  onCancel,
}: AddParticipantFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    const result = await addSmsParticipantToGroup(groupId, formData);

    setIsLoading(false);

    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || "Failed to add participant");
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1">
          Phone Number
        </label>
        <Input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          placeholder="+14155551234"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium mb-1">
          Display Name
        </label>
        <Input
          id="displayName"
          name="displayName"
          placeholder="John Doe"
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Optional name to display for this contact
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Adding..." : "Add Participant"}
        </Button>
      </div>
    </form>
  );
}
