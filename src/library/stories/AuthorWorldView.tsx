import { useMemo, useRef, useState, type ChangeEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { ArrowLeft, ChevronRight, LoaderCircle, Sparkles, Square } from 'lucide-react';
import { findStory, type HarnessChapter } from '@seihouse/sen/harness-generation';
import { LibraryButton, ManifestButton } from '@seihouse/library-ui';
import type { CreatorWorld } from '../../components/creator-space/shared/creatorSpaceContracts';
import { WorldCard } from '../../components/world-card/development/WorldCard';
import { useLibraryAssets } from '../assets';
import { AuthorChapterView } from './AuthorChapterView';
import { describeChapterTagging, storyTaggingSummary } from './chapterTagging';
import { StoryBlueprintPage } from './StoryBlueprint';
import { StorySettings } from './settings/StorySettings';
import type { LibraryStories } from './useLibraryStories';

/**
 * The author's world view (SENSEI, 2026-10-30): what a world opens to when
 * its author taps it under Your worlds in Create. The author's tool, iTunes
 * plain: the author's worlds as mini world cards (a column on a laptop, a row
 * on a phone), a medium switcher (Novel; Sequential Art later), and the chosen
 * world's Blueprint, Chapters, Codex and Assets. Tagging lives here and
 * nowhere else: a reader never sees any of it.
 */

export type AuthorWorldTab = 'blueprint' | 'chapters' | 'codex' | 'assets';

const TABS: ReadonlyArray<{ id: AuthorWorldTab; label: string }> = [
  { id: 'blueprint', label: 'Blueprint' },
  { id: 'chapters', label: 'Chapters' },
  { id: 'codex', label: 'Codex' },
  { id: 'assets', label: 'Assets' },
];

/** Library art for a world with no cover yet, the same pick Create's row makes. */
function fallbackCover(id: string, images: readonly string[]) {
  if (!images.length) return undefined;
  let hash = 0;
  for (const letter of id) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
  return images[hash % images.length];
}

export function AuthorWorldView({ stories, worlds, storyId, chapterNumber, onChooseWorld, onOpenChapter, onCloseChapter, onBack }: {
  stories: LibraryStories;
  /** Every world the author has, as Create's Your worlds shows them. */
  worlds: readonly CreatorWorld[];
  /** The chosen world. */
  storyId: string;
  /** A chapter opened from the Chapters tab. */
  chapterNumber?: number;
  onChooseWorld: (storyId: string) => void;
  onOpenChapter: (chapterNumber: number) => void;
  onCloseChapter: () => void;
  /** Back to Create. */
  onBack: () => void;
}) {
  const { homeImages = [] } = useLibraryAssets();
  const [tab, setTab] = useState<AuthorWorldTab>('chapters');
  const shown = chapterNumber ? 'chapters' : tab;
  const world = worlds.find(entry => entry.id === storyId);

  return <div className="mx-auto w-full max-w-7xl" data-testid="author-world" data-world={storyId}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <LibraryButton variant="ghost" size="icon" icon={ArrowLeft} aria-label="Back to Create" onClick={onBack} className="shrink-0" />
      {/* The medium: Novel today; Sequential Art once it exists. */}
      <div role="group" aria-label="Medium" className="flex rounded-full border border-white/15 bg-black/30 p-1 text-sm" data-testid="author-world-medium">
        <button type="button" aria-pressed="true" className="min-h-9 rounded-full bg-white/10 px-4 font-medium text-white">Novel</button>
        <button type="button" aria-pressed="false" disabled title="Coming later"
          className="min-h-9 rounded-full px-4 text-neutral-500">Sequential Art</button>
      </div>
    </div>

    <div className="mt-5 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <nav aria-label="Worlds" className="lg:sticky lg:top-24">
        <p className="mb-2 hidden font-sc text-[0.625rem] font-bold uppercase tracking-[0.25em] text-[#d4af37] lg:block">Worlds</p>
        <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:max-h-[calc(100dvh-9rem)] lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:px-0"
          data-testid="author-world-worlds">
          {worlds.map(entry => {
            const cover = entry.imageUrl ?? fallbackCover(entry.id, homeImages);
            return <li key={entry.id} className="w-28 shrink-0 lg:w-full" data-world-id={entry.id} aria-current={entry.id === storyId ? 'true' : undefined}>
              <WorldCard face="compact" world={entry} cover={cover} fallbackCover={!entry.imageUrl}
                selected={entry.id === storyId} onOpen={() => onChooseWorld(entry.id)} />
            </li>;
          })}
        </ul>
      </nav>

      <section className="mt-4 min-w-0 lg:mt-0" aria-label={world?.title ?? 'World'}>
        <h1 className="font-display text-2xl text-white sm:text-3xl">{world?.title}</h1>
        <div role="tablist" aria-label="This world" className="mt-3 flex gap-1 overflow-x-auto border-b border-white/10" data-testid="author-world-tabs">
          {TABS.map(entry => <button key={entry.id} type="button" role="tab" aria-selected={shown === entry.id}
            onClick={() => { setTab(entry.id); if (chapterNumber) onCloseChapter(); }}
            className={`min-h-11 shrink-0 border-b-2 px-4 text-sm transition-colors ${shown === entry.id ? 'border-[#d4af37] text-white' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}>
            {entry.label}
          </button>)}
        </div>
        <div className="mt-5" role="tabpanel" aria-label={TABS.find(entry => entry.id === shown)!.label}>
          {shown === 'chapters' && (chapterNumber
            ? <AuthorChapterView stories={stories} storyId={storyId} chapterNumber={chapterNumber} onBack={onCloseChapter} />
            : <ChapterTable key={storyId} stories={stories} storyId={storyId} onOpenChapter={onOpenChapter} />)}
          {shown === 'blueprint' && <WorldBlueprint stories={stories} storyId={storyId} />}
          {shown === 'codex' && <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-neutral-300" data-testid="author-world-codex">
            Coming soon: every card and every picture of this world, all in one place, ahead of what a reader has reached.
          </p>}
          {shown === 'assets' && <StorySettings stories={stories} storyId={storyId} only="assets" />}
        </div>
      </section>
    </div>
  </div>;
}

/** The world's Blueprint, or a plain note when the world has none (an imported novel, or one begun from a premise). */
function WorldBlueprint({ stories, storyId }: { stories: LibraryStories; storyId: string }) {
  const { state } = stories;
  const story = state ? findStory(state, storyId) : undefined;
  const input = state && story ? state.foundations.find(entry => entry.id === story.activeFoundationRevisionId)?.input : undefined;
  if (input?.sourceSnapshot?.kind !== 'story-seed' || !input.sourceSnapshot.blueprint) {
    return <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-neutral-300" data-testid="author-world-no-blueprint">
      This world has no Blueprint. An imported novel doesn&rsquo;t have one, and neither does a novel begun from a premise.
    </p>;
  }
  return <StoryBlueprintPage stories={stories} storyId={storyId} access={{ view: 'creator' }} />;
}

type RowState = { label: string; tone: 'done' | 'quiet' | 'warn' | 'busy' };

const rowState = (chapter: HarnessChapter, current: boolean, queued: boolean): RowState => {
  if (current) return { label: 'Reading…', tone: 'busy' };
  if (queued) return { label: 'Waiting', tone: 'quiet' };
  if (!chapter.tagging) return { label: 'Not yet', tone: 'quiet' };
  return chapter.tagging.status === 'tagged' ? { label: 'Tagged', tone: 'done' } : { label: 'Not read', tone: 'warn' };
};

/**
 * The world's chapters as an iTunes list: check the ones to tag (shift-click
 * for a run, the header box for all), then Tag reads them in order, one call
 * each, and every row changes as its chapter lands. Stop finishes the chapter
 * being read and tags no more. Double-click a row, or its arrow, to open it.
 */
function ChapterTable({ stories, storyId, onOpenChapter }: { stories: LibraryStories; storyId: string; onOpenChapter: (chapterNumber: number) => void }) {
  const { state, controller, canGenerate } = stories;
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [anchor, setAnchor] = useState<number>();
  const [run, setRun] = useState<{ queue: readonly string[]; current?: string }>();
  const [problem, setProblem] = useState<string>();
  const stop = useRef(false);
  const chapters = useMemo(() => (state?.chapters ?? []).filter(chapter => chapter.storyId === storyId)
    .sort((left, right) => left.chapterNumber - right.chapterNumber), [state, storyId]);
  if (!state) return null;
  if (!chapters.length) return <p className="text-sm text-neutral-400" data-testid="author-world-no-chapters">This world has no chapters yet.</p>;

  const gapOf = (chapter: HarnessChapter) => (canGenerate ? controller.retagChapterGap(storyId, chapter.id) : 'The tagger cannot be reached here right now.');
  const taggable = chapters.filter(chapter => !gapOf(chapter));
  const running = Boolean(run);
  const chosen = chapters.filter(chapter => selected.has(chapter.id));
  const allChosen = taggable.length > 0 && taggable.every(chapter => selected.has(chapter.id));

  const choose = (index: number, extend: boolean) => {
    if (running) return;
    const chapter = chapters[index];
    if (gapOf(chapter)) return;
    setSelected(current => {
      const next = new Set(current);
      if (extend && anchor !== undefined) {
        const [from, to] = anchor < index ? [anchor, index] : [index, anchor];
        for (const entry of chapters.slice(from, to + 1)) if (!gapOf(entry)) next.add(entry.id);
      } else if (next.has(chapter.id)) next.delete(chapter.id);
      else next.add(chapter.id);
      return next;
    });
    setAnchor(index);
  };
  const chooseAll = () => { if (!running) setSelected(allChosen ? new Set() : new Set(taggable.map(chapter => chapter.id))); };

  const tag = async () => {
    const queue = chosen.map(chapter => chapter.id);
    if (!queue.length) return;
    stop.current = false;
    setProblem(undefined);
    setRun({ queue });
    for (const id of queue) {
      if (stop.current) break;
      setRun({ queue, current: id });
      try {
        await controller.retagChapter(storyId, id);
      } catch (error) {
        setProblem(error instanceof Error ? error.message : 'A chapter could not be tagged.');
        break;
      }
      setSelected(current => { const next = new Set(current); next.delete(id); return next; });
    }
    setRun(undefined);
  };

  const done = run ? run.queue.indexOf(run.current ?? '') : -1;
  return <div data-testid="author-world-chapters">
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {running
        ? <>
            <p className="text-sm text-neutral-200" role="status" data-testid="author-world-tagging">
              <LoaderCircle size={16} aria-hidden="true" className="me-2 inline animate-spin align-[-3px] text-cyan-200" />
              Tagging {Math.max(done, 0) + 1} of {run!.queue.length}
            </p>
            <LibraryButton variant="secondary" size="sm" icon={Square} onClick={() => { stop.current = true; }}>Stop</LibraryButton>
          </>
        : <>
            <ManifestButton size="md" icon={Sparkles} disabled={!chosen.length} onClick={() => void tag()}>
              {chosen.length ? `Tag ${chosen.length === 1 ? '1 chapter' : `${chosen.length} chapters`}` : 'Tag'}
            </ManifestButton>
            <p className="text-xs text-neutral-400" data-testid="author-world-cost">
              {chosen.length
                ? `${chosen.length === 1 ? 'One tagging call' : `${chosen.length} tagging calls`}, one per chapter. Energy for tagging isn’t priced yet.`
                : canGenerate ? 'Check the chapters to tag.' : 'The tagger cannot be reached here right now.'}
            </p>
          </>}
    </div>
    {problem && <p role="alert" className="mt-3 text-sm text-amber-200">{problem}</p>}

    <table className="mt-4 w-full table-fixed border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-white/10 text-xs text-neutral-500">
          <th scope="col" className="w-9 py-2 ps-2 font-normal">
            <input type="checkbox" aria-label="Choose every chapter" className="h-4 w-4 accent-[#d4af37]"
              checked={allChosen} disabled={running || !taggable.length}
              ref={element => { if (element) element.indeterminate = !allChosen && chosen.length > 0; }}
              onChange={chooseAll} />
          </th>
          <th scope="col" className="w-8 py-2 font-normal">#</th>
          <th scope="col" className="py-2 font-normal">Title</th>
          <th scope="col" className="hidden w-20 py-2 pe-4 text-right font-normal sm:table-cell">Words</th>
          <th scope="col" className="w-20 py-2 pe-1 text-right font-normal">Tagging</th>
          <th scope="col" className="w-9"><span className="sr-only">Open</span></th>
        </tr>
      </thead>
      <tbody>
        {chapters.map((chapter, index) => {
          const gap = gapOf(chapter);
          const checked = selected.has(chapter.id);
          const status = rowState(chapter, run?.current === chapter.id, Boolean(run?.queue.includes(chapter.id) && run.current !== chapter.id && run.queue.indexOf(chapter.id) > done));
          const found = chapter.tagging?.status === 'tagged'
            ? describeChapterTagging(chapter, { entries: state.codexEntries }).kinds.filter(line => line.state === 'found').map(line => line.kind)
            : [];
          return <tr key={chapter.id} data-testid="author-world-chapter" data-chapter-number={chapter.chapterNumber} data-checked={checked ? 'true' : 'false'}
            className={`border-b border-white/5 transition-colors ${checked ? 'bg-[#d4af37]/[0.08]' : 'hover:bg-white/[0.03]'} ${gap ? '' : 'cursor-pointer'}`}
            onClick={(event: ReactMouseEvent) => choose(index, event.shiftKey)}
            onDoubleClick={() => onOpenChapter(chapter.chapterNumber)}>
            <td className="py-2.5 ps-2 align-top">
              <input type="checkbox" aria-label={`Chapter ${chapter.chapterNumber}: ${chapter.title}`} className="h-4 w-4 accent-[#d4af37]"
                checked={checked} disabled={Boolean(gap) || running}
                onClick={event => event.stopPropagation()}
                onChange={(event: ChangeEvent<HTMLInputElement>) => choose(index, (event.nativeEvent as MouseEvent).shiftKey === true)} />
            </td>
            <td className="py-2.5 align-top tabular-nums text-neutral-500">{chapter.chapterNumber}</td>
            <td className="min-w-0 py-2.5 pe-2 align-top">
              <span className="block truncate text-neutral-100">{chapter.title}</span>
              {gap
                ? <span className="block text-xs text-neutral-500">{gap}</span>
                : found.length > 0 && <span className="block truncate text-xs text-neutral-500">{found.join(' · ')}</span>}
            </td>
            <td className="hidden py-2.5 pe-4 text-right align-top tabular-nums text-neutral-400 sm:table-cell">{chapter.metrics.wordCount.toLocaleString()}</td>
            <td className={`py-2.5 pe-1 text-right align-top text-xs ${status.tone === 'done' ? 'text-emerald-200/80' : status.tone === 'warn' ? 'text-amber-200' : status.tone === 'busy' ? 'text-cyan-200' : 'text-neutral-500'}`}
              data-testid="author-world-chapter-state">{status.label}</td>
            <td className="py-1.5 align-top">
              <button type="button" aria-label={`Open Chapter ${chapter.chapterNumber}`} className="ms-auto grid h-9 w-9 place-items-center text-[#d4af37] hover:text-white"
                onClick={event => { event.stopPropagation(); onOpenChapter(chapter.chapterNumber); }}>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </td>
          </tr>;
        })}
      </tbody>
    </table>
    <p className="mt-3 text-xs text-neutral-500" data-testid="author-world-summary">{storyTaggingSummary(chapters)}</p>
  </div>;
}
