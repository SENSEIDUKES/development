import { useMemo, useState } from 'react';
import { ArrowLeft, LoaderCircle, Sparkles } from 'lucide-react';
import { findStory } from '@seihouse/sen/harness-generation';
import { HighlightEngine } from '@seihouse/sen/highlight-engine';
import { LibraryButton, ManifestButton } from '@seihouse/library-ui';
import { CHAPTER_TAGGING_KINDS, chapterBlocks, chapterTagMarks, describeChapterTagging, type ChapterTaggingKind } from './chapterTagging';
import type { LibraryStories } from './useLibraryStories';

/**
 * A chapter in the world's Studio (SENSEI, 2026-10-29, `docs/create-hub.md`
 * phase B): the chapter's own prose with its tags lit where they landed, the
 * tagger's findings beside it, one kind per line, and Tag this chapter. Each
 * finding is a switch that lights its kind alone, so a Sound Cue, a speaker
 * or a holding is found at a glance. The prose is never editable here.
 */

const keepProse = () => undefined;
const ALL_KINDS: ReadonlySet<ChapterTaggingKind> = new Set(CHAPTER_TAGGING_KINDS.map(entry => entry.kind));

export function StudioChapterPage({ stories, storyId, chapterNumber, onBack }: {
  stories: LibraryStories;
  storyId: string;
  chapterNumber: number;
  /** Back to the world's Story View. */
  onBack: () => void;
}) {
  const { state, controller, canGenerate } = stories;
  const [shown, setShown] = useState<ReadonlySet<ChapterTaggingKind>>(ALL_KINDS);
  const [tagging, setTagging] = useState(false);
  const [problem, setProblem] = useState<string>();
  const story = state ? findStory(state, storyId) : undefined;
  const chapter = state?.chapters.find(entry => entry.storyId === storyId && entry.chapterNumber === chapterNumber);
  const chapters = useMemo(() => state?.chapters.filter(entry => entry.storyId === storyId).sort((left, right) => left.chapterNumber - right.chapterNumber) ?? [], [state, storyId]);
  const account = useMemo(() => chapter && describeChapterTagging(chapter, { entries: state?.codexEntries }), [chapter, state?.codexEntries]);
  const blocks = useMemo(() => (chapter ? chapterBlocks(chapter) : []), [chapter]);
  const overlay = useMemo(() => (chapter ? { marks: chapterTagMarks(chapter, shown) } : undefined), [chapter, shown]);
  if (!state || !story || !chapter || !account) {
    return <div className="mx-auto max-w-3xl px-4 py-6">
      <LibraryButton variant="ghost" size="icon" icon={ArrowLeft} aria-label="Back to World Info" onClick={onBack} />
      <p role="alert" className="mt-4 text-sm text-amber-200">This chapter is not here.</p>
    </div>;
  }
  const gap = canGenerate ? controller.retagChapterGap(storyId, chapter.id) : 'The writer cannot be reached here, so the chapter cannot be tagged now.';
  const tag = async () => {
    setTagging(true);
    setProblem(undefined);
    try {
      await controller.retagChapter(storyId, chapter.id);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'The chapter could not be tagged.');
    } finally {
      setTagging(false);
    }
  };
  const toggle = (kind: ChapterTaggingKind) => setShown(current => {
    const next = new Set(current);
    if (next.has(kind)) next.delete(kind); else next.add(kind);
    return next;
  });
  const position = chapters.findIndex(entry => entry.id === chapter.id);
  const marks = overlay?.marks.length ?? 0;
  const status = account.status === 'tagged' ? `${marks === 1 ? '1 mark' : `${marks.toLocaleString()} marks`} on the page`
    : account.status === 'failed' ? 'The tagger could not read this chapter' : 'Not tagged yet';

  return <div className="mx-auto max-w-6xl" data-testid="studio-chapter" data-chapter-number={chapter.chapterNumber} data-tagging-status={account.status}>
    {/* The way back, and the page's name, as World Info names itself. */}
    <div className="flex items-center justify-between gap-3">
      <LibraryButton variant="ghost" size="icon" icon={ArrowLeft} aria-label="Back to World Info" onClick={onBack} className="shrink-0" />
      <p className="flex min-w-0 items-center gap-2 font-sc text-[0.625rem] font-bold uppercase tracking-[0.25em] whitespace-nowrap text-[#d4af37] sm:text-xs sm:tracking-[0.3em]" aria-hidden="true">
        Studio
        <span className="hidden items-center min-[360px]:flex"><span className="h-1.5 w-1.5 rotate-45 border border-[#d4af37]" /><span className="h-px w-6 bg-[#d4af37]/80 sm:w-12" /></span>
      </p>
    </div>

    <header className="mt-6 sm:mt-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200/60">Chapter {chapter.chapterNumber} of {chapters.length}</p>
      <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">{chapter.title}</h1>
      <p className="mt-2 text-sm text-neutral-400" data-testid="studio-chapter-status">{status}</p>
    </header>

    {/* The one action, then the findings, then the chapter: on a wide page the findings stand beside the prose. */}
    <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-10">
      <aside className="lg:sticky lg:top-24 lg:order-2" aria-label="What the tagger found">
        <div className="flex flex-col items-start gap-2">
          {gap
            ? <p className="text-sm text-neutral-400" data-testid="tag-chapter-gap">{gap}</p>
            : <ManifestButton size="lg" icon={tagging ? LoaderCircle : Sparkles} disabled={tagging} onClick={() => void tag()} aria-busy={tagging}>
                {tagging ? 'Reading the chapter…' : chapter.tagging ? 'Tag this chapter again' : 'Tag this chapter'}
              </ManifestButton>}
          {problem && <p role="alert" className="text-sm text-amber-200">{problem}</p>}
        </div>

        <ul className="mt-5 flex flex-wrap gap-2 lg:flex-col lg:gap-1.5" data-testid="studio-chapter-findings">
          {account.kinds.length ? account.kinds.map(line => {
            const { tone } = CHAPTER_TAGGING_KINDS.find(entry => entry.kind === line.kind)!;
            const on = line.state === 'found' && shown.has(line.kind);
            const quiet = line.state !== 'found';
            return <li key={line.kind} className="min-w-0 max-w-full">
              <button type="button" aria-pressed={line.state === 'found' ? on : undefined} disabled={quiet} onClick={() => toggle(line.kind)}
                data-tagging-kind={line.kind} data-tagging-state={line.state}
                className={`flex w-full max-w-full items-start gap-3 rounded-2xl border px-3 py-2 text-left transition-colors ${quiet ? 'border-white/5 text-neutral-500' : on ? 'border-white/20 bg-white/[0.04] text-neutral-100' : 'border-white/10 text-neutral-400 hover:border-white/20'}`}>
                <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-white/15 ${quiet || !on ? 'opacity-30' : ''}`} style={{ background: tone }} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{line.kind}</span>
                  <span className="block text-xs leading-snug text-current opacity-80">{line.state === 'found' ? line.said : line.state === 'nothing' ? 'Nothing found' : line.state === 'not-asked' ? 'Nothing equipped' : line.said}</span>
                </span>
              </button>
            </li>;
          }) : <li className="text-sm text-neutral-500">{account.status === 'failed' ? account.problem : 'Tag this chapter to see what the tagger finds.'}</li>}
        </ul>

        <details className="mt-5 text-xs text-neutral-400" data-testid="studio-chapter-record">
          <summary className="cursor-pointer text-neutral-500">{account.headline}</summary>
          <div className="mt-2 space-y-1">
            {account.notes && <p>{account.notes}</p>}
            {account.problem && <p className="text-amber-200">{account.problem}</p>}
            {account.problems.length > 0 && <ul className="list-disc space-y-1 pl-4">{account.problems.map((entry, index) => <li key={index}>{entry}</li>)}</ul>}
          </div>
        </details>
      </aside>

      <article className="mt-8 min-w-0 lg:order-1 lg:mt-0" lang={story.originalLanguage} data-testid="studio-chapter-prose">
        <HighlightEngine blocks={blocks} onBlocksChange={keepProse} editable={false} locale={story.originalLanguage} overlay={overlay}
          className="max-w-[38em] font-serif text-[1.0625rem] leading-[1.8] text-neutral-200" />
      </article>
    </div>
  </div>;
}
