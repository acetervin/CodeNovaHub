"use server";
import { redirect } from "next/navigation";
import { supabase, supabaseAdmin } from "@/lib/supabase";

/** Sends a login link, but only to Kevin or a known client contact. Everyone sees the same reply. */
export async function sendLink(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) redirect("/login?error=email");

  const admin = supabaseAdmin();
  const [{ data: isAdmin }, { data: contact }] = await Promise.all([
    admin.from("admins").select("email").eq("email", email).maybeSingle(),
    admin.from("contacts").select("id").eq("email", email).maybeSingle(),
  ]);

  if (isAdmin || contact) {
    const { error } = await (await supabase()).auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm` },
    });
    if (error) {
      console.error("login link failed", error.message);
      redirect("/login?error=send");
    }
  }
  redirect("/login?sent=1");
}

export async function signOut() {
  await (await supabase()).auth.signOut();
  redirect("/login");
}
