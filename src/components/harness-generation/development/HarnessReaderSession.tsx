import { useMemo, useState } from 'react';
import { ReaderChamber } from '@seihouse/sen/reader-chamber';
import type { StoryMemory, StoryWorld, UpdateStoryFields } from '@seihouse/sen/reader-chamber';
import { CodexSheetOverlay } from '@seihouse/sen/reader-codex';
import { createHarnessSenStory } from '../shared/senAdapter';
import type { HarnessGenerationController } from '../shared/controller';
import type { HarnessWorkspaceState } from '../shared/types';

export function HarnessReaderSession({ state, storyId, onClose, controller, model, onBranch, authorizeWorld }: {
  state: HarnessWorkspaceState; storyId: string; onClose: () => void;
  controller: HarnessGenerationController; model: string; onBranch: (storyId: string) => void; authorizeWorld: () => Promise<void>;
}) {
  const [selectedChapter, setSelectedChapter] = useState(() => state.stories.find(story => story.id === storyId)?.branch?.chapterNumber ?? 1);
  const [fate, setFate] = useState<{ chapter: number; instruction: string; conflict: boolean; reason: string; goal?: string }>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const currentAttempt = state.attempts.filter(attempt => attempt.storyId === storyId).at(-1);
  const generating = busy || currentAttempt?.stage === 'request_started';
  const generate = async (batch = false) => {
    setBusy(true); setError('');
    try {
      if (batch) await controller.startBatch(storyId, model, 5);
      else await controller.generateNextChapter(storyId, model);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Generation could not continue.'); }
    finally { setBusy(false); }
  };
  const checkFate = async (chapter: number, direction: string, prompt: string) => {
    setBusy(true); setError('');
    const instruction = [direction, prompt].filter(Boolean).join('\n');
    try { setFate({ chapter, instruction, ...await controller.checkAlterFate(storyId, chapter, instruction, model) }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Alter Fate review failed.'); }
    finally { setBusy(false); }
  };
  const branch = async () => {
    if (!fate) return;
    setBusy(true); setError('');
    try {
      const next = await controller.alterFate(storyId, fate.chapter, fate.instruction, authorizeWorld);
      try { await controller.generateNextChapter(next.id, model); }
      finally { onBranch(next.id); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The alternate world could not be created.'); }
    finally { setBusy(false); }
  };
  const [codexOpen, setCodexOpen] = useState(false);
  const story = useMemo(() => createHarnessSenStory(state, storyId), [state, storyId]);
  const chapterStory = useMemo(() => createHarnessSenStory(state, storyId, selectedChapter), [state, storyId, selectedChapter]);
  const [read, setRead] = useState<number[]>([]);
  const [sessionPatch, setSessionPatch] = useState<Partial<StoryWorld>>({});
  const [memoryPatches, setMemoryPatches] = useState<Record<number, StoryMemory>>({});
  const readSet = useMemo(() => new Set(read), [read]);
  const activeStory = { ...story, ...sessionPatch, memory: memoryPatches[selectedChapter] ?? chapterStory.memory, mcName: chapterStory.mcName, currentChapterNumber: selectedChapter };
  const updateStoryFields: UpdateStoryFields = async (id, updates) => {
    if (id !== storyId) return;
    const patch = typeof updates === 'function' ? updates(activeStory) : updates;
    const { memory, ...fields } = patch;
    if (memory) setMemoryPatches(current => ({ ...current, [selectedChapter]: memory }));
    setSessionPatch(current => ({ ...current, ...fields }));
  };
  if (!story.arcs.some(arc => arc.chapters.length)) return <main className="mx-auto max-w-3xl p-4">
    <p role="status">{generating ? 'Preparing the alternate chapter…' : 'The alternate world is saved and awaits its first chapter.'}</p>
    {currentAttempt?.failure && <p role="alert">{currentAttempt.failure.message}</p>}
    <button className="min-h-11 underline" onClick={onClose}>Return to generation</button>
  </main>;
  return <main className="mx-auto w-full min-w-0 max-w-6xl px-2 py-3 sm:px-4">
    <p className="mb-3 text-xs text-neutral-400">SEN preview. Reading settings last for this session; save story changes through Harness direction and corrections.</p>
    {generating && <p role="status">Preparing your story…</p>}
    {(error || currentAttempt?.failure) && <p role="alert">{error || currentAttempt?.failure?.message}</p>}
    {fate && <section className="my-4 rounded-xl border border-neutral-700 p-4" aria-label="Alter Fate review">
      {fate.conflict && <p className="text-amber-200">This change would break the current goal: {fate.goal}</p>}
      <p>{fate.reason}</p><p>The original world stays intact. The new world’s goal changes only if the conflicting event becomes canon.</p>
      <button disabled={busy} className="mr-4 min-h-11 underline" onClick={() => void branch()}>Continue in alternate world</button>
      <button disabled={busy} onClick={() => setFate(undefined)}>Cancel</button>
    </section>}
    <ReaderChamber handleAlterFate={checkFate} chapters={story.arcs.flatMap(arc => arc.chapters).map(chapter => ({ ...chapter, status: readSet.has(chapter.number) ? 'read' : 'unread' }))}
      currentPowerStage={chapterStory.memory?.currentPowerStage ?? 'Not yet established'}
      onGenerateChapter={() => generate()} onGenerateNextFiveChapters={() => generate(true)} isGenerating={generating}
      selectedChapterNum={selectedChapter} setSelectedChapterNum={setSelectedChapter}
      onToggleRead={number => setRead(current => current.includes(number) ? current.filter(value => value !== number) : [...current, number])}
      arcTitle={story.title} onBack={onClose} onSwitchTab={tab => { if (tab === 'codex') setCodexOpen(true); }}
      activeStory={activeStory} updateStoryFields={updateStoryFields} />
    <CodexSheetOverlay isOpen={codexOpen} onClose={() => setCodexOpen(false)} activeStory={{ ...chapterStory, ...sessionPatch, arcs: story.arcs, memory: activeStory.memory }}
      onEditArcPlan={plan => controller.editArcGoals(storyId, plan)} generatedThrough={state.stories.find(item => item.id === storyId)!.head.nextChapterNumber - 1}
      onUpdateMemory={memory => setMemoryPatches(current => ({ ...current, [selectedChapter]: memory }))} updateStoryFields={updateStoryFields}
      onJumpToChapter={number => { setSelectedChapter(number); setCodexOpen(false); }} />
  </main>;
}
