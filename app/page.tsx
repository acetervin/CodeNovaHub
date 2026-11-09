import Link from "next/link";
import { redirect } from "next/navigation";
import { rows, session } from "@/lib/supabase";
import { nairobiToday } from "@/lib/form";
import { STAGES } from "@/lib/stages";
import { Field, Input, Select } from "@/components/fields";
import { Submit } from "@/components/Submit";
import { Shell } from "@/components/Shell";
import type { NavItem } from "@/components/Nav";
import { ProjectCard, type CardProject } from "@/components/ProjectCard";
import { Avatar, Empty, Sheet, SheetButton } from "@/components/ui";
import { Updates } from "@/components/Updates";
import { Icon } from "@/components/icons";
import { createProject } from "./actions";

export const dynamic = "force-dynamic";

// Dot colours match the project cards' stage colours.
const GROUPS = {
  active: { label: "In progress", stages: ["signed", "building", "review"], dot: "bg-nova" },
  upcoming: { label: "Upcoming", stages: ["enquiry", "quoted"], dot: "bg-lilac-ink" },
  live: { label: "Live", stages: ["live", "care"], dot: "bg-ok" },
} as const;
type Group = keyof typeof GROUPS;

// Kevin gets the studio dashboard. A client with one project goes straight to it; with several, picks one here.
export default async function Home({ searchParams }: PageProps<"/">) {
  const { code, q, show } = await searchParams;
  // Supabase sends people to the Site URL root when a redirect link isn't on its allow list.
  if (typeof code === "string") redirect(`/auth/confirm?code=${encodeURIComponent(code)}`);
  const { db, isAdmin, name, login } = await session();

  const [projectsQ, contactsQ] = await Promise.all([
    db.from("projects").select("id, name, status, started_on, created_at, clients(id, name), milestones(due_on, done_on)").order("name"),
    db.from("contacts").select("client_id, name").order("name"),
  ]);
  const projects = rows(projectsQ), contacts = rows(contactsQ);

  const people = Map.groupBy(contacts, (c) => c.client_id as string);
  const order = Object.fromEntries(STAGES.map(([s], i) => [s, i]));
  const cards: (CardProject & { clientId: string })[] = projects
    .map((p) => {
      const c = p.clients as unknown as { id: string; name: string };
      return { ...p, client: c.name, clientId: c.id, tasks: p.milestones, people: (people.get(c.id) ?? []).map((x) => x.name as string) };
    })
    .sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));
  if (!isAdmin && cards.length === 1) redirect(`/p/${cards[0].id}`);

  const today = nairobiToday();
  const items: NavItem[] = [
    { href: "/", label: "Projects", icon: "home", exact: true },
    ...(isAdmin ? [{ href: "/due", label: "Schedule", icon: "calendar" } as const] : []),
  ];
  if (!isAdmin) {
    return (
      <Shell items={items} who={login}>
        <h1 className="text-[clamp(1.85rem,4.2vw,2.6rem)] font-semibold leading-[1.12] tracking-[-0.025em]">
          Hey {name ?? "there"}, <span aria-hidden>👋</span>
          <span className="block text-faint">{cards.length ? "Pick a project to follow." : "Nothing here yet."}</span>
        </h1>
        {cards.length === 0 ? (
          <p className="mt-6 max-w-md text-muted">No projects are linked to {login} yet. If that&rsquo;s wrong, message CodeNova on WhatsApp and we&rsquo;ll fix it.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 2xl:grid-cols-4 min-[1800px]:grid-cols-5">{cards.map((p) => <ProjectCard key={p.id} p={p} today={today} showClient={false} />)}</div>
            <Updates />
          </div>
        )}
      </Shell>
    );
  }

  const group = typeof show === "string" && show in GROUPS ? (show as Group) : null;
  const term = typeof q === "string" ? q.trim().toLowerCase() : "";
  const shown = cards.filter((p) =>
    (!group || (GROUPS[group].stages as readonly string[]).includes(p.status)) &&
    (!term || p.name.toLowerCase().includes(term) || p.client.toLowerCase().includes(term)));
  const count = (g: Group) => cards.filter((p) => (GROUPS[g].stages as readonly string[]).includes(p.status)).length;
  const clients = [...new Map(cards.map((p) => [p.clientId, p.client])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const href = (g: Group | null) => `/${g || term ? "?" : ""}${new URLSearchParams({ ...(g && { show: g }), ...(term && { q: term }) })}`;

  return (
    <Shell items={items} who={login}>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold tracking-[-0.02em] lg:text-[2rem]">Studio</h1>
        <form role="search" className="order-last w-full sm:order-none sm:w-72">
          {group && <input type="hidden" name="show" value={group} />}
          <label className="flex items-center gap-2 rounded-full bg-card px-4 py-3 text-faint focus-within:ring-2 focus-within:ring-ink">
            <Icon name="search" className="size-[18px] shrink-0" />
            <input name="q" type="search" defaultValue={term} placeholder="Search projects or clients" aria-label="Search projects or clients"
              className="w-full bg-transparent text-ink outline-none placeholder:text-faint" />
          </label>
        </form>
        <SheetButton target="new-project" label="New project" dark />
        <Avatar name="Kevin" className="size-12 text-base" />
      </header>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="self-start rounded-card bg-card p-3 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="px-1 text-xl font-semibold">Projects</h2>
            {/* Phones: four equal columns, count under the label, so all four fit. Wider: one pill row. */}
            <nav aria-label="Filter projects" className="grid w-full grid-cols-4 gap-1 rounded-[20px] bg-paper p-1 sm:flex sm:w-auto sm:rounded-full">
              {([null, ...Object.keys(GROUPS)] as (Group | null)[]).map((g) => {
                const on = group === g;
                return (
                  <Link key={g ?? "all"} href={href(g)} aria-current={on ? "page" : undefined}
                    className={`btn flex flex-col items-center gap-1 rounded-2xl py-1.5 text-xs font-medium transition-colors duration-150 sm:flex-row sm:gap-2 sm:rounded-full sm:pl-3 sm:pr-1.5 sm:text-sm ${on ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      {g && <span aria-hidden className={`hidden size-2 shrink-0 rounded-full sm:block ${GROUPS[g].dot}`} />}
                      {g ? GROUPS[g].label : "All"}
                    </span>
                    <span className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs tabular-nums ${on ? "bg-white/15" : "bg-card text-ink"}`}>{g ? count(g) : cards.length}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          {shown.length === 0 ? (
            <div className="mt-4"><Empty icon="search">No projects match{term ? ` "${term}"` : ""}. <Link href="/" className="underline">Show all</Link></Empty></div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 2xl:grid-cols-4 min-[1800px]:grid-cols-5">
              {shown.map((p) => <ProjectCard key={p.id} p={p} today={today} />)}
            </div>
          )}
        </section>
        <Updates />
      </div>

      <Sheet id="new-project" title="New project">
        <form action={createProject} className="flex flex-col gap-4">
          <Field label="Project name"><Input name="name" required maxLength={200} placeholder="Company website" /></Field>
          <Field label="Existing client">
            <Select name="client_id" defaultValue=""><option value="">Choose…</option>{clients.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</Select>
          </Field>
          <Field label="Or a new client"><Input name="new_client" maxLength={200} placeholder="Client's business name" /></Field>
          <Submit pending="Creating…">Create project</Submit>
        </form>
      </Sheet>
    </Shell>
  );
}
