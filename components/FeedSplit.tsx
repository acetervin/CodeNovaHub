"use client";
import { type Key, type ReactNode, useLayoutEffect, useRef, useState } from "react";

/** The page's main panel (`children`) with a feed beside it. Desktop: the feed stops at the panel's height and
 *  whatever doesn't fit continues full width below. Phones and tablets: one box that scrolls by itself. */
export function FeedSplit({ className, title, rest, items, empty, children }: {
  className: string; title: string; rest: string; items: { key: Key; node: ReactNode }[]; empty: ReactNode; children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(items.length);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const wide = matchMedia("(min-width: 80rem)"); // Tailwind xl, where the feed sits beside the panel
    const measure = () => {
      if (!wide.matches) return setFit(items.length);
      const bottom = el.clientHeight - parseFloat(getComputedStyle(el).paddingBottom);
      const n = [...el.querySelectorAll<HTMLElement>(":scope > ul > li")].findIndex((li) => li.offsetTop + li.offsetHeight > bottom);
      setFit(n === -1 ? items.length : n);
    };
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    wide.addEventListener("change", measure);
    measure();
    return () => { watch.disconnect(); wide.removeEventListener("change", measure); };
  }, [items]);

  return (
    <>
      <div className={className}>
        {children}
        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="shrink-0 px-1 text-lg font-semibold">{title}</h2>
          {items.length === 0 ? empty : (
            <div className="relative xl:min-h-72 xl:flex-1">
              {/* Desktop: absolute, so the feed takes the panel's height instead of setting it. */}
              <div ref={box} className="max-h-[28rem] overflow-y-auto rounded-card bg-card p-2 [scrollbar-width:none] xl:absolute xl:inset-0 xl:max-h-none xl:overflow-hidden">
                <ul>{items.map((it, i) => <li key={it.key} className={i < fit ? undefined : "invisible"}>{it.node}</li>)}</ul>
              </div>
            </div>
          )}
        </section>
      </div>
      {fit < items.length && (
        <section className="mt-6 flex flex-col gap-3">
          <h2 className="px-1 text-lg font-semibold">{rest}</h2>
          {/* Columns read top to bottom, so it carries on from the feed above. */}
          <div className="rounded-card bg-card p-2">
            <ul className="columns-2 gap-x-6 2xl:columns-3 [&>li]:break-inside-avoid">
              {items.slice(fit).map((it) => <li key={it.key}>{it.node}</li>)}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
