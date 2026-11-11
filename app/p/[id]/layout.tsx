import { getProject, session } from "@/lib/supabase";
import { Shell, type MenuLink } from "@/components/Shell";
import type { NavItem } from "@/components/Nav";

export default async function ProjectLayout({ children, params }: LayoutProps<"/p/[id]">) {
  const { id } = await params;
  const [{ db, isAdmin, login }, p] = await Promise.all([session(), getProject(id)]);
  // A client with one project has nowhere else to go, so they get no "Your projects" link.
  const several = isAdmin || ((await db.from("projects").select("id", { count: "exact", head: true })).count ?? 0) > 1;
  const base = `/p/${id}`;
  // Desktop sidebar: these stay on top on every page, with the project's own pages under its name.
  const top: NavItem[] = [
    ...(several ? [{ href: "/", label: isAdmin ? "Projects" : "Your projects", icon: "home", exact: true } as const] : []),
    ...(isAdmin ? [{ href: "/due", label: "Schedule", icon: "calendar" } as const] : []),
  ];
  const items: NavItem[] = [
    { href: base, label: "Overview", icon: "overview", exact: true },
    { href: `${base}/tasks`, label: "Tasks", icon: "tasks" },
    { href: `${base}/files`, label: "Files", icon: "file" },
    { href: `${base}/payments`, label: "Payments", icon: "wallet" },
    ...(isAdmin ? [{ href: `${base}/settings`, label: "Settings", icon: "settings" } as const] : []),
  ];
  const links: MenuLink[] = [
    { href: `${base}#updates`, label: "All updates", icon: "history" },
    ...top.map((t) => ({ ...t, phone: true })),
  ];
  return <Shell items={top} group={{ title: p.name, items }} links={links} who={login}>{children}</Shell>;
}
