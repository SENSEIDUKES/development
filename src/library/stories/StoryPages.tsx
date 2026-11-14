import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { inheritBlueprintPictures, storyPortraitCharacters } from '../story-seed/blueprintPictures';
import { findStory, HarnessReaderSession } from '@seihouse/sen/harness-generation';
import { type ReaderPreferenceStorage, type ReaderStateRepository } from '@seihouse/sen/reader-runtime';
import type { SceneAudioTrack } from '@seihouse/sen/audio';
import GenerationOverlay from '../../components/chapter-manifestation/development/GenerationOverlay';
import { StoryDetailScreen } from '../../components/light-novels-home/development/StoryDetailScreen';
import type { LoadingAgentPresentation } from '../manifestations/taskCard';
import { LIBRARY_READ_ALOUD_VOICES } from './readAloudVoices';
import { LIBRARY_READER_FONTS } from './readerFonts';
import { StorySettings } from './settings/StorySettings';
import { useStoryCoverManifest } from './StoryCoverManifest';
import { codexPictureRequest, storyCoverRequest, type CodexPictureService, type StoryCoverService } from './storyCover';
import { downloadHarnessStory } from './storyExport';
import { harnessStoryDisplay } from './storyView';
import { worldInfoChapterMap } from './worldInfoChapterMap';
import { StoryBlueprintPage, type StoryBlueprintAccess, type StoryBlueprintViewProps } from './StoryBlueprint';
import type { LibraryStories } from './useLibraryStories';
import { EnergyCostMeter } from '../../components/energy/development/EnergyCostMeter';
import { EnergyActionCost } from '../../components/energy/development/EnergyActionCost';
import { useActionEnergyPrice } from '../../components/energy/shared/energyModels';
import { useWorkspaceHeaderAccessory } from '../../components/library-shell/development/WorkspaceHeader';
import { ReaderFamiliar } from './ReaderFamiliar';

/** A HARNESS story's Portal: the novel alone, until adaptations of it exist. */
const NO_ADAPTATIONS_YET = { expansions: [] } as const;

export interface StoryPagesProps {
  stories: LibraryStories;
  storyId: string;
  /** Which of the story's pages shows: its World Info page, the Reader, or its Blueprint. */
  page: 'info' | 'read' | 'blueprint';
  /** Who views the Blueprint page; a host that owns every story on the device passes the creator. */
  blueprintAccess?: StoryBlueprintAccess;
  /** The Blueprint page's Copy, for a reader the creator allows to copy. */
  onCopyBlueprint?: StoryBlueprintViewProps['onCopy'];
  /** The Blueprint page's Back. */
  onCloseBlueprint?: () => void;
  /** World Info's Start Story, Start Reading or Continue: show the Reader. */
  onOpenReader: () => void;
  /** The Reader's Back. */
  onCloseReader: () => void;
  /** World Info's Back. */
  onBack: () => void;
  /** The visible name of World Info's way back. */
  backLabel?: string;
  /** Host-owned durable Reader state: the reading place. */
  readerStateRepository?: ReaderStateRepository;
  /** Host-owned device preferences: the reader's narration voices and speed. */
  readerPreferences?: ReaderPreferenceStorage;
  /** The host's soundscapes: the Reader's music before the story has a chapter (Chapter 1 being written). */
  soundscapes?: readonly SceneAudioTrack[];
  /** The agent the Generation Overlay shows while a chapter is written (the host owns agent art). Without it, Next says it is writing. */
  writingAgent?: LoadingAgentPresentation;
  /**
   * The host's browsing frame around World Info (the app's Library Shell). The
   * frame owns the page's `<main>`, so World Info is its content. The Reader is
   * never framed: it is immersive and scrolls the page itself.
   */
  frame?: (page: ReactNode) => ReactNode;
  /**
   * The host's cover service: World Info shows the story's cover and offers
   * Manifest cover, behind the media reveal. Without it, World Info has no cover.
   */
  covers?: StoryCoverService;
  /** The host's Codex pictures: the Reader's Codex shows them and offers Manifest. Without it, cards show their aura. */
  codexPictures?: CodexPictureService;
  /**
   * Whether the Reader is the creator's: Fate and Create together, and the
   * story's next chapter written from it. Anyone else's Reader has Fate alone
   * and never writes. Defaults to the creator.
   */
  creator?: boolean;
  /** The Reader opens at this chapter instead of the reader's place (a chapter opened from Create). */
  openAtChapter?: number;
  /** The creator's Reader opens in Create mode, the chapter's tags lit (a chapter opened from the world's Chapters). */
  openInCreate?: boolean;
  /**
   * The Reader begins a story with no chapters as it opens, as World Info's
   * Start Story does: the creator's Reader, opened as a story is made.
   */
  beginOnOpen?: boolean;
}

/** The veil stays open while a chapter is written; there is no minimized state here. */
const keepVeilOpen = () => undefined;

/**
 * One story's own pages: its World Info page (Start Story, Start Reading,
 * Continue, its cover art, and the story's Story Settings) and the Reader, with the Generation Overlay while a chapter is written.
 * The host decides which page shows and keeps this mounted, keyed by story,
 * as the reader moves between them, so Start Story still begins Chapter 1 once
 * the Reader opens.
 */
export function StoryPages({ stories, storyId, page, onOpenReader, onCloseReader, onBack, backLabel, readerStateRepository, readerPreferences, soundscapes, writingAgent, frame, covers, codexPictures, blueprintAccess = { view: 'creator' }, onCopyBlueprint, onCloseBlueprint, creator = true, openAtChapter, openInCreate = false, beginOnOpen = false }: StoryPagesProps) {
  const { state, controller, loadError } = stories;
  const portraitHandoff = useRef<Promise<void>>(Promise.resolve());
  const [portraitProblem, setPortraitProblem] = useState<string>();
  const [portraitRetry, setPortraitRetry] = useState(0);
  const foundationId = state?.stories.find(story => story.id === storyId)?.activeFoundationRevisionId;
  useEffect(() => {
    if (!state || !codexPictures) return;
    let active = true;
    const handoff = portraitHandoff.current.catch(() => undefined).then(() => inheritBlueprintPictures(state, storyId, codexPictures));
    portraitHandoff.current = handoff;
    handoff.then(() => { if (active) setPortraitProblem(undefined); }, error => {
      if (active) setPortraitProblem(error instanceof Error ? error.message : 'The Blueprint portraits could not be opened.');
    });
    return () => { active = false; };
    // A portrait can finish after leaving the Blueprint. Recheck on image updates;
    // the serialized handoff only writes missing images.
  }, [storyId, foundationId, codexPictures, portraitRetry]);
  /** Set by World Info's chapter map: the Reader opens at that chapter, which becomes the reader's place. */
  const [chosenChapter, setChosenChapter] = useState<number>();
  // The choice is for one visit to the Reader: leaving it any way (its Back, or the browser's) forgets it,
  // so Continue then opens at the latest saved place.
  useEffect(() => { if (page !== 'read') setChosenChapter(undefined); }, [page]);
  /** Set by Start Story, so the Reader begins Chapter 1 as it opens. */
  const [startOnOpen, setStartOnOpen] = useState(beginOnOpen);
  // Begin Story writes Chapter 1: its price, said in words for the button's accessible name.
  const chapterPrice = useActionEnergyPrice('chapter.generate');
  // The Familiar's recall, from the app's header, rides in the Reader's top bar beside Reader Settings.
  const familiar = useWorkspaceHeaderAccessory();
  const [readingPosition, setReadingPosition] = useState<{ chapterNumber: number }>();
  const [readChapters, setReadChapters] = useState<readonly number[]>([]);
  const [exportProblem, setExportProblem] = useState<string>();

  // World Info says Continue for a returning reader; the place is the host's Reader state.
  useEffect(() => {
    setReadingPosition(undefined);
    setReadChapters([]);
    if (page !== 'info' || !readerStateRepository) return;
    let active = true;
    readerStateRepository.load(storyId).then(saved => {
      if (!active || !saved) return;
      if (saved.lastReadChapter) setReadingPosition({ chapterNumber: saved.lastReadChapter });
      setReadChapters(saved.readChapters);
    }, () => undefined);
    return () => { active = false; };
  }, [page, storyId, readerStateRepository]);

  if (!state) return <main className="mx-auto max-w-3xl px-4 py-6">
    {loadError
      ? <LoadAlert message={loadError} onRetry={stories.retry} />
      : <p role="status" className="text-sm text-neutral-400">Opening your story…</p>}
  </main>;
  const display = findStory(state, storyId) ? harnessStoryDisplay(state, storyId, covers) : undefined;
  if (!display) return <main className="mx-auto max-w-3xl px-4 py-6">
    <p role="alert" className="text-sm text-amber-200">This story is no longer available.</p>
  </main>;
  // The stories are open but the writer did not answer: reading still works.
  const writerAlert = <>
    {loadError && <div className="mx-auto max-w-3xl px-4 pt-4"><LoadAlert message={loadError} onRetry={stories.retry} /></div>}
    {portraitProblem && <LoadAlert message={`The Blueprint portraits could not be carried over: ${portraitProblem}`} onRetry={() => setPortraitRetry(value => value + 1)} />}
  </>;

  // Only the creator's Reader writes: a reader who does not control the novel never generates in it.
  const writes = creator && stories.canGenerate;
  if (page === 'read') return <>
    {writerAlert}
    <HarnessReaderSession state={state} storyId={storyId} controller={controller}
      readerStateRepository={readerStateRepository} startOnOpen={startOnOpen} creator={creator} openAtChapter={chosenChapter ?? openAtChapter}
      openInCreate={openInCreate && chosenChapter === undefined}
      codexPictures={codexPictures && {
        pictureOf: key => codexPictures.pictureOf(storyId, key),
        manifest: card => codexPictures.manifest(storyId, card.key, codexPictureRequest(state, storyId, card)),
      }}
      readerPreferences={readerPreferences} readAloudVoices={LIBRARY_READ_ALOUD_VOICES} readerFonts={LIBRARY_READER_FONTS} soundscapes={soundscapes}
      onGenerateNextChapter={writes ? () => stories.generateNextChapter(storyId) : undefined}
      onRewriteChapter={writes ? note => stories.rewriteLatestChapter(storyId, note) : undefined}
      onPlanArc={writes ? () => stories.planArc(storyId) : undefined}
      onTagChapter={writes ? chapterId => controller.retagChapter(storyId, chapterId) : undefined}
      onTagChapterMedia={writes ? chapterId => controller.retagChapter(storyId, chapterId, { focus: 'media' }) : undefined}
      // Every generation shows its Energy: a chapter, tagging with the tagger (tagging by hand is free), a Codex picture.
      renderCost={action => <EnergyActionCost actionId={action === 'tag' ? 'chapter.tag' : action === 'picture' ? 'image.generate' : 'chapter.generate'} />}
      renderWriting={writingAgent ? writing => <GenerationOverlay agent={writingAgent} isGenerating={writing.active}
        completed={state.chapters.some(chapter => chapter.storyId === storyId && chapter.chapterNumber === writing.chapterNumber)}
        generationPhase="chapter" generatingChapterNum={writing.chapterNumber} progress={null}
        generationProgressMessage={null} estimatedSecondsRemaining={null} activeAgentId="versa"
        streamingBlocksCount={0} isVeilMinimized={false} setIsVeilMinimized={keepVeilOpen} /> : undefined}
      // A chapter's Energy price beside Write, and "−1" as each arrives (practice: nothing is taken yet).
      companion={familiar}
      renderHostTools={tools => <ReaderFamiliar state={state} storyId={storyId} controller={controller} tools={tools} />}
      renderWriteAside={written => <EnergyCostMeter actionId="chapter.generate" made={written} note="practice: nothing is taken yet" />}
      onClose={() => { setStartOnOpen(false); setChosenChapter(undefined); onCloseReader(); }} />
  </>;

  const exportStory = () => {
    try {
      downloadHarnessStory(state, storyId);
      setExportProblem(undefined);
    } catch (error) {
      setExportProblem(error instanceof Error ? error.message : 'The story could not be exported.');
    }
  };

  // World Info's chapter selector: the whole book by arc, with its goals and the reader's progress,
  // and a tap opens the Reader at that chapter.
  const { chapters, arcs } = worldInfoChapterMap(state, storyId, readChapters);
  const openChapter = (chapterNumber: number) => {
    setChosenChapter(chapterNumber);
    setStartOnOpen(false);
    onOpenReader();
  };
  // Story Settings live in World Info's Settings card.
  const settings = <StorySettings stories={stories} storyId={storyId} />;
  // Inside a host's frame, World Info is the frame's content, not a second <main>.
  const Page = frame ? 'div' : 'main';
  if (page === 'blueprint') {
    const blueprint = <>
      {writerAlert}
      <Page className="px-4 pb-12 pt-4 sm:px-6 sm:pt-6" data-testid="harness-story-blueprint">
        <StoryBlueprintPage stories={stories} storyId={storyId} access={blueprintAccess}
          onBack={onCloseBlueprint ?? onBack} onCopy={onCopyBlueprint} codexPictures={codexPictures} />
      </Page>
    </>;
    return frame ? <>{frame(blueprint)}</> : blueprint;
  }
  // Begin Story writes Chapter 1 in the creator's Reader: its price, where this Reader writes.
  const startCost = writes ? <EnergyActionCost actionId="chapter.generate" /> : undefined;
  const startCostLabel = writes && chapterPrice !== null ? `costs ${chapterPrice} Energy` : undefined;
  const info = <>
    {writerAlert}
    <Page className="px-4 pb-12 pt-4 sm:px-6 sm:pt-6" data-testid="harness-world-info">
      {covers
        ? <CoveredStoryDetail key={storyId} covers={covers} storyId={storyId} request={storyCoverRequest(state, storyId)!} agent={writingAgent}
            characters={storyPortraitCharacters(state, storyId)}
            pictures={codexPictures ? {
              pictureOf: key => codexPictures.pictureOf(storyId, key),
              manifest: card => codexPictures.manifest(storyId, card.key, codexPictureRequest(state, storyId, card)),
            } : undefined}
            referenceOf={codexPictures ? key => codexPictures.referenceOf(storyId, key) : undefined}
            story={display} backLabel={backLabel} readingPosition={readingPosition} onBack={onBack}
            chapters={chapters} arcs={arcs} onOpenChapter={openChapter} portal={NO_ADAPTATIONS_YET} settings={settings}
            onRead={() => { setStartOnOpen(false); onOpenReader(); }}
            onStart={() => { setStartOnOpen(true); onOpenReader(); }} startCost={startCost} startCostLabel={startCostLabel} />
        : <StoryDetailScreen story={display} backLabel={backLabel} readingPosition={readingPosition}
            onBack={onBack} chapters={chapters} arcs={arcs} onOpenChapter={openChapter} portal={NO_ADAPTATIONS_YET} settings={settings}
            onRead={() => { setStartOnOpen(false); onOpenReader(); }}
            onStart={() => { setStartOnOpen(true); onOpenReader(); }} startCost={startCost} startCostLabel={startCostLabel} />}
      {/* For testing: the whole story as one file, so a test can be shared. */}
      <div className="mx-auto mt-10 flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/10 pt-4" data-testid="story-export">
        <button type="button" onClick={exportStory}
          className="min-h-11 rounded-full border border-white/15 px-4 text-sm text-neutral-200 hover:border-white/30">Export story</button>
        <p className="min-w-0 flex-1 text-xs text-neutral-500">Saves a file with every chapter and what the writer was given for it, so a test can be shared.</p>
        {exportProblem && <p role="alert" className="w-full text-xs text-amber-200">{exportProblem}</p>}
      </div>
    </Page>
  </>;
  return frame ? <>{frame(info)}</> : info;
}

function LoadAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-amber-200">
    <span>{message}</span>
    <button type="button" onClick={onRetry}
      className="rounded-full border border-white/15 bg-[rgb(9_11_22/0.78)] px-3 py-1 text-xs font-semibold text-neutral-100 hover:border-white/30">Retry</button>
  </div>;
}

/** World Info with its cover made on the cover itself (Manifest, the choice, the reveal and the picker). */
function CoveredStoryDetail({ covers, storyId, request, agent, characters, pictures, referenceOf, ...detail }: Parameters<typeof useStoryCoverManifest>[0]
  & Omit<ComponentProps<typeof StoryDetailScreen>, 'coverAction'>) {
  const { onCover, overPage } = useStoryCoverManifest({ covers, storyId, request, agent, characters, pictures, referenceOf });
  return <>
    <StoryDetailScreen {...detail} coverAction={onCover} />
    {overPage}
  </>;
}
