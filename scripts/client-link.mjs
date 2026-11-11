// Prints a one-time login link for a client contact without sending an email, to see the hub as that client.
// Run: npm run client-link -- someone@example.com
// Open the link in a private (Incognito) window so your own login stays signed in in the normal one.
import { createClient } from "@supabase/supabase-js";

for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); break; } catch {}
}
const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run client-link -- <client's login email>");
  process.exit(1);
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
// Only client logins: this must never hand out a link to Kevin's admin account or to strangers.
const { data: contact } = await db.from("contacts").select("name").eq("email", email).maybeSingle();
if (!contact) {
  console.error(`${email} isn't a client login. Add it in the hub first: a project's Settings > Who can log in.`);
  process.exit(1);
}
const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
if (error) {
  console.error(`Couldn't make a link: ${error.message}`);
  process.exit(1);
}
const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
console.log(`One-time login link for ${contact.name} (works once):\n${site}/auth/confirm?token_hash=${data.properties.hashed_token}&type=email`);
