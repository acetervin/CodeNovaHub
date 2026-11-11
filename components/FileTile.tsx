import { fileKind, type FileKind } from "@/lib/uploads";
import { Icon } from "./icons";

const look: Record<FileKind, string> = {
  image: "bg-peach text-nova-ink", video: "bg-ink text-white", pdf: "bg-rose text-rose-ink", doc: "bg-lilac text-lilac-ink",
  sheet: "bg-mint text-ok", slides: "bg-nova-soft text-nova-ink", archive: "bg-paper text-muted",
  design: "bg-lilac text-lilac-ink", font: "bg-paper text-ink", file: "bg-paper text-muted",
};

/** A 4:3 preview: the thumbnail when there is one, otherwise a tile coloured by file type with its extension. */
export function FileTile({ name, src, className = "" }: { name: string; src?: string | null; className?: string }) {
  const k = fileKind(name);
  if (src) {
    return (
      <span className={`relative block aspect-[4/3] overflow-hidden rounded-2xl bg-paper ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a stored thumbnail, already small */}
        <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        {k.kind === "video" && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-10 place-items-center rounded-full bg-ink/70 text-white"><Icon name="play" className="size-4" /></span>
          </span>
        )}
      </span>
    );
  }
  return (
    <span className={`grid aspect-[4/3] place-content-center justify-items-center gap-0.5 rounded-2xl ${look[k.kind]} ${className}`}>
      <span className="text-2xl font-semibold tracking-[-0.02em]">{k.kind === "font" ? "Aa" : k.ext.toUpperCase() || "FILE"}</span>
      {k.label !== k.ext.toUpperCase() && <span className="text-xs opacity-80">{k.label}</span>}
    </span>
  );
}
