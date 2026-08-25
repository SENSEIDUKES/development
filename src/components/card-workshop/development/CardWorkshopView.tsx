import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  Layers,
  BookOpen,
  Info,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react';
import { SystemBlock, type SystemEvent } from '@seihouse/sen/reader-chamber';
import { CodexCard, CodexHovercard, getManifestBackdrop } from '@seihouse/sen/codex-cards';
import { createCodexHighlighter, splitByCodexTerms } from '@seihouse/sen/reader-codex';
import type {
  CardPreset,
  CardWorkshopOverrides,
  ImagePreviewState,
} from '../shared/types';
import { CardWorkshopContextualReader } from './CardWorkshopContextualReader';
import {
  ACTIVE_CARD_PRESETS,
  SYSTEM_PROMPT_CHARACTER_TERMS,
  SYSTEM_PROMPT_PRESET_EXAMPLES,
} from '../../../workshop/previews/card-workshop/previewData';
import {
  SYSTEM_PROMPT_STYLE_OPTIONS,
  FATE_OUTCOME_OPTIONS,
  IMAGE_STATE_OPTIONS,
  INITIAL_CARD_WORKSHOP_OVERRIDES,
} from '../../../workshop/previews/card-workshop/previewStates';
import {
  CARD_BRANCHES,
  findBranchForCategory,
  findCardCategory,
  findCategoryForPreset,
  type CardBranchId,
} from '../../../workshop/previews/card-workshop/cardCategories';

const LOCAL_HUMAN_PORTRAIT = '/card-workshop/test-images/ye_chen_portrait.png';
const LOCAL_CREATURE_PORTRAIT = '/card-workshop/test-images/lyra_meadowlight_portrait.png';
const SYSTEM_PROMPT_CHARACTER_HIGHLIGHTER = createCodexHighlighter(SYSTEM_PROMPT_CHARACTER_TERMS);

/** Workshop-only renderer proving all System copy accepts Reader-owned character links. */
function renderSystemPromptProse(text: string) {
  const segments = splitByCodexTerms(text, SYSTEM_PROMPT_CHARACTER_HIGHLIGHTER);
  if (segments.length === 1) return <>{text}</>;

  return (
    <>
      {segments.map((segment, index) => (
        segment.match ? (
          <CodexHovercard
            key={`${segment.text}-${index}`}
            term={segment.text}
            type="character"
            entry={segment.match.entry}
          >
            {segment.text}
          </CodexHovercard>
        ) : (
          <React.Fragment key={`${segment.text}-${index}`}>{segment.text}</React.Fragment>
        )
      ))}
    </>
  );
}

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
  const initialCategory = findCategoryForPreset(initialPresetId);
  const [activeBranchId, setActiveBranchId] = useState<CardBranchId>(
    findBranchForCategory(initialCategory.id).id,
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategory.id);
  const [overrides, setOverrides] = useState<CardWorkshopOverrides>(
    INITIAL_CARD_WORKSHOP_OVERRIDES,
  );
  const [manifestedIds, setManifestedIds] = useState<Set<string>>(new Set());
  const [summoningId, setSummoningId] = useState<string | null>(null);
  const manifestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardTabListRef = useRef<HTMLDivElement | null>(null);

  const activeBranch = useMemo(
    () => CARD_BRANCHES.find((branch) => branch.id === activeBranchId) ?? CARD_BRANCHES[0],
    [activeBranchId],
  );
  /** Only the selected parent's categories are ever selectable. */
  const visibleCategories = activeBranch.categories;
  const selectedCategory = useMemo(
    () => findCardCategory(selectedCategoryId) ?? visibleCategories[0],
    [selectedCategoryId, visibleCategories],
  );
  const selectedPresetId = selectedCategory.presetId;

  const selectedPreset = useMemo(
    () => ACTIVE_CARD_PRESETS.find((p) => p.id === selectedPresetId) || ACTIVE_CARD_PRESETS[0],
    [selectedPresetId],
  );

  /** System categories expose only the content styles that belong to them. */
  const categoryStyleOptions = useMemo(() => {
    const allowed = selectedCategory.systemPromptStyles;
    if (!allowed) return SYSTEM_PROMPT_STYLE_OPTIONS;
    return SYSTEM_PROMPT_STYLE_OPTIONS.filter((option) => allowed.includes(option.value));
  }, [selectedCategory]);

  const selectCategory = (categoryId: string) => {
    const category = findCardCategory(categoryId);
    if (!category) return;
    setSelectedCategoryId(category.id);
    setActiveBranchId(findBranchForCategory(category.id).id);
    if (category.systemPromptStyles) {
      setOverrides((previous) => (
        previous.systemPromptContentStyle
          && category.systemPromptStyles!.includes(previous.systemPromptContentStyle)
          ? previous
          : { ...previous, systemPromptContentStyle: category.systemPromptStyles![0] }
      ));
    }
  };

  const selectBranch = (branchId: CardBranchId) => {
    if (branchId === activeBranchId) return;
    const branch = CARD_BRANCHES.find((candidate) => candidate.id === branchId) ?? CARD_BRANCHES[0];
    setActiveBranchId(branch.id);
    selectCategory(branch.categories[0].id);
  };

  useEffect(() => {
    if (!selectedPreset.systemEvent) return;
    setOverrides((previous) => ({
      ...previous,
      selectedSystemKind: selectedPreset.systemEvent?.kind,
    }));
  }, [selectedPreset]);

  useEffect(() => () => {
    if (manifestTimerRef.current) clearTimeout(manifestTimerRef.current);
  }, []);

  useEffect(() => {
    if (activeTab !== 'tabs') return;
    const activeCategoryTab = [...(cardTabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])]
      .find(tab => tab.dataset.categoryId === selectedCategoryId);
    activeCategoryTab?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeTab, selectedCategoryId]);

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

  const handleCardTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    const count = visibleCategories.length;
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % count;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + count) % count;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = count - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    selectCategory(visibleCategories[nextIndex].id);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [nextIndex]?.focus();
  };

  const handleBranchTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    const count = CARD_BRANCHES.length;
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % count;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + count) % count;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = count - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    selectBranch(CARD_BRANCHES[nextIndex].id);
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

    // 1. Codex Card
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
            activeStory={{ assignedRevealBackdrops: { [term.entry.id]: getManifestBackdrop(term.entry.id) } }}
            isSenMode={overrides.isSenMode}
            isRevealed={overrides.isRevealVisible}
            generatingRevealId={summoningId}
            onManifestReveal={handleManifestReveal}
          />
        </div>
      );
    }

    // 2. System Block & Fate Result
    if (preset.kind === 'system-block' || preset.kind === 'fate-result') {
      let content = preset.systemContent || '[ SYSTEM NOTIFICATION ]';
      let baseSystemEvent = preset.systemEvent;

      if (preset.id === 'preset-system-prompt') {
        const style = overrides.systemPromptContentStyle || 'breakthrough';
        const example = SYSTEM_PROMPT_PRESET_EXAMPLES[style];
        content = example.systemContent;
        baseSystemEvent = example.systemEvent;
      }

      const activeSystemEvent: SystemEvent | undefined = baseSystemEvent
        ? baseSystemEvent.fateResult
          ? {
              ...baseSystemEvent,
              fateResult: overrides.selectedFateOutcome
                ? {
                    ...baseSystemEvent.fateResult,
                    outcome: overrides.selectedFateOutcome,
                  }
                : baseSystemEvent.fateResult,
            }
          : {
              ...baseSystemEvent,
            }
        : undefined;

      return (
        <div className="w-full flex justify-center py-2">
          <SystemBlock
            content={content}
            system={activeSystemEvent}
            renderProse={renderSystemPromptProse}
          />
        </div>
      );
    }

    return null;
  };

  // Developer metadata explanation block
  const renderExplanationBadge = (explanation: CardPreset['explanation']) => (
    <div className="min-w-0 space-y-3 rounded-xl border border-neutral-800/80 bg-[#020813]/90 p-3 text-xs font-mono shadow-md sm:p-4">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-2">
        <span className="flex min-w-0 shrink-0 items-center gap-1.5 font-semibold uppercase tracking-wider text-portal">
          <Info size={13} /> {explanation.componentName}
        </span>
        <span className="min-w-0 truncate text-right text-[10px] text-neutral-500 sm:max-w-[200px]">
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
    <details className="w-full min-w-0 max-w-full rounded-2xl border border-neutral-800 bg-neutral-950/70 shadow-xl">
      <summary className="flex cursor-pointer list-none flex-col items-start justify-between gap-1 px-4 py-4 font-mono text-xs uppercase tracking-widest text-neutral-300 sm:flex-row sm:items-center sm:gap-4 sm:px-5 transition-colors hover:text-portal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-portal [&::-webkit-details-marker]:hidden">
        <span>Technical Details</span>
        <span className="text-[10px] normal-case tracking-normal text-neutral-500">
          Preset, routing, capabilities, and local-only overrides
        </span>
      </summary>

      <div className="space-y-6 border-t border-neutral-800 p-4 sm:p-5">
        <div>
          <label className="mb-2 block text-xs font-mono font-semibold uppercase tracking-widest text-portal">
            Select Card Category
          </label>
          <select
            aria-label="Card category"
            value={selectedCategoryId}
            onChange={(event) => selectCategory(event.target.value)}
            className="w-full max-w-full rounded-lg border border-neutral-800 bg-[#020914] px-3 py-2 text-xs font-mono text-signal focus:border-portal focus:outline-none"
          >
            {CARD_BRANCHES.map((branch) => (
              <optgroup key={branch.id} label={branch.label}>
                {branch.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </optgroup>
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
                <span className="mb-1 block text-[10px] font-mono uppercase text-neutral-500">
                  System Category
                </span>
                <div className="rounded border border-neutral-800/80 bg-[#020914] px-2.5 py-1.5 text-[11px] font-mono text-neutral-300">
                  {activeBranch.label} › {selectedCategory.label}
                </div>
              </div>

              {selectedPreset.id === 'preset-system-prompt' && (
                <div>
                  <label htmlFor="system-prompt-example-style" className="mb-1 block text-[10px] font-mono uppercase text-neutral-500">
                    Content Example Style (Development Only)
                  </label>
                  <select
                    id="system-prompt-example-style"
                    aria-label="System prompt example style"
                    value={overrides.systemPromptContentStyle || 'breakthrough'}
                    onChange={(event) =>
                      setOverrides((previous) => ({
                        ...previous,
                        systemPromptContentStyle: event.target.value as CardWorkshopOverrides['systemPromptContentStyle'],
                      }))
                    }
                    className="w-full rounded border border-neutral-800 bg-[#020914] px-2.5 py-1.5 text-[11px] font-mono text-signal"
                  >
                    {categoryStyleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[#01070e] text-signal">
      {/* Top Header & Mode Navigation */}
      <header className="relative z-30 flex w-full min-w-0 max-w-full flex-col gap-2.5 border-b border-neutral-800/80 bg-[#010914]/90 px-3 py-2.5 shadow-lg sm:sticky sm:top-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-3.5 sm:backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-portal/10 border border-portal/30 flex items-center justify-center text-portal shadow-[0_0_12px_rgba(4,172,255,0.2)] shrink-0">
            <Layers size={16} className="sm:w-[18px] sm:h-[18px]" />
          </div>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-sc font-bold uppercase tracking-wider text-signal sm:text-base">
              Reader Card Workshop
              <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-portal/10 text-portal border border-portal/30">
                Development Only
              </span>
            </h1>
            <p className="hidden sm:block text-xs text-neutral-400 font-sans">
              Compare Reader card presets, then place the same selection in a fixed local chapter without generating anything.
            </p>
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
          {/* Mode Switcher */}
          <div className="flex w-full rounded-lg border border-neutral-800 bg-neutral-900/80 p-1 sm:w-auto">
            <button
              type="button"
              aria-pressed={activeTab === 'tabs'}
              onClick={() => setActiveTab('tabs')}
              className={`min-h-11 flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-mono font-medium transition-colors sm:flex-none ${
                activeTab === 'tabs'
                  ? 'bg-portal text-void font-bold shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Card Type Tabs
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'contextual'}
              onClick={() => setActiveTab('contextual')}
              className={`min-h-11 flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-mono font-medium transition-colors sm:flex-none ${
                activeTab === 'contextual'
                  ? 'bg-portal text-void font-bold shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Contextual View
            </button>
          </div>

          {/* Viewport Width Emulation */}
          <div className="flex shrink-0 rounded-lg border border-neutral-800 bg-neutral-900/80 p-1">
            <button
              type="button"
              aria-label="Mobile Viewport"
              aria-pressed={overrides.viewportMode === 'mobile'}
              onClick={() => setOverrides((prev) => ({ ...prev, viewportMode: 'mobile' }))}
              className={`flex h-11 w-11 items-center justify-center rounded-md transition-colors ${
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
              aria-pressed={overrides.viewportMode === 'tablet'}
              onClick={() => setOverrides((prev) => ({ ...prev, viewportMode: 'tablet' }))}
              className={`flex h-11 w-11 items-center justify-center rounded-md transition-colors ${
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
              aria-pressed={overrides.viewportMode === 'desktop'}
              onClick={() => setOverrides((prev) => ({ ...prev, viewportMode: 'desktop' }))}
              className={`flex h-11 w-11 items-center justify-center rounded-md transition-colors ${
                overrides.viewportMode === 'desktop'
                  ? 'bg-neutral-800 text-portal'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title="Desktop Viewport (100%)"
            >
              <Monitor size={15} />
            </button>
          </div>

          <label className="flex min-h-11 min-w-0 flex-1 basis-40 items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 px-2 py-1 text-[10px] font-mono text-neutral-400 sm:flex-none sm:basis-auto">
            <span className="shrink-0">Image</span>
            <select
              aria-label="Image state"
              value={overrides.imageState}
              onChange={(event) => setOverrides(prev => ({
                ...prev,
                imageState: event.target.value as ImagePreviewState,
              }))}
              className="min-h-11 w-full min-w-0 bg-[#020914] px-1.5 py-1 text-[11px] text-signal sm:w-auto sm:max-w-[150px]"
            >
              {IMAGE_STATE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 p-3 sm:p-8">
        {/* OVERVIEW MODE */}
        {activeTab === 'tabs' && (
          <div className="space-y-12">
            <div className="space-y-3">
              {/* Parent branch: only the selected family's categories are offered below. */}
              <div
                role="tablist"
                aria-label="Card families"
                className="w-full min-w-0"
              >
                <div className="flex flex-wrap gap-2 rounded-xl border border-neutral-800 bg-neutral-950/70 p-1.5">
                  {CARD_BRANCHES.map((branch, index) => {
                    const isSelected = branch.id === activeBranchId;
                    return (
                      <button
                        key={branch.id}
                        id={`card-branch-tab-${branch.id}`}
                        data-branch-id={branch.id}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        aria-controls="card-category-tablist"
                        tabIndex={isSelected ? 0 : -1}
                        onClick={() => selectBranch(branch.id)}
                        onKeyDown={(event) => handleBranchTabKeyDown(event, index)}
                        className={`min-h-11 whitespace-nowrap rounded-lg border px-3 py-2 text-[11px] font-mono uppercase tracking-wider transition-colors ${
                          isSelected
                            ? 'border-portal/50 bg-portal/15 text-portal'
                            : 'border-transparent text-neutral-400 hover:border-neutral-700 hover:text-signal'
                        }`}
                      >
                        {branch.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Child categories of the selected branch. */}
              <div
                id="card-category-tablist"
                role="tablist"
                aria-label="Card types"
                className="w-full min-w-0"
              >
                <div
                  ref={cardTabListRef}
                  className="flex flex-wrap gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950/70 p-2 sm:gap-2"
                >
                  {visibleCategories.map((category, index) => {
                    const isSelected = category.id === selectedCategoryId;
                    return (
                      <button
                        key={category.id}
                        id={`card-tab-${category.id}`}
                        data-category-id={category.id}
                        data-preset-id={category.presetId}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        aria-controls={`card-panel-${category.id}`}
                        tabIndex={isSelected ? 0 : -1}
                        onClick={() => selectCategory(category.id)}
                        onKeyDown={(event) => handleCardTabKeyDown(event, index)}
                        className={`min-h-11 whitespace-nowrap rounded-lg border px-3 py-2 text-[11px] font-mono transition-colors ${
                          isSelected
                            ? 'border-portal/50 bg-portal/15 text-portal'
                            : 'border-transparent text-neutral-400 hover:border-neutral-700 hover:text-signal'
                        }`}
                      >
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 1. Codex Cards */}
            {selectedPreset.kind === 'codex-card' && (
            <section
              id={`card-panel-${selectedCategory.id}`}
              role="tabpanel"
              aria-labelledby={`card-tab-${selectedCategory.id}`}
              className="space-y-6"
            >
              <div className="flex flex-col gap-1.5 border-b border-neutral-800 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex min-w-0 items-center gap-2">
                  <BookOpen size={16} className="shrink-0 text-portal" />
                  <h2 className="text-sm font-sc font-bold uppercase tracking-widest text-signal">
                    Codex Cards
                  </h2>
                </div>
                <span className="min-w-0 break-words text-[11px] text-neutral-500 font-mono sm:text-xs sm:text-right">
                  {activeBranch.categories.map((category) => category.label).join(', ')}
                </span>
              </div>

              <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 items-start">
                {ACTIVE_CARD_PRESETS.filter((p) => p.id === selectedPreset.id).map((preset) => (
                  <div
                    key={preset.id}
                    className="flex min-w-0 flex-col space-y-3 rounded-2xl border border-neutral-900 bg-neutral-950/40 p-3 sm:p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-display font-semibold text-sm text-signal">
                          {preset.title}
                        </h3>
                        <p className="text-[11px] text-neutral-400 font-sans">{preset.subtitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('contextual');
                        }}
                        className="inline-flex min-h-11 shrink-0 items-center px-2 text-[10px] font-mono text-portal hover:underline"
                      >
                        View in Reader →
                      </button>
                    </div>

                    <div className={`mx-auto w-full min-w-0 overflow-x-auto ${viewportWidthClass} transition-[width,max-width] duration-300 motion-reduce:transition-none`}>
                      {renderCardInstance(preset)}
                    </div>

                    {renderExplanationBadge(preset.explanation)}
                  </div>
                ))}
              </div>
            </section>
            )}

            {/* 2. System Blocks & Fate Results */}
            {(selectedPreset.kind === 'system-block' || selectedPreset.kind === 'fate-result') && (
            <section
              id={`card-panel-${selectedCategory.id}`}
              role="tabpanel"
              aria-labelledby={`card-tab-${selectedCategory.id}`}
              className="space-y-6"
            >
              <div className="flex flex-col gap-1.5 border-b border-neutral-800 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex min-w-0 items-center gap-2">
                  <Zap size={16} className="shrink-0 text-portal" />
                  <h2 className="text-sm font-sc font-bold uppercase tracking-widest text-signal">
                    System Panels &amp; Fate Outcomes
                  </h2>
                </div>
                <span className="min-w-0 break-words text-[11px] text-neutral-500 font-mono sm:text-xs sm:text-right">
                  Real SystemBlock &amp; FateResultCard integration
                </span>
              </div>

              <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 items-start">
                {ACTIVE_CARD_PRESETS.filter((p) => p.id === selectedPreset.id).map((preset) => (
                  <div
                    key={preset.id}
                    className="flex min-w-0 flex-col space-y-3 rounded-2xl border border-neutral-900 bg-neutral-950/40 p-3 sm:p-4"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="font-display font-semibold text-sm text-signal">
                          {preset.title}
                        </h3>
                        <p className="text-[11px] text-neutral-400 font-sans">{preset.subtitle}</p>
                      </div>
                      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                        {preset.id === 'preset-system-prompt' && (
                          <div
                            role="group"
                            aria-label="System prompt examples"
                            className="flex min-w-0 flex-wrap items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/90 p-1"
                          >
                            <span className="text-[9px] font-mono uppercase text-neutral-500 px-1">Example:</span>
                            {categoryStyleOptions.map((styleOpt) => {
                              const isCurrentStyle = (overrides.systemPromptContentStyle || 'breakthrough') === styleOpt.value;
                              return (
                                <button
                                  key={styleOpt.value}
                                  type="button"
                                  aria-pressed={isCurrentStyle}
                                  onClick={() => setOverrides(prev => ({ ...prev, systemPromptContentStyle: styleOpt.value }))}
                                  className={`min-h-11 px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                                    isCurrentStyle
                                      ? 'bg-portal/20 text-portal border border-portal/40 font-semibold'
                                      : 'text-neutral-400 hover:text-neutral-200'
                                  }`}
                                >
                                  {styleOpt.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('contextual');
                          }}
                          className="inline-flex min-h-11 items-center px-2 text-[10px] font-mono text-portal hover:underline"
                        >
                          View in Reader →
                        </button>
                      </div>
                    </div>

                    <div className={`mx-auto w-full min-w-0 overflow-x-auto ${viewportWidthClass} transition-[width,max-width] duration-300 motion-reduce:transition-none`}>
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
          <section className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
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
