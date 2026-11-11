import type { ReactNode } from "react";
import { Sheet } from "./ui";
import { Icon } from "./icons";
import { FilePreview } from "./FilePreview";

/** A stored file opened in place: its preview, a line about it, and Download. Open it with popoverTarget={id}.
 *  `fileName` decides the preview and the downloaded name, since a document's title may have no extension. */
export function FileSheet({ id, title, fileName = title, path, thumb, size, about }: {
  id: string; title: string; fileName?: string; path: string; thumb?: string | null; size?: number; about: ReactNode;
}) {
  return (
    <Sheet wide id={id} title={title}>
      <FilePreview fileName={fileName} path={path} thumb={thumb} size={size} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-sm text-muted">{about}</div>
        <a href={`/f/${path}?download=${encodeURIComponent(fileName)}`} className="btn flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white">
          <Icon name="download" className="size-4" />Download
        </a>
      </div>
    </Sheet>
  );
}
