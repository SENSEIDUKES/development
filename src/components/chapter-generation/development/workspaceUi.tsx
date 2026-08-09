import { Check, ChevronRight, Copy, X } from "lucide-react";
import { useState, type ReactNode } from "react";

export type CopyState = "idle" | "copied" | "failed";

/**
 * Reports the clipboard result truthfully: "Copied" only after a confirmed
 * successful write, "Copy failed" when clipboard access is unavailable or
 * rejects (for example, denied permission or an insecure context).
 */
export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<CopyState>("idle");

  const handleCopy = async () => {
    const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    let nextState: CopyState = "failed";
    if (clipboard?.writeText) {
      try {
        await clipboard.writeText(text);
        nextState = "copied";
      } catch {
        nextState = "failed";
      }
    }
    setState(nextState);
    setTimeout(() => setState("idle"), 1200);
  };

  return (
    <button
      type="button"
      onClick={() => {
        void handleCopy();
      }}
      className={`flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-[10px] uppercase tracking-widest transition-colors ${
        state === "copied"
          ? "border-emerald-500/40 text-emerald-200/90"
          : state === "failed"
            ? "border-rose-500/40 text-rose-200/90"
            : "border-white/10 text-white/50 hover:border-white/30 hover:text-white/80"
      }`}
    >
      {state === "copied" ? <Check size={11} /> : state === "failed" ? <X size={11} /> : <Copy size={11} />}
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy"}
    </button>
  );
}

export interface CollapsibleProps {
  title: ReactNode;
  /** Right-aligned summary hint, for example a character or token count. */
  meta?: string;
  /** When set, the expanded body offers a copy control for this exact text. */
  copyText?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Collapsed-by-default disclosure used for large instructions and raw data. */
export function Collapsible({ title, meta, copyText, defaultOpen = false, children }: CollapsibleProps) {
  return (
    <details open={defaultOpen} className="group rounded-md border border-white/10 bg-black/20">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs text-white/70 transition-colors hover:text-white/90 [&::-webkit-details-marker]:hidden">
        <ChevronRight size={12} className="shrink-0 text-white/40 transition-transform group-open:rotate-90" />
        <span className="min-w-0 flex-1 break-words">{title}</span>
        {meta && <span className="shrink-0 font-mono text-[10px] text-white/30">{meta}</span>}
      </summary>
      <div className="border-t border-white/5 px-3 py-2">
        {copyText !== undefined && (
          <div className="mb-2 flex justify-end">
            <CopyButton text={copyText} />
          </div>
        )}
        {children}
      </div>
    </details>
  );
}

/** One labeled value inside a card grid. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-0.5 break-words text-xs leading-relaxed text-white/80">{children}</div>
    </div>
  );
}

export type ChipTone = "neutral" | "cyan" | "emerald" | "amber" | "rose" | "violet";

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: "border-white/10 bg-white/5 text-white/60",
  cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200/90",
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200/90",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-200/90",
  rose: "border-rose-500/30 bg-rose-500/10 text-rose-200/90",
  violet: "border-violet-500/30 bg-violet-500/10 text-violet-200/90",
};

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: ChipTone }) {
  return (
    <span className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] leading-relaxed ${CHIP_TONES[tone]}`}>
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}

/** Quiet placeholder shown when a package legitimately has nothing to show. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-xs italic leading-relaxed text-white/30">{children}</p>;
}

/** Card shell used by both Permanent Story Rules cards and run steps. */
export function WorkspaceCard({
  icon,
  kicker,
  title,
  headerAside,
  contentClassName = "gap-3 px-3 py-3",
  children,
}: {
  icon?: ReactNode;
  kicker?: string;
  title: ReactNode;
  headerAside?: ReactNode;
  /** Body layout override — used to give the manifested chapter its reading space. */
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-black/30">
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2.5">
        {icon && <span className="shrink-0 text-white/40">{icon}</span>}
        <div className="min-w-0 flex-1">
          {kicker && (
            <div className="text-[9px] uppercase tracking-widest text-white/30">{kicker}</div>
          )}
          <h3 className="break-words text-xs font-semibold uppercase tracking-widest text-white/80">{title}</h3>
        </div>
        {headerAside}
      </header>
      <div className={`flex min-w-0 flex-col ${contentClassName}`}>{children}</div>
    </section>
  );
}
