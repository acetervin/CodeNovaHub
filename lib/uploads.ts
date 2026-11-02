// Upload rules, shared by the browser (checks a file the moment it's picked) and the server (checks again,
// because the browser can be bypassed).

export const MAX_MB = 25;
export const MAX_BYTES = MAX_MB * 1024 * 1024;

// Logos, photos, copy, designs. Anything that runs as a program is left out.
export const GENERAL_TYPES = [
  "jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "svg", "pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx",
  "txt", "md", "rtf", "zip", "ai", "eps", "psd", "fig", "sketch", "mp4", "mov", "ttf", "otf", "woff", "woff2",
];
export const GENERAL_LIMITS = `Up to ${MAX_MB} MB per file. Images, PDF, Word, Excel, PowerPoint, text, ZIP, design files (AI, PSD, EPS, Figma, Sketch), MP4 or MOV video, and fonts.`;
export const PDF_LIMITS = `PDF only, up to ${MAX_MB} MB.`;
export const TOO_BIG_TIP = "For anything bigger, send a WeTransfer or Google Drive link to CodeNova on WhatsApp.";

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** What's wrong with a file, in words for the person uploading it, or null if it can go. */
export function fileProblem(file: { name: string; size: number }, kind: "general" | "pdf"): string | null {
  const ext = /\.([^.]+)$/.exec(file.name)?.[1].toLowerCase() ?? "";
  if (kind === "pdf" && ext !== "pdf") return `"${file.name}" isn't a PDF. Save or export it as a PDF and try again.`;
  if (kind === "general" && !GENERAL_TYPES.includes(ext)) {
    return `"${file.name}" can't be uploaded: ${ext ? `.${ext} files aren't accepted` : "it has no file type"}. Allowed: images, PDF, Office files, text, ZIP, design files, MP4/MOV and fonts.`;
  }
  if (file.size === 0) return `"${file.name}" is empty. Choose the file again.`;
  if (file.size > MAX_BYTES) return `"${file.name}" is ${mb(file.size)}; the limit is ${MAX_MB} MB per file. Compress or zip it. ${TOO_BIG_TIP}`;
  return null;
}
