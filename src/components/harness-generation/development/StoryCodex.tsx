import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Backpack, ChevronLeft, Flag, Hand, Lock, Package, ScrollText, Sparkles, Sword, TriangleAlert, User, Users } from 'lucide-react';
import './story-codex.css';
import type { HoldingVerb } from '../../../narrative/holdings';
import type { HeldThing, HoldingEvent, KnownAbility } from '../shared/holdings';
import type { CodexCharacter, CodexCheck, CodexFaction, CodexItem, CodexPassage, StoryCodexRecord } from '../shared/storyCodex';

/** How each change reads in the Codex. */
const VERB_LABELS: Record<HoldingVerb, string> = {
  has: 'already had', gained: 'gained', lost: 'lost', equipped: 'took up', unequipped: 'put away', knows: 'already knew',
  learning: 'began learning', learned: 'learned', improved: 'improved', sealed: 'sealed', unsealed: 'unsealed', rank: 'reached',
};

/** Opens the chapter behind a fact, at its paragraph, with the Codex still open. */
type ReadPassage = (chapterNumber: number, blockId: string) => void;

type CodexTab = 'characters' | 'factions' | 'items';

/** What each category's cards carry on their art until a picture is manifested. */
const CATEGORY_MARK: Record<CodexTab, (size: number) => ReactNode> = {
  characters: size => <User size={size} />,
  factions: size => <Flag size={size} />,
  items: size => <Sword size={size} />,
};

/** The nearest box that scrolls, so a new view can start at its top without moving the chapter behind it. */
function scrollBoxOf(element: HTMLElement | null): HTMLElement | undefined {
  for (let node = element?.parentElement; node; node = node.parentElement) {
    const overflow = typeof getComputedStyle === 'function' ? getComputedStyle(node).overflowY : '';
    if (overflow === 'auto' || overflow === 'scroll') return node;
  }
  return undefined;
}

/**
 * A card's art. A picture is manifested while reading, from a name in the
 * chapter; until then the card shows the aura where its picture will stand.
 */
function CardArt({ category, picture, name, large = false }: { category: CodexTab; picture?: string; name: string; large?: boolean }) {
  if (picture) return <img src={picture} alt={name} className="absolute inset-0 h-full w-full object-cover" />;
  return <div aria-hidden className="absolute inset-0 overflow-hidden bg-[#07090d]">
    <div className="absolute inset-0 bg-[radial-gradient(#ffffff14_1px,transparent_1px)] [background-size:14px_14px]" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,#ffffff12,transparent_62%)]" />
    <div className={`absolute left-1/2 top-[38%] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white/30 ${large ? 'h-24 w-24' : 'h-14 w-14'}`}>
      <span className="absolute inset-1.5 rounded-full border border-dashed border-white/15 motion-safe:animate-[spin_40s_linear_infinite]" />
      {CATEGORY_MARK[category](large ? 34 : 20)}
    </div>
    <span className={`absolute inset-x-0 text-center font-mono uppercase tracking-[0.28em] text-white/30 ${large ? 'top-[58%] text-[10px]' : 'top-[60%] text-[8px]'}`}>Unmanifested</span>
  </div>;
}

/**
 * One card in the gallery: its art fills it, its name and one line about it
 * sit at its foot. Every category's cards are the same card.
 */
function CodexCard({ category, name, line, badge, featured = false, testId, cardKey, onOpen }: {
  category: CodexTab; name: string; line: string; badge?: string; featured?: boolean; testId: string; cardKey: string; onOpen: () => void;
}) {
  return <li>
    <button type="button" onClick={onOpen} data-testid={testId} data-card={cardKey} aria-label={`${name}. ${line}`}
      className={`group relative block aspect-[3/4] w-full overflow-hidden rounded-xl border text-left shadow-[0_8px_24px_#0008] transition-transform duration-200 motion-reduce:transition-none hover:-translate-y-0.5 ${featured ? 'border-white/30' : 'border-white/10'}`}>
      <CardArt category={category} name={name} />
      {/* The card's frame: an inner rim and a foot dark enough to read its name on any picture. */}
      <span aria-hidden className="pointer-events-none absolute inset-1 rounded-[10px] border border-white/[0.07]" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent" />
      {badge && <span className="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-md border border-white/15 bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">{badge}</span>}
      <span className="absolute inset-x-0 bottom-0 p-2.5">
        <span className="block break-words font-display text-[15px] leading-tight text-white">{name}</span>
        <span className="mt-0.5 block truncate text-[11px] text-white/60">{line}</span>
      </span>
    </button>
  </li>;
}

/** A small link to the paragraph a fact came from. */
function PassageChip({ passage, label, onReadPassage }: { passage: CodexPassage; label: string; onReadPassage?: ReadPassage }) {
  const chip = 'inline-flex min-h-8 items-center rounded-full border border-white/12 bg-white/[0.04] px-2.5 text-[11px] text-neutral-300';
  if (!onReadPassage) return <span className={chip} title={passage.text}>{label}</span>;
  return <button type="button" className={`${chip} hover:border-white/30 hover:text-white`} title={passage.text}
    aria-label={`${label}. Read the passage: ${passage.text}`} onClick={() => onReadPassage(passage.chapterNumber, passage.blockId)}>{label}</button>;
}

const eventPassage = (event: HoldingEvent): CodexPassage => ({ chapterNumber: event.passage.chapterNumber, blockId: event.passage.blockId, text: event.passage.text });
const eventLabel = (event: HoldingEvent) => `Ch. ${event.passage.chapterNumber} · ${VERB_LABELS[event.verb]}${event.count ? ` ${event.count}` : ''}${event.level && event.verb !== 'rank' ? ` → ${event.level}` : ''}${event.reason ? ` (${event.reason})` : ''}`;

/** One part of a profile, under its own small heading. */
function Section({ title, icon, label, testId, children }: { title: string; icon: ReactNode; label?: string; testId?: string; children: ReactNode }) {
  return <section className="space-y-2" aria-label={label} data-testid={testId}>
    <h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">{icon}{title}</h4>
    {children}
  </section>;
}

/** Spoken words, framed as a quote, with the passage they came from. */
function Words({ passage, caption, onReadPassage }: { passage: CodexPassage; caption: string; onReadPassage?: ReadPassage }) {
  return <figure className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
    <blockquote className="text-[15px] italic leading-relaxed text-neutral-100">{passage.text}</blockquote>
    <figcaption className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
      <span>{caption}</span><PassageChip passage={passage} label={`Ch. ${passage.chapterNumber}`} onReadPassage={onReadPassage} />
    </figcaption>
  </figure>;
}

/** One thing in a character's hands or pack. */
function ItemSlot({ thing, onReadPassage }: { thing: HeldThing; onReadPassage?: ReadPassage }) {
  return <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid="codex-slot">
    <p className="flex items-start gap-2.5 text-sm text-white">
      <Sword size={15} aria-hidden className="mt-0.5 shrink-0 text-neutral-500" />
      <span className="min-w-0 flex-1 break-words">{thing.name}</span>
      {thing.count > 1 && <span className="shrink-0 font-mono text-xs text-neutral-300">×{thing.count}</span>}
    </p>
    <div className="mt-2 flex flex-wrap gap-1.5">{thing.events.map(event => <PassageChip key={event.passage.recordId} passage={eventPassage(event)} label={eventLabel(event)} onReadPassage={onReadPassage} />)}</div>
  </li>;
}

/** An ability, with how far along it is: learning, known, or sealed. */
function AbilityRow({ ability, onReadPassage }: { ability: KnownAbility; onReadPassage?: ReadPassage }) {
  const stage = ability.sealed ? 'Sealed' : ability.stage === 'learned' ? 'Known' : 'Learning';
  const lit = ability.stage === 'learned' ? 2 : 1;
  return <li className={`rounded-xl border border-white/10 bg-white/[0.03] p-3 ${ability.sealed ? 'opacity-70' : ''}`} data-testid="codex-ability">
    <div className="flex items-start justify-between gap-3">
      <p className="min-w-0 break-words text-sm text-white">{ability.name}</p>
      <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-neutral-300">
        {ability.sealed
          ? <Lock size={12} aria-hidden className="text-neutral-400" />
          : <span aria-hidden className="flex gap-0.5">{[0, 1].map(pip => <span key={pip} className={`h-1.5 w-3 rounded-full ${pip < lit ? 'bg-white/80' : 'bg-white/15'}`} />)}</span>}
        {stage}{ability.level ? ` · ${ability.level}` : ''}
      </span>
    </div>
    <div className="mt-2 flex flex-wrap gap-1.5">{ability.events.map(event => <PassageChip key={event.passage.recordId} passage={eventPassage(event)} label={eventLabel(event)} onReadPassage={onReadPassage} />)}</div>
  </li>;
}

/** Every change, in story order, each a link to its passage. */
function Chronicle({ events, describe, onReadPassage }: { events: readonly HoldingEvent[]; describe: (event: HoldingEvent) => string; onReadPassage?: ReadPassage }) {
  return <details className="rounded-xl border border-white/10 bg-white/[0.02] p-4" data-testid="codex-chronicle">
    <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-200"><ScrollText size={14} aria-hidden />Chronicle ({events.length})</summary>
    <ol className="mt-3 space-y-2 border-s border-white/10 ps-4">
      {events.map(event => <li key={event.passage.recordId} className="relative">
        <span aria-hidden className="absolute -start-[21px] top-3 h-2 w-2 rounded-full bg-white/50" />
        <PassageChip passage={eventPassage(event)} label={describe(event)} onReadPassage={onReadPassage} />
      </li>)}
    </ol>
  </details>;
}

/**
 * An opened card: its art large at the top with its name, then everything the
 * record knows about it together, never scattered across pages. Every
 * category opens into this same profile.
 */
function Profile({ category, name, line, badges, backLabel, onBack, children }: {
  category: CodexTab; name: string; line: string; badges: readonly string[]; backLabel: string; onBack: () => void; children: ReactNode;
}) {
  return <article className="space-y-5 motion-safe:animate-[codex-rise_260ms_ease-out]" aria-labelledby="codex-profile-name" data-testid="codex-profile">
    <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1 rounded-full pr-3 text-sm text-neutral-300 hover:text-white">
      <ChevronLeft size={18} aria-hidden /> {backLabel}
    </button>
    <header className="relative mx-auto aspect-[4/5] max-h-[26rem] w-full max-w-sm overflow-hidden rounded-2xl border border-white/15 shadow-[0_16px_40px_#000a]">
      <CardArt category={category} name={name} large />
      <span aria-hidden className="pointer-events-none absolute inset-1.5 rounded-[14px] border border-white/[0.07]" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent" />
      {badges.length > 0 && <span className="absolute left-3 top-3 flex flex-wrap gap-1.5">
        {badges.map(badge => <span key={badge} className="rounded-md border border-white/15 bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">{badge}</span>)}
      </span>}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 id="codex-profile-name" className="break-words font-display text-2xl leading-tight text-white">{name}</h3>
        <p className="mt-1 text-sm text-white/65">{line}</p>
      </div>
    </header>
    {children}
  </article>;
}

function CharacterProfile({ character, onBack, onReadPassage }: { character: CodexCharacter; onBack: () => void; onReadPassage?: ReadPassage }) {
  const equipped = character.things.filter(thing => thing.equipped);
  const carried = character.things.filter(thing => !thing.equipped);
  return <Profile category="characters" name={character.name} backLabel="All characters" onBack={onBack}
    line={character.rank?.text ?? `Met in Chapter ${character.firstSeen.chapterNumber}`}
    badges={character.mainCharacter ? ['Main character'] : []}>
    <div className="flex flex-wrap gap-1.5">
      <PassageChip passage={character.firstSeen} label={`First seen · Ch. ${character.firstSeen.chapterNumber}`} onReadPassage={onReadPassage} />
      {character.rank && <span data-testid="codex-rank" className="contents">{character.rank.events.map(event =>
        <PassageChip key={event.passage.recordId} passage={eventPassage(event)} label={`Rank · Ch. ${event.passage.chapterNumber}`} onReadPassage={onReadPassage} />)}</span>}
    </div>
    {character.voice && <div data-testid="codex-voice"><Words passage={character.voice.first} caption="First words" onReadPassage={onReadPassage} /></div>}
    {equipped.length > 0 && <Section title="Equipped" icon={<Hand size={12} aria-hidden />} label={`${character.name}: Equipped`}>
      <ul className="grid gap-2">{equipped.map(thing => <ItemSlot key={thing.entryId} thing={thing} onReadPassage={onReadPassage} />)}</ul>
    </Section>}
    {carried.length > 0 && <Section title="Carried" icon={<Backpack size={12} aria-hidden />} label={`${character.name}: Carried`}>
      <ul className="grid gap-2">{carried.map(thing => <ItemSlot key={thing.entryId} thing={thing} onReadPassage={onReadPassage} />)}</ul>
    </Section>}
    {character.abilities.length > 0 && <Section title="Abilities" icon={<Sparkles size={12} aria-hidden />} label={`${character.name}: Abilities`}>
      <ul className="space-y-2">{character.abilities.map(ability => <AbilityRow key={ability.entryId} ability={ability} onReadPassage={onReadPassage} />)}</ul>
    </Section>}
    {!character.things.length && !character.abilities.length && !character.rank && <p className="text-sm text-neutral-400">The story has not shown them holding or learning anything yet.</p>}
    {character.chronicle.length > 0 && <Chronicle events={character.chronicle} onReadPassage={onReadPassage}
      describe={event => `${eventLabel(event)}${event.target && event.verb !== 'rank' ? ` ${event.target}` : event.level ? ` ${event.level}` : ''}`} />}
  </Profile>;
}

function FactionProfile({ faction, onBack, onReadPassage }: { faction: CodexFaction; onBack: () => void; onReadPassage?: ReadPassage }) {
  return <Profile category="factions" name={faction.name} line={`Met in Chapter ${faction.firstSeen.chapterNumber}`} badges={[]} backLabel="All factions" onBack={onBack}>
    <Words passage={faction.voice.first} caption="First heard" onReadPassage={onReadPassage} />
  </Profile>;
}

const holderLine = (item: CodexItem) => (item.holder ? `${item.holder.name} · ${item.equipped ? 'in hand' : 'carried'}` : 'No longer held');

function ItemProfile({ item, onBack, onReadPassage }: { item: CodexItem; onBack: () => void; onReadPassage?: ReadPassage }) {
  return <Profile category="items" name={item.name} line={holderLine(item)} badges={item.count > 1 ? [`×${item.count}`] : []} backLabel="All items" onBack={onBack}>
    <Chronicle events={item.events} onReadPassage={onReadPassage}
      describe={event => `${eventLabel(event)} · ${(event as CodexItem['events'][number]).holder}`} />
  </Profile>;
}

/** The record's own checks, for testing a story against its chapters. */
function Checks({ checks, onReadPassage, onReadChapter }: { checks: readonly CodexCheck[]; onReadPassage?: ReadPassage; onReadChapter?: (chapterNumber: number) => void }) {
  const chip = 'inline-flex min-h-8 items-center rounded-full border border-white/15 px-2.5 text-[11px] text-neutral-300 hover:border-white/30 hover:text-white';
  return <details className="rounded-xl border border-white/10 bg-white/[0.02] p-4" data-testid="codex-checks">
    <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-300">
      <TriangleAlert size={14} aria-hidden className={checks.length ? 'text-amber-300' : 'text-neutral-500'} />Record checks ({checks.length})
    </summary>
    {checks.length
      ? <ul className="mt-3 space-y-3">{checks.map((check, index) => <li key={`${check.kind}-${check.recordId ?? index}`} className="space-y-2 text-sm text-amber-100/90">
          <p>{check.message}</p>
          {check.chapterNumber !== undefined && (check.blockId && onReadPassage
            ? <button type="button" className={chip} onClick={() => onReadPassage(check.chapterNumber!, check.blockId!)}>Read the passage</button>
            : onReadChapter && <button type="button" className={chip} onClick={() => onReadChapter(check.chapterNumber!)}>Read Chapter {check.chapterNumber}</button>)}
        </li>)}</ul>
      : <p className="mt-3 text-sm text-neutral-400">Nothing to check: every change fits what came before it, and every closing list matches.</p>}
  </details>;
}

const EMPTY: Record<CodexTab, string> = {
  characters: 'No one has stepped onto the page yet. Characters join the Codex as the story meets them.',
  factions: 'No sect, clan or faction has stepped forward yet.',
  items: 'Nothing has changed hands yet. Items join the Codex as the story gives, takes or uses them.',
};

/**
 * The Codex: a gallery of the cards the reader has collected, one tab per
 * category (characters, factions, items), every category built the same way.
 * Each card is its picture first; opening it shows everything the story's
 * record knows about it together. Pictures are manifested while reading, so
 * a card shows its unmanifested aura until then. Every fact links to the
 * passage that made it, and the chapter behind the Codex moves to it while
 * the Codex stays open. The record's checks close the gallery, for testing.
 */
export function StoryCodex({ codex, storyTitle, onBack, onReadPassage, onReadChapter }: {
  codex: StoryCodexRecord;
  storyTitle: string;
  /** Back to the chapter. */
  onBack?: () => void;
  onReadPassage?: ReadPassage;
  /** Opens a chapter, for a check that points at a whole chapter. */
  onReadChapter?: (chapterNumber: number) => void;
}) {
  const [tab, setTab] = useState<CodexTab>('characters');
  const [open, setOpen] = useState<string>();
  const root = useRef<HTMLElement>(null);
  const close = () => setOpen(undefined);
  const character = tab === 'characters' ? codex.characters.find(entry => entry.key === open) : undefined;
  const faction = tab === 'factions' ? codex.factions.find(entry => entry.key === open) : undefined;
  const item = tab === 'items' ? codex.items.find(entry => entry.key === open) : undefined;
  const profileOpen = Boolean(character || faction || item);
  // A new view starts at its top.
  useLayoutEffect(() => {
    const box = scrollBoxOf(root.current);
    if (box) box.scrollTop = 0;
  }, [tab, open]);

  const tabs: { id: CodexTab; label: string; count: number; icon: ReactNode }[] = [
    { id: 'characters', label: 'Characters', count: codex.characters.length, icon: <Users size={15} aria-hidden /> },
    { id: 'factions', label: 'Factions', count: codex.factions.length, icon: <Flag size={15} aria-hidden /> },
    { id: 'items', label: 'Items', count: codex.items.length, icon: <Package size={15} aria-hidden /> },
  ];
  const cards = tab === 'characters'
    ? codex.characters.map(entry => <CodexCard key={entry.key} category="characters" testId="codex-character" cardKey={entry.key} name={entry.name}
        featured={entry.mainCharacter} badge={entry.mainCharacter ? 'Main character' : undefined}
        line={entry.rank?.text ?? `Met in Chapter ${entry.firstSeen.chapterNumber}`} onOpen={() => setOpen(entry.key)} />)
    : tab === 'factions'
      ? codex.factions.map(entry => <CodexCard key={entry.key} category="factions" testId="codex-faction" cardKey={entry.key} name={entry.name}
          line={`Met in Chapter ${entry.firstSeen.chapterNumber}`} onOpen={() => setOpen(entry.key)} />)
      : codex.items.map(entry => <CodexCard key={entry.key} category="items" testId="codex-item" cardKey={entry.key} name={entry.name}
          badge={entry.count > 1 ? `×${entry.count}` : undefined} line={holderLine(entry)} onOpen={() => setOpen(entry.key)} />);

  return <section ref={root} className="mx-auto w-full min-w-0 max-w-3xl space-y-4 px-3 py-4 sm:px-4" aria-labelledby="codex-panel-title" data-testid="story-codex">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">{storyTitle}</p>
        <h2 id="codex-panel-title" className="mt-1 font-display text-2xl text-white">Codex</h2>
      </div>
      {onBack && <button type="button" onClick={onBack} className="min-h-11 rounded-full border border-white/15 px-4 text-sm text-neutral-200 hover:border-white/30">Back to reading</button>}
    </div>

    <div role="tablist" aria-label="Codex" className="grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-black/30 p-1">
      {tabs.map(entry => <button key={entry.id} type="button" role="tab" id={`codex-tab-${entry.id}`} aria-selected={tab === entry.id} aria-controls="codex-tab-panel"
        onClick={() => { setTab(entry.id); setOpen(undefined); }}
        className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-full px-1 text-sm transition-colors motion-reduce:transition-none ${tab === entry.id ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-neutral-100'}`}>
        {entry.icon}<span className="truncate">{entry.label}</span><span className="font-mono text-[11px] text-neutral-500">{entry.count}</span>
      </button>)}
    </div>

    <div id="codex-tab-panel" role="tabpanel" aria-labelledby={`codex-tab-${tab}`} className="space-y-4">
      {character && <CharacterProfile key={character.key} character={character} onBack={close} onReadPassage={onReadPassage} />}
      {faction && <FactionProfile key={faction.key} faction={faction} onBack={close} onReadPassage={onReadPassage} />}
      {item && <ItemProfile key={item.key} item={item} onBack={close} onReadPassage={onReadPassage} />}
      {!profileOpen && (cards.length
        ? <ul className="grid grid-cols-2 gap-3">{cards}</ul>
        : <p className="py-8 text-center text-sm text-neutral-400">{EMPTY[tab]}</p>)}
      {!profileOpen && <Checks checks={codex.checks} onReadPassage={onReadPassage} onReadChapter={onReadChapter} />}
    </div>
  </section>;
}
