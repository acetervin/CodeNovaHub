import Link from "next/link";
import { rows, session } from "@/lib/supabase";
import { ActivityTile, Card, Empty, ago } from "./ui";

/** Newest changes across every project the viewer can see. Scrolls inside its own box, and on wide screens stays in view.
 *  `fill`: on a one-screen page (Shell `fit`) it takes the column's height instead of sticking. */
export async function Updates({ fill }: { fill?: boolean }) {
  const { db } = await session();
  const log = rows(await db.from("activity").select("id, at, actor, summary, kind, project_id, projects(name)")
    .order("at", { ascending: false }).order("id", { ascending: false }).limit(40));
  return (
    <section className={`flex flex-col gap-3 xl:self-start ${fill ? "xl:max-h-full" : "xl:sticky xl:top-6"}`}>
      <h2 className="shrink-0 px-1 text-lg font-semibold">Latest updates</h2>
      {log.length === 0 ? <Empty icon="history">Changes to projects show up here.</Empty> : (
        // Sticky: sized to fit on screen under the page title. The cut-off last item shows there's more.
        <Card className={`max-h-[28rem] overflow-y-auto p-2 [scrollbar-width:none] xl:overscroll-contain ${fill ? "xl:max-h-none xl:min-h-0" : "xl:max-h-[calc(100dvh-11.25rem)]"}`}>
          <ul>
            {log.map((a) => (
              <li key={a.id}>
                <Link href={`/p/${a.project_id}/history`} className="flex items-start gap-3 rounded-2xl p-3 transition-colors duration-150 hover:bg-paper">
                  <ActivityTile kind={a.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-medium">{(a.projects as unknown as { name: string }).name}</span>
                      <time dateTime={a.at} className="shrink-0 text-xs text-faint">{ago(a.at)}</time>
                    </p>
                    <p className="text-sm text-muted"><span className="text-ink">{a.actor}:</span> {a.summary}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
