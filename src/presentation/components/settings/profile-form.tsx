"use client";

/**
 * Profile Form Component
 *
 * Handles profile updates with proper error/success feedback.
 */

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { updateProfile } from "@/application/actions";

interface ProfileFormProps {
  defaultDisplayName: string;
  defaultPhoneNumber: string | null;
}

export function ProfileForm({
  defaultDisplayName,
  defaultPhoneNumber,
}: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const result = await updateProfile(formData);

    setIsLoading(false);

    if (result.success) {
      setSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || "Failed to update profile");
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-medium mb-1"
        >
          Display Name
        </label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={defaultDisplayName}
          disabled={isLoading}
        />
      </div>

      <div>
        <label
          htmlFor="phoneNumber"
          className="block text-sm font-medium mb-1"
        >
          Phone Number
        </label>
        <Input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          placeholder="+14155551234"
          defaultValue={defaultPhoneNumber || ""}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Optional. Used for receiving notifications.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Profile updated successfully!
        </p>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
