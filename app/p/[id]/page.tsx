import Link from "next/link";
import { getProject, rows, session } from "@/lib/supabase";
import { nairobiToday } from "@/lib/form";
import { STAGES, shillings, shortDate, stageLabel } from "@/lib/stages";
import { completion, daysBetween, money, taskState, weeklyCompletion } from "@/lib/progress";
import { type Contact, nudgeContact, nudgeHref, nudgeMessage } from "@/lib/nudge";
import { Avatar, Bars, Card, DayLog, Empty, LogRow, Pill, RoundLink, SectionHead, ago } from "@/components/ui";
import { Icon, Mark } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Overview({ params }: PageProps<"/p/[id]">) {
  const { id } = await params;
  const [{ db, isAdmin, name, login }, p] = await Promise.all([session(), getProject(id)]);
  const [tasksQ, paysQ, logQ, contactsQ] = await Promise.all([
    db.from("milestones").select("id, title, due_on, done_on, waiting_on").eq("project_id", id).order("due_on", { nullsFirst: false }),
    db.from("payments").select("id, label, amount_kes, due_on, paid_on").eq("project_id", id).order("due_on", { nullsFirst: false }),
    db.from("activity").select("id, at, actor, summary, kind").eq("project_id", id).order("at", { ascending: false }).order("id", { ascending: false }).limit(300), // shortcut: All updates shows the latest 300; page it once a project outgrows that
    isAdmin ? db.from("contacts").select("name, phone, email").eq("client_id", p.client.id).order("name") : { data: [], error: null },
  ]);
  const tasks = rows(tasksQ), pays = rows(paysQ), log = rows(logQ), contacts = rows(contactsQ);

  const today = nairobiToday();
  const pct = completion(tasks);
  const late = tasks.filter((t) => taskState(t, today) === "late").length;
  const open = tasks.filter((t) => !t.done_on).slice(0, 3);

  // Kevin's view splits the work by whose turn it is: his next task up top, the client's open items in their own
  // list with a Nudge button. Tasks are sorted by due date, so late ones come first.
  const mine = tasks.filter((t) => !t.done_on && t.waiting_on !== "client");
  const myNext = mine[0];
  const who = nudgeContact(contacts as Contact[]);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const nudge = (what: string, due: string | null, isLate: boolean, page: string) => nudgeHref(who, nudgeMessage({
    first: who?.name.split(" ")[0] ?? "there", what, project: p.name, due: due && shortDate(due), late: isLate, link: `${site}/p/${id}/${page}`,
  }));
  const waiting = [
    ...tasks.filter((t) => !t.done_on && t.waiting_on === "client").map((t) => {
      const isLate = taskState(t, today) === "late";
      return { key: `t${t.id}`, icon: "user" as const, title: t.title, due: t.due_on, late: isLate, href: nudge(`"${t.title}"`, t.due_on, isLate, "tasks") };
    }),
    // Payments count once they're due within a week, or late.
    ...pays.filter((x) => !x.paid_on && x.due_on && daysBetween(today, x.due_on) <= 7).map((x) => {
      const isLate = x.due_on! < today;
      return { key: `p${x.id}`, icon: "wallet" as const, title: `${x.label}, ${shillings(x.amount_kes)}`, due: x.due_on, late: isLate,
        href: nudge(`the payment "${x.label}" (${shillings(x.amount_kes)})`, x.due_on, isLate, "payments") };
    }),
  ].sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const m = money(pays, today);
  const value = p.value_kes ?? (m.total || null);
  const stage = STAGES.findIndex(([s]) => s === p.status);

  // Payments as bars: height is the amount, colour is whether it's paid, due or late.
  const maxPay = Math.max(...pays.map((x) => x.amount_kes), 1);
  const payBars = pays.map((x) => Math.round((x.amount_kes / maxPay) * 100));
  const payTones = pays.map((x) => (x.paid_on ? "nova" : x.due_on && x.due_on < today ? "late" : "muted") as "nova" | "late" | "muted");
  // Money in over time: each paid instalment adds a step.
  const paidSteps = pays.filter((x) => x.paid_on).sort((a, b) => a.paid_on!.localeCompare(b.paid_on!))
    .reduce<number[]>((acc, x) => [...acc, (acc.at(-1) ?? 0) + x.amount_kes], []);
  const paidPct = value ? Math.round((m.paid / value) * 100) : null;
  const base = `/p/${id}`;
  const waitingRow = (w: (typeof waiting)[number]) => (
    <div key={w.key} className="flex items-center gap-3 rounded-[22px] bg-card p-3 pl-4">
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${w.late ? "bg-danger-soft text-danger" : "bg-nova-soft text-nova"}`}>
        <Icon name={w.icon} className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{w.title}</p>
        <p className={`truncate text-sm ${w.late ? "text-danger" : "text-faint"}`}>
          {w.due ? `${w.late ? "Was due" : "Due"} ${shortDate(w.due)}` : "No due date"}
        </p>
      </div>
      {w.href && (
        <a href={w.href} target="_blank" rel="noopener" title={`Remind ${who?.name} on ${who?.phone ? "WhatsApp" : "email"}`}
          className={`btn shrink-0 rounded-full px-4 py-2 text-sm font-medium ${w.late ? "bg-ink text-white" : "bg-paper"}`}>Nudge</a>
      )}
    </div>
  );
  // The right column previews the top 3 waiting and the latest 5 updates; the full lists follow below, full width.
  const moreLog = log.length > 5;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between lg:hidden">
        <span className="grid size-12 place-items-center rounded-full bg-nova text-white"><Mark /></span>
        <Avatar name={isAdmin ? "Kevin" : name ?? login} className="size-12 text-base" />
      </div>

      <header className="text-[clamp(1.85rem,4.2vw,2.6rem)] font-semibold leading-[1.12] tracking-[-0.025em]">
        {isAdmin ? (
          <h1>{p.client.name}<span className="block text-faint">{p.name}</span></h1>
        ) : (
          <h1>Hey {name ?? "there"}, <span aria-hidden>👋</span><span className="block text-faint">Here&rsquo;s your <span className="text-nova">project update.</span></span></h1>
        )}
      </header>

      {isAdmin ? (
        <Card className="flex items-center gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-white"><Icon name="code" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">Your next step</p>
            <p className="mt-0.5 text-lg leading-snug">{myNext ? myNext.title : "Nothing open on your side"}</p>
            <p className="text-sm text-faint">
              {myNext ? [myNext.due_on ? `Due ${shortDate(myNext.due_on)}` : "No due date", mine.length > 1 && `then ${mine.length - 1} more of yours`].filter(Boolean).join(", ")
                : waiting.length ? `Waiting on ${p.client.name}.` : "Plan the next task on the Tasks page."}
            </p>
          </div>
          {myNext && taskState(myNext, today) === "late" && <Pill tone="danger">Late</Pill>}
          <RoundLink href={`${base}/tasks`} icon="next" label="Open tasks" />
        </Card>
      ) : p.next_step && (
        <Card className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-nova-soft text-nova"><Icon name="next" /></span>
          <div className="min-w-0">
            <p className="text-sm text-muted">Next step</p>
            <p className="mt-0.5 text-lg leading-snug">{p.next_step}</p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Desktop: the left cards stretch so both columns end on the same line. */}
        <div className="flex flex-col gap-4">
          <Card className="flex flex-1 flex-col">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-medium">Project snapshot</h2>
              <Link href={`${base}/tasks`} aria-label="All tasks" className="btn grid size-10 place-items-center rounded-full bg-paper"><Icon name="more" /></Link>
            </div>
            <div className="mt-2 grid flex-1 grid-cols-[auto_minmax(0,1fr)] gap-5">
              <div className="self-end pb-1">
                <p className="text-[clamp(3.25rem,9vw,4.25rem)] font-semibold leading-none tracking-[-0.04em] tabular-nums">
                  {pct ?? "–"}<span className="text-[0.5em] tracking-normal">%</span>
                </p>
                <p className="mt-2 text-faint">{pct === null ? "No tasks planned yet" : "Project completion"}</p>
                <div className="mt-4">
                  {pct === null ? <Pill dot="plain">{stageLabel[p.status]}</Pill>
                    : <Pill dot={late ? "danger" : "ok"}>{late ? `${late} ${late === 1 ? "task" : "tasks"} late` : "On track"}</Pill>}
                </div>
              </div>
              <Bars values={weeklyCompletion(tasks, today, 8)} label={`Completion over the last 8 weeks, now ${pct ?? 0}%`} className="h-full min-h-36 self-end" />
            </div>
            <div className="mt-6">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-muted">Stage</span>
                <span className="font-medium">{stageLabel[p.status]} <span className="text-faint">step {stage + 1} of {STAGES.length}</span></span>
              </div>
              <ol aria-label={`Stage ${stage + 1} of ${STAGES.length}: ${stageLabel[p.status]}`} className="mt-2 flex gap-1">
                {STAGES.map(([s], i) => (
                  <li key={s} className={`h-1.5 flex-1 rounded-full ${i < stage ? "bg-ink" : i === stage ? "bg-nova" : "bg-black/[0.08]"}`} />
                ))}
              </ol>
            </div>
          </Card>

          <div className="grid flex-1 grid-cols-2 gap-4">
            <Link href={`${base}/payments`} className="btn flex flex-col rounded-card bg-card p-4">
              <div className="flex items-center gap-2.5">
                <span className="hidden size-9 shrink-0 place-items-center rounded-full border border-line sm:grid"><Icon name="wallet" className="size-[18px]" /></span>
                <div className="min-w-0">
                  <p className="text-xs text-faint">Project value</p>
                  <p className="truncate font-semibold tabular-nums">{value ? shillings(value) : "Not set"}</p>
                </div>
              </div>
              <div className="mt-3 flex min-h-24 flex-1 items-end rounded-2xl bg-paper px-3 pt-3">
                {payBars.length ? <Bars values={payBars} tones={payTones} label={`${pays.length} payments`} className="h-full w-full" />
                  : <p className="mb-auto text-sm text-faint">No payments set</p>}
              </div>
            </Link>
            <Link href={`${base}/payments`} className="btn flex flex-col rounded-card bg-card p-4">
              <div className="flex items-center gap-2.5">
                <span className="hidden size-9 shrink-0 place-items-center rounded-full border border-line sm:grid"><Icon name="check" className="size-[18px]" /></span>
                <div className="min-w-0">
                  <p className="text-xs text-faint">Paid</p>
                  <p className="truncate font-semibold tabular-nums">{paidPct === null ? "–" : `${paidPct}% of total`}</p>
                  {m.overdue > 0 && <p className="truncate text-xs font-medium text-danger">{shillings(m.overdue)} overdue</p>}
                </div>
              </div>
              <div className="relative mt-3 flex min-h-24 flex-1 items-end rounded-2xl bg-paper px-3 pt-3">
                {paidSteps.length ? (
                  <>
                    <Bars values={paidSteps.map((v) => Math.round((v / (value ?? v)) * 100))} label={`${shillings(m.paid)} paid so far`} className="h-full w-full" />
                    <span className="absolute right-2 top-2 rounded-xl bg-card px-2 py-1 text-right shadow-sm">
                      <span className="block text-xs font-semibold tabular-nums text-nova">{shillings(m.paid)}</span>
                      <span className="block text-[10px] text-faint">paid so far</span>
                    </span>
                  </>
                ) : <p className="mb-auto text-sm text-faint">Nothing paid yet</p>}
              </div>
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {isAdmin ? (
            <section className="flex flex-col gap-3">
              <SectionHead title={`Waiting on ${p.client.name}`} href={waiting.length > 3 ? "#waiting" : undefined} more={`View all ${waiting.length}`} />
              {waiting.length === 0 ? <Empty icon="user">Nothing is waiting on them right now.</Empty> : waiting.slice(0, 3).map(waitingRow)}
              {waiting.length > 0 && !who && (
                <p className="px-1 text-sm text-muted">Add a phone or email for {p.client.name} in <Link href={`${base}/settings`} className="underline underline-offset-2">Settings</Link> to nudge them.</p>
              )}
              {p.next_step && (
                <p className="px-1 text-sm text-muted">
                  Their next step, as they see it: &ldquo;{p.next_step}&rdquo; <Link href={`${base}/settings`} className="text-ink underline underline-offset-2">Edit</Link>
                </p>
              )}
            </section>
          ) : (
          <section className="flex flex-col gap-3">
            <SectionHead title="Coming up" href={`${base}/tasks`} />
            {open.length === 0 ? (
              <Empty icon="tasks">{tasks.length ? "Every task is done." : "Tasks show up here once the work is planned."}</Empty>
            ) : open.map((t) => {
              const state = taskState(t, today);
              const theirs = t.waiting_on === "client";
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-[22px] bg-card p-3 pl-4">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full border ${theirs ? "border-nova/30 text-nova" : "border-line"}`}>
                    <Icon name={theirs ? "user" : "code"} className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.title}</p>
                    <p className="truncate text-sm text-faint">{t.due_on ? `Due ${shortDate(t.due_on)}` : "No due date"}</p>
                  </div>
                  {state === "late" ? <Pill tone="danger">Late</Pill>
                    : theirs ? <Pill tone="nova">{isAdmin ? "Client's turn" : "Your turn"}</Pill>
                    : <Pill>In progress</Pill>}
                  <RoundLink href={`${base}/tasks`} icon="next" label={`Open tasks`} />
                </div>
              );
            })}
          </section>
          )}

          {/* With 5 or fewer, this is the whole list, so links to #updates land here. */}
          <section id={moreLog ? undefined : "updates"} className="flex scroll-mt-6 flex-col gap-3">
            <SectionHead title="Latest updates" href={moreLog ? "#updates" : undefined} more={`View all ${log.length}`} />
            <Card className="p-2">
              <ul>
                {log.slice(0, 5).map((a) => <LogRow key={a.id} a={a} when={ago(a.at)} />)}
              </ul>
            </Card>
          </section>
        </div>
      </div>

      {isAdmin && waiting.length > 0 && (
        <section id="waiting" className="flex scroll-mt-6 flex-col gap-3">
          <SectionHead title={`Everything waiting on ${p.client.name}`}><span className="text-sm text-muted">{waiting.length} open</span></SectionHead>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">{waiting.map(waitingRow)}</div>
        </section>
      )}
      {moreLog && (
        <section id="updates" className="flex scroll-mt-6 flex-col gap-3">
          <SectionHead title="All updates"><span className="text-sm text-muted">{log.length} changes</span></SectionHead>
          <p className="flex items-start gap-2 px-1 text-sm text-muted">
            <Icon name="shield" className="mt-0.5 size-4 shrink-0 text-ok" />
            <span>The hub writes these by itself whenever a task, payment, stage or file changes. Nobody can edit or delete them.</span>
          </p>
          <DayLog log={log} />
        </section>
      )}
    </div>
  );
}
