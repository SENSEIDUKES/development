/**
 * Workshop-only stand-in for trusted Library activity. A real host records
 * reading progress, accepted chapters and Codex opens from its own servers;
 * here each button sends the development-only activity operation to the real
 * achievements handler, which evaluates every goal and mints any scroll.
 */
import { useRef, useState } from 'react';
import type { LibraryActivityKind, RecordLibraryActivityInput, RecordLibraryActivityResponse } from '@seihouse/library/rewards';
import { SimulatedBadge, WorkshopActionButton, WorkshopCard } from './RewardWorkshopKit';
import { useRewardAccount } from './WorkshopEconomyProvider';

const formatWhole = (value: number) => value.toLocaleString('en-US');

/** One sentence for what a batch of recorded activity did. */
export function describeActivityResults(responses: readonly RecordLibraryActivityResponse[]): string {
  const earned = responses.flatMap(response => response.earned.map(scroll => scroll.achievementName));
  const creation = responses.reduce((total, response) => total + response.creationDaoXp, 0);
  if (!responses.some(response => response.recorded) && !earned.length && creation === 0) return 'Already recorded — nothing moved.';
  const parts: string[] = [];
  if (earned.length) parts.push(`Earned ${earned.join(' and ')} — ${earned.length === 1 ? 'a Mystery Scroll is' : 'Mystery Scrolls are'} waiting.`);
  if (creation > 0) parts.push(`+${formatWhole(creation)} DAO XP for creating.`);
  return parts.join(' ') || 'Recorded. Achievement progress moved.';
}

export function ActivitySimulator({ compact = false }: { compact?: boolean }) {
  const account = useRewardAccount();
  const story = useRef(1);
  const chapter = useRef(0);
  const counters = useRef<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const next = (kind: LibraryActivityKind) => (counters.current[kind] = (counters.current[kind] ?? 0) + 1);
  const run = async (inputs: RecordLibraryActivityInput[]) => {
    if (!account.achievementsStore) return;
    setPending(true);
    try {
      const responses: RecordLibraryActivityResponse[] = [];
      for (const input of inputs) responses.push(await account.achievementsStore.recordActivityDevelopment(input));
      await account.refreshBalances();
      setMessage(describeActivityResults(responses));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The activity could not be recorded.');
    } finally {
      setPending(false);
    }
  };
  const readChapters = (count: number) => run(Array.from({ length: count }, () => {
    chapter.current += 1;
    return { kind: 'chapter.read' as const, subjectId: `workshop-story-${story.current}:${chapter.current}`, storyId: `workshop-story-${story.current}` };
  }));
  const readAnotherStory = () => {
    story.current += 1;
    chapter.current = 0;
    return readChapters(1);
  };

  return (
    <WorkshopCard title="Library activity" badge={<SimulatedBadge>Activity intake not built</SimulatedBadge>}
      description={compact ? undefined : 'Stand-ins for what a host records from its own servers: reading progress, created stories and chapters, Codex opens and visits. The server evaluates every goal and decides what is earned.'}>
      <div className="flex flex-wrap gap-2">
        <WorkshopActionButton disabled={pending} onClick={() => void readChapters(1)}>Read a chapter</WorkshopActionButton>
        <WorkshopActionButton disabled={pending} onClick={() => void readChapters(10)}>Read ten chapters</WorkshopActionButton>
        <WorkshopActionButton disabled={pending} onClick={() => void readAnotherStory()}>Read another story</WorkshopActionButton>
        <WorkshopActionButton disabled={pending} onClick={() => { const n = next('story.created'); void run([{ kind: 'story.created', subjectId: `workshop-created-story-${n}`, storyId: `workshop-created-story-${n}` }]); }}>Create a story</WorkshopActionButton>
        <WorkshopActionButton disabled={pending} onClick={() => { const n = next('chapter.created'); void run([{ kind: 'chapter.created', subjectId: `workshop-created-story-1:${n}`, storyId: 'workshop-created-story-1' }]); }}>Create a chapter</WorkshopActionButton>
        <WorkshopActionButton disabled={pending} onClick={() => { const n = next('codex.entry-opened'); void run([{ kind: 'codex.entry-opened', subjectId: `workshop-codex-${n}`, storyId: `workshop-story-${story.current}` }]); }}>Open a Codex entry</WorkshopActionButton>
        <WorkshopActionButton disabled={pending} onClick={() => { const n = next('world.visited'); void run([{ kind: 'world.visited', subjectId: `workshop-world-${n}` }]); }}>Visit another creator’s world</WorkshopActionButton>
        <WorkshopActionButton disabled onClick={() => undefined}>Experience other media · planned</WorkshopActionButton>
      </div>
      {message ? <p role="status" className="mt-3 text-xs text-white/75" data-activity-message>{message}</p> : null}
    </WorkshopCard>
  );
}
