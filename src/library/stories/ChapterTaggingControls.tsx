import { findStory, type CodexEntry, type HarnessChapter } from '@seihouse/sen/harness-generation';
import { NarrativeButton as LibraryButton } from '@seihouse/sen/presentation';
import { describeChapterTagging } from './chapterTagging';
import type { LibraryStories } from './useLibraryStories';

/**
 * A chapter's tagging record in words and Tag this chapter on any committed
 * chapter, for the Workshop's HARNESS workspace (a developer instrument). In
 * the app, tagging lives only in the author's world view in Create
 * (`AuthorWorldView`).
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
