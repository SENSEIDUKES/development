import React, { useCallback, useMemo, useRef, useState } from 'react';
import { getReaderChamberSurfaceClass } from '../../reader-chamber/development/ReaderChamber';
import { ReaderViewport } from '../../reader-chamber/development/ReaderViewport';
import { CodexHovercard } from '../../reader-codex/development/CodexHovercard';
import { getManifestBackdrop } from '../../reader-codex/development/codexManifestBackdrop';
import {
  createCodexHighlighter,
  splitByCodexTerms,
  type CodexTerm,
  type CodexTermType,
} from '../../reader-codex/shared/codexHighlighting';
import type {
  ReaderChapter,
  ReaderPreferences,
  StoryBlock,
  StoryWorld,
  SystemEvent,
} from '../../reader-chamber/shared/types';
import type { InlineAudioHighlight } from '../../../audio/inlineAudio';
import type { CardPreset, CardWorkshopOverrides } from '../shared/types';

const LOCAL_HUMAN_PORTRAIT = '/card-workshop/test-images/ye_chen_portrait.png';
const LOCAL_CREATURE_PORTRAIT = '/card-workshop/test-images/lyra_meadowlight_portrait.png';

const CONTEXT_CARD_BLOCK_ID = 'card-workshop-context-card';
const CONTEXT_CHAPTER_NUMBER = 1;

const CONTEXT_WITNESS: CodexTerm = {
  term: 'Aster',
  type: 'character',
  isCanonicalName: true,
  entry: {
    id: 'card-workshop-context-witness',
    name: 'Aster',
    role: 'Archive courier',
    status: 'alive',
    relationshipToMC: 'ally',
    description: 'A quiet Rain Court courier who records the exact moment a sworn truth begins to fail.',
    portraitKind: 'human',
  },
};

const CONTEXT_CUE_LOCATION: CodexTerm = {
  term: 'Rain Court',
  type: 'location',
  isCanonicalName: true,
  entry: {
    id: 'card-workshop-context-rain-court',
    name: 'Rain Court',
    description: 'An oathbound tribunal where each false vow answers with a bell-like peal of thunder.',
  },
};

const CONTEXT_INLINE_WORLD_CUES = [{
  id: 'card-workshop-rain-court-cue',
  phrase: 'Rain Court',
  action: {
    type: 'sound',
    cueUrl: 'https://celestialaudio.seihouse.org/DEFAULT/Locations/Signatures/Sect_Gong_1.mp3',
  },
}] as const satisfies readonly InlineAudioHighlight[];

const CONTEXT_READER_PREFERENCES: ReaderPreferences = {
  fontSize: 'lg',
  fontFamily: 'serif',
  lineHeight: 'relaxed',
  paragraphSpacing: 'normal',
  themeOverride: 'void',
  lineHeightScale: 1.62,
  paragraphSpacingScale: 1.15,
  letterSpacing: 0,
  wordSpacing: 0,
  readingWidth: 62,
  textAlignment: 'start',
};

export interface CardWorkshopContextualFixture {
  activeStory: StoryWorld;
  chapter: ReaderChapter;
  codexTerms: CodexTerm[];
  cardBlockIndex: number;
}

export interface CardWorkshopContextualReaderProps {
  preset: CardPreset;
  overrides: CardWorkshopOverrides;
  manifestedIds: Set<string>;
  generatingRevealId: string | null;
  onManifestReveal: (entry: { id?: string }, type: string) => void;
}

/** Whether the preset reveals a human or non-human portrait entity. */
function isPortraitPreset(preset: CardPreset) {
  return preset.id === 'preset-human-character'
    || preset.id === 'preset-nonhuman-individual';
}

/** Maps the preset's reveal display type onto a Codex term type. */
function getCodexTermType(preset: CardPreset): CodexTermType {
  const revealType = preset.codexReveal?.type.toLowerCase() ?? '';
  if (revealType.includes('artifact')) return 'artifact';
  if (revealType.includes('location')) return 'location';
  return 'character';
}

/**
 * Builds the Codex term the Contextual Reader highlights, applying the
 * Workshop overrides for portrait kind and image state. Returns null when the
 * preset has no Codex reveal or the override marks the entry missing.
 */
function createContextualCodexTerm(
  preset: CardPreset,
  overrides: CardWorkshopOverrides,
  manifestedIds: Set<string>,
): CodexTerm | null {
  if (preset.kind !== 'codex-card' || !preset.codexReveal || overrides.codexEntryState === 'missing') {
    return null;
  }

  const revealEntry = preset.codexReveal.entry;
  const portrait = isPortraitPreset(preset);
  const existingImage = portrait
    ? (overrides.portraitKind === 'human' ? LOCAL_HUMAN_PORTRAIT : LOCAL_CREATURE_PORTRAIT)
    : revealEntry.imageUrl;
  const hasManifestedImage = manifestedIds.has(revealEntry.id);

  return {
    term: revealEntry.name,
    type: getCodexTermType(preset),
    isCanonicalName: true,
    entry: {
      ...revealEntry,
      ...(portrait ? { portraitKind: overrides.portraitKind } : {}),
      imageUrl: hasManifestedImage || overrides.imageState === 'existing'
        ? existingImage
        : undefined,
      imageAssetId: overrides.imageState === 'missing'
        ? 'card-workshop-missing-image'
        : undefined,
    },
  };
}

/**
 * Builds the System event for the fixture, honoring the selected system-kind
 * and Fate-outcome overrides. Undefined when the preset has no System event.
 */
function createContextualSystemEvent(
  preset: CardPreset,
  overrides: CardWorkshopOverrides,
): SystemEvent | undefined {
  if (!preset.systemEvent) return undefined;
  return {
    ...preset.systemEvent,
    kind: (overrides.selectedSystemKind ?? preset.systemEvent.kind) as SystemEvent['kind'],
    fateResult: preset.systemEvent.fateResult && overrides.selectedFateOutcome
      ? {
          ...preset.systemEvent.fateResult,
          outcome: overrides.selectedFateOutcome,
        }
      : preset.systemEvent.fateResult,
  };
}

/** The display name of the entity the fixture spotlights. */
function selectedEntityName(preset: CardPreset, codexTerm: CodexTerm | null) {
  return codexTerm?.term
    ?? preset.systemEvent?.title
    ?? preset.title;
}

/**
 * A fixed Reader chapter that deliberately drives the existing structured-block
 * path. There is no generation, storage, model, or API boundary in this fixture.
 */
export function createCardWorkshopContextualFixture(
  preset: CardPreset,
  overrides: CardWorkshopOverrides,
  manifestedIds: Set<string>,
): CardWorkshopContextualFixture {
  const codexTerm = createContextualCodexTerm(preset, overrides, manifestedIds);
  const systemEvent = createContextualSystemEvent(preset, overrides);
  const entityName = selectedEntityName(preset, codexTerm);
  const mentionEntities: StoryBlock['metadata'] = {
    entities: [{ name: 'Aster', type: 'character', mention: 'reference' }],
  };
  const cardBlock: StoryBlock = {
    id: CONTEXT_CARD_BLOCK_ID,
    type: preset.kind,
    text: preset.kind === 'system-block' || preset.kind === 'fate-result'
      ? (preset.systemContent || '[ SYSTEM NOTIFICATION ]')
      : `For one measured breath, the whole Rain Court waited to see what the broken oath would reveal.`,
    metadata: preset.kind === 'codex-card' && codexTerm && overrides.entityMention === 'reveal'
      ? {
          entities: [{
            name: codexTerm.term,
            type: codexTerm.type,
            mention: 'reveal',
          }],
        }
      : mentionEntities,
    ...(systemEvent ? { system: systemEvent } : {}),
  };

  const blocks: StoryBlock[] = [
    {
      id: 'card-workshop-context-opening',
      type: 'prose',
      text: 'Rain threaded down the bronze eaves of the Rain Court in silver cords, each drop sounding like a small bell against the empty tribunal.',
    },
    {
      id: 'card-workshop-context-mention',
      type: 'prose',
      text: `Aster steadied her lantern beside ${entityName}, listening for the first tremor in the magistrate\'s oath.`,
      metadata: mentionEntities,
    },
    cardBlock,
    {
      id: 'card-workshop-context-aftermath',
      type: 'prose',
      text: 'Then the thunder moved on. No one spoke until the last bright thread of rain had vanished beyond the pavilion steps.',
    },
  ];

  const codexTerms = [CONTEXT_WITNESS, CONTEXT_CUE_LOCATION, codexTerm].filter(
    (term): term is CodexTerm => Boolean(term),
  );
  // Real Manifest backdrop art per entity (the shared pool's stable pick), so
  // Codex surfaces in this fixture show the production revelation landscapes.
  const assignedRevealBackdrops = Object.fromEntries(
    codexTerms.map(term => [term.entry.id, getManifestBackdrop(term.entry.id)]),
  );
  const activeStory: StoryWorld = {
    id: 'card-workshop-context-fixture',
    title: 'Ashes of the Ninth Meridian',
    genre: 'Cultivation Mystery',
    mcName: 'Rin',
    customPremise: 'A fixed local chapter used only to judge Reader card placement.',
    createdAt: '2026-08-15T00:00:00.000Z',
    updatedAt: '2026-08-15T00:00:00.000Z',
    arcs: [],
    currentChapterNumber: CONTEXT_CHAPTER_NUMBER,
    readerPreferences: CONTEXT_READER_PREFERENCES,
    assignedRevealBackdrops,
  };

  return {
    activeStory,
    chapter: {
      number: CONTEXT_CHAPTER_NUMBER,
      title: 'The Oath Beneath the Rain',
      premise: 'A fixed, local Reader fixture.',
      status: 'read',
      hasContent: true,
      blocks,
    },
    codexTerms,
    cardBlockIndex: 2,
  };
}

/**
 * Card Workshop Contextual View: renders the selected card preset inside the
 * real Development ReaderViewport using the fixed local fixture, so Codex
 * Cards and System Panels can be inspected in their true host, with a separate
 * inline World Cue demonstrating independent Codex and sound actions.
 */
export function CardWorkshopContextualReader({
  preset,
  overrides,
  manifestedIds,
  generatingRevealId,
  onManifestReveal,
}: CardWorkshopContextualReaderProps) {
  const readerRef = useRef<HTMLDivElement>(null);
  const [editingBookmarkParagraphIndex, setEditingBookmarkParagraphIndex] = useState<number | null>(null);
  const [bookmarkNoteText, setBookmarkNoteText] = useState('');
  const fixture = useMemo(
    () => createCardWorkshopContextualFixture(preset, overrides, manifestedIds),
    [manifestedIds, overrides, preset],
  );
  const codexHighlighter = useMemo(
    () => createCodexHighlighter(fixture.codexTerms),
    [fixture.codexTerms],
  );
  const renderHighlightedText = useCallback((text: string) => {
    const segments = splitByCodexTerms(text, codexHighlighter);
    if (segments.length === 1) return <>{text}</>;

    return (
      <>
        {segments.map((segment, index) => (
          segment.match ? (
            <CodexHovercard
              key={`${segment.text}-${index}`}
              term={segment.text}
              type={segment.match.type}
              entry={segment.match.entry as never}
            >
              {segment.text}
            </CodexHovercard>
          ) : (
            <React.Fragment key={`${segment.text}-${index}`}>{segment.text}</React.Fragment>
          )
        ))}
      </>
    );
  }, [codexHighlighter]);

  const handleSaveBookmark = useCallback(() => {
    // Deliberately local-only: the contextual fixture never writes Reader state.
    setEditingBookmarkParagraphIndex(null);
  }, []);
  const isRevealVisible = !overrides.isSenMode || overrides.isRevealVisible;

  return (
    <section
      aria-label="Reader contextual fixture"
      data-testid="card-workshop-contextual-reader"
      className="w-full min-w-0"
    >
      <div
        id="reader-chamber-root"
        className={getReaderChamberSurfaceClass(CONTEXT_READER_PREFERENCES.themeOverride)}
      >
        <ReaderViewport
          readerRef={readerRef}
          isReaderFullscreen={false}
          handleTouchStart={() => undefined}
          handleTouchMove={() => undefined}
          handleTouchEnd={() => undefined}
          handleTextClick={() => undefined}
          isTranslating={false}
          preferredLang="en"
          selectedChapter={fixture.chapter}
          activeStory={fixture.activeStory}
          currentPowerStage="Foundation Establishment — Stage 4"
          selectedChapterNum={CONTEXT_CHAPTER_NUMBER}
          maxChapterNum={CONTEXT_CHAPTER_NUMBER}
          codexTerms={fixture.codexTerms}
          generatingRevealId={generatingRevealId}
          handleManifestReveal={onManifestReveal}
          readerMode={overrides.isSenMode ? 'sen' : 'reader'}
          immersion={{ imagePopups: true }}
          isPlayingText={overrides.isSenMode}
          isPausedText={false}
          currentNarratedBlockIndex={isRevealVisible ? fixture.cardBlockIndex : fixture.cardBlockIndex - 1}
          currentPrefs={CONTEXT_READER_PREFERENCES}
          handleUpdatePreference={() => undefined}
          activeBookmarks={[]}
          editingBookmarkParagraphIndex={editingBookmarkParagraphIndex}
          setEditingBookmarkParagraphIndex={setEditingBookmarkParagraphIndex}
          bookmarkNoteText={bookmarkNoteText}
          setBookmarkNoteText={setBookmarkNoteText}
          handleRemoveBookmark={() => undefined}
          handleSaveBookmark={handleSaveBookmark}
          activeTranslationContent={null}
          renderHighlightedText={renderHighlightedText}
          getFocusClass={() => ''}
          navigatePrev={() => undefined}
          navigateNext={() => undefined}
          handleSealClick={() => undefined}
          isCheckingConsistency={false}
          isGenerating={false}
          handleGenerate={() => undefined}
          handleGenerateNextFive={() => undefined}
          activeAgentId={null}
          showFateCodex={false}
          setShowFateCodex={() => undefined}
          showLegend={false}
          setShowLegend={() => undefined}
          hasSystemBlocks={Boolean(fixture.chapter.blocks?.some(block => block.system))}
          chapters={[fixture.chapter]}
          inlineAudioHighlights={CONTEXT_INLINE_WORLD_CUES}
        />
      </div>
    </section>
  );
}

export default CardWorkshopContextualReader;
