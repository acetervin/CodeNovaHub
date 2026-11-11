"use client";
import { useRef, useState } from "react";
import { GENERAL_TYPES, fileKind, fileProblem, thumbOk } from "@/lib/uploads";
import { Input } from "./fields";
import { FileTile } from "./FileTile";

/** A ≤480px preview of a photo or a video's first second, made in the browser; null if it can't read the file. */
async function makeThumb(file: File): Promise<string | null> {
  const kind = fileKind(file.name).kind;
  if (kind !== "image" && kind !== "video") return null;
  const url = URL.createObjectURL(file);
  try {
    let src: HTMLImageElement | HTMLVideoElement, w: number, h: number;
    if (kind === "image") {
      const img = new Image();
      img.src = url;
      await img.decode(); // throws for formats this browser can't read, like HEIC outside Safari
      [src, w, h] = [img, img.naturalWidth, img.naturalHeight];
    } else {
      const v = document.createElement("video");
      Object.assign(v, { muted: true, playsInline: true, preload: "auto", src: url });
      const wait = (event: "loadeddata" | "seeked") => new Promise((ok, fail) => {
        v.addEventListener(event, ok, { once: true });
        v.addEventListener("error", fail, { once: true });
        setTimeout(fail, 5000);
      });
      await wait("loadeddata");
      v.currentTime = Math.min(1, (v.duration || 0) / 2);
      await wait("seeked");
      [src, w, h] = [v, v.videoWidth, v.videoHeight];
    }
    if (!w || !h) return null;
    const scale = Math.min(1, 480 / Math.max(w, h));
    const c = document.createElement("canvas");
    [c.width, c.height] = [Math.round(w * scale), Math.round(h * scale)];
    const g = c.getContext("2d")!;
    g.drawImage(src, 0, 0, c.width, c.height);
    let out = c.toDataURL("image/webp", 0.7);
    if (!out.startsWith("data:image/webp")) {
      // Safari can't write WebP. JPEG has no transparency, so a logo's clear parts get the tile colour.
      g.globalCompositeOperation = "destination-over";
      g.fillStyle = "#f4f4f4";
      g.fillRect(0, 0, c.width, c.height);
      out = c.toDataURL("image/jpeg", 0.75);
    }
    return thumbOk(out) ? out : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** File picker that checks size and type as soon as a file is chosen, and blocks sending one that won't fit.
 *  General files also get a preview, which is sent along as `thumb`. */
export function FileInput({ kind, className }: { kind: "general" | "pdf"; className?: string }) {
  const [problem, setProblem] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ name: string; thumb: string | null } | null>(null);
  const latest = useRef<File | null>(null); // a slow preview for an earlier pick must not land on a later one
  return (
    <>
      <Input
        name="file" type="file" required className={className}
        accept={kind === "pdf" ? "application/pdf,.pdf" : GENERAL_TYPES.map((t) => `.${t}`).join(",")}
        aria-invalid={problem ? true : undefined}
        onChange={async (e) => {
          const file = e.currentTarget.files?.[0] ?? null;
          const p = file ? fileProblem(file, kind) : null;
          e.currentTarget.setCustomValidity(p ?? ""); // the browser then refuses to send the form
          setProblem(p);
          latest.current = file;
          setPicked(file && !p && kind === "general" ? { name: file.name, thumb: null } : null);
          if (!file || p || kind !== "general") return;
          const thumb = await makeThumb(file);
          if (latest.current === file) setPicked({ name: file.name, thumb });
        }}
      />
      {problem && <span role="alert" className="px-1 text-sm text-danger">{problem}</span>}
      {picked && (
        <>
          <input type="hidden" name="thumb" value={picked.thumb ?? ""} />
          <FileTile name={picked.name} src={picked.thumb} className="w-40" />
        </>
      )}
    </>
  );
}
