import type { ReactNode } from "react";

/** Quiet full-page status (404, crash) in the style of Next's default 404, with CodeNova across the bottom. */
export function StatusPage({ code, message, children }: { code: string; message: string; children?: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col overflow-hidden">
      <div className="my-auto flex flex-col items-center px-6 py-12">
        <div className="flex items-center">
          <h1 className="mr-5 border-r border-ink/30 pr-6 text-2xl font-medium leading-[49px]">{code}</h1>
          <p className="text-sm">{message}</p>
        </div>
        {children && <div className="mt-5 flex max-w-sm flex-col items-center gap-4 text-center text-sm text-muted">{children}</div>}
      </div>
      {/* textLength stretches the word to exactly the screen's width, whatever the font's metrics. */}
      <svg viewBox="0 0 1000 178" role="img" aria-label="CodeNova" className="block w-full shrink-0 text-ink">
        <text x="0" y="172" textLength="1000" lengthAdjust="spacingAndGlyphs" fill="currentColor" fontSize="236" fontWeight="600" letterSpacing="-8">CodeNova</text>
      </svg>
    </main>
  );
}
