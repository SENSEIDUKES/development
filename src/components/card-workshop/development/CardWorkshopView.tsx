import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  Volume2,
  VolumeX,
  Sparkles,
  Layers,
  BookOpen,
  Info,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react';
import { WorldCard } from '../../reader-chamber/development/WorldCard';
import { SystemBlock } from '../../reader-chamber/development/SystemBlock';
import { CodexCard } from '../../reader-chamber/development/CodexCard';
import type { SystemEvent } from '../../reader-chamber/shared/types';
import type {
  AudioPreviewState,
  CardPreset,
  CardWorkshopOverrides,
  ImagePreviewState,
} from '../shared/types';
import { createCardWorkshopAudioAdapter } from '../shared/cardWorkshopAudioAdapter';
import type { WorldCardAudioAsset } from '../../reader-chamber/development/WorldCard';
import { useDevAudioPlayback } from '../../../audio/DevAudioPlayback';
import { CardWorkshopContextualReader } from './CardWorkshopContextualReader';
import { ACTIVE_CARD_PRESETS } from '../../../workshop/previews/card-workshop/previewData';
import {
  SYSTEM_KIND_OPTIONS,
  FATE_OUTCOME_OPTIONS,
  IMAGE_STATE_OPTIONS,
  AUDIO_STATE_OPTIONS,
  INITIAL_CARD_WORKSHOP_OVERRIDES,
} from '../../../workshop/previews/card-workshop/previewStates';

// Reuse the same published Library Help narration that backs the
// audio-player smoke workspace. The workshop has no curated SFX catalog,
// so the adapter routes every tap through this single shared sample. The
// actual audio content is irrelevant to the visual demo — what matters
// is that the real shared `@seihouse/audio-player` session is exercised.
const WORKSHOP_CARD_AUDIO_SAMPLE = 'https://lines.seihouse.org/LIBRARY/Lines/SYSTEM/SYSTEM/HELP%20LINES/STORY%20SEED%20ENG.mp3';

const resolveCardAudioSource = (_asset: WorldCardAudioAsset): string => WORKSHOP_CARD_AUDIO_SAMPLE;

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

function isPortraitPreset(preset: CardPreset) {
  return preset.id === 'preset-human-character'
    || preset.id === 'preset-nonhuman-individual';
}

export interface CardWorkshopViewProps {
  initialPresetId?: string;
  /** `overview` and `inspection` remain accepted for old Workshop links. */
  initialMode?: 'tabs' | 'contextual' | 'overview' | 'inspection';
}

function normalizeInitialMode(initialMode: NonNullable<CardWorkshopViewProps['initialMode']>) {
  return initialMode === 'contextual' || initialMode === 'inspection'
    ? 'contextual'
    : 'tabs';
}

export const CardWorkshopView: React.FC<CardWorkshopViewProps> = ({
  initialPresetId = 'preset-human-character',
  initialMode = 'tabs',
}) => {
  const [activeTab, setActiveTab] = useState<'tabs' | 'contextual'>(
    normalizeInitialMode(initialMode),
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialPresetId);
  const [overrides, setOverrides] = useState<CardWorkshopOverrides>(
    INITIAL_CARD_WORKSHOP_OVERRIDES,
  );
  const [manifestedIds, setManifestedIds] = useState<Set<string>>(new Set());
  const [summoningId, setSummoningId] = useState<string | null>(null);
  const manifestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardTabListRef = useRef<HTMLDivElement | null>(null);

  const selectedPreset = useMemo(
    () => ACTIVE_CARD_PRESETS.find((p) => p.id === selectedPresetId) || ACTIVE_CARD_PRESETS[0],
    [selectedPresetId],
  );

  useEffect(() => {
    if (!selectedPreset.systemEvent) return;
    setOverrides((previous) => ({
      ...previous,
      selectedSystemKind: selectedPreset.systemEvent?.kind,
    }));
  }, [selectedPreset]);

  const player = useDevAudioPlayback();
  const audioAdapter = useMemo(
    () => createCardWorkshopAudioAdapter({
      state: overrides.audioState,
      muted: overrides.isAudioMuted,
      resolveSource: resolveCardAudioSource,
      player,
    }),
    [overrides.audioState, overrides.isAudioMuted, player],
  );

  useEffect(() => () => {
    audioAdapter.dispose();
  }, [audioAdapter]);

  useEffect(() => () => {
    if (manifestTimerRef.current) clearTimeout(manifestTimerRef.current);
  }, []);

  useEffect(() => {
    if (activeTab !== 'tabs') return;
    const activePresetTab = [...(cardTabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])]
      .find(tab => tab.dataset.presetId === selectedPresetId);
    activePresetTab?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeTab, selectedPresetId]);

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

  const handleCardTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % ACTIVE_CARD_PRESETS.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + ACTIVE_CARD_PRESETS.length) % ACTIVE_CARD_PRESETS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = ACTIVE_CARD_PRESETS.length - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    setSelectedPresetId(ACTIVE_CARD_PRESETS[nextIndex].id);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [nextIndex]?.focus();
  };

  // Viewport container width style
  const viewportWidthClass = {
    mobile: 'max-w-[375px]',
    tablet: 'max-w-[768px]',
    desktop: 'max-w-4xl',
  }[overrides.viewportMode];

  // Helper to render a card given its preset and current overrides
  const renderCardInstance = (preset: CardPreset) => {
    const isManifestedLocally = preset.codexReveal?.entry?.id
      ? manifestedIds.has(preset.codexReveal.entry.id)
      : false;

    // 1. World Card
    if (preset.kind === 'world-card') {
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
          <WorldCard
            key={`${preset.id}-${overrides.audioState}-${overrides.isAudioMuted}`}
            card={cardPayload}
            audioAdapter={audioAdapter}
          />
        </div>
      );
    }

    // 2. Codex Card
    if (preset.kind === 'codex-card') {
      if (!preset.codexReveal) return null;
      if (overrides.codexEntryState === 'missing') {
        return <MissingPreview>No Codex entry resolved, so the Reader emits no Codex Card.</MissingPreview>;
      }
      if (overrides.entityMention === 'reference') {
        return <MissingPreview>Existing entity reference: inline highlighting remains, with no first-reveal card.</MissingPreview>;
      }
      const isPortraitCard = preset.id === 'preset-human-character'
        || preset.id === 'preset-nonhuman-individual';
      const localManifestedImage = overrides.portraitKind === 'human'
        ? LOCAL_HUMAN_PORTRAIT
        : LOCAL_CREATURE_PORTRAIT;
      const existingImage = isPortraitCard
        ? localManifestedImage
        : preset.codexReveal.entry.imageUrl;
      const term = {
        ...preset.codexReveal,
        entry: {
          ...preset.codexReveal.entry,
          ...(isPortraitCard ? { portraitKind: overrides.portraitKind } : {}),
          imageUrl: isManifestedLocally
            ? existingImage
            : overrides.imageState === 'existing'
              ? existingImage
              : undefined,
          imageAssetId: overrides.imageState === 'missing'
            ? 'card-workshop-missing-image'
            : undefined,
        },
      };
      return (
        <div className="w-full flex justify-center py-2">
          <CodexCard
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
            kind: overrides.selectedSystemKind
              ? overrides.selectedSystemKind as SystemEvent['kind']
              : preset.systemEvent.kind,
            fateResult:
              preset.systemEvent.fateResult && overrides.selectedFateOutcome
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
          {explanation.capabilities.hasAudio ? <CheckCircle2 size={10} /> : <XCircle size={10} />} Audio contract
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

  const renderTechnicalDetails = () => (
    <details className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/70 shadow-xl">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-mono text-xs uppercase tracking-widest text-neutral-300 transition-colors hover:text-portal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-portal [&::-webkit-details-marker]:hidden">
        <span>Technical Details</span>
        <span className="text-[10px] normal-case tracking-normal text-neutral-500">
          Preset, routing, capabilities, and local-only overrides
        </span>
      </summary>

      <div className="space-y-6 border-t border-neutral-800 p-5">
        <div>
          <label className="mb-2 block text-xs font-mono font-semibold uppercase tracking-widest text-portal">
            Select Card Preset
          </label>
          <select
            aria-label="Card preset"
            value={selectedPresetId}
            onChange={(event) => setSelectedPresetId(event.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-[#020914] px-3 py-2 text-xs font-mono text-signal focus:border-portal focus:outline-none"
          >
            {ACTIVE_CARD_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.title} — {preset.subtitle}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4 border-t border-neutral-900 pt-4">
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
            Interactive Overrides
          </h3>

          {(selectedPreset.kind === 'system-block' || selectedPreset.kind === 'fate-result') && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-mono uppercase text-neutral-500">
                  System Panel Kind
                </label>
                <select
                  aria-label="System panel kind"
                  value={overrides.selectedSystemKind || selectedPreset.systemEvent?.kind}
                  onChange={(event) =>
                    setOverrides((previous) => ({
                      ...previous,
                      selectedSystemKind: event.target.value,
                    }))
                  }
                  className="w-full rounded border border-neutral-800 bg-[#020914] px-2.5 py-1.5 text-[11px] font-mono text-signal"
                >
                  {SYSTEM_KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPreset.kind === 'fate-result' && (
                <div>
                  <label className="mb-1 block text-[10px] font-mono uppercase text-neutral-500">
                    Fate Outcome
                  </label>
                  <select
                    aria-label="Fate outcome"
                    value={overrides.selectedFateOutcome}
                    onChange={(event) =>
                      setOverrides((previous) => ({
                        ...previous,
                        selectedFateOutcome: event.target.value as CardWorkshopOverrides['selectedFateOutcome'],
                      }))
                    }
                    className="w-full rounded border border-neutral-800 bg-[#020914] px-2.5 py-1.5 text-[11px] font-mono text-signal"
                  >
                    {FATE_OUTCOME_OPTIONS.map((outcome) => (
                      <option key={outcome} value={outcome}>
                        {outcome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {selectedPreset.kind === 'codex-card' && selectedPreset.codexReveal && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-mono uppercase text-neutral-500">
                  Codex Entry
                </label>
                <select
                  aria-label="Codex entry state"
                  value={overrides.codexEntryState}
                  onChange={(event) => setOverrides((previous) => ({
                    ...previous,
                    codexEntryState: event.target.value as CardWorkshopOverrides['codexEntryState'],
                  }))}
                  className="w-full rounded border border-neutral-800 bg-[#020914] px-2.5 py-1.5 text-[11px] font-mono text-signal"
                >
                  <option value="present">Present</option>
                  <option value="missing">Missing</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-mono uppercase text-neutral-500">
                  Entity Mention
                </label>
                <select
                  aria-label="Entity mention state"
                  value={overrides.entityMention}
                  onChange={(event) => setOverrides((previous) => ({
                    ...previous,
                    entityMention: event.target.value as CardWorkshopOverrides['entityMention'],
                  }))}
                  className="w-full rounded border border-neutral-800 bg-[#020914] px-2.5 py-1.5 text-[11px] font-mono text-signal"
                >
                  <option value="reveal">First reveal</option>
                  <option value="reference">Existing entity reference</option>
                </select>
              </div>

              {isPortraitPreset(selectedPreset) && (
                <div>
                  <label className="mb-1 block text-[10px] font-mono uppercase text-neutral-500">
                    Portrait Kind
                  </label>
                  <select
                    aria-label="Portrait kind"
                    value={overrides.portraitKind}
                    onChange={(event) => setOverrides((previous) => ({
                      ...previous,
                      portraitKind: event.target.value as CardWorkshopOverrides['portraitKind'],
                    }))}
                    className="w-full rounded border border-neutral-800 bg-[#020914] px-2.5 py-1.5 text-[11px] font-mono text-signal"
                  >
                    <option value="human">Human Portrait</option>
                    <option value="non-human">Non-Human Portrait</option>
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  setOverrides((previous) => ({ ...previous, isRevealVisible: !previous.isRevealVisible }))
                }
                className="flex w-full items-center justify-between rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-mono text-neutral-300 hover:border-portal/40"
              >
                <span>Viewport State:</span>
                <span className="font-semibold text-portal">
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
                className="w-full rounded border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-[11px] font-mono text-neutral-400 hover:text-neutral-200"
              >
                Reset Local Awaken State
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-900 pt-4">
          {renderExplanationBadge(selectedPreset.explanation)}
        </div>
      </div>
    </details>
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
              Compare Reader card presets, then place the same selection in a fixed local chapter without generating anything.
            </p>
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex bg-neutral-900/80 p-1 rounded-lg border border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab('tabs')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                activeTab === 'tabs'
                  ? 'bg-portal text-void font-bold shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Card Type Tabs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('contextual')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                activeTab === 'contextual'
                  ? 'bg-portal text-void font-bold shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Contextual View
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
        {activeTab === 'tabs' && (
          <div className="space-y-12">
            <div
              role="tablist"
              aria-label="Card types"
              className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
            >
              <div
                ref={cardTabListRef}
                className="flex min-w-max gap-2 rounded-xl border border-neutral-800 bg-neutral-950/70 p-2 lg:min-w-0 lg:flex-wrap"
              >
                {ACTIVE_CARD_PRESETS.map((preset, index) => {
                  const isSelected = preset.id === selectedPresetId;
                  return (
                    <button
                      key={preset.id}
                      id={`card-tab-${preset.id}`}
                      data-preset-id={preset.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      aria-controls={`card-panel-${preset.id}`}
                      tabIndex={isSelected ? 0 : -1}
                      onClick={() => setSelectedPresetId(preset.id)}
                      onKeyDown={(event) => handleCardTabKeyDown(event, index)}
                      className={`whitespace-nowrap rounded-lg border px-3 py-2 text-[11px] font-mono transition-colors ${
                        isSelected
                          ? 'border-portal/50 bg-portal/15 text-portal'
                          : 'border-transparent text-neutral-400 hover:border-neutral-700 hover:text-signal'
                      }`}
                    >
                      {preset.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1. World Cards */}
            {selectedPreset.kind === 'world-card' && (
            <section
              id={`card-panel-${selectedPreset.id}`}
              role="tabpanel"
              aria-labelledby={`card-tab-${selectedPreset.id}`}
              className="space-y-6"
            >
              <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-portal" />
                  <h2 className="text-sm font-sc font-bold uppercase tracking-widest text-signal">
                    World Cards
                  </h2>
                </div>
                <span className="text-xs text-neutral-500 font-mono">
                  Full artwork, title, quote & sound cues
                </span>
              </div>

              <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 items-start">
                {ACTIVE_CARD_PRESETS.filter((p) => p.id === selectedPreset.id).map((preset) => (
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
                          setActiveTab('contextual');
                        }}
                        className="text-[10px] font-mono text-portal hover:underline"
                      >
                        View in Reader →
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
            )}

            {/* 2. Codex Cards */}
            {selectedPreset.kind === 'codex-card' && (
            <section
              id={`card-panel-${selectedPreset.id}`}
              role="tabpanel"
              aria-labelledby={`card-tab-${selectedPreset.id}`}
              className="space-y-6"
            >
              <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-portal" />
                  <h2 className="text-sm font-sc font-bold uppercase tracking-widest text-signal">
                    Codex Cards
                  </h2>
                </div>
                <span className="text-xs text-neutral-500 font-mono">
                  Human Portraits, Non-Human Portraits, Artifacts & Locations
                </span>
              </div>

              <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 items-start">
                {ACTIVE_CARD_PRESETS.filter((p) => p.id === selectedPreset.id).map((preset) => (
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
                          setActiveTab('contextual');
                        }}
                        className="text-[10px] font-mono text-portal hover:underline"
                      >
                        View in Reader →
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
            )}

            {/* 3. System Blocks & Fate Results */}
            {(selectedPreset.kind === 'system-block' || selectedPreset.kind === 'fate-result') && (
            <section
              id={`card-panel-${selectedPreset.id}`}
              role="tabpanel"
              aria-labelledby={`card-tab-${selectedPreset.id}`}
              className="space-y-6"
            >
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

              <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 items-start">
                {ACTIVE_CARD_PRESETS.filter((p) => p.id === selectedPreset.id).map((preset) => (
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
                          setActiveTab('contextual');
                        }}
                        className="text-[10px] font-mono text-portal hover:underline"
                      >
                        View in Reader →
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
            )}

          </div>
        )}

        {activeTab === 'contextual' && (
          <section className="mx-auto w-full max-w-5xl space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-800 pb-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-portal">
                  Contextual View
                </p>
                <h2 className="mt-1 font-display text-lg font-bold text-signal">
                  {selectedPreset.title}
                </h2>
                <p className="mt-1 max-w-2xl text-xs font-sans text-neutral-400">
                  {selectedPreset.description}
                </p>
              </div>
              <span className="text-[10px] font-mono uppercase text-neutral-500">
                Device: {overrides.viewportMode}
              </span>
            </div>

            <div className={`mx-auto w-full min-w-0 ${viewportWidthClass} transition-all duration-300`}>
              <CardWorkshopContextualReader
                preset={selectedPreset}
                overrides={overrides}
                manifestedIds={manifestedIds}
                generatingRevealId={summoningId}
                onManifestReveal={handleManifestReveal}
                audioAdapter={audioAdapter}
              />
            </div>

            {renderTechnicalDetails()}
          </section>
        )}
      </main>
    </div>
  );
};

export default CardWorkshopView;
