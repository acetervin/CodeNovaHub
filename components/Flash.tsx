"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/** Shows the problem a form action sent back as ?error=, until it's dismissed. */
export function Flash() {
  const error = useSearchParams().get("error");
  const path = usePathname();
  if (!error) return null;
  return (
    <div role="alert" className="mb-5 flex items-start justify-between gap-4 rounded-3xl border border-danger/25 bg-danger-soft px-5 py-4 text-danger">
      <p>{error}</p>
      <Link href={path} replace scroll={false} className="shrink-0 text-sm font-medium underline">Dismiss</Link>
    </div>
  );
}
