/**
 * Data Mappers - Public API
 *
 * Transforms database rows to domain objects.
 */

export { mapProfileToAppUser, mapProfilesToAppUsers } from "./profile-mapper";

export {
  mapRowToSmsParticipant,
  mapRowsToSmsParticipants,
} from "./sms-participant-mapper";

export {
  mapRowToGroup,
  mapRowsToGroups,
  mapRowToGroupMember,
  mapRowsToGroupMembers,
} from "./group-mapper";
export type { GroupMemberRowWithRelations } from "./group-mapper";

export {
  mapRowToMessage,
  mapRowsToMessages,
  safeMapRowToMessage,
} from "./message-mapper";
