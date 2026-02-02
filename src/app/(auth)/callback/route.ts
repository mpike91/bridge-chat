/**
 * Auth Callback Route
 *
 * Handles OAuth and email confirmation callbacks from Supabase.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/data/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to chats after successful auth
  return NextResponse.redirect(new URL("/chats", requestUrl.origin));
}
