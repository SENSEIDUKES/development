import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Backpack, ChevronLeft, ChevronRight, Crown, Flag, Hand, Lock, Package, Quote, Sparkles, TriangleAlert, Users } from 'lucide-react';
import './story-codex.css';
import { getColorCodeValue, type ColorCodeId } from '../../../narrative/colorCodes';
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

const colorOf = (character: Pick<CodexCharacter, 'mainCharacter'>): ColorCodeId => (character.mainCharacter ? 'mainCharacter' : 'unknown');
const mix = (code: ColorCodeId, percent: number) => `color-mix(in srgb, ${getColorCodeValue(code)} ${percent}%, transparent)`;

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => [...word][0]).join('').toUpperCase();

/** The nearest box that scrolls, so a new view can start at its top without moving the chapter behind it. */
function scrollBoxOf(element: HTMLElement | null): HTMLElement | undefined {
  for (let node = element?.parentElement; node; node = node.parentElement) {
    const overflow = typeof getComputedStyle === 'function' ? getComputedStyle(node).overflowY : '';
    if (overflow === 'auto' || overflow === 'scroll') return node;
  }
  return undefined;
}

/** A character's emblem: their initials in a ring of their Color Code. */
function Sigil({ name, code, size = 'md', aura = false }: { name: string; code: ColorCodeId; size?: 'md' | 'lg'; aura?: boolean }) {
  const box = size === 'lg' ? 'h-20 w-20 text-2xl' : 'h-12 w-12 text-base';
  return <span aria-hidden className={`relative inline-flex shrink-0 items-center justify-center ${box}`}>
    {aura && <span className="absolute -inset-2 rounded-full opacity-70 blur-md motion-safe:animate-pulse"
      style={{ background: `radial-gradient(circle, ${mix(code, 45)}, transparent 70%)` }} />}
    {aura && <span className="absolute -inset-1 rounded-full motion-safe:animate-[spin_18s_linear_infinite]"
      style={{ background: `conic-gradient(from 0deg, transparent, ${mix(code, 70)}, transparent 40%, ${mix(code, 50)}, transparent 75%)`, mask: 'radial-gradient(circle, transparent 62%, #000 64%)', WebkitMask: 'radial-gradient(circle, transparent 62%, #000 64%)' }} />}
    <span className="relative flex h-full w-full items-center justify-center rounded-full border-2 font-display tracking-wide text-white"
      style={{ borderColor: mix(code, 80), background: `radial-gradient(circle at 35% 30%, ${mix(code, 35)}, #0b1220 72%)`, boxShadow: `0 0 18px ${mix(code, 30)}, inset 0 1px 0 #ffffff22` }}>
      {initials(name)}
    </span>
  </span>;
}

/** A small link to the paragraph a fact came from. */
function PassageChip({ passage, label, onReadPassage }: { passage: CodexPassage; label: string; onReadPassage?: ReadPassage }) {
  const chip = 'inline-flex min-h-8 items-center rounded-full border border-white/15 bg-black/20 px-2.5 text-[11px] text-neutral-300';
  if (!onReadPassage) return <span className={chip} title={passage.text}>{label}</span>;
  return <button type="button" className={`${chip} hover:border-cyan-300/50 hover:text-cyan-50`} title={passage.text}
    aria-label={`${label}. Read the passage: ${passage.text}`} onClick={() => onReadPassage(passage.chapterNumber, passage.blockId)}>{label}</button>;
}

const eventPassage = (event: HoldingEvent): CodexPassage => ({ chapterNumber: event.passage.chapterNumber, blockId: event.passage.blockId, text: event.passage.text });
const eventLabel = (event: HoldingEvent) => `Ch. ${event.passage.chapterNumber} · ${VERB_LABELS[event.verb]}${event.count ? ` ${event.count}` : ''}${event.level && event.verb !== 'rank' ? ` → ${event.level}` : ''}${event.reason ? ` (${event.reason})` : ''}`;

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <h4 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">{icon}{children}</h4>;
}

/** One thing in a character's hands or pack, as an inventory slot. */
function ItemSlot({ thing, equipped, onReadPassage }: { thing: HeldThing; equipped: boolean; onReadPassage?: ReadPassage }) {
  return <li className="rounded-xl border p-3" data-testid="codex-slot"
    style={{ borderColor: mix('itemBasic', equipped ? 28 : 12), background: `linear-gradient(160deg, ${mix('itemBasic', equipped ? 9 : 4)}, transparent)` }}>
    <p className="flex items-start justify-between gap-2 text-sm text-white">
      <span className="min-w-0 break-words">{thing.name}</span>
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
          : <span aria-hidden className="flex gap-0.5">{[0, 1].map(pip => <span key={pip} className="h-1.5 w-3 rounded-full"
              style={{ background: pip < lit ? getColorCodeValue('mentor') : '#ffffff26' }} />)}</span>}
        {stage}{ability.level ? ` · ${ability.level}` : ''}
      </span>
    </div>
    <div className="mt-2 flex flex-wrap gap-1.5">{ability.events.map(event => <PassageChip key={event.passage.recordId} passage={eventPassage(event)} label={eventLabel(event)} onReadPassage={onReadPassage} />)}</div>
  </li>;
}

/** A tile in the roster. */
function RosterTile({ character, onOpen }: { character: CodexCharacter; onOpen: () => void }) {
  const code = colorOf(character);
  const stats = [
    { icon: <Backpack size={12} aria-hidden />, value: character.things.length, label: 'items' },
    { icon: <Sparkles size={12} aria-hidden />, value: character.abilities.length, label: 'abilities' },
  ].filter(stat => stat.value > 0);
  return <li>
    <button type="button" onClick={onOpen} data-testid="codex-character" data-character={character.key}
      className="group flex w-full min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition-colors motion-reduce:transition-none hover:bg-white/[0.04]"
      style={{ borderColor: mix(code, 30), background: `linear-gradient(120deg, ${mix(code, 10)}, transparent 60%)` }}>
      <Sigil name={character.name} code={code} aura={character.mainCharacter} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-white">{character.name}</span>
        <span className="mt-0.5 block truncate text-xs" style={{ color: character.rank ? getColorCodeValue('mentor') : undefined }}>
          {character.rank ? character.rank.text : <span className="text-neutral-500">Met in Chapter {character.firstSeen.chapterNumber}</span>}
        </span>
        {stats.length > 0 && <span className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-neutral-400">
          {stats.map(stat => <span key={stat.label} className="inline-flex items-center gap-1" aria-label={`${stat.value} ${stat.label}`}>{stat.icon}{stat.value}</span>)}
        </span>}
      </span>
      <ChevronRight size={18} aria-hidden className="shrink-0 text-neutral-500 transition-transform motion-reduce:transition-none group-hover:translate-x-0.5" />
    </button>
  </li>;
}

/** A character's sheet: who they are in the record, what they carry, what they can do, and what happened to them. */
function CharacterSheet({ character, onBack, onReadPassage }: { character: CodexCharacter; onBack: () => void; onReadPassage?: ReadPassage }) {
  const code = colorOf(character);
  const equipped = character.things.filter(thing => thing.equipped);
  const carried = character.things.filter(thing => !thing.equipped);
  return <article className="space-y-5" aria-labelledby="codex-sheet-name" data-testid="codex-sheet">
    <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1 rounded-full pr-3 text-sm text-neutral-300 hover:text-white">
      <ChevronLeft size={18} aria-hidden /> All characters
    </button>
    <header className="relative overflow-hidden rounded-2xl border p-4 motion-safe:animate-[codex-rise_260ms_ease-out]"
      style={{ borderColor: mix(code, 35), background: `radial-gradient(120% 90% at 0% 0%, ${mix(code, 18)}, transparent 60%), #0b1220cc` }}>
      <div className="flex items-center gap-4">
        <Sigil name={character.name} code={code} size="lg" aura />
        <div className="min-w-0">
          {character.mainCharacter && <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: getColorCodeValue(code) }}>Main character</p>}
          <h3 id="codex-sheet-name" className="break-words font-display text-2xl leading-tight text-white">{character.name}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <PassageChip passage={character.firstSeen} label={`First seen · Ch. ${character.firstSeen.chapterNumber}`} onReadPassage={onReadPassage} />
          </div>
        </div>
      </div>
      {character.rank && <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2"
        style={{ borderColor: mix('mentor', 35), background: mix('mentor', 8) }} data-testid="codex-rank">
        <Crown size={15} aria-hidden style={{ color: getColorCodeValue('mentor') }} />
        <span className="text-sm text-white">{character.rank.text}</span>
        <span className="ms-auto flex flex-wrap gap-1.5">{character.rank.events.map(event => <PassageChip key={event.passage.recordId} passage={eventPassage(event)} label={`Ch. ${event.passage.chapterNumber}`} onReadPassage={onReadPassage} />)}</span>
      </div>}
    </header>

    {character.voice && <figure className="rounded-2xl border border-white/10 bg-white/[0.03] p-4" data-testid="codex-voice">
      <Quote size={16} aria-hidden className="text-neutral-500" />
      <blockquote className="mt-1 text-[15px] italic leading-relaxed text-neutral-100">{character.voice.first.text}</blockquote>
      <figcaption className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
        <span>First words</span>
        <PassageChip passage={character.voice.first} label={`Ch. ${character.voice.first.chapterNumber}`} onReadPassage={onReadPassage} />
      </figcaption>
    </figure>}

    {equipped.length > 0 && <section className="space-y-2" aria-label={`${character.name}: Equipped`}>
      <SectionTitle icon={<Hand size={12} aria-hidden />}>Equipped</SectionTitle>
      <ul className="grid gap-2 sm:grid-cols-2">{equipped.map(thing => <ItemSlot key={thing.entryId} thing={thing} equipped onReadPassage={onReadPassage} />)}</ul>
    </section>}
    {carried.length > 0 && <section className="space-y-2" aria-label={`${character.name}: Carried`}>
      <SectionTitle icon={<Backpack size={12} aria-hidden />}>Carried</SectionTitle>
      <ul className="grid gap-2 sm:grid-cols-2">{carried.map(thing => <ItemSlot key={thing.entryId} thing={thing} equipped={false} onReadPassage={onReadPassage} />)}</ul>
    </section>}
    {character.abilities.length > 0 && <section className="space-y-2" aria-label={`${character.name}: Abilities`}>
      <SectionTitle icon={<Sparkles size={12} aria-hidden />}>Abilities</SectionTitle>
      <ul className="space-y-2">{character.abilities.map(ability => <AbilityRow key={ability.entryId} ability={ability} onReadPassage={onReadPassage} />)}</ul>
    </section>}
    {!character.things.length && !character.abilities.length && !character.rank && <p className="text-sm text-neutral-400">The story has not shown them holding or learning anything yet.</p>}

    {character.chronicle.length > 0 && <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4" data-testid="codex-chronicle">
      <summary className="cursor-pointer text-sm font-medium text-neutral-200">Chronicle ({character.chronicle.length})</summary>
      <ol className="mt-3 space-y-2 border-s border-white/10 ps-4">
        {character.chronicle.map(event => <li key={event.passage.recordId} className="relative">
          <span aria-hidden className="absolute -start-[21px] top-2.5 h-2 w-2 rounded-full" style={{ background: getColorCodeValue(code) }} />
          <PassageChip passage={eventPassage(event)} label={`${eventLabel(event)}${event.target && event.verb !== 'rank' ? ` ${event.target}` : event.level ? ` ${event.level}` : ''}`} onReadPassage={onReadPassage} />
        </li>)}
      </ol>
    </details>}
  </article>;
}

/** A thing in the story: who holds it now, and everything that happened to it. */
function ItemCard({ item, onReadPassage }: { item: CodexItem; onReadPassage?: ReadPassage }) {
  const status = item.holder ? `${item.holder.name} · ${item.equipped ? 'in hand' : 'carried'}` : 'No longer held';
  return <li data-testid="codex-item">
    <details className="group rounded-2xl border p-3" style={{ borderColor: mix('itemBasic', 16), background: `linear-gradient(150deg, ${mix('itemBasic', 6)}, transparent 70%)` }}>
      <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
          style={{ borderColor: mix('itemBasic', 30), background: `radial-gradient(circle at 35% 30%, ${mix('itemBasic', 16)}, #0b1220 75%)` }}>
          <Package size={18} className="text-neutral-200" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-semibold text-white">{item.name}{item.count > 1 ? <span className="ms-1.5 font-mono text-xs font-normal text-neutral-300">×{item.count}</span> : null}</span>
          <span className={`mt-0.5 block truncate text-xs ${item.holder ? 'text-neutral-400' : 'text-neutral-500 italic'}`}>{status}</span>
        </span>
        <ChevronRight size={16} aria-hidden className="shrink-0 text-neutral-500 transition-transform motion-reduce:transition-none group-open:rotate-90" />
      </summary>
      <ol className="mt-3 flex flex-wrap gap-1.5">
        {item.events.map(event => <li key={event.passage.recordId}>
          <PassageChip passage={eventPassage(event)} label={`${eventLabel(event)} · ${event.holder}`} onReadPassage={onReadPassage} />
        </li>)}
      </ol>
    </details>
  </li>;
}

/** A sect, clan or other faction: its crest, when the story first heard from it, and its words. */
function FactionCard({ faction, onReadPassage }: { faction: CodexFaction; onReadPassage?: ReadPassage }) {
  return <li data-testid="codex-faction">
    <details className="group rounded-2xl border p-3" style={{ borderColor: mix('location', 25), background: `linear-gradient(150deg, ${mix('location', 9)}, transparent 70%)` }}>
      <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 font-display text-base text-white"
          style={{ borderColor: mix('location', 70), background: `radial-gradient(circle at 35% 30%, ${mix('location', 30)}, #0b1220 75%)`, boxShadow: `0 0 16px ${mix('location', 25)}` }}>
          {initials(faction.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words font-semibold text-white">{faction.name}</span>
          <span className="mt-0.5 block text-xs text-neutral-500">Met in Chapter {faction.firstSeen.chapterNumber}</span>
        </span>
        <ChevronRight size={16} aria-hidden className="shrink-0 text-neutral-500 transition-transform motion-reduce:transition-none group-open:rotate-90" />
      </summary>
      <figure className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <blockquote className="text-sm italic leading-relaxed text-neutral-100">{faction.voice.first.text}</blockquote>
        <figcaption className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
          <span>First heard</span>
          <PassageChip passage={faction.voice.first} label={`Ch. ${faction.voice.first.chapterNumber}`} onReadPassage={onReadPassage} />
        </figcaption>
      </figure>
    </details>
  </li>;
}

/** The record's own checks, for testing a story against its chapters. */
function Checks({ checks, onReadPassage, onReadChapter }: { checks: readonly CodexCheck[]; onReadPassage?: ReadPassage; onReadChapter?: (chapterNumber: number) => void }) {
  const chip = 'inline-flex min-h-8 items-center rounded-full border border-white/15 px-2.5 text-[11px] text-neutral-300 hover:border-cyan-300/50 hover:text-cyan-50';
  return <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4" data-testid="codex-checks">
    <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-200">
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

type CodexTab = 'characters' | 'factions' | 'items';

/**
 * The Codex, as the reader meets it: the story's world as far as its record
 * knows it, shown like a game's character screen rather than a table. Today
 * that is who the story has met (with their rank, what they carry, what they
 * can do and their first words) and the things that have changed hands. Every
 * fact links to the passage that made it, and the chapter behind the Codex
 * moves to it while the Codex stays open. The record's checks sit at the end
 * for testing. Each new kind of information joins it as its tag is built.
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
  const character = tab === 'characters' ? codex.characters.find(entry => entry.key === open) : undefined;
  // A new view starts at its top.
  useLayoutEffect(() => {
    const box = scrollBoxOf(root.current);
    if (box) box.scrollTop = 0;
  }, [tab, character?.key]);

  const tabs: { id: CodexTab; label: string; count: number; icon: ReactNode }[] = [
    { id: 'characters', label: 'Characters', count: codex.characters.length, icon: <Users size={15} aria-hidden /> },
    { id: 'factions', label: 'Factions', count: codex.factions.length, icon: <Flag size={15} aria-hidden /> },
    { id: 'items', label: 'Items', count: codex.items.length, icon: <Package size={15} aria-hidden /> },
  ];
  const tabStyle = (active: boolean): CSSProperties | undefined => (active ? { borderColor: mix('mainCharacter', 55), background: mix('mainCharacter', 14) } : undefined);

  return <section ref={root} className="mx-auto w-full min-w-0 max-w-3xl space-y-4 px-3 py-4 sm:px-4" aria-labelledby="codex-panel-title" data-testid="story-codex">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200/60">{storyTitle}</p>
        <h2 id="codex-panel-title" className="mt-1 font-display text-2xl text-white">Codex</h2>
      </div>
      {onBack && <button type="button" onClick={onBack} className="min-h-11 rounded-full border border-white/15 px-4 text-sm text-neutral-200 hover:border-white/30">Back to reading</button>}
    </div>

    <div role="tablist" aria-label="Codex" className="grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-black/30 p-1">
      {tabs.map(entry => <button key={entry.id} type="button" role="tab" id={`codex-tab-${entry.id}`} aria-selected={tab === entry.id} aria-controls="codex-tab-panel"
        onClick={() => { setTab(entry.id); setOpen(undefined); }} style={tabStyle(tab === entry.id)}
        className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-full px-1 border border-transparent text-sm transition-colors motion-reduce:transition-none ${tab === entry.id ? 'text-white' : 'text-neutral-400 hover:text-neutral-100'}`}>
        {entry.icon}<span className="truncate">{entry.label}</span><span className="font-mono text-[11px] text-neutral-400">{entry.count}</span>
      </button>)}
    </div>

    <div id="codex-tab-panel" role="tabpanel" aria-labelledby={`codex-tab-${tab}`} className="space-y-4">
      {tab === 'characters' && (character
        ? <CharacterSheet key={character.key} character={character} onBack={() => setOpen(undefined)} onReadPassage={onReadPassage} />
        : codex.characters.length
          ? <ul className="space-y-2">{codex.characters.map(entry => <RosterTile key={entry.key} character={entry} onOpen={() => setOpen(entry.key)} />)}</ul>
          : <p className="py-6 text-center text-sm text-neutral-400">No one has stepped onto the page yet. Characters join the Codex as the story meets them.</p>)}
      {tab === 'factions' && (codex.factions.length
        ? <ul className="space-y-2">{codex.factions.map(faction => <FactionCard key={faction.key} faction={faction} onReadPassage={onReadPassage} />)}</ul>
        : <p className="py-6 text-center text-sm text-neutral-400">No sect, clan or faction has stepped forward yet.</p>)}
      {tab === 'items' && (codex.items.length
        ? <ul className="space-y-2">{codex.items.map(item => <ItemCard key={item.key} item={item} onReadPassage={onReadPassage} />)}</ul>
        : <p className="py-6 text-center text-sm text-neutral-400">Nothing has changed hands yet. Items join the Codex as the story gives, takes or uses them.</p>)}
      {!character && <Checks checks={codex.checks} onReadPassage={onReadPassage} onReadChapter={onReadChapter} />}
    </div>
  </section>;
}
