import { getProject, session } from "@/lib/supabase";
import { DayLog, Empty, TopBar } from "@/components/ui";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function PaymentHistory({ params }: PageProps<"/p/[id]/payments/history">) {
  const { id } = await params;
  const [{ db }] = await Promise.all([session(), getProject(id)]);
  // shortcut: shows the latest 300 payment changes; add paging once a project grows past that.
  const { data: log, error } = await db.from("activity").select("id, at, actor, summary, kind").eq("project_id", id).eq("kind", "payment")
    .order("at", { ascending: false }).order("id", { ascending: false }).limit(300);
  if (error) throw error;

  return (
    <div className="flex flex-col gap-4">
      <TopBar title="Payment history" back={`/p/${id}/payments`} />
      <p className="flex items-start gap-2 px-1 text-sm text-muted">
        <Icon name="shield" className="mt-0.5 size-4 shrink-0 text-ok" />
        <span>
          The hub records every payment added, received or changed, with who did it. It can&rsquo;t be edited or
          deleted from the hub, so both sides can rely on it.
        </span>
      </p>
      {log.length === 0 ? <Empty icon="history">Every payment added, received or changed is recorded here, with who did it.</Empty> : <DayLog log={log} heading="h2" />}
    </div>
  );
}
