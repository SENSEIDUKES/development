import { ChevronRight } from 'lucide-react';
import { findStory, type CodexEntry, type HarnessChapter } from '@seihouse/sen/harness-generation';
import { NarrativeButton as LibraryButton } from '@seihouse/sen/presentation';
import { describeChapterTagging } from './chapterTagging';
import type { LibraryStories } from './useLibraryStories';

/**
 * A chapter's tagging record in words and Tag this chapter on any committed
 * chapter (SENSEI, 2026-10-29, `docs/create-hub.md` phase B), for the Workshop's
 * HARNESS workspace, and World Info's Chapters list, the way into each
 * chapter's Studio page in the app. The page itself is `StudioChapterPage`.
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
 * a way into its Studio page (`StudioChapterPage`), with one line saying
 * whether the tagger has read it and what it found.
 */
export function StoryChapterList({ stories, storyId, onOpen }: {
  stories: LibraryStories;
  storyId: string;
  /** Opens a chapter's Studio page. Without it the list only tells. */
  onOpen?: (chapterNumber: number) => void;
}) {
  const { state } = stories;
  if (!state || !findStory(state, storyId)) return null;
  const chapters = state.chapters.filter(chapter => chapter.storyId === storyId).sort((left, right) => left.chapterNumber - right.chapterNumber);
  return <ol className="grid gap-2 text-left" data-testid="story-chapters" aria-label="Chapters">
    {chapters.map(chapter => {
      const account = describeChapterTagging(chapter, { entries: state.codexEntries });
      const found = account.kinds.filter(line => line.state === 'found').map(line => line.kind);
      const line = account.status === 'tagged' ? (found.length ? `Tagged · ${found.join(', ')}` : 'Tagged · nothing found')
        : account.status === 'failed' ? 'The tagger could not read it' : 'Not tagged yet';
      const face = <>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200/55">Chapter {chapter.chapterNumber}</span>
          <span className="mt-0.5 block truncate font-display text-lg text-white">{chapter.title}</span>
          <span className="mt-0.5 block text-xs text-neutral-400" data-testid="story-chapter-line">{line}</span>
        </span>
        {onOpen && <ChevronRight size={20} aria-hidden="true" className="shrink-0 text-[#d4af37]" />}
      </>;
      return <li key={chapter.id} data-testid="story-chapter" data-chapter-number={chapter.chapterNumber}>
        {onOpen
          ? <button type="button" onClick={() => onOpen(chapter.chapterNumber)} aria-label={`Chapter ${chapter.chapterNumber}: ${chapter.title}`}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition-colors hover:border-white/25">{face}</button>
          : <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">{face}</div>}
      </li>;
    })}
  </ol>;
}
