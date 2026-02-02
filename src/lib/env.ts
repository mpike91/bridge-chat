/**
 * Environment Configuration
 *
 * Type-safe environment variable access.
 */

/**
 * Public environment variables (available in browser).
 */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
} as const;

/**
 * Server-only environment variables.
 */
export const serverEnv = {
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
} as const;

/**
 * Validates required environment variables are set.
 */
export function validateEnv(): void {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}
