import type { ComponentProps, ReactNode } from "react";

// Shared form controls. 16px text stops iOS zooming into inputs.
export const control =
  "w-full rounded-2xl border border-transparent bg-paper px-4 py-3 text-base text-ink outline-none transition-[border-color,background-color] duration-150 placeholder:text-faint focus:border-ink focus:bg-white";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="px-1 text-sm text-muted">{label}</span>
      {children}
      {hint && <span className="px-1 text-sm text-faint">{hint}</span>}
    </label>
  );
}

export const Input = (p: ComponentProps<"input">) => <input {...p} className={`${control} ${p.className ?? ""}`} />;
export const Textarea = (p: ComponentProps<"textarea">) => <textarea rows={3} {...p} className={`${control} ${p.className ?? ""}`} />;
export const Select = (p: ComponentProps<"select">) => <select {...p} className={`${control} ${p.className ?? ""}`} />;
