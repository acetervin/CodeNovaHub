"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminDb, session, supabase, supabaseAdmin } from "@/lib/supabase";
import { redirectWithFlash } from "@/lib/flash";
import { DOC_KIND_IDS, PLAN_IDS, STAGE_IDS } from "@/lib/stages";
import { FormError, date, email, kes, nairobiToday, oneOf, phone, required, text, url, uuid } from "@/lib/form";
import { fileProblem, thumbOk } from "@/lib/uploads";

type Db = Awaited<ReturnType<typeof adminDb>>;

type Page = "tasks" | "files" | "payments" | "settings";

/** Runs one change. Success re-renders in place; a problem comes back to the page the form is on (lib/flash.ts). */
async function run(projectId: unknown, page: Page, db: Db, fn: (db: Db, id: string) => Promise<unknown>) {
  const id = uuid(projectId);
  let problem: string | null = null;
  try {
    await fn(db, id);
  } catch (e) {
    if (e instanceof FormError) problem = e.message;
    else {
      console.error(e);
      // Clients get a next step they can take; the Supabase hint is only for Kevin.
      problem = (await session()).isAdmin
        ? "That didn't save. Try again; if it keeps failing, check Supabase and the server log."
        : "That didn't save. Try again in a moment; if it keeps failing, message CodeNova on WhatsApp.";
    }
  }
  revalidatePath(`/p/${id}`, "layout");
  if (problem) await redirectWithFlash(`/p/${id}/${page}`, problem);
}

/** A change only Kevin may make. */
const change = async (projectId: unknown, page: Page, fn: (db: Db, id: string) => Promise<unknown>) =>
  run(projectId, page, await adminDb(), fn);

const ok = <T,>({ error, data }: { error: { message: string } | null; data?: T }) => {
  if (error) throw new Error(error.message);
  return data as T;
};

export async function setStage(projectId: string, form: FormData) {
  await change(projectId, "settings", async (db, id) => {
    const status = oneOf(form, "status", "Stage", STAGE_IDS);
    if (!status) throw new FormError("Pick a stage.");
    ok(await db.from("projects").update({ status }).eq("id", id));
  });
}

export async function saveDetails(projectId: string, form: FormData) {
  await change(projectId, "settings", async (db, id) => {
    const review = text(form, "review_days", "Review window", 2);
    ok(await db.from("projects").update({
      name: required(form, "name", "Project name"),
      plan: oneOf(form, "plan", "Payment plan", PLAN_IDS),
      value_kes: kes(form, "value_kes", "Project value"),
      review_days: review ? (Number(review) === 5 || Number(review) === 10 ? Number(review) : null) : null,
      started_on: date(form, "started_on", "Start date"),
      live_url: url(form, "live_url", "Live link"),
      repo: text(form, "repo", "Repo", 200),
      worker: text(form, "worker", "Worker", 100),
      folder: text(form, "folder", "Folder", 200),
      next_step: text(form, "next_step", "Next step", 500),
      brief: text(form, "brief", "Brief", 5000),
    }).eq("id", id));
  });
}

export async function saveNote(projectId: string, form: FormData) {
  await change(projectId, "settings", async (db, id) => {
    const note = text(form, "note", "Note", 5000);
    if (note) ok(await db.from("project_notes").upsert({ project_id: id, note }));
    else ok(await db.from("project_notes").delete().eq("project_id", id));
  });
}

export async function addMilestone(projectId: string, form: FormData) {
  await change(projectId, "tasks", async (db, id) => {
    ok(await db.from("milestones").insert({
      project_id: id,
      title: required(form, "title", "Milestone", 200),
      due_on: date(form, "due_on", "Due date"),
      waiting_on: oneOf(form, "waiting_on", "Waiting on", ["codenova", "client"] as const) ?? "codenova",
    }));
  });
}

export async function toggleMilestone(projectId: string, milestoneId: string, done: boolean) {
  await change(projectId, "tasks", async (db, id) => {
    ok(await db.from("milestones").update({ done_on: done ? nairobiToday() : null }).eq("id", uuid(milestoneId)).eq("project_id", id));
  });
}

export async function deleteMilestone(projectId: string, milestoneId: string) {
  await change(projectId, "tasks", async (db, id) => {
    ok(await db.from("milestones").delete().eq("id", uuid(milestoneId)).eq("project_id", id));
  });
}

export async function addPayment(projectId: string, form: FormData) {
  await change(projectId, "payments", async (db, id) => {
    const amount = kes(form, "amount_kes", "Amount");
    if (!amount) throw new FormError("Amount is required.");
    ok(await db.from("payments").insert({
      project_id: id,
      label: required(form, "label", "What it's for", 120),
      amount_kes: amount,
      due_on: date(form, "due_on", "Due date"),
    }));
  });
}

export async function markPaid(projectId: string, paymentId: string, form: FormData) {
  await change(projectId, "payments", async (db, id) => {
    ok(await db.from("payments").update({
      paid_on: date(form, "paid_on", "Paid on") ?? nairobiToday(),
      method: text(form, "method", "Payment reference", 120),
    }).eq("id", uuid(paymentId)).eq("project_id", id));
  });
}

export async function markUnpaid(projectId: string, paymentId: string) {
  await change(projectId, "payments", async (db, id) => {
    ok(await db.from("payments").update({ paid_on: null, method: null }).eq("id", uuid(paymentId)).eq("project_id", id));
  });
}

export async function deletePayment(projectId: string, paymentId: string) {
  await change(projectId, "payments", async (db, id) => {
    ok(await db.from("payments").delete().eq("id", uuid(paymentId)).eq("project_id", id));
  });
}

export async function uploadDocument(projectId: string, form: FormData) {
  await change(projectId, "files", async (db, id) => {
    const file = form.get("file");
    if (!(file instanceof File)) throw new FormError("Choose a PDF to upload.");
    const problem = fileProblem(file, "pdf");
    if (problem) throw new FormError(problem);
    if (file.type !== "application/pdf") throw new FormError(`"${file.name}" isn't a real PDF. Export it as a PDF again and retry.`);
    const kind = oneOf(form, "kind", "Type", DOC_KIND_IDS);
    if (!kind) throw new FormError("Pick what kind of document it is.");
    const title = text(form, "title", "Title", 200) ?? file.name.replace(/\.pdf$/i, "");

    const path = `${id}/documents/${crypto.randomUUID()}.pdf`;
    ok(await db.storage.from("hub").upload(path, file, { contentType: "application/pdf" }));
    const { error } = await db.from("documents").insert({
      project_id: id, kind, title, path,
      ref: text(form, "ref", "Reference", 60),
      signed_on: date(form, "signed_on", "Signed on"),
    });
    if (error) {
      await db.storage.from("hub").remove([path]); // don't leave a file nothing points to
      throw new Error(error.message);
    }
  });
}

export async function deleteDocument(projectId: string, documentId: string) {
  await change(projectId, "files", async (db, id) => {
    const doc = ok<{ path: string } | null>(await db.from("documents").select("path").eq("id", uuid(documentId)).eq("project_id", id).maybeSingle());
    if (!doc) return;
    ok(await db.from("documents").delete().eq("id", uuid(documentId)));
    ok(await db.storage.from("hub").remove([doc.path]));
  });
}

export async function deleteAsset(projectId: string, assetId: string) {
  await change(projectId, "files", async (db, id) => {
    const asset = ok<{ path: string } | null>(await db.from("assets").select("path").eq("id", uuid(assetId)).eq("project_id", id).maybeSingle());
    if (!asset) return;
    ok(await db.from("assets").delete().eq("id", uuid(assetId)));
    ok(await db.storage.from("hub").remove([asset.path]));
  });
}

export async function addContact(projectId: string, clientId: string, form: FormData) {
  await change(projectId, "settings", async (db) => {
    const e = email(form, "email"), p = phone(form, "phone");
    if (!e && !p) throw new FormError("Add an email or a phone number, so they have a way to log in.");
    const { error } = await db.from("contacts").insert({ client_id: uuid(clientId), name: required(form, "name", "Name", 120), email: e, phone: p });
    if (error?.code === "23505") throw new FormError("Someone already logs in with that email or phone.");
    ok({ error });
  });
}

export async function deleteContact(projectId: string, contactId: string) {
  await change(projectId, "settings", async (db) => {
    ok(await db.from("contacts").delete().eq("id", uuid(contactId)));
  });
}

/** A client (or Kevin) adds a file. Runs as the signed-in person, so storage and table rules decide. */
export async function uploadAsset(projectId: string, form: FormData) {
  const db = await supabase();
  const { data: claims } = await db.auth.getClaims();
  if (!claims) redirect("/login");
  await run(projectId, "files", db, async (db, id) => {
    const file = form.get("file");
    if (!(file instanceof File)) throw new FormError("Choose a file to upload.");
    const problem = fileProblem(file, "general");
    if (problem) throw new FormError(problem);
    const note = text(form, "note", "Note", 500);

    const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-100);
    const path = `${id}/assets/${crypto.randomUUID()}-${safe}`;
    ok(await db.storage.from("hub").upload(path, file, { contentType: file.type || "application/octet-stream" }));
    const thumb = form.get("thumb"); // the browser's preview; dropped if it isn't a small WebP/JPEG
    const { error } = await db.from("assets").insert({ project_id: id, path, name: file.name.slice(0, 200), size_bytes: file.size, note, thumb: thumbOk(thumb) ? thumb : null });
    if (error) {
      // Clients may add files but not delete them, so the clean-up runs with the secret key.
      await supabaseAdmin().storage.from("hub").remove([path]);
      throw new Error(error.message);
    }
  });
}
