import { adminDb, getProject, rows } from "@/lib/supabase";
import { PLANS, STAGES } from "@/lib/stages";
import { Field, Input, Select, Textarea } from "@/components/fields";
import { Submit } from "@/components/Submit";
import { Avatar, Card, TopBar } from "@/components/ui";
import * as act from "../actions";

export const dynamic = "force-dynamic";

// Kevin only: adminDb() sends anyone else home.
export default async function Settings({ params }: PageProps<"/p/[id]/settings">) {
  const { id } = await params;
  const db = await adminDb();
  const p = await getProject(id);
  const [noteQ, contactsQ] = await Promise.all([
    db.from("project_notes").select("note").eq("project_id", id).maybeSingle(),
    db.from("contacts").select("*").eq("client_id", p.client.id).order("name"),
  ]);
  const note = rows(noteQ), contacts = rows(contactsQ);
  const stage = STAGES.findIndex(([s]) => s === p.status);

  return (
    <div className="flex flex-col gap-5">
      <TopBar title="Settings" back={`/p/${id}`} />

      <Card>
        <h2 className="font-medium">Stage</h2>
        <p className="text-sm text-faint">Tap a stage to move the project there. The client sees it, and it goes in the history.</p>
        <ol className="mt-4 flex flex-wrap gap-2">
          {STAGES.map(([s, label], i) => (
            <li key={s}>
              <form action={act.setStage.bind(null, id)}>
                <input type="hidden" name="status" value={s} />
                <button aria-current={i === stage ? "step" : undefined}
                  className={`btn rounded-full px-4 py-2.5 text-sm ${i === stage ? "bg-nova text-white" : i < stage ? "bg-ink text-white" : "bg-paper text-muted"}`}>
                  {label}
                </button>
              </form>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
        <Card>
          <h2 className="mb-4 font-medium">Details</h2>
          <form action={act.saveDetails.bind(null, id)} className="flex flex-col gap-4">
            <Field label="Project name"><Input name="name" required maxLength={200} defaultValue={p.name} /></Field>
            <Field label="Next step" hint="The client sees this first. Write it for them.">
              <Textarea name="next_step" maxLength={500} defaultValue={p.next_step ?? ""} placeholder="Send us your logo and three photos of the office." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Payment plan">
                <Select name="plan" defaultValue={p.plan ?? ""}><option value="">Not set</option>{PLANS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
              </Field>
              <Field label="Value (KES)"><Input name="value_kes" inputMode="numeric" defaultValue={p.value_kes?.toLocaleString("en-KE") ?? ""} /></Field>
              <Field label="Review window">
                <Select name="review_days" defaultValue={p.review_days ?? ""}><option value="">Not set</option><option value="5">5 working days</option><option value="10">10 working days</option></Select>
              </Field>
              <Field label="Started"><Input name="started_on" type="date" defaultValue={p.started_on ?? ""} /></Field>
            </div>
            <Field label="Live link"><Input name="live_url" inputMode="url" autoCapitalize="none" defaultValue={p.live_url ?? ""} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Repo"><Input name="repo" autoCapitalize="none" defaultValue={p.repo ?? ""} placeholder="acetervin/…" /></Field>
              <Field label="Worker"><Input name="worker" autoCapitalize="none" defaultValue={p.worker ?? ""} /></Field>
            </div>
            <Field label="Folder in C:\Coding"><Input name="folder" defaultValue={p.folder ?? ""} /></Field>
            <Field label="Brief" hint="What the client asked for."><Textarea name="brief" rows={4} maxLength={5000} defaultValue={p.brief ?? ""} /></Field>
            <div><Submit pending="Saving…">Save details</Submit></div>
          </form>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <h2 className="font-medium">Private note</h2>
            <p className="mb-4 text-sm text-faint">Only you see this. It isn&rsquo;t logged in the history.</p>
            <form action={act.saveNote.bind(null, id)} className="flex flex-col gap-3">
              <Textarea name="note" rows={4} maxLength={5000} aria-label="Private note" defaultValue={note?.note ?? ""} />
              <div><Submit look="quiet" pending="Saving…">Save note</Submit></div>
            </form>
          </Card>

          <Card>
            <h2 className="font-medium">Who can log in for {p.client.name}</h2>
            <p className="text-sm text-faint">They see every project of this client.</p>
            <ul className="mt-3">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-start gap-3 border-b border-line py-3 last:border-0">
                  <Avatar name={c.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.name}</p>
                    <p className="break-all text-sm text-faint">{[c.email, c.phone && `+${c.phone}`].filter(Boolean).join(", ")}</p>
                  </div>
                  <details className="text-right">
                    <summary className="cursor-pointer list-none text-sm text-muted underline underline-offset-2">Remove</summary>
                    <form action={act.deleteContact.bind(null, id, c.id)} className="mt-2"><Submit look="danger" pending="Removing…" className="!py-2">Remove access</Submit></form>
                  </details>
                </li>
              ))}
            </ul>
            <form action={act.addContact.bind(null, id, p.client.id)} className="mt-4 flex flex-col gap-3">
              <Field label="Name"><Input name="name" required maxLength={120} autoComplete="off" /></Field>
              <Field label="Email"><Input name="email" type="email" autoCapitalize="none" autoComplete="off" /></Field>
              <Field label="Phone" hint="For WhatsApp login, once it's ready."><Input name="phone" type="tel" inputMode="tel" autoComplete="off" placeholder="0712 345 678" /></Field>
              <div><Submit pending="Adding…">Give access</Submit></div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
