// Upload rules, shared by the browser (checks a file the moment it's picked) and the server (checks again,
// because the browser can be bypassed).

export const MAX_MB = 25;
export const MAX_BYTES = MAX_MB * 1024 * 1024;

// Logos, photos, copy, designs. Anything that runs as a program is left out. Grouped for the Files page tiles.
const KINDS = [
  ["image", "Image", ["jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "svg"]],
  ["video", "Video", ["mp4", "mov"]],
  ["pdf", "PDF", ["pdf"]],
  ["doc", "Document", ["doc", "docx", "rtf", "txt", "md"]],
  ["sheet", "Spreadsheet", ["xls", "xlsx", "csv"]],
  ["slides", "Slides", ["ppt", "pptx"]],
  ["archive", "Archive", ["zip"]],
  ["design", "Design file", ["ai", "eps", "psd", "fig", "sketch"]],
  ["font", "Font", ["ttf", "otf", "woff", "woff2"]],
] as const;
export type FileKind = (typeof KINDS)[number][0] | "file";
export const GENERAL_TYPES: string[] = KINDS.flatMap(([, , exts]) => exts);
// Images every browser can show full size; HEIC only gets a preview if the uploader's browser could read it.
export const VIEWABLE = ["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"];

const extOf = (name: string) => /\.([^.]+)$/.exec(name)?.[1].toLowerCase() ?? "";

/** "report.DOCX" → { ext: "docx", kind: "doc", label: "Document" }. */
export function fileKind(name: string): { ext: string; kind: FileKind; label: string } {
  const ext = extOf(name);
  const hit = KINDS.find(([, , exts]) => (exts as readonly string[]).includes(ext));
  return { ext, kind: hit?.[0] ?? "file", label: hit?.[1] ?? "File" };
}

// The preview FileInput makes for photos and videos. The database checks the same rule (assets.thumb).
export const THUMB_MAX = 100_000;
export const thumbOk = (v: unknown): v is string =>
  typeof v === "string" && v.length <= THUMB_MAX && /^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v);
export const GENERAL_LIMITS = `Up to ${MAX_MB} MB per file. Images, PDF, Word, Excel, PowerPoint, text, ZIP, design files (AI, PSD, EPS, Figma, Sketch), MP4 or MOV video, and fonts.`;
export const PDF_LIMITS = `PDF only, up to ${MAX_MB} MB.`;
export const TOO_BIG_TIP = "For anything bigger, send a WeTransfer or Google Drive link to CodeNova on WhatsApp.";

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** What's wrong with a file, in words for the person uploading it, or null if it can go. */
export function fileProblem(file: { name: string; size: number }, kind: "general" | "pdf"): string | null {
  const ext = extOf(file.name);
  if (kind === "pdf" && ext !== "pdf") return `"${file.name}" isn't a PDF. Save or export it as a PDF and try again.`;
  if (kind === "general" && !GENERAL_TYPES.includes(ext)) {
    return `"${file.name}" can't be uploaded: ${ext ? `.${ext} files aren't accepted` : "it has no file type"}. Allowed: images, PDF, Office files, text, ZIP, design files, MP4/MOV and fonts.`;
  }
  if (file.size === 0) return `"${file.name}" is empty. Choose the file again.`;
  if (file.size > MAX_BYTES) return `"${file.name}" is ${mb(file.size)}; the limit is ${MAX_MB} MB per file. Compress or zip it. ${TOO_BIG_TIP}`;
  return null;
}
