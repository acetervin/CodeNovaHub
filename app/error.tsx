"use client";
import { useEffect } from "react";
import { MAX_MB } from "@/lib/uploads";
import { StatusPage } from "@/components/StatusPage";

// Anything unexpected lands here instead of a broken page. Problems with what someone typed or picked are shown
// on the form itself; this is for the rest.
// `retry` asks the server again; `reset` only re-draws the same failed result, so it could never recover.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <StatusPage code="Error" message="That didn't work, so your last change may not have saved.">
      <p>
        Uploading a file? Keep it under {MAX_MB} MB. If this keeps happening, message CodeNova on WhatsApp
        {error.digest ? <> with the reference <span className="font-mono text-ink">{error.digest}</span></> : null}.
      </p>
      <div className="flex items-center gap-5">
        <button onClick={() => retry()} className="btn rounded-full bg-ink px-5 py-2.5 font-medium text-white">Try again</button>
        <a href="/" className="font-medium text-ink underline underline-offset-4">Go to projects</a>
      </div>
    </StatusPage>
  );
}
