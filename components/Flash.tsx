"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Shows the problem a form action sent back (lib/flash.ts) on the page it came back to, until it's dismissed.
 *  The text comes from the server's one-minute cookie, never from the address; both are cleared once read. */
export function Flash() {
  const params = useSearchParams(), path = usePathname();
  const [shown, setShown] = useState<{ path: string; text: string } | null>(null);
  const flagged = params.has("flash");

  useEffect(() => {
    if (!flagged) return;
    const m = /(?:^|;\s*)flash=([^;]*)/.exec(document.cookie);
    document.cookie = "flash=; path=/; max-age=0";
    if (m) setShown({ path, text: decodeURIComponent(m[1]) });
    const rest = new URLSearchParams(params);
    rest.delete("flash");
    history.replaceState(null, "", rest.size ? `${path}?${rest}` : path);
  }, [flagged, params, path]);

  if (!shown || shown.path !== path) return null;
  return (
    <div role="alert" className="mb-5 flex items-start justify-between gap-4 rounded-3xl border border-danger/25 bg-danger-soft px-5 py-4 text-danger">
      <p>{shown.text}</p>
      <button onClick={() => setShown(null)} className="shrink-0 text-sm font-medium underline">Dismiss</button>
    </div>
  );
}
