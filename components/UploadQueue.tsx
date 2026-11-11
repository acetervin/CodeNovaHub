"use client";
import { useSyncExternalStore } from "react";
import { remove, retry, uploadStore } from "@/lib/upload-queue";
import { FileTile } from "./FileTile";

/** Files still on their way, as tiles at the front of the General files grid, with progress or Retry. */
export function UploadQueue({ projectId }: { projectId: string }) {
  const uploads = useSyncExternalStore(uploadStore.subscribe, uploadStore.get, uploadStore.getServer).filter((u) => u.projectId === projectId);
  return uploads.map((u) => {
    const pct = Math.round(u.progress * 100);
    return (
      <li key={u.key} className="flex min-w-0 flex-col gap-2 rounded-[24px] bg-card p-2">
        <div className="relative">
          <FileTile name={u.file.name} src={u.thumb} className={u.state === "failed" ? "opacity-50" : ""} />
          {u.state !== "failed" && (
            <div role="progressbar" aria-label={`Uploading ${u.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
              className="absolute inset-x-3 bottom-3 h-1.5 overflow-hidden rounded-full bg-white/80">
              <div className="h-full origin-left rounded-full bg-nova transition-transform duration-200 ease-out motion-reduce:transition-none"
                style={{ transform: `scaleX(${u.progress})` }} />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-2 pb-1.5">
          <p title={u.file.name} className="truncate font-medium">{u.file.name}</p>
          {u.state === "failed" ? (
            <>
              <p className="line-clamp-2 text-sm text-danger" title={u.error}>Didn&rsquo;t upload. {u.error}</p>
              <div className="mt-auto flex items-center gap-3 pt-1">
                <button onClick={() => retry(u.key)} className="btn rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-white">Retry</button>
                <button onClick={() => remove(u.key)} className="text-sm text-muted underline underline-offset-2">Remove</button>
              </div>
            </>
          ) : (
            <p className="text-sm tabular-nums text-faint">{u.state === "saving" ? "Saving…" : `Uploading ${pct}%`}</p>
          )}
        </div>
      </li>
    );
  });
}
