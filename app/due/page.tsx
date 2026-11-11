import Link from "next/link";
import { adminDb, rows, session } from "@/lib/supabase";
import { nairobiToday } from "@/lib/form";
import { shillings, shortDate } from "@/lib/stages";
import { daysBetween, daysLabel } from "@/lib/progress";
import { Shell } from "@/components/Shell";
import { Empty, Pill } from "@/components/ui";
import { Updates } from "@/components/Updates";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

type Row = { key: string; kind: "task" | "payment"; title: string; project: string; client: string; href: string; due: string | null; days: number | null };

// Kevin's schedule: every open task and unpaid payment across all projects, soonest first.
export default async function Due() {
  const db = await adminDb();
  const { login } = await session();
  const [tasksQ, paysQ] = await Promise.all([
    db.from("milestones").select("id, title, due_on, waiting_on, project_id, projects(name, status, clients(name))").is("done_on", null),
    db.from("payments").select("id, label, amount_kes, due_on, project_id, projects(name, status, clients(name))").is("paid_on", null),
  ]);
  const tasks = rows(tasksQ), pays = rows(paysQ);

  const today = nairobiToday();
  type P = { name: string; status: string; clients: { name: string } };
  const items: Row[] = [
    ...tasks.map((t) => ({ ...t, kind: "task" as const, title: t.waiting_on === "client" ? `${t.title} (client's turn)` : t.title, href: `/p/${t.project_id}/tasks` })),
    ...pays.map((x) => ({ ...x, kind: "payment" as const, title: `${x.label}, ${shillings(x.amount_kes)}`, href: `/p/${x.project_id}/payments` })),
  ]
    .filter((r) => (r.projects as unknown as P).status !== "closed")
    .map((r) => {
      const p = r.projects as unknown as P;
      return { key: `${r.kind}-${r.id}`, kind: r.kind, title: r.title, project: p.name, client: p.clients.name, href: r.href, due: r.due_on, days: r.due_on ? daysBetween(today, r.due_on) : null };
    })
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));

  const owed = pays.filter((x) => (x.projects as unknown as P).status !== "closed").reduce((sum, x) => sum + x.amount_kes, 0);
  const sections = [
    ["Late", "bg-danger", items.filter((r) => r.days !== null && r.days < 0)],
    ["Next 7 days", "bg-nova", items.filter((r) => r.days !== null && r.days >= 0 && r.days <= 7)],
    ["Later", "bg-muted", items.filter((r) => r.days !== null && r.days > 7)],
    ["No due date", "bg-faint", items.filter((r) => r.days === null)],
  ] as const;

  return (
    <Shell items={[{ href: "/", label: "Projects", icon: "home", exact: true }, { href: "/due", label: "Schedule", icon: "calendar" }]} who={login}>
      <h1 className="text-2xl font-semibold tracking-[-0.02em] lg:text-[2rem]">Schedule</h1>
      <Updates className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex flex-col gap-5 self-start rounded-card bg-card p-3 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
            <h2 className="text-xl font-semibold">Open tasks and payments</h2>
            <p className="text-sm text-muted"><span className="font-medium text-ink">{shillings(owed)}</span> still to be paid</p>
          </div>
          {items.length === 0 && <Empty icon="calendar">Nothing open. Every task is done and every payment is in.</Empty>}
          {sections.map(([label, dot, list]) => list.length > 0 && (
          <section key={label} className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 px-1 text-sm font-semibold">
              <span aria-hidden className={`size-2 rounded-full ${dot}`} />
              {label}
              <span className="min-w-6 rounded-full bg-paper px-1.5 py-0.5 text-center text-xs font-medium tabular-nums text-muted">{list.length}</span>
            </h3>
            <ul className="flex flex-col gap-2">
              {list.map((r) => (
                <li key={r.key}>
                  <Link href={r.href} className="btn flex items-center gap-3 rounded-[20px] bg-paper p-3 pl-4">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full ${r.days !== null && r.days < 0 ? "bg-danger-soft text-danger" : "bg-card"}`}>
                      <Icon name={r.kind === "task" ? "tasks" : "wallet"} className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{r.title}</p>
                      <p className="truncate text-sm text-faint">{r.project}, {r.client}{r.due && `, ${shortDate(r.due)}`}</p>
                    </div>
                    {r.days !== null && <Pill tone={r.days < 0 ? "danger" : r.days <= 7 ? "nova" : "plain"}>{daysLabel(r.days)}</Pill>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          ))}
        </section>
      </Updates>
    </Shell>
  );
}
