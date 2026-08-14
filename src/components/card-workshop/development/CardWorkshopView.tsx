import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  Volume2,
  VolumeX,
  Sparkles,
  Layers,
  Search,
  BookOpen,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  Shield,
  Zap,
} from 'lucide-react';
import { WorldEntityCard } from '../../reader-chamber/development/WorldEntityCard';
import { SystemBlock } from '../../reader-chamber/development/SystemBlock';
import { CodexRevealCard } from '../../reader-chamber/development/CodexRevealCard';
import { ManifestationImage } from '../../reader-chamber/development/ManifestationImage';
import type { Chapter, SystemEvent } from '../../reader-chamber/shared/types';
import type {
  AudioPreviewState,
  CardPreset,
  CardWorkshopOverrides,
  ImagePreviewState,
} from '../shared/types';
import { createCardWorkshopAudioAdapter } from '../shared/cardWorkshopAudioAdapter';
import { CARD_PRESETS } from '../../../workshop/previews/card-workshop/previewData';
import {
  SYSTEM_KIND_OPTIONS,
  FATE_OUTCOME_OPTIONS,
  IMAGE_STATE_OPTIONS,
  AUDIO_STATE_OPTIONS,
  INITIAL_CARD_WORKSHOP_OVERRIDES,
} from '../../../workshop/previews/card-workshop/previewStates';

const LOCAL_REVEAL_BACKDROP = '/card-workshop/reveal-backdrop.svg';
const LOCAL_HUMAN_PORTRAIT = '/card-workshop/human-portrait.svg';
const LOCAL_CREATURE_PORTRAIT = '/card-workshop/creature-portrait.svg';

function MissingPreview({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="mx-auto my-6 flex min-h-[180px] w-full max-w-sm items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-950/60 px-6 text-center text-xs font-mono text-neutral-500"
    >
      {children}
    </div>
  );
}

export interface CardWorkshopViewProps {
  initialPresetId?: string;
  initialMode?: 'overview' | 'inspection';
}

export const CardWorkshopView: React.FC<CardWorkshopViewProps> = ({
  initialPresetId = 'preset-human-character',
  initialMode = 'overview',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'inspection'>(initialMode);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialPresetId);
  const [overrides, setOverrides] = useState<CardWorkshopOverrides>(
    INITIAL_CARD_WORKSHOP_OVERRIDES,
  );
  const [manifestedIds, setManifestedIds] = useState<Set<string>>(new Set());
  const [summoningId, setSummoningId] = useState<string | null>(null);
  const manifestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedPreset = useMemo(
    () => CARD_PRESETS.find((p) => p.id === selectedPresetId) || CARD_PRESETS[0],
    [selectedPresetId],
  );

  useEffect(() => {
    if (!selectedPreset.systemEvent) return;
    setOverrides((previous) => ({
      ...previous,
      selectedSystemKind: selectedPreset.systemEvent?.kind,
    }));
  }, [selectedPreset]);

  const audioAdapter = useMemo(
    () => createCardWorkshopAudioAdapter(overrides.audioState, overrides.isAudioMuted),
    [overrides.audioState, overrides.isAudioMuted],
  );

  useEffect(() => () => {
    audioAdapter.dispose();
  }, [audioAdapter]);

  useEffect(() => () => {
    if (manifestTimerRef.current) clearTimeout(manifestTimerRef.current);
  }, []);

  // Handle local portrait awaken simulation
  const handleManifestReveal = (entry: { id?: string }) => {
    const id = entry?.id || 'simulated-entry';
    setSummoningId(id);
    if (manifestTimerRef.current) clearTimeout(manifestTimerRef.current);
    manifestTimerRef.current = setTimeout(() => {
      setSummoningId(null);
      setManifestedIds((prev) => new Set([...prev, id]));
      manifestTimerRef.current = null;
    }, 1200);
  };

  const toggleMute = () => {
    setOverrides((prev) => ({ ...prev, isAudioMuted: !prev.isAudioMuted }));
  };

  // Viewport container width style
  const viewportWidthClass = {
    mobile: 'max-w-[375px]',
    tablet: 'max-w-[768px]',
    desktop: 'max-w-4xl',
  }[overrides.viewportMode];

  // Helper to render a card given its preset and current overrides
  const renderCardInstance = (preset: CardPreset, isInspection = false) => {
    const isManifestedLocally = preset.codexReveal?.entry?.id
      ? manifestedIds.has(preset.codexReveal.entry.id)
      : false;

    // 1. World Entity Card
    if (preset.kind === 'world-entity' || preset.kind === 'under-review-route') {
      if (!preset.worldCard) return null;
      const cardPayload = {
        ...preset.worldCard,
        imageUrl: overrides.imageState === 'existing' ? preset.worldCard.imageUrl : undefined,
        codexEntryId: overrides.codexEntryState === 'present'
          ? preset.worldCard.codexEntryId
          : undefined,
      };
      return (
        <div className="w-full flex justify-center py-2">
          <WorldEntityCard
            key={`${preset.id}-${overrides.audioState}-${overrides.isAudioMuted}`}
            card={cardPayload}
            audioAdapter={audioAdapter}
          />
        </div>
      );
    }

    // 2. Codex Reveal Card
    if (preset.kind === 'codex-reveal' || (isInspection && preset.codexReveal)) {
      if (!preset.codexReveal) return null;
      if (overrides.codexEntryState === 'missing') {
        return <MissingPreview>No Codex entry resolved, so the Reader emits no Codex Reveal Card.</MissingPreview>;
      }
      if (overrides.entityMention === 'reference') {
        return <MissingPreview>Existing entity reference: inline highlighting remains, with no first-reveal card.</MissingPreview>;
      }
      const localManifestedImage = overrides.portraitKind === 'human'
        ? LOCAL_HUMAN_PORTRAIT
        : LOCAL_CREATURE_PORTRAIT;
      const term = {
        ...preset.codexReveal,
        entry: {
          ...preset.codexReveal.entry,
          ...(preset.id === 'preset-creature-species'
            ? {}
            : { portraitKind: overrides.portraitKind }),
          imageUrl: isManifestedLocally
            ? localManifestedImage
            : overrides.imageState === 'existing'
              ? (preset.id === 'preset-creature-species'
                  ? preset.codexReveal.entry.imageUrl
                  : localManifestedImage)
              : undefined,
          imageAssetId: overrides.imageState === 'missing'
            ? 'card-workshop-missing-image'
            : undefined,
        },
      };
      return (
        <div className="w-full flex justify-center py-2">
          <CodexRevealCard
            revealTerm={term}
            activeStory={{ assignedRevealBackdrops: { [term.entry.id]: LOCAL_REVEAL_BACKDROP } }}
            isSenMode={overrides.isSenMode}
            isRevealed={overrides.isRevealVisible}
            generatingRevealId={summoningId}
            onManifestReveal={handleManifestReveal}
          />
        </div>
      );
    }

    // 3. System Block & Fate Result
    if (preset.kind === 'system-block' || preset.kind === 'fate-result') {
      const activeSystemEvent = preset.systemEvent
        ? {
            ...preset.systemEvent,
            kind: isInspection && overrides.selectedSystemKind
              ? overrides.selectedSystemKind as SystemEvent['kind']
              : preset.systemEvent.kind,
            fateResult:
              isInspection && preset.systemEvent.fateResult && overrides.selectedFateOutcome
                ? {
                    ...preset.systemEvent.fateResult,
                    outcome: overrides.selectedFateOutcome,
                  }
                : preset.systemEvent.fateResult,
          }
        : undefined;

      return (
        <div className="w-full flex justify-center py-2">
          <SystemBlock
            content={preset.systemContent || '[ SYSTEM NOTIFICATION ]'}
            system={activeSystemEvent}
          />
        </div>
      );
    }

    // 4. Manifestation Image
    if (preset.kind === 'manifestation-image') {
      if (!preset.manifestationImage) return null;
      const heroImage = overrides.imageState === 'existing'
        ? preset.manifestationImage.url
        : undefined;
      if (!heroImage) {
        return <MissingPreview>No chapter manifestation image is available for this state.</MissingPreview>;
      }
      const chapter = {
        number: preset.manifestationImage.chapterNumber || 1,
        title: preset.title,
        premise: preset.description,
        status: 'read',
        summary: preset.manifestationImage.quote || preset.manifestationImage.caption || preset.description,
        generatedContent: '',
        assetManifest: { heroImage },
      } satisfies Chapter;

      return (
        <div className="w-full flex justify-center py-2">
          <ManifestationImage selectedChapter={chapter} />
        </div>
      );
    }

    return null;
  };

  // Developer metadata explanation block
  const renderExplanationBadge = (explanation: CardPreset['explanation']) => (
    <div className="rounded-xl border border-neutral-800/80 bg-[#020813]/90 p-4 space-y-3 shadow-md text-xs font-mono">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <span className="text-portal font-semibold flex items-center gap-1.5 uppercase tracking-wider">
          <Info size={13} /> {explanation.componentName}
        </span>
        <span className="text-[10px] text-neutral-500 truncate max-w-[200px]">
          {explanation.sourceFile}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        <div>
          <span className="text-neutral-500 uppercase tracking-widest text-[9px] block">Trigger</span>
          <span className="text-neutral-300">{explanation.currentTrigger}</span>
        </div>
        <div>
          <span className="text-neutral-500 uppercase tracking-widest text-[9px] block">Codex Target</span>
          <span className="text-neutral-300">{explanation.codexDestination}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1 border-t border-neutral-900">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
            explanation.capabilities.hasImage
              ? 'bg-portal/10 text-portal border border-portal/20'
              : 'bg-neutral-900 text-neutral-500'
          }`}
        >
          {explanation.capabilities.hasImage ? <CheckCircle2 size={10} /> : <XCircle size={10} />} Image
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
            explanation.capabilities.hasManifestAction
              ? 'bg-portal/10 text-portal border border-portal/20'
              : 'bg-neutral-900 text-neutral-500'
          }`}
        >
          {explanation.capabilities.hasManifestAction ? <CheckCircle2 size={10} /> : <XCircle size={10} />} Awaken Action
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
            explanation.capabilities.hasAudio
              ? 'bg-portal/10 text-portal border border-portal/20'
              : 'bg-neutral-900 text-neutral-500'
          }`}
        >
          {explanation.capabilities.hasAudio ? <CheckCircle2 size={10} /> : <XCircle size={10} />} Audio SFX
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
            explanation.capabilities.hasCodexLink
              ? 'bg-portal/10 text-portal border border-portal/20'
              : 'bg-neutral-900 text-neutral-500'
          }`}
        >
          {explanation.capabilities.hasCodexLink ? <CheckCircle2 size={10} /> : <XCircle size={10} />} Codex Link
        </span>
      </div>

      {explanation.architecturalNotes && (
        <div className="pt-2 border-t border-neutral-900 text-[10px] text-amber-400/90 leading-relaxed font-sans">
          {explanation.architecturalNotes}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#01070e] text-signal flex flex-col">
      {/* Top Header & Mode Navigation */}
      <header className="sticky top-0 z-30 border-b border-neutral-800/80 bg-[#010914]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-portal/10 border border-portal/30 flex items-center justify-center text-portal shadow-[0_0_12px_rgba(4,172,255,0.2)]">
            <Layers size={18} />
          </div>
          <div>
            <h1 className="text-base font-sc font-bold uppercase tracking-wider text-signal flex items-center gap-2">
              Reader Card Workshop
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-portal/10 text-portal border border-portal/30">
                Development Only
              </span>
            </h1>
            <p className="text-xs text-neutral-400 font-sans">
              Inspect and test every Reader card and system panel independently without generating chapters.
            </p>
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex bg-neutral-900/80 p-1 rounded-lg border border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-portal text-void font-bold shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Overview Mode
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inspection')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                activeTab === 'inspection'
                  ? 'bg-portal text-void font-bold shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Inspection Mode
            </button>
          </div>

          {/* Viewport Width Emulation */}
          <div className="flex bg-neutral-900/80 p-1 rounded-lg border border-neutral-800">
            <button
              type="button"
              aria-label="Mobile Viewport"
              onClick={() => setOverrides((prev) => ({ ...prev, viewportMode: 'mobile' }))}
              className={`p-1.5 rounded-md transition-colors ${
                overrides.viewportMode === 'mobile'
                  ? 'bg-neutral-800 text-portal'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title="Mobile Viewport (375px)"
            >
              <Smartphone size={15} />
            </button>
            <button
              type="button"
              aria-label="Tablet Viewport"
              onClick={() => setOverrides((prev) => ({ ...prev, viewportMode: 'tablet' }))}
              className={`p-1.5 rounded-md transition-colors ${
                overrides.viewportMode === 'tablet'
                  ? 'bg-neutral-800 text-portal'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title="Tablet Viewport (768px)"
            >
              <Tablet size={15} />
            </button>
            <button
              type="button"
              aria-label="Desktop Viewport"
              onClick={() => setOverrides((prev) => ({ ...prev, viewportMode: 'desktop' }))}
              className={`p-1.5 rounded-md transition-colors ${
                overrides.viewportMode === 'desktop'
                  ? 'bg-neutral-800 text-portal'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title="Desktop Viewport (100%)"
            >
              <Monitor size={15} />
            </button>
          </div>

          <label className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 px-2 py-1 text-[10px] font-mono text-neutral-400">
            <span>Image</span>
            <select
              aria-label="Image state"
              value={overrides.imageState}
              onChange={(event) => setOverrides(prev => ({
                ...prev,
                imageState: event.target.value as ImagePreviewState,
              }))}
              className="max-w-[150px] bg-[#020914] px-1.5 py-1 text-[11px] text-signal"
            >
              {IMAGE_STATE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 px-2 py-1 text-[10px] font-mono text-neutral-400">
            <span>Audio</span>
            <select
              aria-label="Audio state"
              value={overrides.audioState}
              onChange={(event) => setOverrides(prev => ({
                ...prev,
                audioState: event.target.value as AudioPreviewState,
              }))}
              className="max-w-[145px] bg-[#020914] px-1.5 py-1 text-[11px] text-signal"
            >
              {AUDIO_STATE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          {/* Audio Mute Simulator */}
          <button
            type="button"
            onClick={toggleMute}
            className={`p-2 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors ${
              !overrides.isAudioMuted
                ? 'bg-portal/10 text-portal border-portal/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
            title="Simulate Audio Mute / Cues Disabled"
          >
            {!overrides.isAudioMuted ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span className="hidden sm:inline">Mute: {overrides.isAudioMuted ? 'On' : 'Off'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
        {/* OVERVIEW MODE */}
        {activeTab === 'overview' && (
          <div className="space-y-12">
            {/* 1. World Entity Cards */}
            <section className="space-y-6">
              <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-portal" />
                  <h2 className="text-sm font-sc font-bold uppercase tracking-widest text-signal">
                    World Entity Cards
                  </h2>
                </div>
                <span className="text-xs text-neutral-500 font-mono">
                  Full artwork, title, quote & sound cues
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {CARD_PRESETS.filter((p) => p.kind === 'world-entity').map((preset) => (
                  <div
                    key={preset.id}
                    className="flex flex-col space-y-3 p-4 rounded-2xl bg-neutral-950/40 border border-neutral-900"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-display font-semibold text-sm text-signal">
                          {preset.title}
                        </h3>
                        <p className="text-[11px] text-neutral-400 font-sans">{preset.subtitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPresetId(preset.id);
                          setActiveTab('inspection');
                        }}
                        className="text-[10px] font-mono text-portal hover:underline"
                      >
                        Inspect Deeply →
                      </button>
                    </div>

                    <div className={`mx-auto w-full ${viewportWidthClass} transition-all duration-300`}>
                      {renderCardInstance(preset)}
                    </div>

                    {renderExplanationBadge(preset.explanation)}
                  </div>
                ))}
              </div>
            </section>

            {/* 2. Codex Reveal Moments */}
            <section className="space-y-6">
              <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-portal" />
                  <h2 className="text-sm font-sc font-bold uppercase tracking-widest text-signal">
                    Codex Reveal Moments
                  </h2>
                </div>
                <span className="text-xs text-neutral-500 font-mono">
                  Bestiary species reveals & Non-Human Portrait awakens
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {CARD_PRESETS.filter((p) => p.kind === 'codex-reveal').map((preset) => (
                  <div
                    key={preset.id}
                    className="flex flex-col space-y-3 p-4 rounded-2xl bg-neutral-950/40 border border-neutral-900"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-display font-semibold text-sm text-signal">
                          {preset.title}
                        </h3>
                        <p className="text-[11px] text-neutral-400 font-sans">{preset.subtitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPresetId(preset.id);
                          setActiveTab('inspection');
                        }}
                        className="text-[10px] font-mono text-portal hover:underline"
                      >
                        Inspect Deeply →
                      </button>
                    </div>

                    <div className={`mx-auto w-full ${viewportWidthClass} transition-all duration-300`}>
                      {renderCardInstance(preset, true)}
                    </div>

                    {renderExplanationBadge(preset.explanation)}
                  </div>
                ))}
              </div>
            </section>

            {/* 3. System Blocks & Fate Results */}
            <section className="space-y-6">
              <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-portal" />
                  <h2 className="text-sm font-sc font-bold uppercase tracking-widest text-signal">
                    System Panels & Fate Outcomes
                  </h2>
                </div>
                <span className="text-xs text-neutral-500 font-mono">
                  Real SystemBlock & FateResultCard integration
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {CARD_PRESETS.filter(
                  (p) => p.kind === 'system-block' || p.kind === 'fate-result',
                ).map((preset) => (
                  <div
                    key={preset.id}
                    className="flex flex-col space-y-3 p-4 rounded-2xl bg-neutral-950/40 border border-neutral-900"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-display font-semibold text-sm text-signal">
                          {preset.title}
                        </h3>
                        <p className="text-[11px] text-neutral-400 font-sans">{preset.subtitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPresetId(preset.id);
                          setActiveTab('inspection');
                        }}
                        className="text-[10px] font-mono text-portal hover:underline"
                      >
                        Inspect Deeply →
                      </button>
                    </div>

                    <div className={`mx-auto w-full ${viewportWidthClass} transition-all duration-300`}>
                      {renderCardInstance(preset)}
                    </div>

                    {renderExplanationBadge(preset.explanation)}
                  </div>
                ))}
              </div>
            </section>

            {/* 4. Chapter Manifestation Visuals */}
            <section className="space-y-6">
              <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-portal" />
                  <h2 className="text-sm font-sc font-bold uppercase tracking-widest text-signal">
                    Chapter-Level Visual Memories
                  </h2>
                </div>
                <span className="text-xs text-neutral-500 font-mono">
                  Presented separately from entity cards
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {CARD_PRESETS.filter((p) => p.kind === 'manifestation-image').map((preset) => (
                  <div
                    key={preset.id}
                    className="flex flex-col space-y-3 p-4 rounded-2xl bg-neutral-950/40 border border-neutral-900"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-display font-semibold text-sm text-signal">
                          {preset.title}
                        </h3>
                        <p className="text-[11px] text-neutral-400 font-sans">{preset.subtitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPresetId(preset.id);
                          setActiveTab('inspection');
                        }}
                        className="text-[10px] font-mono text-portal hover:underline"
                      >
                        Inspect Deeply →
                      </button>
                    </div>

                    <div className={`mx-auto w-full ${viewportWidthClass} transition-all duration-300`}>
                      {renderCardInstance(preset)}
                    </div>

                    {renderExplanationBadge(preset.explanation)}
                  </div>
                ))}
              </div>
            </section>

            {/* 5. Current Routing Under Review */}
            <section className="space-y-6">
              <div className="border-b border-amber-500/30 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <h2 className="text-sm font-sc font-bold uppercase tracking-widest text-amber-300">
                    Current Routing Under Review
                  </h2>
                </div>
                <span className="text-xs text-amber-400/80 font-mono">
                  System & Fate events routed through World Card paths
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {CARD_PRESETS.filter((p) => p.kind === 'under-review-route').map((preset) => (
                  <div
                    key={preset.id}
                    className="flex flex-col space-y-3 p-4 rounded-2xl bg-amber-950/10 border border-amber-500/20"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-display font-semibold text-sm text-amber-200">
                          {preset.title}
                        </h3>
                        <p className="text-[11px] text-amber-400/70 font-sans">{preset.subtitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPresetId(preset.id);
                          setActiveTab('inspection');
                        }}
                        className="text-[10px] font-mono text-amber-300 hover:underline"
                      >
                        Inspect Deeply →
                      </button>
                    </div>

                    <div className={`mx-auto w-full ${viewportWidthClass} transition-all duration-300`}>
                      {renderCardInstance(preset)}
                    </div>

                    {renderExplanationBadge(preset.explanation)}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* INDIVIDUAL INSPECTION MODE */}
        {activeTab === 'inspection' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Sidebar: Preset Selection & Overrides */}
            <div className="space-y-6 lg:col-span-1 bg-neutral-950/60 p-5 rounded-2xl border border-neutral-800">
              <div>
                <label className="text-xs font-mono uppercase tracking-widest text-portal block mb-2 font-semibold">
                  Select Card Preset
                </label>
                <select
                  aria-label="Card preset"
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  className="w-full bg-[#020914] border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-signal focus:border-portal focus:outline-none"
                >
                  {CARD_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} — {p.subtitle}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Controls based on preset type */}
              <div className="space-y-4 pt-4 border-t border-neutral-900">
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                  Interactive Overrides
                </h4>

                {/* SystemBlock specific controls */}
                {(selectedPreset.kind === 'system-block' || selectedPreset.kind === 'fate-result') && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">
                        System Panel Kind
                      </label>
                      <select
                        aria-label="System panel kind"
                        value={overrides.selectedSystemKind || selectedPreset.systemEvent?.kind}
                        onChange={(e) =>
                          setOverrides((prev) => ({
                            ...prev,
                            selectedSystemKind: e.target.value,
                          }))
                        }
                        className="w-full bg-[#020914] border border-neutral-800 rounded px-2.5 py-1.5 text-[11px] font-mono text-signal"
                      >
                        {SYSTEM_KIND_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedPreset.kind === 'fate-result' && (
                      <div>
                        <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">
                          Fate Outcome
                        </label>
                        <select
                          aria-label="Fate outcome"
                          value={overrides.selectedFateOutcome}
                          onChange={(e) =>
                            setOverrides((prev) => ({
                              ...prev,
                              selectedFateOutcome: e.target.value as CardWorkshopOverrides['selectedFateOutcome'],
                            }))
                          }
                          className="w-full bg-[#020914] border border-neutral-800 rounded px-2.5 py-1.5 text-[11px] font-mono text-signal"
                        >
                          {FATE_OUTCOME_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Reveal specific controls */}
                {selectedPreset.kind === 'codex-reveal' && selectedPreset.codexReveal && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">
                        Codex Entry
                      </label>
                      <select
                        aria-label="Codex entry state"
                        value={overrides.codexEntryState}
                        onChange={(event) => setOverrides(prev => ({
                          ...prev,
                          codexEntryState: event.target.value as CardWorkshopOverrides['codexEntryState'],
                        }))}
                        className="w-full bg-[#020914] border border-neutral-800 rounded px-2.5 py-1.5 text-[11px] font-mono text-signal"
                      >
                        <option value="present">Present</option>
                        <option value="missing">Missing</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">
                        Entity Mention
                      </label>
                      <select
                        aria-label="Entity mention state"
                        value={overrides.entityMention}
                        onChange={(event) => setOverrides(prev => ({
                          ...prev,
                          entityMention: event.target.value as CardWorkshopOverrides['entityMention'],
                        }))}
                        className="w-full bg-[#020914] border border-neutral-800 rounded px-2.5 py-1.5 text-[11px] font-mono text-signal"
                      >
                        <option value="reveal">First reveal</option>
                        <option value="reference">Existing entity reference</option>
                      </select>
                    </div>

                    {selectedPreset.id !== 'preset-creature-species' && (
                      <div>
                        <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">
                          Portrait Kind
                        </label>
                        <select
                          aria-label="Portrait kind"
                          value={overrides.portraitKind}
                          onChange={(event) => setOverrides(prev => ({
                            ...prev,
                            portraitKind: event.target.value as CardWorkshopOverrides['portraitKind'],
                          }))}
                          className="w-full bg-[#020914] border border-neutral-800 rounded px-2.5 py-1.5 text-[11px] font-mono text-signal"
                        >
                          <option value="human">Human Portrait</option>
                          <option value="non-human">Non-Human Portrait</option>
                        </select>
                      </div>
                    )}

                    {(selectedPreset.id === 'preset-nonhuman-portrait-reveal' || selectedPreset.id === 'preset-creature-species') && (
                      <div>
                        <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">
                          Creature Scope
                        </label>
                        <select
                          aria-label="Creature scope"
                          value={selectedPreset.id === 'preset-creature-species' ? 'species' : 'individual'}
                          onChange={(event) => setSelectedPresetId(
                            event.target.value === 'species'
                              ? 'preset-creature-species'
                              : 'preset-nonhuman-portrait-reveal',
                          )}
                          className="w-full bg-[#020914] border border-neutral-800 rounded px-2.5 py-1.5 text-[11px] font-mono text-signal"
                        >
                          <option value="individual">Important individual</option>
                          <option value="species">Bestiary species</option>
                        </select>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setOverrides((prev) => ({ ...prev, isRevealVisible: !prev.isRevealVisible }))
                      }
                      className="w-full py-1.5 px-3 rounded bg-neutral-900 text-xs font-mono text-neutral-300 border border-neutral-800 hover:border-portal/40 flex items-center justify-between"
                    >
                      <span>Viewport State:</span>
                      <span className="text-portal font-semibold">
                        {overrides.isRevealVisible ? 'In-View Triggered' : 'Hidden Initial'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (manifestTimerRef.current) {
                          clearTimeout(manifestTimerRef.current);
                          manifestTimerRef.current = null;
                        }
                        setManifestedIds(new Set());
                        setSummoningId(null);
                      }}
                      className="w-full py-1.5 px-3 rounded bg-neutral-900/60 text-[11px] font-mono text-neutral-400 border border-neutral-800 hover:text-neutral-200"
                    >
                      Reset Local Awaken State
                    </button>
                  </div>
                )}
              </div>

              {/* Developer Metadata */}
              <div className="pt-4 border-t border-neutral-900">
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-3">
                  Architecture & Routing Data
                </h4>
                {renderExplanationBadge(selectedPreset.explanation)}
              </div>
            </div>

            {/* Right Stage: Interactive Preview Canvas */}
            <div className="lg:col-span-2 space-y-6 flex flex-col items-center">
              <div className="w-full bg-neutral-950/80 border border-neutral-800/80 rounded-2xl p-6 sm:p-10 flex flex-col items-center justify-center min-h-[460px] relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(4,172,255,0.03)_0%,transparent_70%)] pointer-events-none" />

                <div className="w-full flex items-center justify-between border-b border-neutral-900 pb-3 mb-6">
                  <div>
                    <h2 className="font-display font-bold text-lg text-signal">
                      {selectedPreset.title}
                    </h2>
                    <p className="text-xs text-neutral-400 font-sans">
                      {selectedPreset.description}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase">
                    Mode: {overrides.viewportMode}
                  </span>
                </div>

                <div className={`w-full ${viewportWidthClass} transition-all duration-300`}>
                  {renderCardInstance(selectedPreset, true)}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CardWorkshopView;
