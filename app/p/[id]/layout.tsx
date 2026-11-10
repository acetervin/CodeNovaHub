import { getProject, session } from "@/lib/supabase";
import { Shell, type MenuLink } from "@/components/Shell";
import type { NavItem } from "@/components/Nav";

export default async function ProjectLayout({ children, params }: LayoutProps<"/p/[id]">) {
  const { id } = await params;
  const [{ isAdmin, login }] = await Promise.all([session(), getProject(id)]);
  const base = `/p/${id}`;
  const items: NavItem[] = [
    { href: base, label: "Overview", icon: "home", exact: true },
    { href: `${base}/tasks`, label: "Tasks", icon: "tasks" },
    { href: `${base}/files`, label: "Files", icon: "file" },
    { href: `${base}/payments`, label: "Payments", icon: "wallet" },
    ...(isAdmin ? [{ href: `${base}/settings`, label: "Settings", icon: "settings" } as const] : []),
  ];
  const links: MenuLink[] = [
    { href: `${base}/history`, label: "Project history", icon: "history" },
    { href: "/", label: isAdmin ? "All projects" : "Your projects", icon: "home" },
    ...(isAdmin ? [{ href: "/due", label: "Schedule", icon: "calendar" } as const] : []),
  ];
  return <Shell items={items} links={links} who={login}>{children}</Shell>;
}
