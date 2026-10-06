import { useMemo } from 'react';
import type { HarnessWorkspaceState } from '../../../narrative/generation';
import type { HoldingVerb } from '../../../narrative/holdings';
import { deriveHoldings, type CharacterHoldings, type HoldingEvent, type HoldingFlag } from '../shared/holdings';

/** How each change reads in the list. */
const VERB_LABELS: Record<HoldingVerb, string> = {
  has: 'already had', gained: 'gained', lost: 'lost', equipped: 'took up', unequipped: 'put away', knows: 'already knew',
  learning: 'began learning', learned: 'learned', improved: 'improved', sealed: 'sealed', unsealed: 'unsealed', rank: 'reached',
};

const chip = 'inline-flex min-h-9 items-center rounded-full border border-white/15 px-3 text-xs text-neutral-300 hover:border-cyan-300/50 hover:text-cyan-50';

/** One change as a short link to the passage that made it. */
function EventLink({ event, onReadPassage }: { event: HoldingEvent; onReadPassage?: (chapterNumber: number, blockId: string) => void }) {
  const label = `Ch. ${event.passage.chapterNumber} · ${VERB_LABELS[event.verb]}${event.count ? ` ${event.count}` : ''}${event.level && event.verb !== 'rank' ? ` → ${event.level}` : ''}${event.reason ? ` (${event.reason})` : ''}`;
  if (!onReadPassage) return <span className={chip} title={event.passage.text}>{label}</span>;
  return <button type="button" className={chip} title={event.passage.text}
    aria-label={`${label}. Read the passage: ${event.passage.text}`}
    onClick={() => onReadPassage(event.passage.chapterNumber, event.passage.blockId)}>{label}</button>;
}

function HoldingRow({ name, note, events, onReadPassage }: {
  name: string; note?: string; events: readonly HoldingEvent[]; onReadPassage?: (chapterNumber: number, blockId: string) => void;
}) {
  return <li className="space-y-2 py-2">
    <p className="text-sm text-white">{name}{note && <span className="text-neutral-400"> · {note}</span>}</p>
    <div className="flex flex-wrap gap-2">{events.map(event => <EventLink key={event.passage.recordId} event={event} onReadPassage={onReadPassage} />)}</div>
  </li>;
}

function CharacterCard({ character, onReadPassage }: { character: CharacterHoldings; onReadPassage?: (chapterNumber: number, blockId: string) => void }) {
  const lists = [
    { title: 'In hand', items: character.things.filter(thing => thing.equipped).map(thing => ({ key: thing.entryId, name: thing.name, note: thing.count > 1 ? `×${thing.count}` : undefined, events: thing.events })) },
    { title: 'Carried', items: character.things.filter(thing => !thing.equipped).map(thing => ({ key: thing.entryId, name: thing.name, note: thing.count > 1 ? `×${thing.count}` : undefined, events: thing.events })) },
    { title: 'Knows', items: character.abilities.filter(ability => ability.stage === 'learned').map(ability => ({ key: ability.entryId, name: ability.name, note: [ability.level, ability.sealed ? 'sealed' : undefined].filter(Boolean).join(' · ') || undefined, events: ability.events })) },
    { title: 'Learning', items: character.abilities.filter(ability => ability.stage === 'learning').map(ability => ({ key: ability.entryId, name: ability.name, note: ability.level, events: ability.events })) },
  ].filter(list => list.items.length);
  const nothing = !character.rank && !lists.length;
  return <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4" aria-labelledby={`holdings-${character.entryId}`} data-testid="holdings-character">
    <h3 id={`holdings-${character.entryId}`} className="flex flex-wrap items-center gap-2 font-semibold text-white">
      {character.name}
      {character.mainCharacter && <span className="rounded-full border border-cyan-300/30 px-2 py-0.5 font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-cyan-100">Main character</span>}
    </h3>
    {character.rank && <div className="mt-2 space-y-2">
      <p className="text-sm text-neutral-300">Rank: <span className="text-white">{character.rank.text}</span></p>
      <div className="flex flex-wrap gap-2">{character.rank.events.map(event => <EventLink key={event.passage.recordId} event={event} onReadPassage={onReadPassage} />)}</div>
    </div>}
    {nothing && <p className="mt-2 text-sm text-neutral-400">Nothing recorded yet.</p>}
    {lists.map(list => <section key={list.title} className="mt-3" aria-label={`${character.name}: ${list.title}`}>
      <h4 className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">{list.title}</h4>
      <ul className="divide-y divide-white/5">{list.items.map(item => <HoldingRow key={item.key} name={item.name} note={item.note} events={item.events} onReadPassage={onReadPassage} />)}</ul>
    </section>)}
  </article>;
}

/**
 * Holdings: what each character has, uses, knows and is right now, worked out
 * from the change tags in every chapter, with the passage behind each change.
 * A plain list for checking the record against the chapters until the Codex
 * shows holdings itself. Its Checks are the rules' flags and the writer's
 * closing-list mismatches: the things worth looking at when testing.
 */
export function HoldingsPage({ state, storyId, onBack, onReadPassage, onReadChapter }: {
  state: HarnessWorkspaceState;
  storyId: string;
  onBack: () => void;
  /** Opens a chapter in the Reader at the paragraph where a change happened. */
  onReadPassage?: (chapterNumber: number, blockId: string) => void;
  /** Opens a chapter in the Reader. */
  onReadChapter?: (chapterNumber: number) => void;
}) {
  const story = state.stories.find(entry => entry.id === storyId);
  const mainCharacterName = state.foundations.find(entry => entry.id === story?.activeFoundationRevisionId)?.input.cast?.find(member => member.isMainCharacter)?.name;
  const holdings = useMemo(() => deriveHoldings({
    entries: state.codexEntries.filter(entry => entry.storyId === storyId),
    chapters: state.chapters.filter(chapter => chapter.storyId === storyId),
    mainCharacterName,
  }), [state.codexEntries, state.chapters, storyId, mainCharacterName]);
  if (!story) return <p role="alert" className="p-4 text-sm text-amber-200">This story is no longer available.</p>;

  const characters: CharacterHoldings[] = holdings.characters.some(character => character.mainCharacter)
    ? holdings.characters
    : [{ entryId: 'main-character', name: mainCharacterName ?? 'Main character', mainCharacter: true, things: [], abilities: [], history: [] }, ...holdings.characters];
  const passageOf = (flag: HoldingFlag) => flag.recordId
    ? state.chapters.find(chapter => chapter.id === flag.chapterId)?.holdingChanges?.find(change => change.id === flag.recordId)?.anchor.blockId
    : undefined;

  return (
    <section className="mx-auto w-full min-w-0 max-w-3xl space-y-4 px-3 py-4 sm:px-4" aria-labelledby="holdings-page-title" data-testid="holdings-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200/60">{story.title}</p>
          <h2 id="holdings-page-title" className="mt-1 font-display text-2xl text-white">Holdings</h2>
        </div>
        <button type="button" onClick={onBack} className="min-h-11 rounded-full border border-white/15 px-4 text-sm text-neutral-200 hover:border-white/30">Back to reading</button>
      </div>
      <p className="text-sm text-neutral-400">What each character has now, worked out from the tags in every chapter. Each change links to the passage that made it.</p>

      {characters.map(character => <CharacterCard key={character.entryId} character={character} onReadPassage={onReadPassage} />)}

      <details className="rounded-xl border border-white/10 bg-white/[0.02] p-4" data-testid="holdings-checks">
        <summary className="cursor-pointer text-sm font-medium text-neutral-200">Checks ({holdings.flags.length})</summary>
        {holdings.flags.length
          ? <ul className="mt-3 space-y-3">{holdings.flags.map((flag, index) => {
            const blockId = passageOf(flag);
            return <li key={`${flag.kind}-${flag.recordId ?? index}`} className="space-y-2 text-sm text-amber-100/90">
              <p>{flag.message}</p>
              {flag.chapterNumber !== undefined && (blockId && onReadPassage
                ? <button type="button" className={chip} onClick={() => onReadPassage(flag.chapterNumber!, blockId)}>Read the passage</button>
                : onReadChapter && <button type="button" className={chip} onClick={() => onReadChapter(flag.chapterNumber!)}>Read Chapter {flag.chapterNumber}</button>)}
            </li>;
          })}</ul>
          : <p className="mt-3 text-sm text-neutral-400">Nothing to check: every change fits what came before it, and every closing list matches.</p>}
      </details>
    </section>
  );
}
