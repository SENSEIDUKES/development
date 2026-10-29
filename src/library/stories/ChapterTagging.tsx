import { useState } from 'react';
import { findStory, type CodexEntry, type HarnessChapter } from '@seihouse/sen/harness-generation';
import { NarrativeButton as LibraryButton } from '@seihouse/sen/presentation';
import { describeChapterTagging } from './chapterTagging';
import type { LibraryStories } from './useLibraryStories';

/**
 * A chapter's tagging record on the page, and Tag this chapter on any
 * committed chapter (SENSEI, 2026-10-29, `docs/create-hub.md` phase B). One
 * record and one action, shared by World Info's Chapters card in the app and
 * the HARNESS workspace's chapter list in the Workshop, so the two never drift.
 */

/** What the tagger made of one chapter: read or not, by what, and one line per kind of tag. */
export function ChapterTaggingRecord({ chapter, entries }: { chapter: HarnessChapter; entries?: readonly CodexEntry[] }) {
  const account = describeChapterTagging(chapter, { entries });
  return <div className="mt-2 text-xs text-neutral-300" data-testid="chapter-tagging" data-tagging-status={account.status}>
    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">Tagging: {account.headline}</p>
    {account.problem && <p className="mt-1 text-amber-200">{account.problem}</p>}
    {account.notes && <p className="mt-1 text-neutral-400">{account.notes}</p>}
    {account.kinds.length > 0 && <dl className="mt-2 grid gap-y-1 sm:grid-cols-[max-content_minmax(0,1fr)] sm:gap-x-4">
      {account.kinds.map(line => <div key={line.kind} className="contents">
        <dt className="text-neutral-500">{line.kind}</dt>
        <dd className={`min-w-0 break-words ${line.state === 'found' ? 'text-neutral-200' : 'text-neutral-400'}`}
          data-tagging-kind={line.kind} data-tagging-state={line.state}>{line.said}</dd>
      </div>)}
    </dl>}
    {account.problems.length > 0 && <details className="mt-2">
      <summary className="cursor-pointer text-neutral-400">
        {account.problems.length === 1 ? 'One thing was dropped or set aside' : `${account.problems.length} things were dropped or set aside`}
      </summary>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-neutral-400">
        {account.problems.map((problem, index) => <li key={index}>{problem}</li>)}
      </ul>
    </details>}
  </div>;
}

/** Tag this chapter, or why it cannot be tagged, in words a reader can act on. */
export function TagChapterAction({ chapter, gap, busy, onTag }: {
  chapter: Pick<HarnessChapter, 'tagging'>;
  gap: string | undefined;
  busy: boolean;
  onTag: () => void;
}) {
  if (gap) return <p className="mt-2 text-xs text-neutral-400" data-testid="tag-chapter-gap">{gap}</p>;
  return <LibraryButton type="button" size="sm" variant="ghost" disabled={busy} onClick={onTag}>
    {chapter.tagging ? 'Tag this chapter again' : 'Tag this chapter'}
  </LibraryButton>;
}

/**
 * World Info's Chapters: every committed chapter of the story, in order, each
 * with its tagging record and Tag this chapter. One chapter at a time; a
 * tagging replaces the chapter's tags and never touches a word of its prose.
 */
export function StoryChapters({ stories, storyId }: { stories: LibraryStories; storyId: string }) {
  const { state, controller, canGenerate } = stories;
  const [tagging, setTagging] = useState<string>();
  const [problem, setProblem] = useState<string>();
  if (!state || !findStory(state, storyId)) return null;
  const chapters = state.chapters.filter(chapter => chapter.storyId === storyId).sort((left, right) => left.chapterNumber - right.chapterNumber);
  const tag = async (chapterId: string) => {
    setTagging(chapterId);
    setProblem(undefined);
    try {
      await controller.retagChapter(storyId, chapterId);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'The chapter could not be tagged.');
    } finally {
      setTagging(undefined);
    }
  };
  return <section className="grid gap-3 text-left" data-testid="story-chapters" aria-label="Chapters">
    <p className="text-xs text-neutral-400">
      Every chapter and what the tagger made of it. Tagging a chapter again replaces its tags; its words never change.
      {!canGenerate && ' The writer cannot be reached here, so no chapter can be tagged now.'}
    </p>
    <ol className="grid gap-3">
      {chapters.map(chapter => <li key={chapter.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"
        data-testid="story-chapter" data-chapter-number={chapter.chapterNumber}>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200/55">Chapter {chapter.chapterNumber}</p>
        <h3 className="mt-1 font-display text-lg text-white">{chapter.title}</h3>
        <p className="mt-1 text-xs text-neutral-500">{chapter.metrics.wordCount.toLocaleString()} words · {chapter.metrics.paragraphCount.toLocaleString()} paragraphs</p>
        <ChapterTaggingRecord chapter={chapter} entries={state.codexEntries} />
        {canGenerate && <div className="mt-3">
          <TagChapterAction chapter={chapter} gap={controller.retagChapterGap(storyId, chapter.id)} busy={Boolean(tagging)}
            onTag={() => void tag(chapter.id)} />
        </div>}
      </li>)}
    </ol>
    {problem && <p role="alert" className="text-xs text-amber-200">{problem}</p>}
  </section>;
}
