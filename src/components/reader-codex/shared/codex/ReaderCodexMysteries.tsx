import React from 'react';
import { HelpCircle, Check } from 'lucide-react';
import { StoryMemory } from '../types';
import {
  getColorCodeStyle,
  getColorCodeSurfaceStyle,
  resolvePlotThreadStatusColorCode,
} from '../../../reader-chamber/shared/colorCodes';

interface ReaderCodexMysteriesProps {
  memory: StoryMemory;
}

export function ReaderCodexMysteries({ memory }: ReaderCodexMysteriesProps) {
  const unresolvedThreads = memory.unresolvedPlotThreads || [];
  const resolvedThreads = memory.resolvedPlotThreads || [];
  const unresolvedColorCode = resolvePlotThreadStatusColorCode('unresolved');
  const resolvedColorCode = resolvePlotThreadStatusColorCode('resolved');

  return (
    <div className="space-y-6 animate-fadeIn" id="codex-karma-ledger">
      <div className="border-b border-neutral-900 pb-3">
        <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Active Karma Threads</h3>
        <p className="text-[10px] text-neutral-500 font-sans">Open-ended threads, prophecies, and revenge promises awaiting causal resolutions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Unresolved threads column */}
        <div className="space-y-3">
          <span
            data-color-code={unresolvedColorCode}
            style={getColorCodeStyle(unresolvedColorCode)}
            className="text-[10px] font-sc uppercase tracking-widest block font-bold"
          >
            Unresolved mysteries ({unresolvedThreads.length})
          </span>
          <div className="space-y-2">
            {unresolvedThreads.length === 0 ? (
              <p className="text-xs text-neutral-600 text-center py-6 bg-void/40 border border-neutral-950 rounded italic font-serif">
                All karma cleared. No open plot tasks.
              </p>
            ) : (
              unresolvedThreads.map((thread, idx) => (
                <div key={idx} className="p-3 bg-neutral-950/40 border border-neutral-900 rounded-lg text-xs hover:border-neutral-850 flex items-start gap-2.5 animate-fadeIn">
                  <span
                    data-color-code={unresolvedColorCode}
                    style={getColorCodeSurfaceStyle(unresolvedColorCode, {
                      borderOpacity: 0.3,
                      backgroundOpacity: 0.15,
                    })}
                    className="p-1 rounded border flex-shrink-0"
                  >
                    <HelpCircle size={12} className="animate-pulse" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-neutral-350 leading-relaxed font-sans">{typeof thread === 'string' ? thread : thread.description}</p>
                    <span className="text-[9px] text-neutral-600 uppercase font-sc block">
                      {typeof thread !== 'string' && typeof thread.originChapter === 'number' ? `Planted in Chapter ${thread.originChapter}` : 'Opened destiny arc'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Resolved threads column */}
        <div className="space-y-3">
          <span
            data-color-code={resolvedColorCode}
            style={getColorCodeStyle(resolvedColorCode)}
            className="text-[10px] font-sc uppercase tracking-widest block font-bold"
          >
            Severed karma ({resolvedThreads.length})
          </span>
          <div className="space-y-2">
            {resolvedThreads.length === 0 ? (
              <p className="text-xs text-neutral-600 text-center py-6 bg-void/40 border border-neutral-950 rounded italic font-serif">
                No accomplished feats or severed threads. Continue reading to resolve karma.
              </p>
            ) : (
              resolvedThreads.map((thread, idx) => (
                <div key={idx} className="p-3 bg-neutral-950/50 border border-neutral-950 rounded-lg text-xs hover:border-neutral-850 opacity-60 flex items-start gap-2.5">
                  <span
                    data-color-code={resolvedColorCode}
                    style={getColorCodeSurfaceStyle(resolvedColorCode, {
                      borderOpacity: 0.3,
                      backgroundOpacity: 0.15,
                    })}
                    className="p-1 rounded border flex-shrink-0"
                  >
                    <Check size={12} />
                  </span>
                  <div className="space-y-1">
                    <p className="text-neutral-500 leading-relaxed font-sans line-through italic">{typeof thread === 'string' ? thread : thread.description}</p>
                    <span
                      data-color-code={resolvedColorCode}
                      style={getColorCodeStyle(resolvedColorCode)}
                      className="text-[9px] uppercase font-sc block opacity-70"
                    >
                      Causal resolution achieved
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
