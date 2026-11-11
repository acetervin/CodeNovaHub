import Link from "next/link";
import type { ReactNode } from "react";
import { rows, session } from "@/lib/supabase";
import { ActivityTile, Empty, ago } from "./ui";
import { FeedSplit } from "./FeedSplit";

/** `children` (the page's main panel) beside the newest changes across every project the viewer can see.
 *  `className` lays out the two side by side; see FeedSplit for how the feed fits the panel. */
export async function Updates({ className, children }: { className: string; children: ReactNode }) {
  const { db } = await session();
  const log = rows(await db.from("activity").select("id, at, actor, summary, kind, project_id, projects(name)")
    .order("at", { ascending: false }).order("id", { ascending: false }).limit(40));
  const items = log.map((a) => ({
    key: a.id,
    node: (
      <Link href={`/p/${a.project_id}#updates`} className="flex items-start gap-3 rounded-2xl p-3 transition-colors duration-150 hover:bg-paper">
        <ActivityTile kind={a.kind} />
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline justify-between gap-3">
            <span className="truncate font-medium">{(a.projects as unknown as { name: string }).name}</span>
            <time dateTime={a.at} className="shrink-0 text-xs text-faint">{ago(a.at)}</time>
          </p>
          <p className="text-sm text-muted"><span className="text-ink">{a.actor}:</span> {a.summary}</p>
        </div>
      </Link>
    ),
  }));
  return (
    <FeedSplit className={className} title="Latest updates" rest="Earlier updates" items={items}
      empty={<Empty icon="history">Changes to projects show up here.</Empty>}>
      {children}
    </FeedSplit>
  );
}
