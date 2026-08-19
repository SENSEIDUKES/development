import { FlaskConical, Music } from "lucide-react";
import type { ChapterContent, StoryBlock, StoryBlockMetadata, SystemEvent } from "../shared/types";
import { Chip, EmptyNote } from "./workspaceUi";

const formatToken = (token: string) =>
  token.replace(/[_-]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());

/** Visible per-block effect markers, derived from the block's own metadata. */
export function effectMarkers(metadata?: StoryBlockMetadata): string[] {
  if (!metadata) return [];
  const markers: string[] = [];
  if (metadata.sceneType) markers.push(`scene: ${formatToken(metadata.sceneType)}`);
  if (metadata.emotion) markers.push(`emotion: ${metadata.emotion}`);
  if (metadata.intensity !== undefined) markers.push(`intensity ${metadata.intensity}`);
  if (metadata.tension !== undefined) markers.push(`tension ${metadata.tension}`);
  if (metadata.danger !== undefined) markers.push(`danger ${metadata.danger}`);
  if (metadata.mysticism !== undefined) markers.push(`mysticism ${metadata.mysticism}`);
  if (metadata.atmosphereCategory) markers.push(`atmosphere: ${formatToken(metadata.atmosphereCategory)}`);
  if (metadata.music?.mood) markers.push(`music: ${metadata.music.mood}`);
  if (metadata.entities?.length) {
    markers.push(`entities: ${metadata.entities.map(entity => entity.name).join(", ")}`);
  }
  if (metadata.beastEvent) markers.push(`beast: ${formatToken(metadata.beastEvent.type)}`);
  return markers;
}

function EffectMarkerRow({ metadata }: { metadata?: StoryBlockMetadata }) {
  const markers = effectMarkers(metadata);
  if (markers.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {markers.map(marker => (
        <span
          key={marker}
          className="rounded-full border border-white/10 bg-white/5 px-1.5 py-px font-mono text-[9px] leading-relaxed text-white/40"
        >
          {marker}
        </span>
      ))}
    </div>
  );
}

function SystemPanel({ system }: { system: SystemEvent }) {
  return (
    <div className="min-w-0 rounded-md border border-cyan-500/25 bg-cyan-500/5 px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-cyan-200/80">
          System Panel · {formatToken(system.kind)}
        </span>
        {system.promptType && <Chip tone="cyan">{formatToken(system.promptType)}</Chip>}
        {system.rarity && <Chip tone="amber">{system.rarity}</Chip>}
      </div>
      <div className="mt-1 text-xs font-semibold text-cyan-100">{system.title}</div>
      {system.rows && system.rows.length > 0 && (
        <dl className="mt-1.5 flex flex-col gap-1">
          {system.rows.map(row => (
            <div key={`${row.label}-${row.value}`} className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-[11px]">
              <dt className="shrink-0 uppercase tracking-wider text-white/40">{row.label}</dt>
              <dd className="min-w-0 break-words text-white/80">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {system.fateResult && (
        <div className="mt-1.5 text-[11px] text-rose-200/80">
          {system.fateResult.outcome} — {system.fateResult.timelineScar}
        </div>
      )}
    </div>
  );
}

function ChapterBlockView({ block }: { block: StoryBlock }) {
  const isDialogue = block.type === "dialogue" || block.metadata?.mode === "dialogue";
  return (
    <div className="min-w-0">
      {isDialogue ? (
        <div className="border-l-2 border-cyan-500/40 pl-3">
          <p className="break-words font-serif text-sm leading-relaxed text-white/85 [overflow-wrap:anywhere]">
            {block.text}
          </p>
          {block.metadata?.speakerName && (
            <div className="mt-1 text-[10px] uppercase tracking-widest text-cyan-200/60">
              {block.metadata.speakerName}
              {block.metadata.speakerRole ? ` · ${formatToken(block.metadata.speakerRole)}` : ""}
            </div>
          )}
        </div>
      ) : (
        <p className="break-words font-serif text-sm leading-relaxed text-white/85 [overflow-wrap:anywhere]">
          {block.text}
        </p>
      )}
      {block.system && <div className="mt-2"><SystemPanel system={block.system} /></div>}
      <EffectMarkerRow metadata={block.metadata} />
    </div>
  );
}

export interface ManifestedChapterViewProps {
  chapter: ChapterContent;
  /** Chapter Mission title, shown next to the chapter number when available. */
  title?: string;
  /** True when Stage 4 requested a repair and this view shows the repaired text. */
  repaired?: boolean;
  /** Present only for a server-generated chapter; omitted by deterministic diagnostics. */
  generationSource?: { provider: string; model: string };
}

/**
 * Renders the manifested chapter as it is meant to be read: prose, dialogue,
 * System Panels and visible effect markers — never raw JSON.
 */
export function ManifestedChapterView({
  chapter,
  title,
  repaired = false,
  generationSource,
}: ManifestedChapterViewProps) {
  const paragraphs = chapter.blocks?.length
    ? null
    : chapter.generatedContent.split(/\n{2,}/).filter(paragraph => paragraph.trim());

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className={`flex items-start gap-2 rounded-md border px-3 py-2 ${generationSource
        ? "border-emerald-500/25 bg-emerald-500/5"
        : "border-amber-500/25 bg-amber-500/5"}`}>
        <FlaskConical size={12} className={`mt-0.5 shrink-0 ${generationSource
          ? "text-emerald-200/70"
          : "text-amber-200/70"}`} />
        <p className={`text-[11px] leading-relaxed ${generationSource
          ? "text-emerald-100/80"
          : "text-amber-100/80"}`}>
          {generationSource
            ? `Live output — generated server-side through ${generationSource.provider} using ${generationSource.model}.`
            : "Mock output — written by the deterministic Workshop diagnostics adapter, not a live model."}
          {repaired ? " A repair pass was applied after a serious finding." : ""}
        </p>
      </div>

      {chapter.manifestDiagnostics && (
        <div className={`rounded-md border px-3 py-2 ${chapter.manifestDiagnostics.status === "needs-review"
          ? "border-amber-500/30 bg-amber-500/8"
          : "border-white/10 bg-white/[0.03]"}`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip tone={chapter.manifestDiagnostics.status === "needs-review" ? "amber" : "emerald"}>
              {chapter.manifestDiagnostics.status === "needs-review" ? "Needs review" : "Healthy prose"}
            </Chip>
            <span className="text-[10px] text-white/50">
              {chapter.manifestDiagnostics.wordCount.toLocaleString()} words
            </span>
          </div>
          {chapter.manifestDiagnostics.warnings.length > 0 && (
            <ul className="mt-1.5 space-y-1 text-[10px] leading-relaxed text-amber-100/70">
              {chapter.manifestDiagnostics.warnings.map((item, index) => (
                <li key={`${item.code}-${item.blockIndex ?? "chapter"}-${index}`}>• {item.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-white/40">
          Chapter {chapter.chapterNumber}{title ? ` — ${title}` : ""}
        </div>
        {chapter.summary && (
          <p className="mt-0.5 text-[11px] italic leading-relaxed text-white/40">{chapter.summary}</p>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-4 rounded-md border border-white/5 bg-white/[0.02] px-3 py-3">
        {chapter.blocks?.map(block => <ChapterBlockView key={block.id} block={block} />)}
        {paragraphs?.map((paragraph, index) => (
          <p key={index} className="break-words font-serif text-sm leading-relaxed text-white/85 [overflow-wrap:anywhere]">
            {paragraph}
          </p>
        ))}
        {!chapter.blocks?.length && !paragraphs?.length && (
          <EmptyNote>The writer returned no readable content for this chapter.</EmptyNote>
        )}
      </div>

      {(chapter.statsChangeMessage && chapter.statsChangeMessage !== "None") || chapter.cuePayload?.music ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {chapter.statsChangeMessage && chapter.statsChangeMessage !== "None" && (
            <Chip tone="emerald">{chapter.statsChangeMessage}</Chip>
          )}
          {chapter.cuePayload?.music && (
            <Chip tone="violet">
              <Music size={10} /> {chapter.cuePayload.music.mood}
            </Chip>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default ManifestedChapterView;
