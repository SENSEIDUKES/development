import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Circle, CircleDot, GitBranch, ListOrdered, Minus } from 'lucide-react';
import { LibraryButton } from '@seihouse/library-ui';
import { SEIDialog, SEIDialogContent, SEIDialogDescription, SEIDialogTitle, useOverlayScrollbar } from '@seihouse/ui';
import type { WorldInfoArc, WorldInfoBranch, WorldInfoChapter } from '../shared/worldCardContracts';
import { buildChapterMap, type ChapterMapGoal, type ChapterMapPage, type ChapterMapRow, type ChapterMapSection } from './worldCardChapterMap';
import { authorText } from './worldCardText';

/** How far a finger must travel sideways before the page turns. */
const SWIPE_PX = 40;

/**
 * World Info's chapter selector: the whole book as a reading map, in pages. The button sits
 * beside the reading pill; it opens on the reader's own page. Each page holds a fixed run of
 * chapters (Ch. 1–10) with the goals and branch point that fall in it, under its arc's header
 * (the reader's progress through the arc, its goals reached). A swipe sideways, the arrow buttons
 * or the arrow keys turn the page; the arc header steps between arcs. A branched world draws its
 * path: the main story's chapters, the chapter it branched at, and the branch's own chapters
 * after. A tap on any chapter opens it in the Reader. Chapter titles are the author's words, in
 * the world's language.
 */
export function WorldCardChapters({ title, chapters, arcs, branch, readingChapter, language, onOpenChapter }: {
  /** The title the reader sees, for the button's and the list's names. */
  title: string;
  chapters: readonly WorldInfoChapter[];
  arcs?: readonly WorldInfoArc[];
  branch?: WorldInfoBranch;
  /** The reader's place, marked in the list. */
  readingChapter?: number;
  /** The world's original language, the language its chapter titles are written in. */
  language?: string;
  onOpenChapter: (chapterNumber: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const sections = buildChapterMap({ chapters, arcs, branch, readingChapter });
  const pages = sections.flatMap(section => section.pages.map((page, index) => ({ section, page, index })));
  // The book opens on the reader's own page; without one, at the first arc they have not finished.
  const openingPage = () => {
    const reading = pages.findIndex(entry => entry.page.rows.some(row => row.kind === 'chapter' && row.reading));
    if (reading >= 0) return reading;
    const unfinished = pages.findIndex(entry => !entry.section.complete);
    return Math.max(0, unfinished);
  };
  const [pageIndex, setPageIndex] = useState(0);
  const at = Math.min(pageIndex, Math.max(0, pages.length - 1));
  const current = pages[at];
  const turn = (step: number) => setPageIndex(Math.min(Math.max(0, at + step), pages.length - 1));
  // The arcs, each reached at its first page.
  const arcStarts = sections.filter(section => section.arc).map(section => pages.findIndex(entry => entry.section === section));
  const arcAt = current ? arcStarts.findIndex(start => pages[start]?.section === current.section) : -1;

  // A turned page takes away the row that had focus; focus stays on the page, so the keys keep turning it.
  const list = useRef<HTMLDivElement>(null);
  // The Library's own gold overlay scrollbar, for a page too long for a short screen.
  const scroller = useOverlayScrollbar<HTMLDivElement>({ fades: true }, list);
  useEffect(() => {
    const page = list.current;
    if (!open || !page) return;
    const popup = page.closest('.world-card-chapters');
    if (!popup?.contains(document.activeElement) || document.activeElement === popup) page.focus({ preventScroll: true });
  }, [open, at]);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const onPointerDown = (event: PointerEvent) => {
    swiped.current = false;
    swipeStart.current = event.pointerType === 'mouse' ? null : { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    // A sideways swipe turns the page; a mostly vertical one is not a swipe.
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(event.clientY - start.y)) return;
    swiped.current = true;
    // Pages run in the reading direction, so a right-to-left page swipes the other way.
    const forward = getComputedStyle(event.currentTarget).direction === 'rtl' ? dx > 0 : dx < 0;
    turn(forward ? 1 : -1);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    turn((event.key === 'ArrowRight') !== rtl ? 1 : -1);
  };
  const count = chapters.length;

  return <>
    <LibraryButton variant="secondary" size="lg" icon={ListOrdered} className="world-card-info-chapters-button"
      aria-label={`Chapters: ${title}`} aria-haspopup="dialog" title="Chapters"
      onClick={() => { setPageIndex(openingPage()); setOpen(true); }}>
      <span className="world-card-info-chapters-label">Chapters</span>
    </LibraryButton>
    <SEIDialog open={open} onOpenChange={next => setOpen(next)}>
    {/* The panel is the Library's Violet inset material, with the Library's gold scrollbar. */}
    <SEIDialogContent variant="dark" aria-modal="true" data-library-material="violet-card"
      className="world-card-chapters library-material-scope reader-border-glow library-scrollbars"
      bodyClassName="world-card-chapters-body" onKeyDown={onKeyDown}>
      <SEIDialogTitle className="world-card-chapters-title">Chapters</SEIDialogTitle>
      {/* Few numbers: the page says where you are, the path says the rest. */}
      <SEIDialogDescription className="world-card-chapters-count sr-only">
        {count.toLocaleString()} {count === 1 ? 'chapter' : 'chapters'}
        {arcs && arcs.length > 0 && <> · {arcs.length} {arcs.length === 1 ? 'arc' : 'arcs'}</>}
      </SEIDialogDescription>
      {branch && <p className="world-card-chapters-lineage">
        <GitBranch aria-hidden="true" />
        <span>{branch.yours ? 'Your branch of ' : 'Branched from '}<cite {...authorText(language)}>{branch.fromTitle}</cite></span>
      </p>}
      {current && <section className="world-card-chapters-arc" data-path={current.section.path}
        data-complete={current.section.complete ? 'true' : undefined}>
        <PageHeader section={current.section} page={current.page}
          onPrevious={arcAt > 0 ? () => setPageIndex(arcStarts[arcAt - 1]) : undefined}
          onNext={arcAt >= 0 && arcAt < arcStarts.length - 1 ? () => setPageIndex(arcStarts[arcAt + 1]) : undefined}
          stepper={arcStarts.length > 1} />
        <div key={current.page.key} ref={scroller} tabIndex={-1} className="world-card-chapters-list"
          onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { swipeStart.current = null; }}
          // A swipe ends on a chapter; it must not also open it.
          onClickCapture={event => { if (swiped.current) { swiped.current = false; event.preventDefault(); event.stopPropagation(); } }}>
          <ol className="world-card-chapters-rows" aria-label={`Chapters ${current.page.firstChapter} to ${current.page.lastChapter} of ${title}`}>
            {current.page.rows.map(row => <Row key={row.key} row={row} language={language}
              onOpen={number => { setOpen(false); onOpenChapter(number); }} />)}
          </ol>
        </div>
        <Pager section={current.section} index={current.index}
          onPrevious={at > 0 ? () => turn(-1) : undefined} onNext={at < pages.length - 1 ? () => turn(1) : undefined}
 />
      </section>}
    </SEIDialogContent>
    </SEIDialog>
  </>;
}

/**
 * The page's header, kept to a glance: its arc, the chapters on this page (Ch. 41–50), whether the
 * reader is in this arc or has finished it, and a step to the arc before or after. A book without
 * arcs shows the page's chapters alone.
 */
function PageHeader({ section, page, stepper, onPrevious, onNext }: {
  section: ChapterMapSection; page: ChapterMapPage; stepper: boolean; onPrevious?: () => void; onNext?: () => void;
}) {
  const arc = section.arc;
  return <header className="world-card-chapters-arc-header">
    <h3 className="world-card-chapters-arc-title">
      {arc && <span className="world-card-chapters-arc-name">Arc {arc.number}</span>}
      <span className="world-card-chapters-place-range" aria-live="polite">Ch. {page.firstChapter}–{page.lastChapter}</span>
      <span className="sr-only">{section.read} of {section.length} chapters read{section.goals > 0 && `, ${section.goalsDone} of ${section.goals} goals`}</span>
      {section.complete
        ? <span className="world-card-chapters-arc-state" data-state="complete"><Check aria-hidden="true" />Complete</span>
        : arc && section.holdsReader && <span className="world-card-chapters-arc-state" data-state="reading">Reading</span>}
    </h3>
    {stepper && <div className="world-card-chapters-arc-step">
      <button type="button" aria-label="Previous arc" disabled={!onPrevious} onClick={onPrevious}><ChevronsLeft aria-hidden="true" /></button>
      <button type="button" aria-label="Next arc" disabled={!onNext} onClick={onNext}><ChevronsRight aria-hidden="true" /></button>
    </div>}
  </header>;
}

/** The page turner at the foot: back, one bar that fills as the reader moves through the arc's pages, forward. */
function Pager({ section, index, onPrevious, onNext }: {
  section: ChapterMapSection; index: number; onPrevious?: () => void; onNext?: () => void;
}) {
  const total = section.pages.length;
  const percent = Math.round(((index + 1) / total) * 100);
  const where = section.arc ? ` of Arc ${section.arc.number}` : '';
  return <nav className="world-card-chapters-pager" aria-label="Chapter pages">
    <button type="button" className="world-card-chapters-turn" aria-label="Previous page" disabled={!onPrevious} onClick={onPrevious}>
      <ChevronLeft aria-hidden="true" />
    </button>
    {/* The same bar as the Familiar's bond: it fills as the pages turn. */}
    <div className="world-card-chapters-progress" role="progressbar" aria-label={`Page ${index + 1} of ${total}${where}`}
      aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1}>
      <span style={{ width: `${percent}%` }} />
    </div>
    <button type="button" className="world-card-chapters-turn" aria-label="Next page" disabled={!onNext} onClick={onNext}>
      <ChevronRight aria-hidden="true" />
    </button>
  </nav>;
}

const GOAL_LABEL: Record<ChapterMapGoal['status'], string> = {
  reached: 'Goal reached', missed: 'Goal missed', current: 'Current goal', ahead: 'Goal ahead',
};
const GOAL_ICON = { reached: Check, missed: Minus, current: CircleDot, ahead: Circle };

/** Where a goal falls, for screen readers; on screen its place on the path says it. */
function goalWhere(goal: ChapterMapGoal) {
  if (goal.resolved) return `Chapter ${goal.resolved.chapterNumber}`;
  if (goal.status === 'current') return `by Chapter ${goal.endChapter}`;
  return goal.startChapter === goal.endChapter ? `Chapter ${goal.endChapter}` : `Chapters ${goal.startChapter} to ${goal.endChapter}`;
}

function Row({ row, language, onOpen }: { row: ChapterMapRow; language?: string; onOpen: (chapterNumber: number) => void }) {
  if (row.kind === 'fork') return <li className="world-card-chapters-fork" data-path="branch">
    <span className="world-card-chapters-rail" aria-hidden="true"><GitBranch /></span>
    <span className="world-card-chapters-fork-text">
      <strong>{row.branch.yours ? 'You branched here' : 'The branch begins'}</strong>
      <span>From <cite {...authorText(language)}>{row.branch.fromTitle}</cite></span>
    </span>
  </li>;
  if (row.kind === 'goal') {
    const Icon = GOAL_ICON[row.goal.status];
    return <li className="world-card-chapters-goal" data-status={row.goal.status}>
      <span className="world-card-chapters-rail" aria-hidden="true"><Icon /></span>
      <span className="world-card-chapters-goal-text">
        <span className="world-card-chapters-goal-label">{GOAL_LABEL[row.goal.status]}<span className="sr-only">, {goalWhere(row.goal)}</span></span>
        {/* A goal ahead keeps its words until the reader gets there: the map never spoils the story. */}
        {row.goal.status === 'ahead'
          ? <span className="world-card-chapters-goal-hidden">Revealed when you get there</span>
          : <span {...authorText(language)}>{row.goal.text}</span>}
      </span>
    </li>;
  }
  const { chapter, read, reading, path } = row;
  const chapterTitle = chapter.title?.trim();
  return <li data-path={path}>
    <button type="button" className="world-card-chapters-row" onClick={() => onOpen(chapter.number)}
      aria-current={reading ? 'true' : undefined} data-read={read ? 'true' : undefined}
      aria-label={`Chapter ${chapter.number}${chapterTitle ? `: ${chapterTitle}` : ''}${reading ? ', where you are reading' : read ? ', read' : ''}`}>
      <span className="world-card-chapters-rail" aria-hidden="true"><span className="world-card-chapters-dot" /></span>
      <span className="world-card-chapters-number" aria-hidden="true">{chapter.number}</span>
      <span className="world-card-chapters-name" aria-hidden="true">
        {chapterTitle ? <span {...authorText(language)}>{chapterTitle}</span> : <span className="world-card-chapters-untitled">Untitled</span>}
      </span>
      {reading && <span className="world-card-chapters-reading" aria-hidden="true">Reading</span>}
    </button>
  </li>;
}
