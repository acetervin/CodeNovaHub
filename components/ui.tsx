import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconName } from "./icons";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-card bg-card p-5 ${className}`}>{children}</section>;
}

const tones = {
  nova: "border-nova/30 bg-nova-soft text-nova-ink",
  ok: "border-ok/25 bg-ok-soft text-ok",
  danger: "border-danger/25 bg-danger-soft text-danger",
  plain: "border-line bg-paper text-ink",
};
export type Tone = keyof typeof tones;

/** Status pill. `dot` gives the reference's grey "On track" chip with a coloured dot. */
export function Pill({ tone = "plain", dot, children }: { tone?: Tone; dot?: Tone; children: ReactNode }) {
  const dotColor = { nova: "bg-nova", ok: "bg-ok", danger: "bg-danger", plain: "bg-faint" };
  return (
    <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${tones[dot ? "plain" : tone]}`}>
      {dot && <span className={`size-2 rounded-full ${dotColor[dot]}`} />}
      {children}
    </span>
  );
}

const avatarColors = ["bg-peach text-nova-ink", "bg-lilac text-lilac-ink", "bg-mint text-ok", "bg-rose text-rose-ink"];
export function Avatar({ name, className = "size-9 text-sm" }: { name: string; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  const color = avatarColors[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % avatarColors.length];
  return <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-semibold ring-2 ring-white ${color} ${className}`}>{initials || "?"}</span>;
}

// One look per kind of history entry (activity.kind), so an invoice never reads like an upload.
const activityLook: Record<string, { icon: IconName; tile: string; label: string }> = {
  task: { icon: "tasks", tile: "bg-lilac text-lilac-ink", label: "Task" },
  payment: { icon: "wallet", tile: "bg-ok-soft text-ok", label: "Payment" },
  invoice: { icon: "receipt", tile: "bg-nova-soft text-nova-ink", label: "Invoice" },
  agreement: { icon: "signed", tile: "bg-rose text-rose-ink", label: "Agreement" },
  file: { icon: "clip", tile: "bg-paper text-muted", label: "File" },
  project: { icon: "flag", tile: "bg-ink text-white", label: "Project" },
};

/** Coloured icon tile for a history entry; its kind is spoken to screen readers and shown on hover. */
export function ActivityTile({ kind }: { kind: string }) {
  const look = activityLook[kind] ?? activityLook.project;
  return (
    // relative: keeps the sr-only label inside the tile, or it escapes scroll boxes and stretches the page.
    <span title={look.label} className={`relative grid size-9 shrink-0 place-items-center rounded-xl ${look.tile}`}>
      <Icon name={look.icon} className="size-[18px]" />
      <span className="sr-only">{look.label}</span>
    </span>
  );
}

/** The reference's histogram: adjacent bars fading from peach to white. Values are 0–100. */
export function Bars({ values, tones: barTones, label, className = "h-28" }: {
  values: number[];
  tones?: ("nova" | "muted" | "late")[];
  label: string;
  className?: string;
}) {
  if (!values.length) return null;
  return (
    <div role="img" aria-label={label} className={`flex items-end ${className}`}>
      {values.map((v, i) => (
        <div
          key={i}
          data-tone={barTones?.[i] === "nova" ? undefined : barTones?.[i]}
          className="bar flex-1 rounded-t-[3px]"
          style={{ height: `${Math.max(v, 3)}%`, "--i": i } as CSSProperties}
        />
      ))}
    </div>
  );
}

/** Thin progress track; `knob` adds the reference's ringed handle at the end. */
export function Progress({ value, color = "bg-nova", knob, label }: { value: number; color?: string; knob?: boolean; label: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="relative h-1.5 rounded-full bg-black/[0.08]">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${v}%` }} />
      {knob && (
        <span className={`absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-white ${color.replace("bg-", "border-")}`} style={{ left: `${v}%` }} />
      )}
    </div>
  );
}

/** Round white button or link holding one icon, as in the reference's top bars. */
export function RoundLink({ href, icon, label, dark }: { href: string; icon: IconName; label: string; dark?: boolean }) {
  return (
    <Link href={href} aria-label={label} title={label}
      className={`btn grid size-12 shrink-0 place-items-center rounded-full ${dark ? "bg-ink text-white" : "bg-card text-ink"}`}>
      <Icon name={icon} />
    </Link>
  );
}

/** Opens a sheet. Round icon button on phones, as in the reference; icon and words from tablet width up.
 *  `compact` is the smaller pill used in section headers, with its words always showing. */
export function SheetButton({ target, icon = "plus", label, dark, compact }: { target: string; icon?: IconName; label: string; dark?: boolean; compact?: boolean }) {
  return (
    <button popoverTarget={target} aria-label={compact ? undefined : label}
      className={`btn flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-medium ${compact ? "h-10 px-4" : "h-12 min-w-12 sm:px-5"} ${dark ? "bg-ink text-white" : "bg-card text-ink"}`}>
      <Icon name={icon} className={compact ? "size-4" : undefined} />
      <span className={compact ? "" : "hidden sm:inline"} aria-hidden={compact ? undefined : true}>{label}</span>
    </button>
  );
}

/** A form or detail in a native popover: bottom sheet on phones, centred card on larger screens. */
export function Sheet({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div popover="auto" id={id} className="sheet" aria-label={title}>
      <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" />
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-[-0.01em]">{title}</h2>
        <button popoverTarget={id} popoverTargetAction="hide" aria-label="Close" className="btn grid size-10 place-items-center rounded-full bg-paper">
          <Icon name="x" className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

/** Page title row. On phones a back button sits left and the title centres, as in the reference. */
export function TopBar({ title, back, children }: { title: string; back?: string; children?: ReactNode }) {
  return (
    <header className="flex min-h-12 items-center gap-3">
      {back && <RoundLink href={back} icon="back" label="Back" />}
      <h1 className={`min-w-0 flex-1 truncate text-2xl font-semibold tracking-[-0.02em] lg:text-[2rem] ${back ? "text-center lg:text-left" : ""}`}>{title}</h1>
      <div className="flex shrink-0 gap-2">{children}</div>
      {back && !children && <span className="size-12 lg:hidden" />}
    </header>
  );
}

export function Empty({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-[24px] border border-dashed border-black/10 px-4 py-4 text-muted">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-faint"><Icon name={icon} className="size-[18px]" /></span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Section title with a "view all" link or an action (e.g. an upload button) on the right. */
export function SectionHead({ title, href, more = "View all", children }: { title: string; href?: string; more?: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-4 px-1">
      <h2 className="text-lg font-semibold">{title}</h2>
      {href && <Link href={href} className="text-sm text-muted underline-offset-2 hover:underline">{more}</Link>}
      {children}
    </div>
  );
}

/** Time since, for history rows: "just now", "3 hours ago", "4 Nov". */
export function ago(at: string, now = Date.now()) {
  const s = (now - Date.parse(at)) / 1000;
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 6) return `${Math.round(s / 86400)} d ago`;
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" });
}
