"use server";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/supabase";
import { redirectWithFlash } from "@/lib/flash";
import { FormError, required, text, uuid } from "@/lib/form";

/** New project, for an existing client or a new one. Opens the project when done. */
export async function createProject(form: FormData) {
  const db = await adminDb();
  let projectId: string;
  try {
    const name = required(form, "name", "Project name");
    const newClient = text(form, "new_client", "New client name", 200);
    const existing = text(form, "client_id", "Client", 36);
    let clientId: string;
    if (newClient) {
      const { data, error } = await db.from("clients").insert({ name: newClient }).select("id").single();
      if (error) throw new Error(error.message);
      clientId = data.id;
    } else if (existing) {
      clientId = uuid(existing);
    } else {
      throw new FormError("Pick a client, or type a new client's name.");
    }
    const { data, error } = await db.from("projects").insert({ client_id: clientId, name }).select("id").single();
    if (error) throw new Error(error.message);
    projectId = data.id;
  } catch (e) {
    const msg = e instanceof FormError ? e.message : "That didn't save. Try again.";
    if (!(e instanceof FormError)) console.error(e);
    return redirectWithFlash("/", msg);
  }
  redirect(`/p/${projectId}`);
}
