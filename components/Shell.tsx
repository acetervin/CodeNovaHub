import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { signOut } from "@/app/login/actions";
import { Flash } from "./Flash";
import { Icon, type IconName } from "./icons";
import { Nav, type NavItem } from "./Nav";

export type MenuLink = { href: string; label: string; icon: IconName };

/** Page frame shared by every signed-in screen: navigation, the "more" menu, and room for the tab bar.
 *  `fit`: on desktop the page is exactly one screen tall and its panels scroll inside themselves instead. */
export function Shell({ items, links = [], who, fit, children }: { items: NavItem[]; links?: MenuLink[]; who: string; fit?: boolean; children: ReactNode }) {
  const row = "btn flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left hover:bg-paper";
  const menu = (
    <>
      <p className="truncate px-4 pb-2 pt-2 text-sm text-muted">Signed in as {who}</p>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={row}><Icon name={l.icon} className="size-[18px]" />{l.label}</Link>
      ))}
      <form action={signOut}>
        <button className={row}><Icon name="logout" className="size-[18px]" />Log out</button>
      </form>
    </>
  );
  return (
    <>
      <Nav items={items} menu={menu} />
      <div className="lg:pl-60">
        <main className={`px-4 pb-32 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-6 ${fit ? "xl:flex xl:h-dvh xl:flex-col xl:pb-6" : ""}`}>
          <Suspense><Flash /></Suspense>
          {children}
        </main>
      </div>
    </>
  );
}
