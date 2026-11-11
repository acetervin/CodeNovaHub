"use client";
import { useEffect, useRef } from "react";
import { Toaster, useSonner } from "sonner";

/** Toasts for the whole hub (Sonner). They live in a manual popover, raised again for each new toast, because
 *  the sheets are native popovers in the browser's top layer and would otherwise cover them. */
export function Toasts() {
  const layer = useRef<HTMLDivElement>(null);
  const { toasts } = useSonner();
  useEffect(() => {
    const el = layer.current;
    if (!el) return;
    if (el.matches(":popover-open")) el.hidePopover();
    el.showPopover();
  }, [toasts.length]);
  return (
    <div ref={layer} popover="manual" className="toast-layer">
      {/* --toast-bottom clears the phone tab bar (globals.css). */}
      <Toaster richColors position="bottom-right" offset={{ bottom: "var(--toast-bottom)" }} mobileOffset={{ bottom: "var(--toast-bottom)" }}
        toastOptions={{ style: { borderRadius: 20, fontFamily: "inherit" } }} />
    </div>
  );
}
