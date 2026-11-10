import Link from "next/link";
import { getProject, session } from "@/lib/supabase";
import { nairobiToday } from "@/lib/form";
import { shortDate } from "@/lib/stages";
import { completion, newestFirst, taskState, weeklyCompletion, type TaskState } from "@/lib/progress";
import { Field, Input, Select } from "@/components/fields";
import { Submit } from "@/components/Submit";
import { Avatar, Bars, Card, Empty, Pill, Sheet, SheetButton, TopBar } from "@/components/ui";
import { Icon } from "@/components/icons";
import * as act from "../actions";

export const dynamic = "force-dynamic";

const look: Record<TaskState, { ring: string; dot: string; line: string; tile: string; pill: "ok" | "danger" | "nova"; label: string }> = {
  done: { ring: "border-ok", dot: "bg-ok", line: "bg-ok", tile: "bg-ok", pill: "ok", label: "Completed" },
  late: { ring: "border-danger", dot: "bg-danger", line: "bg-danger", tile: "bg-danger", pill: "danger", label: "Delayed" },
  open: { ring: "border-nova", dot: "bg-nova", line: "bg-nova/40", tile: "bg-nova", pill: "nova", label: "In progress" },
};

export default async function Tasks({ params, searchParams }: PageProps<"/p/[id]/tasks">) {
  const { id } = await params;
  const { show } = await searchParams;
  const [{ db, isAdmin }, p] = await Promise.all([session(), getProject(id)]);
  const { data: tasks, error } = await db.from("milestones").select("*").eq("project_id", id)
    .order("due_on", { nullsFirst: false }).order("position");
  if (error) throw error;

  const today = nairobiToday();
  const filter = show === "open" || show === "done" ? show : "all";
  // Newest first for everyone: what's coming and current on top, finished work below.
  const list = newestFirst(tasks).filter((t) => filter === "all" || (filter === "done") === !!t.done_on);
  const tabs = [
    ["all", `All (${tasks.length})`],
    ["open", `In progress (${tasks.filter((t) => !t.done_on).length})`],
    ["done", `Completed (${tasks.filter((t) => t.done_on).length})`],
  ] as const;
  const pct = completion(tasks);
  const count = (s: TaskState) => tasks.filter((t) => taskState(t, today) === s).length;
  const yours = tasks.filter((t) => !t.done_on && t.waiting_on === "client").length;

  return (
    <div className="flex flex-col gap-5">
      <TopBar title="Tasks" back={`/p/${id}`}>
        {isAdmin && <SheetButton target="add-task" label="New task" />}
      </TopBar>

      <nav aria-label="Filter tasks" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {tabs.map(([key, label]) => (
          <Link key={key} href={`/p/${id}/tasks${key === "all" ? "" : `?show=${key}`}`} replace scroll={false} aria-current={filter === key ? "page" : undefined}
            className={`btn shrink-0 rounded-full px-4 py-3 text-sm sm:px-5 ${filter === key ? "bg-ink text-white" : "bg-card"}`}>{label}</Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div>
      {list.length === 0 ? (
        <Empty icon="tasks">
          {tasks.length === 0 ? (isAdmin ? "No tasks yet. Add the first one with New task." : "The plan for your project will show up here.")
            : filter === "done" ? "Nothing finished yet." : "Nothing open. Every task is done."}
        </Empty>
      ) : (
        <ol>
          {list.map((t, i) => {
            const state = taskState(t, today);
            const s = look[state];
            const theirs = t.waiting_on === "client";
            return (
              <li key={t.id} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3">
                <div className="relative flex justify-center" aria-hidden>
                  {i < list.length - 1 && <span className={`absolute bottom-0 top-8 w-0.5 ${s.line}`} />}
                  <span className={`relative mt-5 grid size-6 place-items-center rounded-full border-2 bg-card ${s.ring}`}>
                    <span className={`size-2.5 rounded-full ${s.dot}`} />
                  </span>
                </div>
                <article className="mb-3 rounded-[24px] bg-card p-4">
                  <div className="flex items-start gap-3">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full text-white ${s.tile}`}>
                      <Icon name={state === "done" ? "check" : state === "late" ? "alert" : theirs ? "user" : "code"} className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-medium leading-snug">{t.title}</h2>
                      <p className="text-sm text-faint">
                        {theirs ? (isAdmin ? `Waiting on ${p.client.name}` : "Waiting on you") : isAdmin ? "With CodeNova" : "CodeNova is on it"}
                      </p>
                    </div>
                    <Pill tone={s.pill}>{s.label}</Pill>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                    <Icon name="calendar" className="size-4" />
                    <span className={`flex-1 ${state === "late" ? "text-danger" : ""}`}>
                      {t.done_on ? `Done ${shortDate(t.done_on)}` : t.due_on ? `${state === "late" ? "Was due" : "Due"} ${shortDate(t.due_on)}` : "No due date"}
                    </span>
                    <Avatar name={theirs ? p.client.name : "CodeNova"} className="size-7 text-[11px]" />
                  </div>
                  {isAdmin && (
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                      <form action={act.toggleMilestone.bind(null, id, t.id, !t.done_on)}>
                        <Submit look={t.done_on ? "quiet" : "primary"} pending="Saving…" className="!py-2">{t.done_on ? "Reopen" : "Mark done"}</Submit>
                      </form>
                      <details className="text-right">
                        <summary className="cursor-pointer list-none text-sm text-muted underline underline-offset-2">Remove</summary>
                        <form action={act.deleteMilestone.bind(null, id, t.id)} className="mt-2">
                          <Submit look="danger" pending="Removing…" className="!py-2">Remove for good</Submit>
                        </form>
                      </details>
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      )}

      </div>

      {/* Desktop only: the reference's "overall completion" panel, so the wide screen isn't half empty. */}
      <Card className="hidden lg:sticky lg:top-6 lg:block">
        <h2 className="font-medium">Overall completion</h2>
        <div className="mt-2 flex items-end justify-between gap-4">
          <p className="text-6xl font-semibold leading-none tracking-[-0.04em] tabular-nums">{pct ?? "–"}<span className="text-3xl tracking-normal">%</span></p>
          <Pill dot={count("late") ? "danger" : "ok"}>{count("late") ? `${count("late")} late` : "On track"}</Pill>
        </div>
        <Bars values={weeklyCompletion(tasks, today, 10)} label="Completion over the last 10 weeks" className="mt-5 h-28" />
        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
          <div><dt className="text-faint">Completed</dt><dd className="text-lg font-semibold tabular-nums text-ok">{count("done")}</dd></div>
          <div><dt className="text-faint">In progress</dt><dd className="text-lg font-semibold tabular-nums text-nova-ink">{count("open")}</dd></div>
          <div><dt className="text-faint">Delayed</dt><dd className="text-lg font-semibold tabular-nums text-danger">{count("late")}</dd></div>
          <div><dt className="text-faint">{isAdmin ? "Client's turn" : "Your turn"}</dt><dd className="text-lg font-semibold tabular-nums">{yours}</dd></div>
        </dl>
      </Card>
      </div>

      {isAdmin && (
        <Sheet id="add-task" title="New task">
          <form action={act.addMilestone.bind(null, id)} className="flex flex-col gap-4">
            <Field label="What needs doing" hint="The client sees this."><Input name="title" required maxLength={200} placeholder="Homepage design approved" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Due"><Input name="due_on" type="date" /></Field>
              <Field label="Waiting on">
                <Select name="waiting_on" defaultValue="codenova"><option value="codenova">CodeNova</option><option value="client">The client</option></Select>
              </Field>
            </div>
            <Submit pending="Adding…">Add task</Submit>
          </form>
        </Sheet>
      )}
    </div>
  );
}
