import { getProject, rows, session } from "@/lib/supabase";
import { nairobiToday } from "@/lib/form";
import { PLANS, shillings, shortDate } from "@/lib/stages";
import { money } from "@/lib/progress";
import { Field, Input } from "@/components/fields";
import { Submit } from "@/components/Submit";
import { ActivityTile, Bars, Card, Empty, LogRow, Pill, SectionHead, Sheet, SheetButton, TopBar, ago } from "@/components/ui";
import { Icon } from "@/components/icons";
import { FileSheet } from "@/components/FileSheet";
import * as act from "../actions";

export const dynamic = "force-dynamic";
const planLabel: Record<string, string> = Object.fromEntries(PLANS);

export default async function Payments({ params }: PageProps<"/p/[id]/payments">) {
  const { id } = await params;
  const [{ db, isAdmin }, p] = await Promise.all([session(), getProject(id)]);
  const [paysQ, invoicesQ, logQ] = await Promise.all([
    db.from("payments").select("*").eq("project_id", id).order("due_on", { nullsFirst: false }),
    db.from("documents").select("id, title, ref, path, created_at").eq("project_id", id).eq("kind", "invoice").order("created_at", { ascending: false }),
    db.from("activity").select("id, at, actor, summary, kind").eq("project_id", id).eq("kind", "payment")
      .order("at", { ascending: false }).order("id", { ascending: false }).limit(6),
  ]);
  const pays = rows(paysQ), invoices = rows(invoicesQ), log = rows(logQ);

  const today = nairobiToday();
  const m = money(pays, today);
  const total = p.value_kes ?? m.total;
  const pct = total ? Math.round((m.paid / total) * 100) : null;
  const next = pays.find((x) => !x.paid_on && x.due_on);
  const max = Math.max(...pays.map((x) => x.amount_kes), 1);
  const state = (x: (typeof pays)[number]) => (x.paid_on ? "paid" : x.due_on && x.due_on < today ? "late" : "due");

  return (
    <div className="flex flex-col gap-5">
      <TopBar title="Payments" back={`/p/${id}`}>
        {isAdmin && <SheetButton target="add-payment" label="New payment" />}
      </TopBar>

      {/* Desktop: left is where the money stands and its record, right is what's due and the paperwork.
          Phones: one column, ordered summary, payments, invoices, history. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        <div className="contents lg:flex lg:flex-col lg:gap-5">
        <Card className="order-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-medium">Paid so far</h2>
              {p.plan && <p className="text-sm text-faint">{planLabel[p.plan]}</p>}
            </div>
            {m.overdue > 0 ? <Pill tone="danger">{shillings(m.overdue)} overdue</Pill>
              : total && m.paid >= total ? <Pill tone="ok">Paid in full</Pill>
              : <Pill dot="ok">Up to date</Pill>}
          </div>
          <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-end gap-5">
            <div className="pb-1">
              <p className="text-[clamp(3.25rem,9vw,4.25rem)] font-semibold leading-none tracking-[-0.04em] tabular-nums">
                {pct ?? "–"}<span className="text-[0.5em] tracking-normal">%</span>
              </p>
              <p className="mt-2 text-faint">{total ? `of ${shillings(total)}` : "No payments set yet"}</p>
            </div>
            <Bars values={pays.map((x) => Math.round((x.amount_kes / max) * 100))}
              tones={pays.map((x) => ({ paid: "nova", late: "late", due: "muted" } as const)[state(x)])}
              label={`${pays.filter((x) => x.paid_on).length} of ${pays.length} payments made`} className="h-36" />
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
            <div><dt className="text-faint">Paid</dt><dd className="font-semibold tabular-nums">{shillings(m.paid)}</dd></div>
            <div><dt className="text-faint">Still due</dt><dd className="font-semibold tabular-nums">{shillings(m.due)}</dd></div>
            <div><dt className="text-faint">Next due</dt><dd className="font-semibold">{next ? shortDate(next.due_on!) : "–"}</dd></div>
          </dl>
          {isAdmin && p.value_kes != null && m.total !== p.value_kes && pays.length > 0 && (
            <p className="mt-4 rounded-2xl bg-paper px-4 py-3 text-sm text-muted">
              Payments add up to {shillings(m.total)}; the project value is {shillings(p.value_kes)}.
            </p>
          )}
        </Card>

        <section className="order-4 flex flex-col gap-3">
          <SectionHead title="Payment history" href={`/p/${id}/payments/history`} />
          {log.length === 0 ? <Empty icon="history">Every payment added, received or changed is recorded here, with who did it.</Empty> : (
            <Card className="p-2"><ul>{log.map((a) => <LogRow key={a.id} a={a} when={ago(a.at)} />)}</ul></Card>
          )}
        </section>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-5">
        <ul className="order-2 flex flex-col gap-3">
          {pays.length === 0 && <Empty icon="wallet">{isAdmin ? "No payments yet. Add the deposit with New payment." : "Your payment schedule will show up here once it's agreed."}</Empty>}
          {pays.map((x) => {
            const s = state(x);
            return (
              <li key={x.id} className="rounded-[24px] bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full text-white ${s === "paid" ? "bg-ok" : s === "late" ? "bg-danger" : "bg-nova"}`}>
                    <Icon name={s === "paid" ? "check" : s === "late" ? "alert" : "wallet"} className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{x.label}</p>
                    <p className={`text-sm ${s === "late" ? "text-danger" : "text-faint"}`}>
                      {x.paid_on ? `Paid ${shortDate(x.paid_on)}${x.method ? `, ref ${x.method}` : ""}`
                        : x.due_on ? `${s === "late" ? "Was due" : "Due"} ${shortDate(x.due_on)}` : "No due date"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <p className="font-semibold tabular-nums">{shillings(x.amount_kes)}</p>
                    <Pill tone={s === "paid" ? "ok" : s === "late" ? "danger" : "nova"}>{s === "paid" ? "Paid" : s === "late" ? "Overdue" : "Due"}</Pill>
                  </div>
                </div>
                {isAdmin && (
                  <div className="mt-3 flex flex-wrap items-start justify-between gap-3 border-t border-line pt-3">
                    {x.paid_on ? (
                      <form action={act.markUnpaid.bind(null, id, x.id)}><Submit look="quiet" pending="Saving…" className="!py-2">Undo paid</Submit></form>
                    ) : (
                      <details className="group">
                        <summary className="btn cursor-pointer list-none rounded-full bg-ink px-5 py-2 text-sm font-medium text-white">Mark paid</summary>
                        <form action={act.markPaid.bind(null, id, x.id)} className="mt-3 grid gap-3 sm:w-72">
                          <Field label="Paid on"><Input name="paid_on" type="date" defaultValue={today} required /></Field>
                          <Field label="M-Pesa code or reference"><Input name="method" maxLength={120} autoCapitalize="characters" placeholder="SKF3XY12AB" /></Field>
                          <Submit pending="Saving…">Save payment</Submit>
                        </form>
                      </details>
                    )}
                    <details className="text-right">
                      <summary className="cursor-pointer list-none text-sm text-muted underline underline-offset-2">Delete</summary>
                      <form action={act.deletePayment.bind(null, id, x.id)} className="mt-2"><Submit look="danger" pending="Deleting…" className="!py-2">Delete for good</Submit></form>
                    </details>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <section className="order-3 flex flex-col gap-3">
          <SectionHead title="Invoices" href={`/p/${id}/files`} more={isAdmin ? "Add on Files" : "All files"} />
          {invoices.length === 0 ? <Empty icon="receipt">{isAdmin ? "No invoices yet. Add them on the Files page and they show up here too." : "Invoices for this project will show up here."}</Empty> : (
            <Card className="p-2">
              <ul>
                {invoices.map((d) => (
                  <li key={d.id}>
                    <button popoverTarget={`view-${d.id}`} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors duration-150 hover:bg-paper">
                      <ActivityTile kind="invoice" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{d.title}</p>
                        <p className="text-sm text-faint">{[d.ref !== d.title && d.ref, `Added ${shortDate(d.created_at)}`].filter(Boolean).join(", ")}</p>
                      </div>
                      <span className="text-sm text-muted">Open</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
        </div>
      </div>

      {invoices.map((d) => (
        <FileSheet key={d.id} id={`view-${d.id}`} title={d.title} fileName={/\.pdf$/i.test(d.title) ? d.title : `${d.title}.pdf`} path={d.path}
          about={[d.ref !== d.title && d.ref, `added ${shortDate(d.created_at)}`].filter(Boolean).join(", ")} />
      ))}

      {isAdmin && (
        <Sheet id="add-payment" title="New payment">
          <form action={act.addPayment.bind(null, id)} className="flex flex-col gap-4">
            <Field label="What it's for" hint="The client sees this."><Input name="label" required maxLength={120} placeholder="Deposit 40%" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (KES)"><Input name="amount_kes" required inputMode="numeric" placeholder="20,000" /></Field>
              <Field label="Due"><Input name="due_on" type="date" /></Field>
            </div>
            <Submit pending="Adding…">Add payment</Submit>
          </form>
        </Sheet>
      )}
    </div>
  );
}
