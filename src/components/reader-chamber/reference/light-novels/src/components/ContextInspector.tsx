import { ChevronDown, ScanSearch } from "lucide-react";
import type { ContextManifest } from "../types";

interface ContextInspectorProps {
  manifest?: ContextManifest;
}

export function ContextInspector({ manifest }: ContextInspectorProps) {
  if (!manifest) return null;

  const engine = manifest.engine ?? "v1";
  const providerInputEstimatedTokens =
    manifest.providerInputEstimatedTokens ?? manifest.totalEstimatedTokens;
  const omissionLabels: Record<string, string> = {
    relevance_or_cap: "relevance/cap",
    token_budget: "token budget",
    selection_or_token_budget: "selection/budget",
    demoted_to_brief: "demoted to brief",
    budget_drop: "budget drop",
  };

  return (
    <details className="group mx-auto mt-10 w-full max-w-2xl rounded-lg border border-portal/20 bg-black/35 text-left font-sans shadow-[0_0_18px_rgba(4,172,255,0.05)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-neutral-400 transition-colors hover:text-portal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-portal [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <ScanSearch size={13} className="shrink-0 text-portal/70" />
          <span>Context Inspector</span>
          <span className="truncate font-mono normal-case tracking-normal text-neutral-500">
            Chapter {manifest.chapterNumber}
          </span>
          <span className="rounded border border-portal/20 bg-portal/5 px-1.5 py-0.5 font-mono text-[8px] normal-case tracking-normal text-portal/80">
            Engine {engine}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 font-mono normal-case tracking-normal text-neutral-300">
          ~{providerInputEstimatedTokens.toLocaleString()} provider tokens
          <ChevronDown size={13} className="transition-transform group-open:rotate-180" />
        </span>
      </summary>

      <div className="border-t border-neutral-900 px-3 py-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-neutral-400">
          <span>
            Memory + history: ~{manifest.memoryAndHistoryEstimatedTokens.toLocaleString()}
            {" / "}{manifest.memoryAndHistoryBudgetTokens.toLocaleString()}
          </span>
          <span>
            Budgeted sections: ~{manifest.totalEstimatedTokens.toLocaleString()}
          </span>
          {manifest.memoryAndHistoryBudgetExceeded ? (
            <span className="text-amber-400">Budget exceeded</span>
          ) : (
            <span className="text-jade-accent/80">Within budget</span>
          )}
        </div>
        {manifest.providerInputTruncated ? (
          <p className="mb-3 rounded border border-amber-500/25 bg-amber-500/5 px-2 py-1.5 text-[10px] text-amber-300">
            Provider hard cap applied; sections near the prompt tail may be partial.
          </p>
        ) : null}
        <ol className="space-y-2" aria-label="Chapter context token breakdown">
          {manifest.sections.map(section => {
            const share = manifest.totalEstimatedTokens > 0
              ? Math.round((section.estimatedTokens / manifest.totalEstimatedTokens) * 100)
              : 0;

            return (
              <li key={section.key} className="rounded border border-neutral-900/90 bg-black/25 px-2.5 py-2">
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="font-medium text-neutral-200">{section.label}</span>
                  <span className="font-mono text-neutral-400">
                    ~{section.estimatedTokens.toLocaleString()} · {share}%
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-neutral-900">
                  <div
                    className="h-full rounded-full bg-portal/60"
                    style={{ width: `${Math.max(share, section.estimatedTokens > 0 ? 1 : 0)}%` }}
                  />
                </div>
                {section.includedItems.length > 0 ? (
                  <p className="mt-1.5 break-words text-[10px] leading-relaxed text-neutral-400">
                    <span className="text-jade-accent/80">In:</span>{" "}
                    {section.includedItems.join(", ")}
                  </p>
                ) : null}
                {section.demotedItems?.length ? (
                  <p className="mt-1 break-words text-[10px] leading-relaxed text-sky-300/80">
                    <span className="font-semibold">Demoted:</span>{" "}
                    {section.demotedItems.join(", ")}
                  </p>
                ) : null}
                {section.protectedOverflowTokens ? (
                  <p className="mt-1 break-words text-[10px] leading-relaxed text-violet-300/80">
                    <span className="font-semibold">Protected overflow:</span>{" "}
                    ~{section.protectedOverflowTokens.toLocaleString()} tokens retained
                  </p>
                ) : null}
                {section.omittedItems.length > 0 ? (
                  <p className="mt-1 break-words text-[10px] leading-relaxed text-amber-400/80">
                    <span className="font-semibold">
                      Out{section.omissionReason ? ` (${omissionLabels[section.omissionReason]})` : ""}:
                    </span>{" "}
                    {section.omittedItems.join(", ")}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </details>
  );
}
