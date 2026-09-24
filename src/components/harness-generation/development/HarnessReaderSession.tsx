import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ReaderChamber } from '@seihouse/sen/reader-chamber';
import type { UpdateStoryFields } from '@seihouse/sen/reader-chamber';
import { CodexSheetOverlay } from '@seihouse/sen/reader-codex';
import {
  ReaderRuntimeProvider,
  applyReaderStatePatch,
  createReaderStoryState,
  overlayReaderState,
  resolveReaderOpeningChapter,
  setReaderChapterRead,
  splitReaderStatePatch,
  useReaderRuntime,
  type ReaderRuntime,
  type ReaderStateRepository,
  type ReaderStoreSnapshot,
  type ReaderStoryState,
} from '@seihouse/sen/reader-runtime';
import { createHarnessSenStory } from '../shared/senAdapter';
import type { HarnessGenerationController } from '../shared/controller';
import type { HarnessSkillManifest, HarnessWorkspaceState } from '../../../narrative/generation';
import type { StoryWorld } from '../../../narrative/story';

/**
 * A Reader store scoped to one saved story: the host's reading-mode, audio and
 * language state pass through, while story data and story writes come from
 * this session instead of any host or Workshop story list.
 */
function createSessionReaderStore(parent: ReaderRuntime['store']) {
  const listeners = new Set<() => void>();
  let story: StoryWorld | undefined;
  let update: UpdateStoryFields = async () => undefined;
  let cache: { parent: ReaderStoreSnapshot; story?: StoryWorld; update: UpdateStoryFields; snapshot: ReaderStoreSnapshot } | undefined;
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      const unsubscribe = parent.subscribe(listener);
      return () => { listeners.delete(listener); unsubscribe(); };
    },
    getSnapshot(): ReaderStoreSnapshot {
      const current = parent.getSnapshot();
      if (!cache || cache.parent !== current || cache.story !== story || cache.update !== update) {
        cache = { parent: current, story, update, snapshot: {
          ...current, stories: story ? [story] : [], activeStoryId: story?.id ?? null,
          isGenerating: false, updateStory: update, saveStories: async () => undefined,
        } };
      }
      return cache.snapshot;
    },
    set(nextStory: StoryWorld, nextUpdate: UpdateStoryFields) {
      if (nextStory === story && nextUpdate === update) return false;
      story = nextStory;
      update = nextUpdate;
      return true;
    },
    notify() { listeners.forEach(listener => listener()); },
  };
}

export function HarnessReaderSession({ state, storyId, onClose, controller, installedSkills, readerStateRepository }: {
  state: HarnessWorkspaceState; storyId: string; onClose: () => void; controller: HarnessGenerationController;
  /** Host inventory; the Reader resolves its own `reader` Translation skill from it. */
  installedSkills?: HarnessSkillManifest[];
  /** Host-owned durable Reader state. Without it, place, bookmarks and settings last for this session only. */
  readerStateRepository?: ReaderStateRepository;
}) {
  const story = useMemo(() => createHarnessSenStory(state, storyId), [state, storyId]);
  const chapters = useMemo(() => story.arcs.flatMap(arc => arc.chapters), [story]);
  const [readerState, setReaderState] = useState<ReaderStoryState>();
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [codexOpen, setCodexOpen] = useState(false);
  const [editError, setEditError] = useState('');
  const [storageError, setStorageError] = useState('');
  const readerStateRef = useRef<ReaderStoryState | undefined>(undefined);
  const persistEnabled = useRef(Boolean(readerStateRepository));
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const selectedChapterRef = useRef(selectedChapter);
  selectedChapterRef.current = selectedChapter;

  // Load once per story. Values the story journal already holds (bookmarks or
  // settings saved before Reader state existed) seed the first record.
  useEffect(() => {
    let active = true;
    const open = (saved: ReaderStoryState | undefined) => {
      if (!active) return;
      const initial = saved ?? createReaderStoryState(storyId, story);
      readerStateRef.current = initial;
      setReaderState(initial);
      setSelectedChapter(resolveReaderOpeningChapter(initial, chapters.map(chapter => chapter.number)));
    };
    if (!readerStateRepository) { open(undefined); return () => { active = false; }; }
    readerStateRepository.load(storyId).then(open, () => {
      persistEnabled.current = false;
      setStorageError('Your saved reading place could not be loaded. You can keep reading, but changes in this visit will not be saved.');
      open(undefined);
    });
    return () => { active = false; };
    // Opening is per story; later chapter commits must not reset the reader's place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, readerStateRepository]);

  const commitReaderState = useCallback((next: ReaderStoryState) => {
    readerStateRef.current = next;
    setReaderState(next);
    if (!readerStateRepository || !persistEnabled.current) return;
    // Serialized so an older snapshot can never land after a newer one.
    saveQueue.current = saveQueue.current.then(() => readerStateRepository.save(next)).then(
      () => setStorageError(''),
      () => setStorageError('Your latest reading change could not be saved. It will be retried with your next change.'),
    );
  }, [readerStateRepository]);

  const chapterStory = useMemo(() => createHarnessSenStory(state, storyId, selectedChapter), [state, storyId, selectedChapter]);
  const activeStory = useMemo<StoryWorld>(() => ({
    ...(readerState ? overlayReaderState(chapterStory, readerState) : chapterStory),
    arcs: story.arcs, currentChapterNumber: selectedChapter,
  }), [chapterStory, readerState, story.arcs, selectedChapter]);
  const activeStoryRef = useRef(activeStory);
  activeStoryRef.current = activeStory;

  // Reader-owned fields go to Reader state; Codex and media edits keep using the
  // HARNESS correction journal exactly as before.
  const updateStoryFields = useCallback<UpdateStoryFields>(async (id, updates) => {
    if (id !== storyId || !readerStateRef.current) return;
    const current = overlayReaderState(activeStoryRef.current, readerStateRef.current);
    const { reader, story: storyPatch } = splitReaderStatePatch(typeof updates === 'function' ? updates(current) : updates);
    if (Object.keys(reader).length) commitReaderState(applyReaderStatePatch(readerStateRef.current, reader));
    if (!Object.keys(storyPatch).length) return;
    setEditError('');
    try { await controller.updateReaderStory(storyId, selectedChapterRef.current, storyPatch); }
    catch (error) {
      setEditError(error instanceof Error ? error.message : 'The edit was not saved.');
      throw error;
    }
  }, [commitReaderState, controller, storyId]);

  const parentRuntime = useReaderRuntime();
  const sessionStore = useMemo(() => createSessionReaderStore(parentRuntime.store), [parentRuntime.store]);
  // Consumers rendering now read the new snapshot; the rest are notified after commit.
  sessionStore.set(activeStory, updateStoryFields);
  useLayoutEffect(() => { sessionStore.notify(); }, [sessionStore, activeStory, updateStoryFields]);
  const runtime = useMemo<ReaderRuntime>(() => ({
    ...parentRuntime,
    store: sessionStore,
    // HARNESS stories have no durable image pipeline yet; never save preview art into them.
    manifestImages: undefined,
    manifestReveal: undefined,
    canManifest: () => false,
    canGenerate: () => false,
  }), [parentRuntime, sessionStore]);

  if (!readerState) return <main className="mx-auto w-full max-w-6xl px-4 py-6"><p role="status" className="text-sm text-neutral-400">Opening your place in the story…</p></main>;

  const readChapters = new Set(readerState.readChapters);
  return <ReaderRuntimeProvider value={runtime}>
    <main className="mx-auto w-full min-w-0 max-w-6xl px-2 py-3 sm:px-4">
      <p className="mb-3 text-xs text-neutral-400">Reading from HARNESS. Your place, bookmarks and settings are saved with this story; Codex edits are saved through its correction journal; committed chapter prose stays unchanged.</p>
      {storageError && <p role="alert" className="mb-3 text-sm text-amber-300">{storageError}</p>}
      {editError && <p role="alert" className="mb-3 text-sm text-red-300">{editError}</p>}
      <ReaderChamber chapters={chapters.map(chapter => ({ ...chapter, status: readChapters.has(chapter.number) ? 'read' : 'unread' }))}
        currentPowerStage={chapterStory.memory?.currentPowerStage ?? 'Not yet established'}
        onGenerateChapter={async () => undefined} onGenerateNextFiveChapters={async () => undefined} isGenerating={false}
        selectedChapterNum={selectedChapter} setSelectedChapterNum={setSelectedChapter}
        onToggleRead={number => commitReaderState(setReaderChapterRead(readerStateRef.current!, number, !readerStateRef.current!.readChapters.includes(number)))}
        arcTitle={story.title} onBack={onClose} onSwitchTab={tab => { if (tab === 'codex') setCodexOpen(true); }}
        activeStory={activeStory} updateStoryFields={updateStoryFields} installedSkills={installedSkills} />
      <CodexSheetOverlay isOpen={codexOpen} onClose={() => setCodexOpen(false)} activeStory={activeStory}
        onEditArcPlan={plan => controller.editArcGoals(storyId, plan)} generatedThrough={state.stories.find(item => item.id === storyId)!.head.nextChapterNumber - 1}
        onUpdateMemory={memory => { void updateStoryFields(storyId, { memory }).catch(() => undefined); }} updateStoryFields={updateStoryFields}
        onJumpToChapter={number => { setSelectedChapter(number); setCodexOpen(false); }} />
    </main>
  </ReaderRuntimeProvider>;
}
