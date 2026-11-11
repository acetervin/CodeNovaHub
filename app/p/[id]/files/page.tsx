import { getProject, rows, session } from "@/lib/supabase";
import { DOC_KINDS, docKindLabel, shortDate } from "@/lib/stages";
import { Field, Input, Select } from "@/components/fields";
import { FileInput } from "@/components/FileInput";
import { GENERAL_LIMITS, PDF_LIMITS } from "@/lib/uploads";
import { FileTile } from "@/components/FileTile";
import { FileSheet } from "@/components/FileSheet";
import { UploadForm } from "@/components/UploadForm";
import { UploadQueue } from "@/components/UploadQueue";
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
  const [docsQ, assetsQ, thumbsQ] = await Promise.all([
    db.from("documents").select("*").eq("project_id", id).order("signed_on", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
    db.from("assets").select("id, path, name, size_bytes, note, created_at").eq("project_id", id).order("created_at", { ascending: false }),
    // Which uploads have a preview; the previews themselves load from /thumb, so this page stays light.
    db.from("assets").select("id").eq("project_id", id).not("thumb", "is", null),
  ]);
  const docs = rows(docsQ), withThumb = new Set(rows(thumbsQ).map((t) => t.id as string));
  const assets = rows(assetsQ).map((a) => ({ ...a, thumb: withThumb.has(a.id) ? `/thumb/${a.id}` : null }));
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
  // Every file opens in a sheet on this page (FileSheet), never a new tab.
  const open = (id: string, name: string) => (
    <button popoverTarget={`view-${id}`} className="break-words text-left font-medium underline-offset-2 hover:underline">{name}</button>
  );
  const pdfName = (title: string) => (/\.pdf$/i.test(title) ? title : `${title}.pdf`);

  return (
    <div className="flex flex-col gap-6">
      <TopBar title="Files" back={`/p/${id}`} />

      <div className="flex items-start gap-3 px-1">
        <Icon name="shield" className="mt-0.5 size-5 shrink-0 text-ok" />
        <p className="text-sm text-muted">
          Only {isAdmin ? `${p.client.name}'s team` : "your team"} and CodeNova can open these files. Each file link works for one minute (ten for videos, so they can play),
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
                {open(d.id, d.title)}
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
                {open(d.id, d.title)}
                <p className="text-sm text-faint">{[d.ref !== d.title && d.ref, `Added ${shortDate(d.created_at)}`].filter(Boolean).join(", ")}</p>
              </>, act.deleteDocument.bind(null, id, d.id)))}
            </ul>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <SectionHead title="General files"><SheetButton compact target="upload" icon="upload" label="Upload" dark /></SectionHead>
        {/* Uploads on their way come first; the empty note shows only while the grid has nothing in it. */}
        <ul className="peer grid grid-cols-2 gap-3 empty:hidden sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          <UploadQueue projectId={id} />
            {assets.map((a) => (
              <li key={a.id} className="flex min-w-0 flex-col gap-2 rounded-[24px] bg-card p-2">
                <button popoverTarget={`view-${a.id}`} aria-label={`Open ${a.name}`} className="btn block w-full"><FileTile name={a.name} src={a.thumb} /></button>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-2 pb-1.5">
                  <p title={a.name} className="truncate font-medium">{a.name}</p>
                  <p className="text-sm text-faint">{size(a.size_bytes)}, {shortDate(a.created_at)}</p>
                  {a.note && <p className="line-clamp-2 text-sm text-muted" title={a.note}>{a.note}</p>}
                  {isAdmin && <div className="mt-auto pt-1">{remove(act.deleteAsset.bind(null, id, a.id))}</div>}
                </div>
              </li>
            ))}
        </ul>
        <div className="hidden peer-empty:block">
          <Empty icon="upload">{isAdmin ? `Nothing yet. Files you or ${p.client.name} upload show up here.` : `Send your logo, photos and text here. ${GENERAL_LIMITS}`}</Empty>
        </div>
      </section>

      {assets.map((a) => (
        <FileSheet key={a.id} id={`view-${a.id}`} title={a.name} path={a.path} thumb={a.thumb} size={a.size_bytes}
          about={<>{size(a.size_bytes)}, {shortDate(a.created_at)}{a.note && <><br />{a.note}</>}</>} />
      ))}
      {docs.map((d) => (
        <FileSheet key={d.id} id={`view-${d.id}`} title={d.title} fileName={pdfName(d.title)} path={d.path}
          about={[docKindLabel[d.kind], d.ref !== d.title && d.ref, d.signed_on ? `signed ${shortDate(d.signed_on)}` : `added ${shortDate(d.created_at)}`].filter(Boolean).join(", ")} />
      ))}

      <Sheet id="upload" title="Upload a file">
        <UploadForm projectId={id} inputClassName={fileInput} />
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
