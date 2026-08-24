import React from 'react';
import { VirtualizedList } from '../../../reader-chamber/development/VirtualizedList';
import {
  getColorCodeSurfaceStyle,
  POWER_STAGE_BREAKTHROUGH_COLOR_CODE,
} from '../../../reader-chamber/shared/colorCodes';
import { Chapter } from '../types';

interface ReaderCodexTimelineProps {
  flatChapters: Array<{
    chapter: Chapter;
    arcTitle: string;
    arcIndex: number;
    isFirstInArc: boolean;
  }>;
  onJumpToChapter?: (chapterNumber: number) => void;
}

interface TimelineItemProps {
  item: ReaderCodexTimelineProps['flatChapters'][number];
  onJumpToChapter?: (chapterNumber: number) => void;
}

function TimelineItem({ item, onJumpToChapter }: TimelineItemProps) {
  const ch = item.chapter;
  const summary = ch.summary || "Chapter compiled successfully. View full text inside workspace script chambers.";
  const readButtonLabel = `Read Scene Text for Chapter ${ch.number}: ${ch.title}`;

  return (
    <div className="relative pb-2">
      {/* Arc Title Node */}
      {item.isFirstInArc && (
        <div className="relative flex items-center mb-3 mt-4 select-none">
          <span className="absolute -left-[14px] w-3 h-3 bg-human border-2 border-black rounded-full shadow-red animate-pulse"></span>
          <h4 className="font-sc text-[10px] sm:text-xs text-human uppercase tracking-widest font-extrabold ml-1.5 leading-normal">
            {item.arcTitle}
          </h4>
        </div>
      )}

      {/* Chapter Item */}
      <div className="relative pl-4 space-y-1.5 p-3.5 bg-neutral-950 border border-neutral-900 rounded-lg hover:border-neutral-800 transition-all">
        {/* Inner chapter dot */}
        <span className="absolute -left-[13px] top-6.5 w-2.5 h-2.5 bg-portal rounded-full border-2 border-black shadow"></span>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-900 pb-2">
          <span className="font-sans font-bold text-xs text-signal">
            Chapter {ch.number}: "{ch.title}"
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {ch.statsChangeMessage && ch.statsChangeMessage !== 'None' && (
              <span
                className="text-[8.5px] px-1.5 py-0.25 border font-mono rounded"
                data-color-code={POWER_STAGE_BREAKTHROUGH_COLOR_CODE}
                style={getColorCodeSurfaceStyle(POWER_STAGE_BREAKTHROUGH_COLOR_CODE, { borderOpacity: 0.35, backgroundOpacity: 0.12 })}
              >
                {ch.statsChangeMessage}
              </span>
            )}
            {onJumpToChapter && (
              <button
                onClick={() => onJumpToChapter(ch.number)}
                aria-label={readButtonLabel}
                className="px-2 py-0.5 bg-portal/10 text-portal rounded text-[8px] uppercase tracking-wider font-mono hover:bg-portal hover:text-void transition-all whitespace-nowrap"
              >
                Read Scene Text
              </button>
            )}
          </div>
        </div>

        <div className="font-serif italic leading-relaxed text-[11px] text-neutral-300 line-clamp-3 overflow-hidden" title={summary}>
          {summary}
        </div>

        {/* Dynamic detailed highlights reconstructed from chapter contents */}
        <div className="pt-2 grid grid-cols-2 gap-3 text-[9.5px]">
          <div className="p-1 px-2.5 bg-void border border-neutral-900 rounded">
            <span className="text-neutral-500 block font-mono font-bold">Resonance Breakthrough:</span>
            <span className="text-neutral-300 italic line-clamp-2 overflow-hidden" title={ch.statsChangeMessage || 'Internal cultivation locked.'}>{ch.statsChangeMessage || 'Internal cultivation locked.'}</span>
          </div>
          <div className="p-1 px-2.5 bg-void border border-neutral-900 rounded">
            <span className="text-neutral-500 block font-mono font-bold">Operational Catalyst:</span>
            <span className="text-neutral-300 line-clamp-2 overflow-hidden" title={ch.premise}>{ch.premise}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReaderCodexTimeline({ flatChapters, onJumpToChapter }: ReaderCodexTimelineProps) {
  return (
    <div className="space-y-6 animate-fadeIn" id="codex-timeline">
      <div className="border-b border-neutral-900 pb-3 flex justify-between items-end">
        <div>
          <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Chronicle Script Recaps</h3>
          <p className="text-[10px] text-neutral-500 font-sans">Interactive chapter highlights, written milestones, and quick shortcuts to read full text chapters.</p>
        </div>
      </div>

      <div className="pl-4">
        <VirtualizedList
          items={flatChapters}
          itemHeight={220} // Fixed row height; long text is line-clamped inside each card to preserve virtualization math.
          containerHeight={525}
          timelineLine={true}
          className="pr-2"
          emptyPlaceholder={
            <div className="text-center py-12 border border-dashed border-neutral-900 rounded bg-neutral-950/20 text-xs text-neutral-500 italic">
              Chronology empty. Generate and read your very first chapter to construct the causal timeline!
            </div>
          }
          renderItem={(item) => (
            <TimelineItem key={item.chapter.number} item={item} onJumpToChapter={onJumpToChapter} />
          )}
        />
      </div>
    </div>
  );
}
