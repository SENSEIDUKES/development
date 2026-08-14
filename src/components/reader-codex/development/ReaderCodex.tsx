import React, { useState, useEffect, useMemo } from 'react';
import '../shared/reader-codex.css';
import {
  Users, Network, Zap, Sword,
  MapPin, ShieldAlert,
  Compass,
  BookMarked, BookOpen, Activity, History
} from 'lucide-react';
import { generateId, vibrate } from '../shared/codexCompatibility';
import { StoryMemory, Character, CreatureSpecies, StoryArc, StoryWorld, MultiModelRouting, UpdateStoryFields } from '../shared/types';
import {
  CodexProvider,
  type CodexContextEditorTarget,
} from '../shared/codex/CodexContext';
import { CodexEntryContextDialog } from '../shared/codex/CodexEntryContextDialog';
import { ReaderCodexCollage } from '../shared/codex/ReaderCodexCollage';
import { ReaderCodexCharacters } from '../shared/codex/ReaderCodexCharacters';
import { ReaderCodexRelations } from '../shared/codex/ReaderCodexRelations';
import { ReaderCodexPower } from '../shared/codex/ReaderCodexPower';
import { ReaderCodexGlossary } from '../shared/codex/ReaderCodexGlossary';
import { ReaderCodexMysteries } from '../shared/codex/ReaderCodexMysteries';
import { ReaderCodexTimeline } from '../shared/codex/ReaderCodexTimeline';
import { ReaderCodexArtifacts } from '../shared/codex/ReaderCodexArtifacts';
import { ReaderCodexFactions } from '../shared/codex/ReaderCodexFactions';
import { ReaderCodexDashboards } from '../shared/codex/ReaderCodexDashboards';
import { ReaderCodexFate } from '../shared/codex/ReaderCodexFate';
import { ReaderCodexBestiary } from './ReaderCodexBestiary';
import { DestinyChoicePanel } from '../shared/DestinyChoicePanel';
import { motion, AnimatePresence } from 'motion/react';
import { useCodexAnalytics } from '../shared/hooks/useCodexAnalytics';
import { useCodexImageEvolution } from '../shared/hooks/useCodexImageEvolution';
import { useCodexDeletions } from '../shared/hooks/useCodexDeletions';
import { stripLegacyCodexContextFields } from '../shared/codexContext';

interface ReaderCodexProps {
  memory: StoryMemory;
  arcs: StoryArc[];
  onUpdateMemory: (updatedMemory: StoryMemory) => void;
  mcName: string;
  onJumpToChapter?: (chapterNumber: number) => void;
  onSwitchTab?: (tab: 'reader' | 'codex' | 'memory') => void;
  activeStory: StoryWorld;
  updateStoryFields: UpdateStoryFields;
  routingConfig?: MultiModelRouting;
}

// 1. Static high-fidelity Chinese cultivation vocabulary (Glossary defaults)

// Premium segmented-control styling for Codex navigation tabs.
// Each page carries its own accent aura when active.
const CODEX_TAB_ACCENTS = {
  neutral: 'codex-panel text-signal border-white/15 shadow-[0_0_14px_rgba(250,250,250,0.08)]',
  blue: 'codex-panel-blue text-signal shadow-[0_0_16px_rgba(4,172,255,0.25)]',
  gold: 'codex-panel-gold text-amber-100 shadow-[0_0_16px_rgba(212,175,55,0.25)]',
  orange: 'codex-panel text-signal border-orange-500/40 shadow-[0_0_14px_rgba(249,115,22,0.18)]',
  green: 'codex-panel text-signal border-green-500/40 shadow-[0_0_14px_rgba(34,197,94,0.18)]',
  purple: 'codex-panel text-signal border-purple-500/40 shadow-[0_0_14px_rgba(168,85,247,0.18)]'
} as const;

const codexTabClass = (isActive: boolean, accent: keyof typeof CODEX_TAB_ACCENTS) => {
  const base = 'flex items-center space-x-2 md:space-x-3 px-4 py-2.5 md:px-3 md:py-2.5 rounded-lg text-[10px] md:text-[11px] tracking-wider transition-all duration-300 font-sc uppercase flex-shrink-0 border';
  if (!isActive) {
    return `${base} border-transparent text-neutral-500 hover:text-neutral-350 hover:bg-neutral-950/60 hover:border-white/5`;
  }
  return `${base} ${CODEX_TAB_ACCENTS[accent]}`;
};

type NormalizedStoryMemory = StoryMemory & {
  characters: NonNullable<StoryMemory['characters']>;
  unresolvedPlotThreads: NonNullable<StoryMemory['unresolvedPlotThreads']>;
  resolvedPlotThreads: NonNullable<StoryMemory['resolvedPlotThreads']>;
  worldRules: NonNullable<StoryMemory['worldRules']>;
  memoryWarnings: NonNullable<StoryMemory['memoryWarnings']>;
  factions: NonNullable<StoryMemory['factions']>;
  locations: NonNullable<StoryMemory['locations']>;
  artifacts: NonNullable<StoryMemory['artifacts']>;
  bestiary: NonNullable<StoryMemory['bestiary']>;
  abilities: NonNullable<StoryMemory['abilities']>;
};

const ensureSparseEntityId = (id: unknown, prefix: string, index: number): string =>
  typeof id === 'string' && id.trim().length > 0 ? id : `${prefix}-${index + 1}`;

const normalizeEntityIds = <T extends { id: string }>(
  entries: T[] | undefined,
  prefix: string,
): T[] => {
  if (!Array.isArray(entries)) return [];

  return entries
    .filter((entry): entry is T => Boolean(entry) && typeof entry === 'object')
    .map((entry, index) => ({
      ...entry,
      id: ensureSparseEntityId(entry.id, prefix, index),
    }));
};

const normalizeAbilities = (
  abilities: Character['abilities'] | StoryMemory['abilities'],
  ownerPrefix: string,
): NonNullable<Character['abilities']> => {
  if (!Array.isArray(abilities)) return [];

  return abilities.reduce<NonNullable<Character['abilities']>>((normalized, ability, index) => {
    if (typeof ability === 'string') {
      normalized.push(ability);
    } else if (ability && typeof ability === 'object') {
      normalized.push({
      ...ability,
      id: ensureSparseEntityId(ability.id, `${ownerPrefix}-ability`, index),
      });
    }

    return normalized;
  }, []);
};

const normalizePortrait = (character: Character, index: number): Character => {
  const { isBeast: legacyIsBeast, beastProfile: legacyCreatureProfile, ...canonicalCharacter } = character;
  const rawRole = typeof character.role === 'string' ? character.role.trim() : '';
  const legacyRoleIsBeast = rawRole.toLocaleLowerCase() === 'beast';
  const portraitKind = character.portraitKind === 'non-human'
    || legacyIsBeast === true
    || legacyRoleIsBeast
    || Boolean(character.speciesId)
    ? 'non-human'
    : 'human';

  return {
    ...canonicalCharacter,
    id: ensureSparseEntityId(character.id, 'reader-codex-character', index),
    role: legacyRoleIsBeast
      ? 'Companion'
      : rawRole || 'Unknown',
    status: typeof character.status === 'string'
      ? character.status
      : 'unknown',
    portraitKind,
    abilities: normalizeAbilities(character.abilities, `reader-codex-character-${index + 1}`),
    ...(character.creatureProfile || legacyCreatureProfile
      ? { creatureProfile: character.creatureProfile ?? legacyCreatureProfile }
      : {}),
  };
};

const normalizeBestiary = (entries: CreatureSpecies[] | undefined): CreatureSpecies[] => normalizeEntityIds(
  entries,
  'reader-codex-creature',
).map((species, index) => {
  const firstEncounteredChapter = Number.isInteger(species.firstEncounteredChapter)
    && species.firstEncounteredChapter > 0
    ? species.firstEncounteredChapter
    : 1;
  const appearanceChapters = Array.isArray(species.appearanceChapters)
    ? [...new Set(species.appearanceChapters.filter(chapter => Number.isInteger(chapter) && chapter > 0))]
      .sort((left, right) => left - right)
    : [];

  return {
    ...species,
    id: ensureSparseEntityId(species.id, 'reader-codex-creature', index),
    description: typeof species.description === 'string' ? species.description : '',
    classification: typeof species.classification === 'string' && species.classification.trim()
      ? species.classification
      : 'Unknown',
    traits: Array.isArray(species.traits)
      ? species.traits.filter((trait): trait is string => typeof trait === 'string' && Boolean(trait.trim()))
      : [],
    threatLevel: typeof species.threatLevel === 'string' && species.threatLevel.trim()
      ? species.threatLevel
      : 'Unknown',
    firstEncounteredChapter,
    appearanceChapters: [...new Set([...appearanceChapters, firstEncounteredChapter])]
      .sort((left, right) => left - right),
    notableIndividualIds: Array.isArray(species.notableIndividualIds)
      ? species.notableIndividualIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
      : [],
  };
});

const normalizeSparseMemory = (rawMemory: StoryMemory): NormalizedStoryMemory => {
  const characters = normalizeEntityIds(
    Array.isArray(rawMemory.characters) ? rawMemory.characters : [],
    'reader-codex-character',
  ).map(normalizePortrait);

  const factions = normalizeEntityIds(
    Array.isArray(rawMemory.factions) ? rawMemory.factions : [],
    'reader-codex-faction',
  ).map(faction => ({
    ...faction,
    status: typeof faction.status === 'string' ? faction.status : 'Unknown',
  }));

  return {
    ...rawMemory,
    characters,
    unresolvedPlotThreads: Array.isArray(rawMemory.unresolvedPlotThreads)
      ? rawMemory.unresolvedPlotThreads
      : [],
    resolvedPlotThreads: Array.isArray(rawMemory.resolvedPlotThreads)
      ? rawMemory.resolvedPlotThreads
      : [],
    worldRules: Array.isArray(rawMemory.worldRules) ? rawMemory.worldRules : [],
    memoryWarnings: Array.isArray(rawMemory.memoryWarnings) ? rawMemory.memoryWarnings : [],
    factions,
    locations: normalizeEntityIds(
      Array.isArray(rawMemory.locations) ? rawMemory.locations : [],
      'reader-codex-location',
    ),
    artifacts: normalizeEntityIds(
      Array.isArray(rawMemory.artifacts) ? rawMemory.artifacts : [],
      'reader-codex-artifact',
    ),
    bestiary: normalizeBestiary(rawMemory.bestiary),
    abilities: normalizeAbilities(rawMemory.abilities, 'reader-codex-main-character'),
  };
};


export default function ReaderCodex({
  memory: rawMemory = {} as StoryMemory,
  arcs = [],
  onUpdateMemory,
  mcName = 'Main Character',
  onJumpToChapter,
  onSwitchTab,
  activeStory,
  updateStoryFields,
  routingConfig
}: ReaderCodexProps) {
  const memory = useMemo(() => normalizeSparseMemory(rawMemory), [rawMemory]);

  const [activePage, setActivePage] = useState<'portraits' | 'bestiary' | 'karma' | 'power' | 'artifacts' | 'fate' | 'lore'>('portraits');

  // Selection state for node inspection in Relationship Map & other grids
  const [selectedNodeChar, setSelectedNodeChar] = useState<Character | null>(null);

  // Toggle for Deep Memory / Dormant elements
  const [showDeepMemory, setShowDeepMemory] = useState(false);
  const [codexNotification, setCodexNotification] = useState<string | null>(null);
  const [selectedChartCharId, setSelectedChartCharId] = useState<string>('');
  const [contextEditorTarget, setContextEditorTarget] = useState<CodexContextEditorTarget | null>(null);

  const [deletePrompt, setDeletePrompt] = useState<{type: string, id: string, name?: string} | null>(null);
  const [deleteInput, setDeleteInput] = useState('');

  useEffect(() => {
    if (!selectedChartCharId && memory.characters && memory.characters.length > 0) {
      setSelectedChartCharId(memory.characters[0].id);
    }
  }, [memory.characters, selectedChartCharId]);

  const pushNotification = (msg: string) => {
    setCodexNotification(msg);
    setTimeout(() => setCodexNotification(null), 3000);
  };

  const {
    flatChapters,
    powerTimeline,
    affinityTimelineOfChar,
    getPowerRankScore,
    getPowerStageLevel,
  } = useCodexAnalytics(memory, arcs, activeStory, selectedChartCharId, mcName);

  const {
    generatingId,
    generationError,
    setGenerationError,
    previews,
    setPreviews,
    handleRevertImage,
    handleAwakenCardImage,
    handleSaveEvolution,
    handleDiscardPreview
  } = useCodexImageEvolution(memory, activeStory, updateStoryFields, routingConfig, pushNotification);

  const {
    handleDeleteFaction,
    handleDeleteArtifact,
    handleDeleteLocation,
    handleDeleteCustomRelationship,
    handleDeleteFateNode
  } = useCodexDeletions(memory, onUpdateMemory, activeStory, updateStoryFields);



  const activePreviewId = Object.keys(previews)[0];
  const activePreview = activePreviewId ? previews[activePreviewId] : null;

  const contextEditorData = useMemo(() => {
    if (!contextEditorTarget) return null;
    const source = (memory[contextEditorTarget.collection] || []) as any[];
    const entryIndex = typeof contextEditorTarget.index === 'number'
      ? contextEditorTarget.index
      : source.findIndex(entry => (
        entry && typeof entry === 'object' && entry.id === contextEditorTarget.id
      ));
    if (entryIndex < 0 || entryIndex >= source.length) return null;

    const rawEntry = source[entryIndex];
    const entry = typeof rawEntry === 'string'
      ? { id: `legacy-ability-${entryIndex}`, name: rawEntry, description: '' }
      : rawEntry;
    const peerEntries = source.map((peer, index) => (
      typeof peer === 'string'
        ? { id: `legacy-ability-${index}`, name: peer }
        : peer
    ));

    return { entry, entryIndex, peerEntries };
  }, [contextEditorTarget, memory]);

  const handleSaveEntryContext = (value: any) => {
    if (!contextEditorTarget || !contextEditorData) return;
    const collection = contextEditorTarget.collection;
    const source = [...((memory[collection] || []) as any[])];
    const current = source[contextEditorData.entryIndex];
    const currentWithoutLegacyContext = current && typeof current === 'object'
      ? stripLegacyCodexContextFields(current)
      : current;
    source[contextEditorData.entryIndex] = typeof current === 'string'
      ? {
        id: `abil-${generateId(9)}`,
        name: current,
        description: '',
        ...value,
      }
      : { ...currentWithoutLegacyContext, ...value };
    onUpdateMemory({ ...memory, [collection]: source });
    pushNotification(`Context updated for ${contextEditorData.entry.name}.`);
    setContextEditorTarget(null);
  };

  const {
    dormantChars, charsToRender,
    dormantLocs, locationsToRender,
    dormantFactions, factionsToRender,
    dormantArtifacts, artifactsToRender,
    dormantBestiary, bestiaryToRender,
    hasDormantState,
  } = useMemo(() => {
    // Memory Temperature Filtering. A user pin is the existing force-include
    // contract, so pinned dormant entries stay inspectable without Deep Memory.
    const isVisibleInCurrentMemory = (entry: { relevanceState?: string; provenance?: { isUserPinned?: boolean } }) =>
      entry.provenance?.isUserPinned === true
      || !entry.relevanceState
      || entry.relevanceState === 'active'
      || entry.relevanceState === 'warm'
      || entry.relevanceState === 'reactivated';

    const allChars = memory.characters || [];
    const dormantChars = allChars.filter(c => c.relevanceState === 'dormant' || c.relevanceState === 'archived');
    const charsToRender = showDeepMemory ? allChars : allChars.filter(isVisibleInCurrentMemory);

    const allLocs = memory.locations || [];
    const dormantLocs = allLocs.filter(l => l.relevanceState === 'dormant' || l.relevanceState === 'archived');
    const locationsToRender = showDeepMemory ? allLocs : allLocs.filter(isVisibleInCurrentMemory);

    const allFactions = memory.factions || [];
    const dormantFactions = allFactions.filter(f => f.relevanceState === 'dormant' || f.relevanceState === 'archived');
    const factionsToRender = showDeepMemory ? allFactions : allFactions.filter(isVisibleInCurrentMemory);

    const allArtifacts = memory.artifacts || [];
    const dormantArtifacts = allArtifacts.filter(a => a.relevanceState === 'dormant' || a.relevanceState === 'archived');
    const artifactsToRender = showDeepMemory ? allArtifacts : allArtifacts.filter(isVisibleInCurrentMemory);

    const allBestiary = memory.bestiary || [];
    const dormantBestiary = allBestiary.filter(entry => entry.relevanceState === 'dormant' || entry.relevanceState === 'archived');
    const bestiaryToRender = showDeepMemory ? allBestiary : allBestiary.filter(isVisibleInCurrentMemory);

    const hasDormantState = dormantChars.length > 0 || dormantLocs.length > 0 || dormantFactions.length > 0 || dormantArtifacts.length > 0 || dormantBestiary.length > 0;

    return {
      dormantChars, charsToRender,
      dormantLocs, locationsToRender,
      dormantFactions, factionsToRender,
      dormantArtifacts, artifactsToRender,
      dormantBestiary, bestiaryToRender,
      hasDormantState,
    };
  }, [memory, showDeepMemory]);

  return (
    <CodexProvider value={{     memory,
    arcs,
    activeStory,
    mcName,
    routingConfig,
    onUpdateMemory,
    updateStoryFields,
    pushNotification,
    getPowerRankScore,
    handleAwakenCardImage,
    handleRevertImage,
    previews,
    setPreviews,
    generatingId,
    openEntryContextEditor: setContextEditorTarget }}>
      <div className="codex-premium-shell rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row gap-6 relative min-h-[690px] overflow-hidden" id="living-codex-container">
      <DestinyChoicePanel
        isOpen={!!activePreview}
        imageUrls={activePreview?.urls || []}
        selectedIndex={activePreview?.selectedIndex || 0}
        onSelect={(index) => activePreviewId && setPreviews(prev => ({ ...prev, [activePreviewId]: { ...prev[activePreviewId], selectedIndex: index } }))}
        onApply={() => activePreviewId && handleSaveEvolution(activePreviewId, previews[activePreviewId].type)}
        onDiscard={() => activePreviewId && handleDiscardPreview(activePreviewId)}
        title="Evolution Preview"
        subtitle="Choose the form that will be bound to the Living Codex."
      />

      {contextEditorData && (
        <CodexEntryContextDialog
          entry={contextEditorData.entry}
          peerEntries={contextEditorData.peerEntries}
          onClose={() => setContextEditorTarget(null)}
          onSave={handleSaveEntryContext}
        />
      )}

      {/* Dynamic Portal aura line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-portal to-transparent opacity-80"></div>
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-portal/10 to-transparent pointer-events-none"></div>

      {codexNotification && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-neutral-900 border border-portal text-portal px-4 py-2 rounded shadow-2xl font-sc text-xs animate-fadeIn">
          {codexNotification}
        </div>
      )}

      {/* SIDEBAR NAVIGATION PAGES */}
      <div className="w-full md:w-60 flex-shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-portal/10 pb-2 md:pb-0 md:pr-4" id="codex-side-nav">
        <div className="mb-3 md:mb-4 relative codex-panel-blue rounded-xl p-3.5 md:p-4 overflow-hidden">
          {/* Decorative corner accents */}
          <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-portal/40 rounded-tl pointer-events-none"></div>
          <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t border-r border-portal/40 rounded-tr pointer-events-none"></div>
          <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b border-l border-portal/40 rounded-bl pointer-events-none"></div>
          <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-portal/40 rounded-br pointer-events-none"></div>
          {/* Faint monolith glow */}
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-portal/15 blur-2xl pointer-events-none"></div>

          <span className="text-[9px] text-amber-400/90 uppercase font-bold tracking-[0.3em] font-sc flex items-center gap-1.5">
            <Compass size={10} className="text-amber-400/80" />
            <span>Divine Registry</span>
          </span>
          <h2 className="font-display font-medium text-xl md:text-2xl text-signal tracking-wide mt-1 codex-glow-blue">
            The Living Codex
          </h2>
          <p className="text-[10px] text-neutral-500 font-sans tracking-tight mt-1.5 leading-relaxed hidden md:block">
            Distilling structural power-charts, fate karma, spatial domains, and relational trees.
          </p>
        </div>

        {/* HORIZONTAL TABS ON MOBILE / VERTICAL SIDEBAR ON DESKTOP */}
        <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 gap-1.5 md:gap-1.5 md:space-y-1.5 no-scrollbar whitespace-nowrap w-full" id="codex-tab-scroller">
          {/* Portraits Link */}
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => { vibrate('softTap'); setActivePage('portraits'); }}
            className={codexTabClass(activePage === 'portraits', 'neutral')}
          >
            <Users size={14} className={activePage === 'portraits' ? 'text-human' : ''} />
            <span>Portraits</span>
          </button>

          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => { vibrate('softTap'); setActivePage('bestiary'); }}
            className={codexTabClass(activePage === 'bestiary', 'green')}
          >
            <BookOpen size={14} className={activePage === 'bestiary' ? 'text-green-400' : ''} />
            <span>Bestiary</span>
          </button>

          {/* Karma Link */}
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
              vibrate('softTap');
              setActivePage('karma');
              setSelectedNodeChar(null);
            }}
            className={codexTabClass(activePage === 'karma', 'blue')}
          >
            <Network size={14} className={activePage === 'karma' ? 'text-portal' : ''} />
            <span>Karma</span>
          </button>

          {/* Power Rankings Link */}
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => { vibrate('softTap'); setActivePage('power'); }}
            className={codexTabClass(activePage === 'power', 'gold')}
          >
            <Zap size={14} className={activePage === 'power' ? 'text-yellow-500' : ''} />
            <span>Power Rankings</span>
          </button>

          {/* Artifacts Gallery Link */}
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => { vibrate('softTap'); setActivePage('artifacts'); }}
            className={codexTabClass(activePage === 'artifacts', 'orange')}
          >
            <Sword size={14} className={activePage === 'artifacts' ? 'text-orange-500' : ''} />
            <span>Artifacts</span>
          </button>

          {/* Fate Panel Link */}
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => { vibrate('softTap'); setActivePage('fate'); }}
            className={codexTabClass(activePage === 'fate', 'green')}
          >
            <Compass size={14} className={activePage === 'fate' ? 'text-green-400' : ''} />
            <span>Fate</span>
          </button>

          {/* Lore Link */}
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => { vibrate('softTap'); setActivePage('lore'); }}
            className={codexTabClass(activePage === 'lore', 'purple')}
          >
            <BookMarked size={12} className={activePage === 'lore' ? 'text-purple-400' : ''} />
            <span>Lore</span>
          </button>

          {/* Back navigation shortcut in horizontal list on mobile */}
          {onSwitchTab && onJumpToChapter && (
            <button
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => onSwitchTab('reader')}
              className="flex sm:hidden items-center space-x-1.5 px-3 py-1.5 rounded text-[10px] tracking-wider font-mono uppercase bg-void text-portal border border-portal/20 flex-shrink-0"
            >
              <span>← Reader</span>
            </button>
          )}
        </div>

        {/* Deep Memory Controls */}
        <div className="pt-4 border-t border-neutral-900 mt-4 hidden sm:block">
           <button
              tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowDeepMemory(!showDeepMemory)}
             className={`w-full flex items-center justify-between px-3 py-2 rounded text-[10px] font-mono tracking-wider transition-all border ${
               showDeepMemory
                 ? 'bg-portal/10 border-portal text-portal shadow-sm shadow-portal/20'
                 : 'bg-void border-neutral-900 text-neutral-500 hover:text-portal hover:border-portal'
             }`}
           >
             <span className="flex items-center gap-1.5 uppercase">
               <History size={12} />
               Deep Memory
             </span>
             {hasDormantState && (
               <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                 showDeepMemory ? 'bg-portal text-void' : 'bg-neutral-900 text-neutral-400'
               }`}>
                  {(dormantChars.length + dormantLocs.length + dormantFactions.length + dormantArtifacts.length + dormantBestiary.length)} Dormant
               </span>
             )}
           </button>
           <p className="mt-2 text-[8.5px] text-neutral-500 font-sans px-2 text-center italic">
             Toggle to unearth inactive karma threads, domains, and ancient artifacts.
           </p>
        </div>

        {/* Back navigation shortcut to active script reading (Desktop Only) */}
        {onSwitchTab && onJumpToChapter && (
          <div className="pt-4 border-t border-neutral-900 mt-4 hidden sm:block">
            <button
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                onSwitchTab('reader');
              }}
              className="w-full py-2 bg-void text-portal border border-portal/20 hover:border-portal/40 rounded text-[10px] uppercase font-mono tracking-widest flex items-center justify-center space-x-1"
            >
              <span>← Back to Script</span>
            </button>
          </div>
        )}

        {/* Map Pin Locations Indicator */}
        <div className="pt-4 border-t border-neutral-900 mt-auto hidden md:block">
          <div className="p-3 bg-neutral-950/80 border border-neutral-900 rounded text-[10px] space-y-1.5 leading-normal">
            <span className="text-portal tracking-widest font-sc font-bold uppercase flex items-center space-x-1">
              <MapPin size={10} className="text-portal animate-bounce" />
              <span>Dimensional Node</span>
            </span>
            <div className="text-neutral-400 font-sans">
              Linked to Han Feng's physical location of resonance inside the active Scripture timeline.
            </div>
          </div>
        </div>
      </div>

      {/* MAIN DYNAMIC CONTENT SPACE */}
      <div className="flex-1 overflow-y-auto px-1 max-h-[660px]" id="codex-main-display">

        {/* Error notification banner if image generation etc fails */}
        {generationError && (
          <div className="mb-4 p-3 bg-human/15 border border-human/30 rounded text-[11px] text-neutral-300 font-sans flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <ShieldAlert size={14} className="text-human" />
              <span>{generationError}</span>
            </span>
            <button  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setGenerationError(null)} className="text-neutral-500 hover:text-neutral-300 font-bold">×</button>
          </div>
        )}

        {/* Memory Linter Soft Warnings */}
        {memory.memoryWarnings && memory.memoryWarnings.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-950/20 border border-yellow-900/50 rounded space-y-2">
            <h4 className="flex items-center space-x-2 text-yellow-600 text-xs font-sc font-bold uppercase tracking-widest">
              <Activity size={12} />
              <span>Continuity Alerts ({memory.memoryWarnings.length})</span>
            </h4>
            <div className="space-y-1">
              {memory.memoryWarnings.map((warning, idx) => (
                <div key={idx} className="flex space-x-2 text-[10px] sm:text-xs text-neutral-400 font-sans group items-start justify-between">
                  <div className="flex space-x-2 flex-1">
                    <span className="text-yellow-600/70 mt-0.5">•</span>
                    <span>{warning}</span>
                  </div>
                  <button
                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                      const updatedWarnings = [...(memory.memoryWarnings || [])];
                      updatedWarnings.splice(idx, 1);
                      onUpdateMemory({ ...memory, memoryWarnings: updatedWarnings });
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[9px] uppercase font-mono tracking-wider text-neutral-500 hover:text-yellow-500 transition-all px-2 flex-shrink-0"
                    title="Dismiss Warning"
                  >
                    Resolve
                  </button>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <button
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                  const updatedMemory = { ...memory, memoryWarnings: [] };
                  onUpdateMemory(updatedMemory);
                }}
                className="text-[9px] uppercase font-mono tracking-wider text-yellow-600/70 hover:text-yellow-500 transition-colors"
               >
                 Clear Alerts
               </button>
            </div>
          </div>
        )}

        {/* PAGE 1: PORTRAITS (Human and non-human individuals, locations, timeline recaps, factions) */}
        {activePage === 'portraits' && (
          <div className="space-y-8 pb-8">
            {/* Chronicle Photo Memory Collage Album */}
            <ReaderCodexCollage
              activeStory={activeStory}
              memory={memory}
              onJumpToChapter={onJumpToChapter}
              onSwitchTab={onSwitchTab}
            />

            <div className="border-t border-neutral-900 pt-6">
              <ReaderCodexCharacters
                charsToRender={charsToRender}
                locationsToRender={locationsToRender}
                separatePortraitKinds
                setDeletePrompt={setDeletePrompt}
                selectedNodeChar={selectedNodeChar}
                setSelectedNodeChar={setSelectedNodeChar}
              />
            </div>

            <div className="border-t border-neutral-900 pt-6">
              <ReaderCodexFactions
                factionsToRender={factionsToRender}
                memoryCharacters={memory.characters}
                setDeletePrompt={setDeletePrompt}
              />
            </div>

            <div className="border-t border-neutral-900 pt-6">
              <h4 className="text-[11px] text-human tracking-widest font-sc font-bold uppercase mb-4 px-2">Visual Story Recaps</h4>
              <ReaderCodexTimeline
                flatChapters={flatChapters}
                onJumpToChapter={onJumpToChapter}
              />
            </div>
          </div>
        )}

        {activePage === 'bestiary' && (
          <div className="pb-8">
            <ReaderCodexBestiary
              bestiary={bestiaryToRender}
              characters={charsToRender}
            />
          </div>
        )}

        {/* PAGE 2: KARMA (Relations Web & Mysteries / Threads) */}
        {activePage === 'karma' && (
          <div className="space-y-8 pb-8">
            <ReaderCodexRelations
              charsToRender={charsToRender}
              setDeletePrompt={setDeletePrompt}
              selectedNodeChar={selectedNodeChar}
              setSelectedNodeChar={setSelectedNodeChar}
            />

            <div className="border-t border-neutral-900 pt-6">
              <h4 className="text-[11px] text-human tracking-widest font-sc font-bold uppercase mb-4 px-2">Karmic Threads & Plot Lines</h4>
              <ReaderCodexMysteries memory={memory} />
            </div>
          </div>
        )}

        {/* PAGE 3: POWER RANKINGS */}
        {activePage === 'power' && (
          <div className="space-y-8 pb-8">
            <ReaderCodexPower
              memory={memory}
              activeStory={activeStory}
              getPowerStageLevel={getPowerStageLevel}
              mcName={mcName}
              getPowerRankScore={getPowerRankScore}
              charsToRender={charsToRender}
              openEntryContextEditor={setContextEditorTarget}
            />

            <div className="border-t border-neutral-900 pt-6">
              <h4 className="text-[11px] text-human tracking-widest font-sc font-bold uppercase mb-4 px-2">Cultivation Analytics</h4>
              <ReaderCodexDashboards
                memory={memory}
                activeStory={activeStory}
                flatChapters={flatChapters}
                charsToRender={charsToRender}
                affinityTimelineOfChar={affinityTimelineOfChar}
                powerTimeline={powerTimeline}
                selectedChartCharId={selectedChartCharId}
                setSelectedChartCharId={setSelectedChartCharId}
              />
            </div>
          </div>
        )}

        {/* PAGE 4: ARTIFACTS */}
        {activePage === 'artifacts' && (
          <ReaderCodexArtifacts
            artifactsToRender={artifactsToRender}
            setDeletePrompt={setDeletePrompt}
          />
        )}

        {/* PAGE 5: FATE (User world molding controls) */}
        {activePage === 'fate' && (
            <ReaderCodexFate canonicalCreatureTerminology />
        )}

        {/* PAGE 6: LORE (Glossary) */}
        {activePage === 'lore' && (
          <ReaderCodexGlossary
            memory={memory}
            arcs={arcs}
            mcName={mcName}
            routingConfig={routingConfig}
          />
        )}
      </div>

      <AnimatePresence>
        {deletePrompt && (
          <motion.div
            key="delete-prompt-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-red-900/50 rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl relative"
            >
              <h3 className="text-xl font-display font-bold text-signal mb-2">Delete {deletePrompt.type}?</h3>
              <p className="text-sm text-neutral-400 mb-4 font-serif">
                You can no longer see this fate or undo this karma severing.
                {deletePrompt.name && <span className="block mt-2 font-mono text-xs text-red-300 mx-1">{deletePrompt.name}</span>}
              </p>

              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono" htmlFor="a11y-control-vksku3q">
                    Type <span className="text-red-400 font-bold">DELETE</span> to confirm
                  </label>
                  <button
                    type="button"
                    onClick={() => setDeleteInput('DELETE')}
                    className="inline-flex shrink-0 items-center px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-sc font-bold border border-portal/30 bg-portal/10 text-portal hover:bg-portal hover:text-black rounded transition-all duration-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-portal outline-none focus-visible:ring-offset-2"
                    title="Auto-fill delete text"
                    aria-label="Auto-fill delete text"
                  >
                    Auto-Fill
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="DELETE"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  aria-label="Type DELETE to confirm"
                  className="w-full bg-void text-xs text-signal border border-neutral-700 focus:border-red-500 p-2 rounded focus:outline-none font-mono placeholder:text-neutral-700 focus-visible:ring-2 focus-visible:ring-portal outline-none focus-visible:ring-offset-2" id="a11y-control-vksku3q"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setDeletePrompt(null);
                    setDeleteInput('');
                  }}
                  className="px-4 py-2 bg-void border border-neutral-700 text-neutral-300 rounded font-sc text-xs hover:bg-neutral-800 transition-colors focus-visible:ring-2 focus-visible:ring-portal outline-none focus-visible:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  disabled={deleteInput !== 'DELETE'}
                  onClick={() => {
                    if (deleteInput === 'DELETE') {
                      if (deletePrompt.type === 'faction') handleDeleteFaction(deletePrompt.id);
                      if (deletePrompt.type === 'artifact') handleDeleteArtifact(deletePrompt.id);
                      if (deletePrompt.type === 'location') handleDeleteLocation(deletePrompt.id);
                      if (deletePrompt.type === 'relationship') handleDeleteCustomRelationship(deletePrompt.id);
                      if (deletePrompt.type === 'fate') handleDeleteFateNode(deletePrompt.id);

                      setDeletePrompt(null);
                      setDeleteInput('');
                    }
                  }}
                  className={`px-4 py-2 bg-red-900 border border-red-700 text-white rounded font-sc font-bold text-xs transition-colors focus-visible:ring-2 focus-visible:ring-portal outline-none focus-visible:ring-offset-2 ${deleteInput === 'DELETE' ? 'hover:bg-red-800' : 'opacity-50 cursor-not-allowed'}`}
                >
                  Sever Karma
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
    </CodexProvider>
  );
}
