import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/** Acts as the signed-in person, so row-level security decides what they see. Use this by default. */
export async function supabase() {
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components can't set cookies; middleware.ts refreshes the session instead.
        }
      },
    },
  });
}

/** A query's rows, or its error thrown so the page shows the error screen. */
export function rows<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data as T;
}

/** Who is signed in, once per request. Sends visitors to the login page. */
export const session = cache(async () => {
  const db = await supabase();
  const { data: claims } = await db.auth.getClaims();
  if (!claims) redirect("/login");
  const { data: admin } = await db.from("admins").select("email").maybeSingle(); // RLS: only your own row
  // A client may read their own contact row, which holds the name to greet them by.
  const { data: me } = admin ? { data: null } : await db.from("contacts").select("name").limit(1).maybeSingle();
  const c = claims.claims;
  return {
    db,
    isAdmin: !!admin,
    name: admin ? "Kevin" : (me?.name as string | undefined)?.split(" ")[0] ?? null,
    login: String(c.email || (c.phone ? `+${c.phone}` : "this login")),
  };
});

/** Client for Kevin-only pages and actions. Anyone else is sent to the login page or home. */
export async function adminDb() {
  const { db, isAdmin } = await session();
  if (!isAdmin) redirect("/");
  return db;
}

/** One project with its client, once per request. Row-level security hides other clients' projects. */
export const getProject = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { db } = await session();
  const { data, error } = await db.from("projects").select("*, clients(id, name)").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return { ...data, client: data.clients as unknown as { id: string; name: string } };
});

/** Bypasses row-level security. Only for login checks and cleaning up a failed upload, never for page data. */
export function supabaseAdmin() {
  return createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
}
