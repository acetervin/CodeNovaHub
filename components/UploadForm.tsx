"use client";
import { useState } from "react";
import { GENERAL_LIMITS, TOO_BIG_TIP } from "@/lib/uploads";
import { upload } from "@/lib/upload-queue";
import { Field, Textarea } from "./fields";
import { FileInput } from "./FileInput";

/** The Upload sheet's form. Pressing Upload closes the sheet at once; the file then uploads on its own tile. */
export function UploadForm({ projectId, inputClassName }: { projectId: string; inputClassName: string }) {
  const [round, setRound] = useState(0); // a fresh picker and preview after each send
  return (
    <form key={round} className="flex flex-col gap-4" onSubmit={(e) => {
      e.preventDefault(); // the browser has already refused a file that breaks the rules (FileInput)
      const form = e.currentTarget, data = new FormData(form), file = data.get("file");
      if (!(file instanceof File) || !file.name) return;
      upload(projectId, file, String(data.get("note") ?? "").trim(), String(data.get("thumb") ?? "") || null);
      form.closest<HTMLElement>("[popover]")?.hidePopover();
      setRound((r) => r + 1);
    }}>
      <Field label="File" hint={`${GENERAL_LIMITS} ${TOO_BIG_TIP}`}><FileInput kind="general" className={inputClassName} /></Field>
      <Field label="Note (optional)"><Textarea name="note" maxLength={500} placeholder="This is the logo with the white background." /></Field>
      <button className="btn rounded-full bg-ink px-5 py-3 font-medium text-white">Upload</button>
    </form>
  );
}
