"use client";

/**
 * Client-side components for Group Settings
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  searchUsersToAdd,
  addAppUserToGroup,
  removeMemberFromGroup,
  updateGroup,
  deleteGroup,
} from "@/application/actions";

// Remove Member Button
interface RemoveMemberButtonProps {
  groupId: string;
  memberId: string;
  memberType: "app_user" | "sms_participant";
  memberName: string;
}

export function RemoveMemberButton({
  groupId,
  memberId,
  memberType,
  memberName,
}: RemoveMemberButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeMemberFromGroup(groupId, memberId, memberType);
      if (!result.success) {
        alert(result.error || "Failed to remove member");
      }
      setShowConfirm(false);
    });
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Remove?</span>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleRemove}
          disabled={isPending}
        >
          {isPending ? "..." : "Yes"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
        >
          No
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setShowConfirm(true)}
      className="text-muted-foreground hover:text-destructive"
    >
      Remove
    </Button>
  );
}

// Add App User Form
interface AddAppUserFormProps {
  groupId: string;
}

export function AddAppUserForm({ groupId }: AddAppUserFormProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<
    Array<{ id: string; email: string; displayName: string }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setError(null);

    const result = await searchUsersToAdd(groupId, searchTerm);

    setIsSearching(false);

    if (result.success && result.users) {
      setUsers(result.users);
      if (result.users.length === 0) {
        setError("No users found");
      }
    } else {
      setError(result.error || "Search failed");
    }
  };

  const handleAdd = (userId: string) => {
    startTransition(async () => {
      const result = await addAppUserToGroup(groupId, userId);
      if (result.success) {
        setUsers(users.filter((u) => u.id !== userId));
        setSearchTerm("");
      } else {
        setError(result.error || "Failed to add user");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by email or name..."
          disabled={isSearching || isPending}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button
          onClick={handleSearch}
          disabled={isSearching || isPending || !searchTerm.trim()}
        >
          {isSearching ? "..." : "Search"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {users.length > 0 && (
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-2 rounded bg-secondary/50"
            >
              <div>
                <p className="font-medium">{user.displayName}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <Button
                size="sm"
                onClick={() => handleAdd(user.id)}
                disabled={isPending}
              >
                Add
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Edit Twilio Number Form
interface EditTwilioNumberFormProps {
  groupId: string;
  currentNumber: string;
}

export function EditTwilioNumberForm({
  groupId,
  currentNumber,
}: EditTwilioNumberFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(currentNumber);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("twilioPhoneNumber", phoneNumber);

      const result = await updateGroup(groupId, formData);

      if (result.success) {
        setIsEditing(false);
        setError(null);
      } else {
        setError(result.error || "Failed to update");
      }
    });
  };

  if (!isEditing) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsEditing(true)}
      >
        Edit
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+14155551234"
          disabled={isPending}
        />
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "..." : "Save"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setIsEditing(false);
            setPhoneNumber(currentNumber);
            setError(null);
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// Delete Group Button
interface DeleteGroupButtonProps {
  groupId: string;
  groupName: string;
}

export function DeleteGroupButton({ groupId, groupName }: DeleteGroupButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (confirmText !== groupName) {
      setError("Group name doesn't match");
      return;
    }

    startTransition(async () => {
      const result = await deleteGroup(groupId);
      if (result.success) {
        router.push("/chats");
      } else {
        setError(result.error || "Failed to delete group");
      }
    });
  };

  if (!showConfirm) {
    return (
      <Button
        variant="destructive"
        onClick={() => setShowConfirm(true)}
      >
        Delete Group
      </Button>
    );
  }

  return (
    <div className="space-y-4 p-4 border border-destructive rounded-lg">
      <p className="text-sm">
        This action cannot be undone. This will permanently delete the group
        and all messages.
      </p>
      <p className="text-sm font-medium">
        Type <span className="font-mono bg-secondary px-1">{groupName}</span> to
        confirm:
      </p>
      <Input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="Type group name to confirm"
        disabled={isPending}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={isPending || confirmText !== groupName}
        >
          {isPending ? "Deleting..." : "Delete Forever"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setShowConfirm(false);
            setConfirmText("");
            setError(null);
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
