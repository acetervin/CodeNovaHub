import { getProject, session } from "@/lib/supabase";
import { ActivityTile, Card, Empty, TopBar } from "@/components/ui";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

const day = (at: string) => new Date(at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi" });
const time = (at: string) => new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });

export default async function History({ params }: PageProps<"/p/[id]/history">) {
  const { id } = await params;
  const [{ db }] = await Promise.all([session(), getProject(id)]);
  // shortcut: shows the latest 300 entries; add paging once a project's history grows past that.
  const { data: log, error } = await db.from("activity").select("id, at, actor, summary, kind").eq("project_id", id)
    .order("at", { ascending: false }).order("id", { ascending: false }).limit(300);
  if (error) throw error;
  const days = Map.groupBy(log, (a) => day(a.at));

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <TopBar title="History" back={`/p/${id}`} />
      <div className="flex items-start gap-3 px-1">
        <Icon name="shield" className="mt-0.5 size-5 shrink-0 text-ok" />
        <p className="text-sm text-muted">
          The hub writes this record by itself whenever a task, payment, stage or file changes. It can&rsquo;t be edited
          or deleted from the hub, so both sides can rely on it.
        </p>
      </div>
      {log.length === 0 ? <Empty icon="history">Nothing has happened on this project yet.</Empty> : [...days].map(([d, rows]) => (
        <section key={d} className="flex flex-col gap-2">
          <h2 className="px-1 text-sm text-faint">{d}</h2>
          <Card className="p-2">
            <ul>
              {rows.map((a) => (
                <li key={a.id} className="flex items-start gap-3 rounded-2xl p-3">
                  <ActivityTile kind={a.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{a.actor}</span>
                      <time dateTime={a.at} className="shrink-0 text-xs tabular-nums text-faint">{time(a.at)}</time>
                    </p>
                    <p className="text-sm text-muted">{a.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}
