import type { WorldInfoArc, WorldInfoArcGoal, WorldInfoBranch, WorldInfoChapter } from '../shared/worldCardContracts';

/**
 * How a goal reads to this reader. A goal the story reached shows as reached only once the reader
 * has read the chapter that reached it; until then it is the goal they are heading for (`current`)
 * or one still `ahead`, so the map never spoils the story.
 */
export type ChapterMapGoalStatus = 'reached' | 'missed' | 'current' | 'ahead';

export interface ChapterMapGoal extends WorldInfoArcGoal {
  key: string;
  status: ChapterMapGoalStatus;
}

/**
 * Which path a chapter belongs to: the main story, or a branch from the chapter it branched at.
 * Every chapter is on the main path until a branch begins; the map colors each path its own way.
 */
export type ChapterMapPath = 'main' | 'branch';

export type ChapterMapRow =
  | { kind: 'chapter'; key: string; chapter: WorldInfoChapter; read: boolean; reading: boolean; path: ChapterMapPath }
  | { kind: 'goal'; key: string; goal: ChapterMapGoal }
  | { kind: 'fork'; key: string; branch: WorldInfoBranch };

/** How many chapters one page of the chapter map holds. */
export const CHAPTERS_PER_PAGE = 10;

/** One page of the map: a fixed run of chapters (Ch. 1–10), with the goals and fork that fall in it. */
export interface ChapterMapPage {
  key: string;
  firstChapter: number;
  lastChapter: number;
  rows: ChapterMapRow[];
}

export interface ChapterMapSection {
  key: string;
  /** Absent for chapters outside every arc (or a book without arcs). */
  arc?: WorldInfoArc;
  rows: ChapterMapRow[];
  /** The section's rows in pages of `CHAPTERS_PER_PAGE` chapters; only pages with something on them. */
  pages: ChapterMapPage[];
  /** Chapters of the arc the reader has read, out of the arc's length. */
  read: number;
  length: number;
  /** The reader has read every chapter of the arc. */
  complete: boolean;
  /** The reader's place is in this arc. */
  holdsReader: boolean;
  /** The path the arc's latest chapter is on, for its progress color. */
  path: ChapterMapPath;
  goalsDone: number;
  goals: number;
}

export function buildChapterMap({ chapters, arcs = [], branch, readingChapter }: {
  chapters: readonly WorldInfoChapter[];
  arcs?: readonly WorldInfoArc[];
  branch?: WorldInfoBranch;
  readingChapter?: number;
}): ChapterMapSection[] {
  const ordered = [...chapters].sort((left, right) => left.number - right.number);
  const written = new Set(ordered.map(chapter => chapter.number));
  const marked = new Set(ordered.filter(chapter => chapter.read).map(chapter => chapter.number));
  // Read: a chapter the reader has opened, and the one they are on.
  const isRead = (number: number) => written.has(number) && (marked.has(number) || number === readingChapter);
  const pathOf = (number: number): ChapterMapPath => branch && number >= branch.atChapter ? 'branch' : 'main';
  const sortedArcs = [...arcs].sort((left, right) => left.number - right.number);

  // Each goal as the reader knows it: the first goal not yet revealed as resolved is the current one.
  let currentGiven = false;
  const goalsByArc = new Map(sortedArcs.map(arc => [arc.number, arc.goals.map((goal, index): ChapterMapGoal => {
    const revealed = goal.resolved && isRead(goal.resolved.chapterNumber) ? goal.resolved : undefined;
    let status: ChapterMapGoalStatus = revealed ? revealed.outcome : 'ahead';
    if (!revealed && !currentGiven) { status = 'current'; currentGiven = true; }
    // A goal not yet revealed keeps its place in the plan, never where the story resolved it.
    return { ...goal, resolved: revealed, key: `goal-${arc.number}-${index}`, status };
  })]));

  const chapterRow = (chapter: WorldInfoChapter): ChapterMapRow => ({
    kind: 'chapter', key: `chapter-${chapter.number}`, chapter, read: isRead(chapter.number),
    reading: chapter.number === readingChapter, path: pathOf(chapter.number),
  });
  const forkRow = (): ChapterMapRow => ({ kind: 'fork', key: 'fork', branch: branch! });
  const forkBefore = (number: number) => branch !== undefined && number === branch.atChapter;

  const sections: ChapterMapSection[] = [];
  const placed = new Set<number>();
  for (const arc of sortedArcs) {
    const inArc = ordered.filter(chapter => chapter.number >= arc.firstChapter && chapter.number <= arc.lastChapter);
    const goals = goalsByArc.get(arc.number) ?? [];
    // A goal sits after the chapter that resolved it, or, while unresolved, after its last chapter;
    // a goal whose chapter is not written yet waits at the end of the arc.
    const anchor = (goal: ChapterMapGoal) => goal.resolved?.chapterNumber ?? goal.endChapter;
    const rows: PlacedRow[] = [];
    for (const chapter of inArc) {
      if (forkBefore(chapter.number)) rows.push({ at: chapter.number, row: forkRow() });
      rows.push({ at: chapter.number, row: chapterRow(chapter) });
      placed.add(chapter.number);
      for (const goal of goals) if (anchor(goal) === chapter.number) rows.push({ at: chapter.number, row: { kind: 'goal', key: goal.key, goal } });
    }
    // Goals whose chapters are not written yet wait after the last written one, on its page.
    const tail = inArc.at(-1)?.number ?? arc.firstChapter;
    for (const goal of goals) if (!written.has(anchor(goal))) rows.push({ at: tail, row: { kind: 'goal', key: goal.key, goal } });
    const length = arc.lastChapter - arc.firstChapter + 1;
    const read = inArc.filter(chapter => isRead(chapter.number)).length;
    sections.push({
      key: `arc-${arc.number}`, arc, rows: rows.map(placed => placed.row),
      pages: paginate(`arc-${arc.number}`, rows, arc.firstChapter, arc.lastChapter), read, length, complete: read === length,
      path: pathOf(inArc.at(-1)?.number ?? arc.firstChapter),
      holdsReader: readingChapter !== undefined && readingChapter >= arc.firstChapter && readingChapter <= arc.lastChapter,
      goalsDone: goals.filter(goal => goal.status === 'reached' || goal.status === 'missed').length, goals: goals.length,
    });
  }

  // Chapters outside every arc (or the whole book, without arcs) form one plain section.
  const rest = ordered.filter(chapter => !placed.has(chapter.number));
  if (rest.length) {
    const rows: PlacedRow[] = [];
    for (const chapter of rest) {
      if (forkBefore(chapter.number)) rows.push({ at: chapter.number, row: forkRow() });
      rows.push({ at: chapter.number, row: chapterRow(chapter) });
    }
    sections.push({
      key: 'chapters', rows: rows.map(placed => placed.row), pages: paginate('chapters', rows, 1, rest.at(-1)!.number), read: rest.filter(chapter => isRead(chapter.number)).length, length: rest.length,
      path: pathOf(rest.at(-1)!.number),
      complete: false, holdsReader: rest.some(chapter => chapter.number === readingChapter), goalsDone: 0, goals: 0,
    });
  }
  return sections;
}

/** A row and the chapter it belongs with, for paging. */
interface PlacedRow { at: number; row: ChapterMapRow }

/** Splits a section's rows into fixed runs of chapters counted from its first chapter. */
function paginate(sectionKey: string, rows: readonly PlacedRow[], firstChapter: number, lastChapter: number): ChapterMapPage[] {
  const pages = new Map<number, ChapterMapPage>();
  for (const { at, row } of rows) {
    const index = Math.max(0, Math.floor((at - firstChapter) / CHAPTERS_PER_PAGE));
    const start = firstChapter + index * CHAPTERS_PER_PAGE;
    let page = pages.get(index);
    if (!page) {
      page = { key: `${sectionKey}-page-${index}`, firstChapter: start, lastChapter: Math.min(start + CHAPTERS_PER_PAGE - 1, Math.max(lastChapter, start)), rows: [] };
      pages.set(index, page);
    }
    page.rows.push(row);
  }
  return [...pages.entries()].sort(([left], [right]) => left - right).map(([, page]) => page);
}
