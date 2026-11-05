"use client";
import { useState } from "react";
import { GENERAL_TYPES, fileProblem } from "@/lib/uploads";
import { Input } from "./fields";

/** File picker that checks size and type as soon as a file is chosen, and blocks sending one that won't fit. */
export function FileInput({ kind, className }: { kind: "general" | "pdf"; className?: string }) {
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <>
      <Input
        name="file" type="file" required className={className}
        accept={kind === "pdf" ? "application/pdf,.pdf" : GENERAL_TYPES.map((t) => `.${t}`).join(",")}
        aria-invalid={problem ? true : undefined}
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          const p = file ? fileProblem(file, kind) : null;
          e.currentTarget.setCustomValidity(p ?? ""); // the browser then refuses to send the form
          setProblem(p);
        }}
      />
      {problem && <span role="alert" className="px-1 text-sm text-danger">{problem}</span>}
    </>
  );
}
