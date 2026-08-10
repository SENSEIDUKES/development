import React, { useState } from 'react';
import { Users, ShieldAlert, MapPin, Sword, Compass, BookMarked, ArrowLeft } from 'lucide-react';
import type { StoryMemory, Character, Faction, Location, Artifact, PlotThread } from '../shared/types';

export interface ReaderCodexViewProps {
  memory?: StoryMemory & {
    powerSystem?: string;
    characters?: Character[];
    factions?: Faction[];
    locations?: Location[];
    artifacts?: Artifact[];
    unresolvedPlotThreads?: Array<string | PlotThread>;
    resolvedPlotThreads?: Array<string | PlotThread>;
    worldRules?: string[];
  };
  mcName?: string;
  currentPowerStage?: string;
  onBackToReader: () => void;
}

type CodexTab = 'characters' | 'factions' | 'locations' | 'artifacts' | 'threads';

const characterStatusClass = (status: Character['status']) => ({
  alive: 'bg-emerald-950 text-emerald-300 border border-emerald-500/30',
  deceased: 'bg-rose-950 text-rose-300 border border-rose-500/30',
  unknown: 'bg-slate-900 text-slate-300 border border-slate-500/30',
  ascended: 'bg-amber-950 text-amber-300 border border-amber-500/30',
})[status ?? 'unknown'] ?? 'bg-violet-950 text-violet-300 border border-violet-500/30';

export const originChapterForThread = (thread: string | PlotThread) => (
  typeof thread === 'object' ? thread.originChapter : undefined
);

export function ReaderCodexView({
  memory,
  mcName = 'Protagonist',
  currentPowerStage = 'Qi Refining',
  onBackToReader,
}: ReaderCodexViewProps) {
  const [activeTab, setActiveTab] = useState<CodexTab>('characters');

  const characters = memory?.characters || [];
  const factions = memory?.factions || [];
  const locations = memory?.locations || [];
  const artifacts = memory?.artifacts || [];
  const unresolvedThreads = memory?.unresolvedPlotThreads || [];

  const tabClass = (tab: CodexTab) =>
    `flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all border ${
      activeTab === tab
        ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
        : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
    }`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8">
      {/* Header Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBackToReader}
            className="flex items-center space-x-1.5 rounded-full border border-cyan-500/40 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-cyan-300 transition-colors hover:bg-cyan-950 hover:text-cyan-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Reader Chamber</span>
          </button>
          <div>
            <h1 className="font-display text-lg sm:text-xl text-white tracking-wide">
              Reader Codex & Story Memory
            </h1>
            <p className="text-xs font-mono text-cyan-400/80">
              Cultivator: <span className="text-white">{mcName}</span> • Realm:{' '}
              <span className="text-amber-300">{memory?.currentPowerStage || currentPowerStage}</span>
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setActiveTab('characters')} className={tabClass('characters')}>
            <Users className="h-3.5 w-3.5 text-cyan-400" />
            <span>Characters ({characters.length})</span>
          </button>
          <button type="button" onClick={() => setActiveTab('factions')} className={tabClass('factions')}>
            <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" />
            <span>Factions ({factions.length})</span>
          </button>
          <button type="button" onClick={() => setActiveTab('locations')} className={tabClass('locations')}>
            <MapPin className="h-3.5 w-3.5 text-purple-400" />
            <span>Locations ({locations.length})</span>
          </button>
          <button type="button" onClick={() => setActiveTab('artifacts')} className={tabClass('artifacts')}>
            <Sword className="h-3.5 w-3.5 text-amber-400" />
            <span>Artifacts ({artifacts.length})</span>
          </button>
          <button type="button" onClick={() => setActiveTab('threads')} className={tabClass('threads')}>
            <BookMarked className="h-3.5 w-3.5 text-rose-400" />
            <span>Threads ({unresolvedThreads.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        {/* Characters Tab */}
        {activeTab === 'characters' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {characters.length === 0 ? (
              <div className="col-span-full rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-neutral-400">
                No active character entries in living Codex memory.
              </div>
            ) : (
              characters.map((char, idx) => (
                <div
                  key={char.id || char.name || idx}
                  className="rounded-xl border border-cyan-500/20 bg-slate-900/60 p-4 backdrop-blur-sm transition-all hover:border-cyan-500/40"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-base text-cyan-200">{char.name}</h3>
                      <p className="text-xs font-mono text-neutral-400">{char.role || 'Character'}</p>
                    </div>
                    {char.status && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${characterStatusClass(char.status)}`}
                      >
                        {char.status}
                      </span>
                    )}
                  </div>
                  {char.powerLevel && (
                    <p className="mt-2 text-xs text-amber-300/90 font-mono">
                      Realm: {char.powerLevel}
                    </p>
                  )}
                  {char.relationshipToMC && (
                    <p className="mt-1 text-xs text-cyan-300/80">
                      Relationship: {char.relationshipToMC}
                    </p>
                  )}
                  {char.description && (
                    <p className="mt-2 text-xs text-neutral-300 leading-relaxed line-clamp-3">
                      {char.description}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Factions Tab */}
        {activeTab === 'factions' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {factions.length === 0 ? (
              <div className="col-span-full rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-neutral-400">
                No active faction entries in living Codex memory.
              </div>
            ) : (
              factions.map((fac, idx) => (
                <div
                  key={fac.id || fac.name || idx}
                  className="rounded-xl border border-emerald-500/20 bg-slate-900/60 p-4 backdrop-blur-sm"
                >
                  <h3 className="font-display text-base text-emerald-200">{fac.name}</h3>
                  {fac.alignment && (
                    <p className="text-xs font-mono text-emerald-400/80">Alignment: {fac.alignment}</p>
                  )}
                  {fac.description && (
                    <p className="mt-2 text-xs text-neutral-300 leading-relaxed">{fac.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Locations Tab */}
        {activeTab === 'locations' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {locations.length === 0 ? (
              <div className="col-span-full rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-neutral-400">
                No location entries in living Codex memory.
              </div>
            ) : (
              locations.map((loc, idx) => (
                <div
                  key={loc.id || loc.name || idx}
                  className="rounded-xl border border-purple-500/20 bg-slate-900/60 p-4 backdrop-blur-sm"
                >
                  <h3 className="font-display text-base text-purple-200">{loc.name}</h3>
                  {loc.safetyLevel && (
                    <p className="text-xs font-mono text-purple-400/80">Safety: {loc.safetyLevel}</p>
                  )}
                  {loc.description && (
                    <p className="mt-2 text-xs text-neutral-300 leading-relaxed">{loc.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Artifacts Tab */}
        {activeTab === 'artifacts' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artifacts.length === 0 ? (
              <div className="col-span-full rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-neutral-400">
                No artifact entries in living Codex memory.
              </div>
            ) : (
              artifacts.map((art, idx) => (
                <div
                  key={art.id || art.name || idx}
                  className="rounded-xl border border-amber-500/20 bg-slate-900/60 p-4 backdrop-blur-sm"
                >
                  <h3 className="font-display text-base text-amber-200">{art.name}</h3>
                  {art.tier && <p className="text-xs font-mono text-amber-400/80">Tier: {art.tier}</p>}
                  {art.description && (
                    <p className="mt-2 text-xs text-neutral-300 leading-relaxed">{art.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Threads Tab */}
        {activeTab === 'threads' && (
          <div className="space-y-3 max-w-3xl">
            {unresolvedThreads.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-neutral-400">
                No active plot threads recorded.
              </div>
            ) : (
              unresolvedThreads.map((thread, idx) => {
                const desc = typeof thread === 'string' ? thread : thread.description;
                const ch = originChapterForThread(thread);
                return (
                  <div
                    key={idx}
                    className="flex items-start space-x-3 rounded-lg border border-rose-500/20 bg-slate-900/60 p-3"
                  >
                    <Compass className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-neutral-200">{desc}</p>
                      {ch !== undefined && <p className="mt-0.5 text-[10px] font-mono text-neutral-500">Origin Chapter {ch}</p>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
