import React, { useState } from 'react';
import {
  Zap, Compass, Crown, SlidersHorizontal, LayoutGrid, ChevronRight, Sparkles, Settings2
} from 'lucide-react';
import type { CodexContextEditorTarget } from './CodexContext';
import { StoryMemory, StoryWorld } from '../types';
import {
  getColorCodeSurfaceStyle,
  resolvePowerStageColorCode,
} from '../../../reader-chamber/shared/colorCodes';

interface ReaderCodexPowerProps {
  memory: StoryMemory;
  activeStory: StoryWorld;
  getPowerStageLevel: (stage?: string) => { score: number, title: string };
  mcName: string;
  getPowerRankScore: (s?: string) => { score: number, title: string };
  charsToRender: any[];
  openEntryContextEditor?: (target: CodexContextEditorTarget) => void;
}

export function ReaderCodexPower({
  memory,
  activeStory,
  getPowerStageLevel,
  mcName,
  getPowerRankScore,
  charsToRender,
  openEntryContextEditor,
}: ReaderCodexPowerProps) {
  const activeTierColorCode = resolvePowerStageColorCode(memory.currentPowerStage);

  return (
    <>
{/* PAGE 3: Power system (Sovereign Cultivation Power-Ranking Chart) */}

          <div className="space-y-6 animate-fadeIn" id="codex-power-system-leadboard">
            <div className="border-b border-amber-500/15 pb-3 flex flex-wrap justify-between items-end gap-3">
              <div>
                <h3 className="font-display text-lg text-amber-100 tracking-wide codex-glow-gold flex items-center gap-2">
                  <Crown size={16} className="text-amber-400" />
                  <span>Power Overview</span>
                </h3>
                <p className="text-[10px] text-neutral-500 font-sans mt-0.5">Power rankings distill standard cultivation tiers into exact energetic indexes.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:flex items-center gap-1.5 text-[9px] px-2.5 py-1.5 rounded-lg border border-white/10 bg-black/50 font-sc text-neutral-400 uppercase tracking-widest">
                  <SlidersHorizontal size={10} />
                  <span>Sort</span>
                </span>
                <span className="hidden sm:flex items-center px-2 py-1.5 rounded-lg border border-white/10 bg-black/50 text-neutral-400">
                  <LayoutGrid size={10} />
                </span>
                <span
                  className="text-[10px] px-2.5 py-1.5 font-mono border rounded-lg"
                  data-color-code={activeTierColorCode}
                  style={getColorCodeSurfaceStyle(activeTierColorCode, { borderOpacity: 0.2, backgroundOpacity: 0.08 })}
                >
                  Active Tier: {memory.currentPowerStage}
                </span>
              </div>
            </div>

            {/* Dynamic visual ranking bar charts */}
            <div className="space-y-4">
              <span className="text-[10px] font-sc tracking-[0.25em] uppercase text-portal font-semibold block px-1">Combat Prowess Graph</span>

              <div className="space-y-4">
                {/* Always include Main Character Han Feng / MC at their current live rank */}
                {(() => {
                  const mcScore = getPowerRankScore(memory.currentPowerStage);

                  return (
                    <div className="codex-panel-blue rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                      {/* Decorative corner accents */}
                      <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-portal/40 rounded-tl pointer-events-none"></div>
                      <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-portal/40 rounded-tr pointer-events-none"></div>
                      <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-portal/40 rounded-bl pointer-events-none"></div>
                      <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-portal/40 rounded-br pointer-events-none"></div>

                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Sigil circle */}
                        <div className="hidden sm:flex w-16 h-16 rounded-full border border-portal/40 bg-portal/5 items-center justify-center relative flex-shrink-0 shadow-[0_0_20px_rgba(4,172,255,0.2)]">
                          <div className="absolute inset-1 rounded-full border border-portal/20 border-dashed"></div>
                          <Zap size={22} className="text-portal" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-[9px] px-2 py-0.5 border border-portal/40 bg-portal/10 text-portal font-sc font-bold uppercase tracking-widest rounded">MC</span>
                              <strong className="text-signal font-display text-lg sm:text-xl tracking-wide truncate">{mcName} <span className="font-serif italic text-sm text-neutral-400 font-normal">(You)</span></strong>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="block text-[8.5px] text-portal/70 font-sc uppercase tracking-[0.25em]">Rank Index</span>
                              <span className="text-portal font-display font-bold text-xl sm:text-2xl codex-glow-blue">{mcScore.score}/100</span>
                            </div>
                          </div>

                          <div className="h-2.5 bg-black/70 border border-portal/15 rounded-full overflow-hidden relative mt-3">
                            <div className="bg-gradient-to-r from-portal via-cyan-400 to-signal h-full rounded-full transition-all duration-1000 codex-progress-shimmer shadow-[0_0_10px_rgba(4,172,255,0.6)]" style={{ width: `${mcScore.score}%` }}></div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 items-center gap-2 mt-4 pt-3 border-t border-portal/15">
                        <div className="text-left">
                          <span className="block text-[8.5px] text-neutral-500 font-sc uppercase tracking-[0.2em]">Min Stage</span>
                          <span className="text-neutral-400 font-serif text-xs sm:text-sm">Mortal</span>
                        </div>
                        <div className="text-center relative">
                          <ChevronRight size={12} className="absolute -left-1 top-1/2 -translate-y-1/2 text-portal/50 hidden sm:block" />
                          <span className="block text-[8.5px] text-portal/70 font-sc uppercase tracking-[0.2em]">Current Stage</span>
                          <span className="text-signal font-serif text-xs sm:text-sm block">{memory.currentPowerStage}</span>
                          <span className="text-portal/80 font-serif italic text-[10px] block">({mcScore.title})</span>
                          <ChevronRight size={12} className="absolute -right-1 top-1/2 -translate-y-1/2 text-portal/50 hidden sm:block" />
                        </div>
                        <div className="text-right">
                          <span className="block text-[8.5px] text-neutral-500 font-sc uppercase tracking-[0.2em]">Max Stage</span>
                          <span className="text-neutral-400 font-serif text-xs sm:text-sm">Sovereign</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Secondary characters in order of power level */}
                {charsToRender
                  .map(c => ({ char: c, stats: getPowerRankScore(c.powerLevel) }))
                  .sort((a, b) => b.stats.score - a.stats.score)
                  .map(({ char, stats }) => {
                    return (
                      <div key={char.id} className="codex-panel-gold rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_24px_rgba(212,175,55,0.15)]">
                        <div className="flex items-center gap-3 sm:gap-4">
                          {/* Sigil circle */}
                          <div className="hidden sm:flex w-12 h-12 rounded-full border border-amber-500/30 bg-amber-500/5 items-center justify-center relative flex-shrink-0">
                            <div className="absolute inset-1 rounded-full border border-amber-500/15 border-dashed"></div>
                            <Sparkles size={16} className="text-amber-400/80" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-[9px] px-2 py-0.5 border border-amber-500/40 bg-amber-500/10 text-amber-400 font-sc font-bold uppercase tracking-widest rounded">Node</span>
                                <span className="text-amber-50 font-display text-base sm:text-lg tracking-wide truncate">{char.name}</span>
                                <span className="text-[10px] text-neutral-500 font-serif italic truncate">({(char.role || '').split(',')[0]})</span>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className="block text-[8.5px] text-amber-500/70 font-sc uppercase tracking-[0.25em]">Rank Index</span>
                                <span className="text-amber-400 font-display font-bold text-lg sm:text-xl codex-glow-gold">{stats.score}/100</span>
                              </div>
                            </div>

                            <div className="h-2 bg-black/70 border border-amber-500/15 rounded-full overflow-hidden mt-2.5">
                              <div className="bg-gradient-to-r from-yellow-700 via-yellow-500 to-amber-300 h-full rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]" style={{ width: `${stats.score}%` }}></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center gap-2 mt-3 pt-2.5 border-t border-amber-500/10">
                          <div>
                            <span className="block text-[8.5px] text-neutral-500 font-sc uppercase tracking-[0.2em]">Realm</span>
                            <span className="text-neutral-300 font-serif text-xs">{char.powerLevel || 'Level Unlisted'}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[8.5px] text-neutral-500 font-sc uppercase tracking-[0.2em]">Realm Title</span>
                            <span className="text-amber-200/90 font-serif text-xs">{stats.title}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                }

                {charsToRender.length === 0 && (
                  <div className="codex-panel rounded-2xl text-center py-10 px-6">
                    <Compass size={24} className="mx-auto text-amber-500/30 mb-2" />
                    <p className="text-neutral-500 font-serif italic text-xs">
                      No secondary Daoist ranks mapped yet. Introduce them in scriptures.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* General World system explanation definition rules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="codex-panel rounded-2xl p-4 sm:p-5 text-xs leading-relaxed space-y-2.5">
                <span className="text-[10px] text-human uppercase font-bold tracking-[0.25em] block font-sc border-b border-human-brand/25 pb-2">Cultivation System Rules</span>
                <p className="text-neutral-400 font-serif italic font-light">“{memory.powerSystem}”</p>
              </div>

              <div className="codex-panel rounded-2xl p-4 sm:p-5 text-xs leading-relaxed space-y-2.5">
                <span className="text-[10px] text-portal uppercase font-bold tracking-[0.25em] block font-sc border-b border-portal/20 pb-2">Universal Laws of Void</span>
                <ul className="list-disc pl-4 space-y-1.5 text-neutral-400 marker:text-portal/50">
                  {memory.worldRules?.map((rule, idx) => (
                    <li key={idx} className="font-sans font-light">{rule}</li>
                  ))}
                  {(!memory.worldRules || memory.worldRules.length === 0) && (
                    <li>No laws codified yet. Survival is standard.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Ability Ledger */}
            <div className="space-y-4 pt-6 border-t border-portal/10 mt-6" id="codex-ability-ledger">
              <div>
                <h3 className="font-display text-lg text-signal tracking-wide codex-glow-blue">Ability Ledger</h3>
                <p className="text-[10px] text-neutral-500 font-sans mt-0.5">Formal record of all confirmed abilities acquired by {mcName}.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {memory.abilities?.map((ability, idx) => {
                  if (!ability) return null;
                  if (typeof ability === 'string') {
                    return (
                      <div key={idx} className="codex-panel p-4 rounded-2xl space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-signal font-display font-bold text-sm tracking-wide">{ability}</span>
                          {openEntryContextEditor && (
                            <button
                              type="button"
                              onClick={() => openEntryContextEditor({ collection: 'abilities', index: idx })}
                              className="text-neutral-600 hover:text-portal"
                              title="Edit generation context"
                              aria-label={`Edit generation context for ${ability}`}
                            >
                              <Settings2 size={12} />
                            </button>
                          )}
                        </div>
                        <span className="block text-[9px] text-neutral-500 font-sc uppercase tracking-widest">Legacy Text Record</span>
                      </div>
                    );
                  }

                  return (
                    <div key={ability.id || idx} className="codex-panel p-4 sm:p-5 hover:border-portal/40 hover:shadow-[0_0_20px_rgba(4,172,255,0.1)] transition-all duration-300 rounded-2xl space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="text-signal font-display font-bold text-base tracking-wide">{ability.name}</h4>
                        <div className="flex items-center gap-2">
                          {ability.masteryLevel && (
                            <span className="text-[9px] px-2 py-0.5 bg-portal/10 text-portal font-sc uppercase tracking-widest rounded border border-portal/30 shadow-[0_0_8px_rgba(4,172,255,0.15)]">
                              {ability.masteryLevel}
                            </span>
                          )}
                          {openEntryContextEditor && (
                            <button
                              type="button"
                              onClick={() => openEntryContextEditor({ collection: 'abilities', index: idx })}
                              className="text-neutral-600 hover:text-portal"
                              title="Edit generation context"
                              aria-label={`Edit generation context for ${ability.name}`}
                            >
                              <Settings2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-neutral-400 text-xs leading-relaxed font-serif italic">
                        {ability.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-white/5 pt-2.5">
                        {ability.cost && (
                          <div className="flex flex-col">
                            <span className="text-neutral-600 uppercase">Cost</span>
                            <span className="text-rose-400/80 truncate" title={ability.cost}>{ability.cost}</span>
                          </div>
                        )}
                        {ability.limits && (
                          <div className="flex flex-col">
                            <span className="text-neutral-600 uppercase">Limits</span>
                            <span className="text-neutral-300 truncate" title={ability.limits}>{ability.limits}</span>
                          </div>
                        )}
                        {ability.source && (
                          <div className="flex flex-col">
                            <span className="text-neutral-600 uppercase">Source</span>
                            <span className="text-amber-500/80 truncate" title={ability.source}>{ability.source}</span>
                          </div>
                        )}
                        {ability.acquiredChapter && (
                          <div className="flex flex-col">
                            <span className="text-neutral-600 uppercase">Acquired</span>
                            <span className="text-neutral-400">Chapter {ability.acquiredChapter}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {(!memory.abilities || memory.abilities.length === 0) && (
                  <div className="col-span-1 md:col-span-2 codex-panel p-8 border-dashed rounded-2xl text-center">
                     <span className="text-neutral-500 text-xs font-serif italic">No formalized abilities recorded in the ledger yet.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

    </>
  );
}
