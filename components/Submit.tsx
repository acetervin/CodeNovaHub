"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

const looks = {
  primary: "rounded-full bg-ink px-5 py-3 text-white",
  quiet: "rounded-full bg-paper px-5 py-3 text-ink",
  danger: "rounded-full bg-danger px-5 py-3 text-white",
  link: "text-muted underline underline-offset-2",
};

/** Submit button that shows it's working, can't be pressed twice, and closes its sheet when done. */
export function Submit({ children, look = "primary", pending: pendingText, className = "" }: {
  children: ReactNode;
  look?: keyof typeof looks;
  pending?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const ref = useRef<HTMLButtonElement>(null);
  const was = useRef(false);
  useEffect(() => {
    if (was.current && !pending) ref.current?.closest<HTMLElement>("[popover]")?.hidePopover();
    was.current = pending;
  }, [pending]);
  return (
    <button
      ref={ref}
      disabled={pending}
      aria-busy={pending}
      className={`btn text-sm font-medium disabled:opacity-60 ${looks[look]} ${className}`}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
