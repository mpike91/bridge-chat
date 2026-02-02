/**
 * Server Actions - Public API
 */

export {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  requireAuth,
} from "./auth-actions";
export type { AuthResult } from "./auth-actions";

export { updateProfile, getMyProfile } from "./profile-actions";
export type { ProfileUpdateResult } from "./profile-actions";

export {
  createGroup,
  updateGroup,
  deleteGroup,
  addSmsParticipantToGroup,
  removeSmsParticipantFromGroup,
  leaveGroup,
  getGroupWithMembers,
  getMyGroups,
} from "./group-actions";
export type { GroupResult, GroupMemberResult } from "./group-actions";

export { sendMessage, getGroupMessages } from "./message-actions";
export type { SendMessageResult } from "./message-actions";
