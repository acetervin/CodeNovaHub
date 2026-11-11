"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, Mark, type IconName } from "./icons";

export type NavItem = { href: string; label: string; icon: IconName; exact?: boolean };
export type NavGroup = { title: string; items: NavItem[] };

/** Labelled sidebar on desktop, floating frosted tab bar on phones. `menu` fills the "more" popover.
 *  `group` (a project's pages): the sidebar lists it under `items`; the tab bar has room for it alone. */
export function Nav({ items, group, menu }: { items: NavItem[]; group?: NavGroup; menu: ReactNode }) {
  const path = usePathname();
  const active = (i: NavItem) => path === i.href || (!i.exact && path.startsWith(`${i.href}/`));
  const side = "btn flex items-center gap-3 rounded-full px-4 py-3 text-[15px]";
  const sideLink = (i: NavItem) => (
    <Link key={i.href} href={i.href} aria-current={active(i) ? "page" : undefined}
      className={`${side} ${active(i) ? "bg-ink text-white" : "text-ink/75 hover:bg-card hover:text-ink"}`}>
      <Icon name={i.icon} />{i.label}
    </Link>
  );
  const tab = "btn flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-[22px] px-1 pb-1.5 pt-2 text-[11px] font-medium";

  return (
    <>
      <nav aria-label="Main" className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-1 px-4 py-6 lg:flex">
        <Link href="/" className="mb-6 flex items-center gap-3 px-2">
          <span className="grid size-11 place-items-center rounded-2xl bg-nova text-white"><Mark /></span>
          <span className="font-semibold leading-tight">CodeNova<span className="block text-sm font-normal text-faint">Project hub</span></span>
        </Link>
        {items.map(sideLink)}
        {group && (
          <>
            <p className={`truncate px-4 pb-1 text-sm text-faint ${items.length ? "mt-4 border-t border-line pt-4" : ""}`}>{group.title}</p>
            {group.items.map(sideLink)}
          </>
        )}
        <button popoverTarget="more" className={`${side} mt-auto text-ink/75 hover:bg-card hover:text-ink`}>
          <Icon name="more" />More
        </button>
      </nav>

      <nav aria-label="Main" className="tabbar fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom,0px))] z-30 mx-auto flex max-w-md gap-1 rounded-[28px] p-1.5 lg:hidden">
        {(group?.items ?? items).map((i) => (
          <Link key={i.href} href={i.href} aria-current={active(i) ? "page" : undefined}
            className={`${tab} ${active(i) ? "bg-ink text-white" : "text-ink/70"}`}>
            <Icon name={i.icon} className="size-[22px]" /><span className="max-w-full truncate">{i.label}</span>
          </Link>
        ))}
        <button popoverTarget="more" className={`${tab} text-ink/70`}>
          <Icon name="more" className="size-[22px]" /><span>More</span>
        </button>
      </nav>

      <div popover="auto" id="more" className="menu">{menu}</div>
    </>
  );
}
