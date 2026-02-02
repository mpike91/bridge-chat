/**
 * Application Constants
 */

/** Maximum message length */
export const MAX_MESSAGE_LENGTH = 1600;

/** Number of messages to load per page */
export const MESSAGES_PAGE_SIZE = 50;

/** Debounce delay for typing indicators */
export const TYPING_DEBOUNCE_MS = 300;

/** Time before marking user as "away" */
export const PRESENCE_AWAY_MS = 5 * 60 * 1000; // 5 minutes

/** Routes */
export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  chats: "/chats",
  chat: (id: string) => `/chats/${id}`,
  contacts: "/contacts",
  settings: "/settings",
} as const;

/** App metadata */
export const APP_NAME = "BridgeChat";
export const APP_DESCRIPTION =
  "Bridge conversations between app users and SMS participants";
