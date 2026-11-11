"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** Shows the problem a form action sent back (lib/flash.ts) as a toast. The text comes from the server's
 *  one-minute cookie, never from the address; both are cleared once read. */
export function Flash() {
  const params = useSearchParams(), path = usePathname();
  const flagged = params.has("flash");

  useEffect(() => {
    if (!flagged) return;
    const m = /(?:^|;\s*)flash=([^;]*)/.exec(document.cookie);
    document.cookie = "flash=; path=/; max-age=0";
    if (m) toast.error(decodeURIComponent(m[1]), { id: "flash", duration: 10_000 });
    const rest = new URLSearchParams(params);
    rest.delete("flash");
    history.replaceState(null, "", rest.size ? `${path}?${rest}` : path);
  }, [flagged, params, path]);

  return null;
}
