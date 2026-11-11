import { getProject, rows, session } from "@/lib/supabase";
import { DOC_KINDS, docKindLabel, shortDate } from "@/lib/stages";
import { Field, Input, Select, Textarea } from "@/components/fields";
import { FileInput } from "@/components/FileInput";
import { GENERAL_LIMITS, PDF_LIMITS, TOO_BIG_TIP } from "@/lib/uploads";
import { Submit } from "@/components/Submit";
import { Empty, Pill, SectionHead, Sheet, SheetButton, TopBar } from "@/components/ui";
import { Icon } from "@/components/icons";
import * as act from "../actions";

export const dynamic = "force-dynamic";

const size = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
const fileInput = "py-2.5 file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:text-white";
const AGREEMENT_KINDS = DOC_KINDS.filter(([k]) => k !== "invoice");

// Three shelves, each with its own button: agreements and invoices (Kevin adds them), and general files
// either side uploads.
export default async function Files({ params }: PageProps<"/p/[id]/files">) {
  const { id } = await params;
  const [{ db, isAdmin }, p] = await Promise.all([session(), getProject(id)]);
  const [docsQ, assetsQ] = await Promise.all([
    db.from("documents").select("*").eq("project_id", id).order("signed_on", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
    db.from("assets").select("*").eq("project_id", id).order("created_at", { ascending: false }),
  ]);
  const docs = rows(docsQ), assets = rows(assetsQ);
  const agreements = docs.filter((d) => d.kind !== "invoice");
  const invoices = docs.filter((d) => d.kind === "invoice");
  // The newest signed agreement is the one that counts (standard CodeNova terms).
  const inForce = agreements.find((d) => d.signed_on)?.id;

  const remove = (action: () => Promise<void>) => (
    <details className="shrink-0 text-right">
      <summary className="cursor-pointer list-none text-sm text-muted underline underline-offset-2">Delete</summary>
      <form action={action} className="mt-2"><Submit look="danger" pending="Deleting…" className="!py-2">Delete file for good</Submit></form>
    </details>
  );
  const card = (key: string, tile: string, icon: "file" | "wallet" | "upload", body: React.ReactNode, del?: () => Promise<void>) => (
    <li key={key} className="flex items-start gap-3 rounded-[24px] bg-card p-4">
      <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${tile}`}><Icon name={icon} /></span>
      <div className="min-w-0 flex-1">{body}</div>
      {isAdmin && del && remove(del)}
    </li>
  );
  const open = (path: string, name: string) => (
    <a href={`/f/${path}`} target="_blank" rel="noopener" className="break-words font-medium underline-offset-2 hover:underline">{name}</a>
  );

  return (
    <div className="flex flex-col gap-6">
      <TopBar title="Files" back={`/p/${id}`} />

      <div className="flex items-start gap-3 px-1">
        <Icon name="shield" className="mt-0.5 size-5 shrink-0 text-ok" />
        <p className="text-sm text-muted">
          Only {isAdmin ? `${p.client.name}'s team` : "your team"} and CodeNova can open these files. Each download link works for one minute,
          and every file added or removed is written to the project history.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <SectionHead title="Agreements">{isAdmin && <SheetButton compact target="add-agreement" label="Add agreement" />}</SectionHead>
          {agreements.length === 0 ? (
            <Empty icon="file">{isAdmin ? "No agreements yet. Add the signed PDF here." : "Your signed agreement and its schedules will be kept here."}</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {agreements.map((d) => card(d.id, "bg-nova-soft text-nova", "file", <>
                {open(d.path, d.title)}
                <p className="text-sm text-faint">{[docKindLabel[d.kind], d.ref].filter(Boolean).join(", ")}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {d.signed_on ? <Pill tone="ok">Signed {shortDate(d.signed_on)}</Pill> : <Pill>Not signed yet</Pill>}
                  {d.id === inForce && <Pill tone="nova">In force</Pill>}
                </div>
              </>, act.deleteDocument.bind(null, id, d.id)))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionHead title="Invoices">{isAdmin && <SheetButton compact target="add-invoice" label="Add invoice" />}</SectionHead>
          {invoices.length === 0 ? (
            <Empty icon="wallet">{isAdmin ? "No invoices yet." : "Invoices for this project will be kept here."}</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {invoices.map((d) => card(d.id, "bg-paper text-ink", "wallet", <>
                {open(d.path, d.title)}
                <p className="text-sm text-faint">{[d.ref !== d.title && d.ref, `Added ${shortDate(d.created_at)}`].filter(Boolean).join(", ")}</p>
              </>, act.deleteDocument.bind(null, id, d.id)))}
            </ul>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <SectionHead title="General files"><SheetButton compact target="upload" icon="upload" label="Upload" dark /></SectionHead>
        {assets.length === 0 ? (
          <Empty icon="upload">{isAdmin ? `Nothing yet. Files you or ${p.client.name} upload show up here.` : `Send your logo, photos and text here. ${GENERAL_LIMITS}`}</Empty>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {assets.map((a) => card(a.id, "bg-paper text-muted", "upload", <>
              {open(a.path, a.name)}
              <p className="text-sm text-faint">{size(a.size_bytes)}, {shortDate(a.created_at)}</p>
              {a.note && <p className="mt-1 text-sm text-muted">{a.note}</p>}
            </>, act.deleteAsset.bind(null, id, a.id)))}
          </ul>
        )}
      </section>

      <Sheet id="upload" title="Upload a file">
        <form action={act.uploadAsset.bind(null, id)} className="flex flex-col gap-4">
          <Field label="File" hint={`${GENERAL_LIMITS} ${TOO_BIG_TIP}`}>
            <FileInput kind="general" className={fileInput} />
          </Field>
          <Field label="Note (optional)"><Textarea name="note" maxLength={500} placeholder="This is the logo with the white background." /></Field>
          <Submit pending="Uploading…">Upload</Submit>
        </form>
      </Sheet>

      {isAdmin && (
        <>
          <Sheet id="add-agreement" title="Add an agreement">
            <form action={act.uploadDocument.bind(null, id)} className="flex flex-col gap-4">
              <Field label="PDF" hint={PDF_LIMITS}><FileInput kind="pdf" className={fileInput} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type"><Select name="kind" required defaultValue="agreement">{AGREEMENT_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
                <Field label="Reference"><Input name="ref" maxLength={60} autoCapitalize="characters" placeholder="CN246J56-SCH-08" /></Field>
              </div>
              <Field label="Title" hint="Leave empty to use the file name."><Input name="title" maxLength={200} /></Field>
              <Field label="Signed on" hint="Leave empty if it isn't signed yet."><Input name="signed_on" type="date" /></Field>
              <Submit pending="Uploading…">Add agreement</Submit>
            </form>
          </Sheet>

          <Sheet id="add-invoice" title="Add an invoice">
            <form action={act.uploadDocument.bind(null, id)} className="flex flex-col gap-4">
              <input type="hidden" name="kind" value="invoice" />
              <Field label="PDF" hint={PDF_LIMITS}><FileInput kind="pdf" className={fileInput} /></Field>
              <Field label="Invoice number"><Input name="ref" maxLength={60} autoCapitalize="characters" placeholder="INV-0042" /></Field>
              <Field label="Title" hint="Leave empty to use the file name."><Input name="title" maxLength={200} /></Field>
              <Submit pending="Uploading…">Add invoice</Submit>
            </form>
          </Sheet>
        </>
      )}
    </div>
  );
}
