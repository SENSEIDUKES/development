import { useMemo, useState } from 'react';
import { ReaderChamber } from '@seihouse/sen/reader-chamber';
import type { UpdateStoryFields } from '@seihouse/sen/reader-chamber';
import { CodexSheetOverlay } from '@seihouse/sen/reader-codex';
import { createHarnessSenStory } from '../shared/senAdapter';
import type { HarnessGenerationController } from '../shared/controller';
import type { HarnessSkillManifest, HarnessWorkspaceState } from '../../../narrative/generation';

export function HarnessReaderSession({ state, storyId, onClose, controller, installedSkills }: {
  state: HarnessWorkspaceState; storyId: string; onClose: () => void; controller: HarnessGenerationController;
  /** Host inventory; the Reader resolves its own `reader` Translation skill from it. */
  installedSkills?: HarnessSkillManifest[];
}) {
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [codexOpen, setCodexOpen] = useState(false);
  const story = useMemo(() => createHarnessSenStory(state, storyId), [state, storyId]);
  const chapterStory = useMemo(() => createHarnessSenStory(state, storyId, selectedChapter), [state, storyId, selectedChapter]);
  const [read, setRead] = useState<number[]>([]);
  const [editError, setEditError] = useState('');
  const readSet = useMemo(() => new Set(read), [read]);
  const activeStory = { ...chapterStory, arcs: story.arcs, currentChapterNumber: selectedChapter };
  const updateStoryFields: UpdateStoryFields = async (id, updates) => {
    if (id !== storyId) return;
    setEditError('');
    try { await controller.updateReaderStory(storyId, selectedChapter, updates); }
    catch (error) {
      setEditError(error instanceof Error ? error.message : 'The edit was not saved.');
      throw error;
    }
  };
  return <main className="mx-auto w-full min-w-0 max-w-6xl px-2 py-3 sm:px-4">
    <p className="mb-3 text-xs text-neutral-400">Reading from HARNESS. Reader and Codex edits are saved through its correction journal; committed chapter prose stays unchanged.</p>
    {editError && <p role="alert" className="mb-3 text-sm text-red-300">{editError}</p>}
    <ReaderChamber chapters={story.arcs.flatMap(arc => arc.chapters).map(chapter => ({ ...chapter, status: readSet.has(chapter.number) ? 'read' : 'unread' }))}
      currentPowerStage={chapterStory.memory?.currentPowerStage ?? 'Not yet established'}
      onGenerateChapter={async () => undefined} onGenerateNextFiveChapters={async () => undefined} isGenerating={false}
      selectedChapterNum={selectedChapter} setSelectedChapterNum={setSelectedChapter}
      onToggleRead={number => setRead(current => current.includes(number) ? current.filter(value => value !== number) : [...current, number])}
      arcTitle={story.title} onBack={onClose} onSwitchTab={tab => { if (tab === 'codex') setCodexOpen(true); }}
      activeStory={activeStory} updateStoryFields={updateStoryFields} installedSkills={installedSkills} />
    <CodexSheetOverlay isOpen={codexOpen} onClose={() => setCodexOpen(false)} activeStory={activeStory}
      onEditArcPlan={plan => controller.editArcGoals(storyId, plan)} generatedThrough={state.stories.find(item => item.id === storyId)!.head.nextChapterNumber - 1}
      onUpdateMemory={memory => { void updateStoryFields(storyId, { memory }).catch(() => undefined); }} updateStoryFields={updateStoryFields}
      onJumpToChapter={number => { setSelectedChapter(number); setCodexOpen(false); }} />
  </main>;
}
