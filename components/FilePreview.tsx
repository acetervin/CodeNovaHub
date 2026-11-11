"use client";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { VIEWABLE, fileKind } from "@/lib/uploads";
import { FileTile } from "./FileTile";

const TEXT = ["txt", "md", "csv"];
const TEXT_BYTES = 200_000; // shortcut: text previews show the first 200 KB; the rest is a download away

/** A file inside its sheet: the picture, video, PDF or text itself, or its tile when browsers can't show it.
 *  Loads only while the sheet is open, so a page of files costs nothing up front, and closing stops a video. */
export function FilePreview({ fileName, path, thumb, size }: { fileName: string; path: string; thumb?: string | null; size?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(true); // phones can't show a PDF in a page, so they don't download it into one
  const [text, setText] = useState<string | false | null>(null);
  const k = fileKind(fileName), url = `/f/${path}`, isText = TEXT.includes(k.ext);

  useEffect(() => {
    const sheet = box.current?.closest("[popover]");
    const on = (e: Event) => {
      setWide(matchMedia("(min-width: 48rem)").matches);
      setOpen((e as ToggleEvent).newState === "open");
    };
    sheet?.addEventListener("beforetoggle", on);
    if (sheet?.matches(":popover-open")) on({ newState: "open" } as ToggleEvent); // tapped before the page finished loading
    return () => sheet?.removeEventListener("beforetoggle", on);
  }, []);
  useEffect(() => {
    if (!open || !isText || text !== null) return;
    fetch(url, { headers: { Range: `bytes=0-${TEXT_BYTES - 1}` } })
      .then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
      .then(setText, () => setText(false));
  }, [open, isText, text, url]);

  const frame = "h-[60dvh] w-full rounded-2xl bg-paper sm:h-[70dvh]";
  const note = (message: string, extra?: ReactNode) => (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-paper px-6 py-8 text-center">
      <FileTile name={fileName} src={thumb} className="w-44" />
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {extra}
    </div>
  );
  const picture = k.kind === "image" ? (VIEWABLE.includes(k.ext) ? url : thumb) : null;
  let body: ReactNode;
  if (!picture && k.kind !== "video" && k.kind !== "pdf" && !isText) {
    body = note(`There's no preview for ${k.label.toLowerCase()} files here. Download it to open it.`);
  } else if (!open) {
    body = <div className={frame} />; // same size as the preview, so the sheet doesn't jump when it loads
  } else if (picture) {
    // eslint-disable-next-line @next/next/no-img-element -- a signed link to the original
    body = <img src={picture} alt={fileName} className={`${frame} object-contain`} />;
  } else if (k.kind === "video") {
    body = <video src={`${url}?play`} poster={thumb ?? undefined} controls playsInline className={`${frame} bg-ink`} />;
  } else if (k.kind === "pdf") {
    body = wide ? <iframe src={url} title={fileName} className={frame} /> : note("Your phone opens PDFs in its own viewer.", (
      <a href={url} target="_blank" rel="noopener" className="btn rounded-full bg-card px-5 py-2.5 text-sm font-medium">Open PDF</a>
    ));
  } else if (text === null) {
    body = <div className={`${frame} grid place-items-center text-sm text-muted`}>Loading…</div>;
  } else if (text === false) {
    body = note("The preview didn't load. Download the file to open it.");
  } else {
    body = (
      <pre className={`${frame} overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm`}>
        {text}{size && size > TEXT_BYTES ? "\n\n… Download the file to see the rest." : ""}
      </pre>
    );
  }
  return <div ref={box}>{body}</div>;
}
