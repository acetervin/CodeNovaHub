import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

// Login links land here in one of two shapes:
// - ?token_hash=…&type=email, from our Magic Link template. Works on any device.
// - ?code=…, from Supabase's default template. Works only in the browser that asked for the link.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const token_hash = q.get("token_hash");
  const type = q.get("type") as EmailOtpType | null;
  const code = q.get("code");
  const db = await supabase();

  let error: unknown = "missing token";
  if (token_hash && type) ({ error } = await db.auth.verifyOtp({ token_hash, type }));
  else if (code) ({ error } = await db.auth.exchangeCodeForSession(code));

  if (!error) return NextResponse.redirect(new URL("/", request.url));
  console.error("login link failed", error);
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
