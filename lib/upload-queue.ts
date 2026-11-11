// Uploads in progress, in the browser. Each file goes straight to storage over a one-time link (so it can show
// progress), then the server checks it and records it. They live here, not in a component, so they carry on
// while someone moves around the hub; closing the tab is the only thing that stops them, so the browser asks first.
import { toast } from "sonner";
import { finishUpload, startUpload } from "@/app/p/[id]/actions";

export type Upload = {
  key: string; projectId: string; file: File; note: string; thumb: string | null;
  progress: number; state: "sending" | "saving" | "failed"; error?: string;
};

let uploads: Upload[] = [];
const NONE: Upload[] = [];
const listeners = new Set<() => void>();
const hold = (e: BeforeUnloadEvent) => e.preventDefault();

function set(next: Upload[]) {
  uploads = next;
  listeners.forEach((l) => l());
  if (uploads.some((u) => u.state !== "failed")) addEventListener("beforeunload", hold);
  else removeEventListener("beforeunload", hold);
}
const patch = (key: string, p: Partial<Upload>) => set(uploads.map((u) => (u.key === key ? { ...u, ...p } : u)));

/** For useSyncExternalStore. */
export const uploadStore = {
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  get: () => uploads,
  getServer: () => NONE,
};

export function upload(projectId: string, file: File, note: string, thumb: string | null) {
  const key = crypto.randomUUID();
  set([{ key, projectId, file, note, thumb, progress: 0, state: "sending" }, ...uploads]);
  void send(key);
}

export const retry = (key: string) => void send(key);

export function remove(key: string) {
  toast.dismiss(key);
  set(uploads.filter((u) => u.key !== key));
}

async function send(key: string) {
  const u = uploads.find((x) => x.key === key);
  if (!u) return;
  toast.dismiss(key);
  patch(key, { state: "sending", progress: 0, error: undefined });
  try {
    const start = await startUpload(u.projectId, { name: u.file.name, size: u.file.size });
    if ("error" in start) throw new Error(start.error);
    await put(start.url, u.file, (progress) => patch(key, { progress }));
    patch(key, { state: "saving", progress: 1 });
    const done = await finishUpload(u.projectId, { path: start.path, name: u.file.name, note: u.note, thumb: u.thumb });
    if (done.error) throw new Error(done.error);
    set(uploads.filter((x) => x.key !== key));
    toast.success(`Uploaded ${u.file.name}`);
  } catch (e) {
    const error = e instanceof Error ? e.message : "Something went wrong.";
    patch(key, { state: "failed", error });
    toast.error(`${u.file.name} didn't upload`, { id: key, description: error, duration: Infinity, action: { label: "Retry", onClick: () => retry(key) } });
  }
}

/** PUT to a signed upload link, reporting progress from 0 to 1. Same request supabase-js makes, but XHR, since
 *  fetch can't report upload progress. */
function put(url: string, file: File, progress: (p: number) => void) {
  return new Promise<void>((ok, fail) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("content-type", file.type || "application/octet-stream");
    x.setRequestHeader("x-upsert", "false");
    x.upload.onprogress = (e) => { if (e.lengthComputable) progress(e.loaded / e.total); };
    x.onload = () => (x.status < 300 ? ok() : fail(new Error(x.status === 413
      ? "It's bigger than storage allows (25 MB)."
      : `Storage turned it down (${x.status}). Retry, or message CodeNova if it keeps happening.`)));
    x.onerror = () => fail(new Error("The connection dropped. Check your internet, then retry."));
    x.send(file);
  });
}
