import { useMemo, useState } from 'react';
import { ReaderChamber } from '@seihouse/sen/reader-chamber';
import type { StoryMemory, StoryWorld, UpdateStoryFields } from '@seihouse/sen/reader-chamber';
import { CodexSheetOverlay } from '@seihouse/sen/reader-codex';
import { createHarnessSenStory } from '../shared/senAdapter';
import type { HarnessWorkspaceState } from '../shared/types';

export function HarnessReaderSession({ state, storyId, onClose }: {
  state: HarnessWorkspaceState; storyId: string; onClose: () => void;
}) {
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [codexOpen, setCodexOpen] = useState(false);
  const story = useMemo(() => createHarnessSenStory(state, storyId), [state, storyId]);
  const chapterStory = useMemo(() => createHarnessSenStory(state, storyId, selectedChapter), [state, storyId, selectedChapter]);
  const [read, setRead] = useState<number[]>([]);
  const [sessionPatch, setSessionPatch] = useState<Partial<StoryWorld>>({});
  const [memoryPatches, setMemoryPatches] = useState<Record<number, StoryMemory>>({});
  const activeStory = { ...story, ...sessionPatch, memory: memoryPatches[selectedChapter] ?? chapterStory.memory, mcName: chapterStory.mcName, currentChapterNumber: selectedChapter };
  const updateStoryFields: UpdateStoryFields = async (id, updates) => {
    if (id !== storyId) return;
    const patch = typeof updates === 'function' ? updates(activeStory) : updates;
    const { memory, ...fields } = patch;
    if (memory) setMemoryPatches(current => ({ ...current, [selectedChapter]: memory }));
    setSessionPatch(current => ({ ...current, ...fields }));
  };
  return <main className="mx-auto w-full min-w-0 max-w-6xl px-2 py-3 sm:px-4">
    <p className="mb-3 text-xs text-neutral-400">SEN preview. Reading settings last for this session; save story changes through Harness direction and corrections.</p>
    <ReaderChamber chapters={story.arcs[0].chapters.map(chapter => ({ ...chapter, status: read.includes(chapter.number) ? 'read' : 'unread' }))}
      currentPowerStage={chapterStory.memory?.currentPowerStage ?? 'Not yet established'}
      onGenerateChapter={async () => undefined} onGenerateNextFiveChapters={async () => undefined} isGenerating={false}
      selectedChapterNum={selectedChapter} setSelectedChapterNum={setSelectedChapter}
      onToggleRead={number => setRead(current => current.includes(number) ? current.filter(value => value !== number) : [...current, number])}
      arcTitle={story.title} onBack={onClose} onSwitchTab={tab => { if (tab === 'codex') setCodexOpen(true); }}
      activeStory={activeStory} updateStoryFields={updateStoryFields} />
    <CodexSheetOverlay isOpen={codexOpen} onClose={() => setCodexOpen(false)} activeStory={{ ...chapterStory, ...sessionPatch, memory: activeStory.memory }}
      onUpdateMemory={memory => setMemoryPatches(current => ({ ...current, [selectedChapter]: memory }))} updateStoryFields={updateStoryFields}
      onJumpToChapter={number => { setSelectedChapter(number); setCodexOpen(false); }} />
  </main>;
}
