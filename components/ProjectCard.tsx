import Link from "next/link";
import { shortDate, stageLabel } from "@/lib/stages";
import { completion, daysLabel, nextDue } from "@/lib/progress";
import { Avatar, Progress } from "./ui";

// The card colour says which stage a project is in.
const stageLook: Record<string, { bg: string; bar: string; text: string }> = {
  enquiry: { bg: "bg-lilac", bar: "bg-lilac-ink", text: "text-lilac-ink" },
  quoted: { bg: "bg-lilac", bar: "bg-lilac-ink", text: "text-lilac-ink" },
  signed: { bg: "bg-peach", bar: "bg-nova", text: "text-nova-ink" },
  building: { bg: "bg-peach", bar: "bg-nova", text: "text-nova-ink" },
  review: { bg: "bg-rose", bar: "bg-rose-ink", text: "text-rose-ink" },
  live: { bg: "bg-mint", bar: "bg-ok", text: "text-ok" },
  care: { bg: "bg-mint", bar: "bg-ok", text: "text-ok" },
  closed: { bg: "bg-card", bar: "bg-faint", text: "text-muted" },
};

export type CardProject = {
  id: string; name: string; status: string; started_on: string | null; created_at: string;
  client: string; tasks: { due_on: string | null; done_on: string | null }[]; people: string[];
};

export function ProjectCard({ p, today, showClient = true }: { p: CardProject; today: string; showClient?: boolean }) {
  const look = stageLook[p.status] ?? stageLook.closed;
  const pct = completion(p.tasks);
  const due = nextDue(p.tasks, today);
  return (
    <Link href={`/p/${p.id}`} className={`btn flex flex-col rounded-[20px] p-3 sm:rounded-[24px] sm:p-4 ${look.bg}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 text-xs">
        <span className="text-muted">{shortDate(p.started_on ?? p.created_at)}</span>
        <span className={`font-medium ${look.text}`}>{stageLabel[p.status]}</span>
      </div>
      <div className="my-3 text-center">
        <h3 className="text-[15px] font-semibold leading-snug sm:text-lg">{p.name}</h3>
        {showClient && <p className="text-xs text-muted sm:text-sm">{p.client}</p>}
      </div>
      <div className="mt-auto">
        <div className="mb-2 flex items-baseline justify-between gap-2 text-xs sm:text-sm">
          <span className="font-medium">Progress</span>
          <span className="tabular-nums text-muted">{pct === null ? "No tasks" : `${pct}%`}</span>
        </div>
        <Progress value={pct ?? 0} color={look.bar} label={`${p.name} progress`} />
      </div>
      <div className="-mx-3 mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.06] px-3 pt-3 sm:-mx-4 sm:px-4">
        <span className="flex -space-x-2">
          {p.people.slice(0, 2).map((n) => <Avatar key={n} name={n} className="size-7 text-[11px]" />)}
          {p.people.length > 2 && <span className="grid size-7 place-items-center rounded-full bg-white text-[11px] ring-2 ring-white">+{p.people.length - 2}</span>}
          {p.people.length === 0 && <span className="hidden text-xs text-muted sm:inline">No logins yet</span>}
        </span>
        {due ? (
          <span className={`rounded-full bg-white/80 px-2.5 py-1.5 text-xs font-medium ${due.days < 0 ? "text-danger" : look.text}`}>{daysLabel(due.days)}</span>
        ) : (
          <span className="rounded-full bg-white/80 px-2.5 py-1.5 text-xs text-muted">{pct === 100 ? "All done" : "No due dates"}</span>
        )}
      </div>
    </Link>
  );
}
