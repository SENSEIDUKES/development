import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Archive, AudioLines, Backpack, ChevronLeft, Eye, Flag, Hand, LoaderCircle, Lock, Package, Play, ScrollText, Sparkles, Sword, TriangleAlert, User, Users, WandSparkles } from 'lucide-react';
import { SEIHOUSE_VOICE_CAST, castVoice, type VoiceCastMember } from '../../../audio/voiceCast';
import './story-codex.css';
import type { HoldingVerb } from '../../../narrative/holdings';
import { CHARACTER_LOOK_TRAITS, THING_LOOK_TRAITS, type LookTrait } from '../../../narrative/appearances';
import type { HeldThing, HoldingEvent, KnownAbility } from '../shared/holdings';
import type { CodexAppearance, CodexCharacter, CodexCheck, CodexFaction, CodexItem, CodexPassage, CodexPictureCard, CodexPictures, StoryCodexRecord } from '../shared/storyCodex';

/** How each change reads in the Codex. */
const VERB_LABELS: Record<HoldingVerb, string> = {
  has: 'already had', gained: 'gained', lost: 'lost', equipped: 'took up', unequipped: 'put away', knows: 'already knew',
  learning: 'began learning', learned: 'learned', improved: 'improved', sealed: 'sealed', unsealed: 'unsealed', rank: 'reached',
};

/** How each trait of a look is named, in the order a look is read. */
const TRAIT_LABELS: Record<LookTrait, string> = {
  build: 'Build', face: 'Face', eyes: 'Eyes', hair: 'Hair', skin: 'Skin', clothing: 'Clothing', marks: 'Marks', gear: 'Gear',
  form: 'Form', size: 'Size', material: 'Material', colour: 'Colour', condition: 'Condition',
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
 * A card's art: its manifested picture, else the aura where its picture will
 * stand, which stirs while the picture is being made.
 */
function CardArt({ category, picture, name, large = false, making = false }: { category: CodexTab; picture?: string; name: string; large?: boolean; making?: boolean }) {
  if (picture && !making) return <img src={picture} alt={name} className="absolute inset-0 h-full w-full object-cover" />;
  return <div aria-hidden className="absolute inset-0 overflow-hidden bg-[#07090d]">
    <div className="absolute inset-0 bg-[radial-gradient(#ffffff14_1px,transparent_1px)] [background-size:14px_14px]" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,#ffffff12,transparent_62%)]" />
    <div className={`absolute left-1/2 top-[38%] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white/30 ${large ? 'h-24 w-24' : 'h-14 w-14'}`}>
      <span className={`absolute inset-1.5 rounded-full border border-dashed ${making ? 'border-white/40 motion-safe:animate-[spin_4s_linear_infinite]' : 'border-white/15 motion-safe:animate-[spin_40s_linear_infinite]'}`} />
      {CATEGORY_MARK[category](large ? 34 : 20)}
    </div>
    <span className={`absolute inset-x-0 text-center font-mono uppercase tracking-[0.28em] ${making ? 'text-white/60 motion-safe:animate-pulse' : 'text-white/30'} ${large ? 'top-[58%] text-[10px]' : 'top-[60%] text-[8px]'}`}>{making ? 'Manifesting' : 'Unmanifested'}</span>
  </div>;
}

/**
 * One card in the gallery: its art fills it, its name and one line about it
 * sit at its foot. Every category's cards are the same card.
 */
function CodexCard({ category, name, line, badge, featured = false, testId, cardKey, picture, making, onOpen }: {
  category: CodexTab; name: string; line: string; badge?: string; featured?: boolean; testId: string; cardKey: string; picture?: string; making?: boolean; onOpen: () => void;
}) {
  return <li>
    <button type="button" onClick={onOpen} data-testid={testId} data-card={cardKey} aria-label={`${name}. ${line}`}
      className={`group relative block aspect-[3/4] w-full overflow-hidden rounded-xl border text-left shadow-[0_8px_24px_#0008] transition-transform duration-200 motion-reduce:transition-none hover:-translate-y-0.5 ${featured ? 'border-white/30' : 'border-white/10'}`}>
      <CardArt category={category} name={name} picture={picture} making={making} />
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

/** The reader's hold on characters' voices: change one, and hear it. */
export interface CodexVoices {
  /** Keeps a character's voice, a SEIHouse cast key, on their card. */
  choose: (characterKey: string, voice: string) => Promise<void>;
  /** Speaks a character's line in a voice, in the engine Read Aloud uses. */
  hear: (character: CodexCharacter, voice: string) => void;
}

const CAST_GROUPS: Array<{ label: string; gender: VoiceCastMember['gender'] }> = [
  { label: 'Women', gender: 'female' }, { label: 'Men', gender: 'male' }, { label: 'Others', gender: 'unisex' },
];

/** A character's voice: their first words, the SEIHouse cast voice they speak in, and, with the reader's hold on voices, a choice of another. */
function VoiceSection({ character, voices, onReadPassage }: { character: CodexCharacter & { voice: NonNullable<CodexCharacter['voice']> }; voices?: CodexVoices; onReadPassage?: ReadPassage }) {
  const [problem, setProblem] = useState<string>();
  const member = castVoice(character.voice.cast);
  // Only a character with a Codex entry keeps a voice; someone known only by the name they speak under has none yet.
  const onCard = !character.key.startsWith('character:');
  const choose = (voice: string) => {
    if (!voices) return;
    setProblem(undefined);
    voices.choose(character.key, voice).catch((error: unknown) => setProblem(error instanceof Error && error.message ? error.message : 'The voice could not be kept. Please try again.'));
  };
  return <div className="space-y-2" data-testid="codex-voice">
    <Words passage={character.voice.first} caption="First words" onReadPassage={onReadPassage} />
    {onCard && <Section title="Voice" icon={<AudioLines size={12} aria-hidden />} label={`${character.name}: Voice`} testId="codex-voice-cast">
      <p className="text-sm text-neutral-100">{member ? `${member.archetype} · ${member.ageRange}` : `Read in the ${character.mainCharacter ? 'main character' : 'side character'} voice`}</p>
      {member && <p className="text-xs leading-relaxed text-neutral-400">{member.description}</p>}
      {voices && <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-neutral-400">
          <span className="sr-only">{`Voice for ${character.name}`}</span>
          <select value={member?.key ?? ''} onChange={event => event.target.value && choose(event.target.value)} aria-label={`Voice for ${character.name}`}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 text-sm text-neutral-100">
            {!member && <option value="">Choose a voice</option>}
            {CAST_GROUPS.map(group => <optgroup key={group.gender} label={group.label}>
              {SEIHOUSE_VOICE_CAST.filter(entry => entry.gender === group.gender && entry.recorded !== false).map(entry =>
                <option key={entry.key} value={entry.key}>{`${entry.archetype} · ${entry.ageRange}`}</option>)}
            </optgroup>)}
          </select>
        </label>
        {member && <button type="button" onClick={() => voices.hear(character, member.key)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-sm text-white hover:border-white/40">
          <Play size={14} aria-hidden />Hear
        </button>}
      </div>}
      {problem && <p role="alert" className="text-xs text-amber-200">{problem}</p>}
    </Section>}
  </div>;
}

/** One thing in a character's hands or pack. */
/** How many changes a history shows at a time, newest first. */
const HISTORY_PAGE = 10;

/**
 * A thing's or an ability's changes, folded away until the reader asks: the
 * newest first, ten at a time, so a long story never fills the card with them.
 */
function History({ events, onReadPassage }: { events: readonly HoldingEvent[]; onReadPassage?: ReadPassage }) {
  const [shown, setShown] = useState(HISTORY_PAGE);
  if (!events.length) return null;
  const newest = [...events].reverse();
  const older = newest.length - shown;
  return <details className="mt-2" data-testid="codex-history">
    <summary className="inline-flex min-h-8 cursor-pointer items-center rounded-full px-1 text-[11px] text-neutral-400 hover:text-neutral-200">History ({events.length})</summary>
    <div className="mt-2 flex flex-wrap gap-1.5">
      {newest.slice(0, shown).map(event => <PassageChip key={event.passage.recordId} passage={eventPassage(event)} label={eventLabel(event)} onReadPassage={onReadPassage} />)}
    </div>
    {older > 0 && <button type="button" onClick={() => setShown(count => count + HISTORY_PAGE)}
      className="mt-2 min-h-8 rounded-full border border-white/12 px-3 text-[11px] text-neutral-300 hover:border-white/30 hover:text-white">
      Show {Math.min(HISTORY_PAGE, older)} older
    </button>}
  </details>;
}

/** Since which chapter: the chapter of the latest change. */
const sinceLine = (events: readonly HoldingEvent[]) => (events.length ? ` since Ch. ${events.at(-1)!.passage.chapterNumber}` : '');

function ItemSlot({ thing, onReadPassage }: { thing: HeldThing; onReadPassage?: ReadPassage }) {
  return <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid="codex-slot">
    <p className="flex items-start gap-2.5 text-sm text-white">
      <Sword size={15} aria-hidden className="mt-0.5 shrink-0 text-neutral-500" />
      <span className="min-w-0 flex-1 break-words">{thing.name}</span>
      {thing.count > 1 && <span className="shrink-0 font-mono text-xs text-neutral-300">×{thing.count}</span>}
    </p>
    <p className="mt-1 text-xs text-neutral-400" data-testid="codex-slot-state">{thing.equipped ? 'In hand' : 'Carried'}{sinceLine(thing.events)}</p>
    <History events={thing.events} onReadPassage={onReadPassage} />
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
    {ability.events.length > 0 && <p className="mt-1 text-xs text-neutral-400">{stage}{sinceLine(ability.events)}</p>}
    <History events={ability.events} onReadPassage={onReadPassage} />
  </li>;
}

/** Every change, in story order, each a link to its passage. */
function Chronicle({ events, describe, onReadPassage }: { events: readonly HoldingEvent[]; describe: (event: HoldingEvent) => string; onReadPassage?: ReadPassage }) {
  const [shown, setShown] = useState(HISTORY_PAGE);
  // The newest first, ten at a time.
  const newest = [...events].reverse();
  const older = newest.length - shown;
  return <details className="rounded-xl border border-white/10 bg-white/[0.02] p-4" data-testid="codex-chronicle">
    <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-200"><ScrollText size={14} aria-hidden />Chronicle ({events.length})</summary>
    <ol className="mt-3 space-y-2 border-s border-white/10 ps-4">
      {newest.slice(0, shown).map(event => <li key={event.passage.recordId} className="relative">
        <span aria-hidden className="absolute -start-[21px] top-3 h-2 w-2 rounded-full bg-white/50" />
        <PassageChip passage={eventPassage(event)} label={describe(event)} onReadPassage={onReadPassage} />
      </li>)}
    </ol>
    {older > 0 && <button type="button" onClick={() => setShown(count => count + HISTORY_PAGE)}
      className="mt-3 min-h-8 rounded-full border border-white/12 px-3 text-[11px] text-neutral-300 hover:border-white/30 hover:text-white">
      Show {Math.min(HISTORY_PAGE, older)} older
    </button>}
  </details>;
}

/**
 * How someone or something looks, as the record wrote it down from the
 * chapters: its one line, then each trait the passages state, with links to
 * the passage it was read from and to every change since.
 */
function LookSection({ name, appearance, traits, onReadPassage }: {
  name: string; appearance: CodexAppearance; traits: readonly LookTrait[]; onReadPassage?: ReadPassage;
}) {
  const { look } = appearance;
  const stated = look ? traits.flatMap(trait => (look.traits[trait] ? [[trait, look.traits[trait]!] as const] : [])) : [];
  return <Section title="Look" icon={<Eye size={12} aria-hidden />} label={`${name}: Look`} testId="codex-look">
    {look
      ? <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[15px] leading-relaxed text-neutral-100">{look.summary}</p>
          {stated.length > 0 && <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {stated.map(([trait, value]) => <Fragment key={trait}>
              <dt className="pt-0.5 text-[11px] uppercase tracking-[0.14em] text-neutral-500">{TRAIT_LABELS[trait]}</dt>
              <dd className="min-w-0 break-words text-neutral-200">{value}</dd>
            </Fragment>)}
          </dl>}
          {look.conflict && <p className="mt-3 text-xs leading-relaxed text-amber-100/80">Differs from the author&rsquo;s notes: {look.conflict}</p>}
        </div>
      : appearance.description
        // The writer's own words until a look is written: Manifest writes it from them.
        ? <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4" data-testid="codex-look-description">
            <p className="text-[15px] leading-relaxed text-neutral-200">{appearance.description}</p>
            <p className="mt-3 text-xs text-neutral-500">In the story&rsquo;s words. Manifest writes the full look from them.</p>
          </div>
        : <p className="text-sm text-neutral-400">No look written down yet.</p>}
    {look && appearance.lookStale && <p className="text-xs text-neutral-500" data-testid="codex-look-stale">The story has changed this look since. Manifest writes it again.</p>}
    {look && <div className="flex flex-wrap gap-1.5">
      <PassageChip passage={look.passage} label={`Look · Ch. ${look.passage.chapterNumber}`} onReadPassage={onReadPassage} />
    </div>}
    {appearance.changes.length > 0 && <details data-testid="codex-look-changes">
      <summary className="inline-flex min-h-8 cursor-pointer items-center rounded-full px-1 text-[11px] text-neutral-400 hover:text-neutral-200">Changes ({appearance.changes.length})</summary>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[...appearance.changes].reverse().map(change => <PassageChip key={`${change.passage.chapterNumber}:${change.passage.blockId}:${change.change}`} passage={change.passage}
          label={`Ch. ${change.passage.chapterNumber} · ${change.change}`} onReadPassage={onReadPassage} />)}
      </div>
    </details>}
  </Section>;
}

/**
 * An opened card: its art large at the top with its name, then everything the
 * record knows about it together, never scattered across pages. Every
 * category opens into this same profile.
 */
function Profile({ category, name, line, badges, backLabel, onBack, art, children }: {
  category: CodexTab; name: string; line: string; badges: readonly string[]; backLabel: string; onBack: () => void;
  /** The card's picture and Manifest, when the host makes pictures. */
  art?: ProfileArt; children: ReactNode;
}) {
  return <article className="space-y-5 motion-safe:animate-[codex-rise_260ms_ease-out]" aria-labelledby="codex-profile-name" data-testid="codex-profile">
    <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1 rounded-full pr-3 text-sm text-neutral-300 hover:text-white">
      <ChevronLeft size={18} aria-hidden /> {backLabel}
    </button>
    <header className="relative mx-auto aspect-[4/5] max-h-[26rem] w-full max-w-sm overflow-hidden rounded-2xl border border-white/15 shadow-[0_16px_40px_#000a]">
      <CardArt category={category} name={name} large picture={art?.picture} making={art?.making} />
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
    {art && <ManifestControl art={art} name={name} />}
    {children}
  </article>;
}

/** A profile's picture, and how to make it, from the host's pictures. */
interface ProfileArt {
  picture?: string;
  making: boolean;
  problem?: string;
  /** Absent until the record has written down a look to make the picture from. */
  onManifest?: () => void;
}

/**
 * Manifest: makes the card's picture from the look the record wrote down, so
 * the reader can see how well the story's words bring it to life. A card the
 * record has no look for waits for one.
 */
function ManifestControl({ art, name }: { art: ProfileArt; name: string }) {
  if (!art.onManifest) return <p className="text-center text-xs text-neutral-500" data-testid="codex-manifest-waits">
    Manifest waits until the story writes down how {name} looks.
  </p>;
  return <div className="flex flex-col items-center gap-2" data-testid="codex-manifest">
    <button type="button" onClick={art.onManifest} disabled={art.making}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-5 text-sm font-medium text-white hover:border-white/40 disabled:opacity-60">
      {art.making ? <LoaderCircle size={16} aria-hidden className="motion-safe:animate-spin" /> : <WandSparkles size={16} aria-hidden />}
      {art.making ? 'Manifesting…' : art.picture ? 'Manifest again' : 'Manifest'}
    </button>
    {art.problem && <p role="alert" className="max-w-sm text-center text-xs text-amber-200">{art.problem}</p>}
  </div>;
}

function CharacterProfile({ character, art, voices, onBack, onReadPassage }: { character: CodexCharacter; art?: ProfileArt; voices?: CodexVoices; onBack: () => void; onReadPassage?: ReadPassage }) {
  const equipped = character.things.filter(thing => thing.equipped);
  const carried = character.things.filter(thing => !thing.equipped);
  return <Profile category="characters" name={character.name} backLabel="All characters" onBack={onBack}
    line={character.rank?.text ?? `Met in Chapter ${character.firstSeen.chapterNumber}`}
    badges={character.mainCharacter ? ['Main character'] : []} art={art}>
    <div className="flex flex-wrap gap-1.5">
      <PassageChip passage={character.firstSeen} label={`First seen · Ch. ${character.firstSeen.chapterNumber}`} onReadPassage={onReadPassage} />
      {character.rank && <span data-testid="codex-rank" className="contents">{character.rank.events.map(event =>
        <PassageChip key={event.passage.recordId} passage={eventPassage(event)} label={`Rank · Ch. ${event.passage.chapterNumber}`} onReadPassage={onReadPassage} />)}</span>}
    </div>
    {character.appearance && <LookSection name={character.name} appearance={character.appearance} traits={CHARACTER_LOOK_TRAITS} onReadPassage={onReadPassage} />}
    {character.voice && <VoiceSection character={{ ...character, voice: character.voice }} voices={voices} onReadPassage={onReadPassage} />}
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

/** A thing that changed hands and is no longer held: lost, used up, broken or given away. */
const isArchived = (item: CodexItem) => !item.holder && item.events.length > 0;
const holderLine = (item: CodexItem) => (item.holder ? `${item.holder.name} · ${item.equipped ? 'in hand' : 'carried'}` : item.events.length ? 'No longer held' : 'Held by no one');

function ItemProfile({ item, art, onBack, onReadPassage }: { item: CodexItem; art?: ProfileArt; onBack: () => void; onReadPassage?: ReadPassage }) {
  return <Profile category="items" name={item.name} line={holderLine(item)} badges={isArchived(item) ? ['Archived'] : item.count > 1 ? [`×${item.count}`] : []} backLabel="All items" onBack={onBack} art={art}>
    <div className="flex flex-wrap gap-1.5">
      <PassageChip passage={item.firstSeen} label={`First seen · Ch. ${item.firstSeen.chapterNumber}`} onReadPassage={onReadPassage} />
    </div>
    {item.appearance && <LookSection name={item.name} appearance={item.appearance} traits={THING_LOOK_TRAITS} onReadPassage={onReadPassage} />}
    {item.events.length > 0 && <Chronicle events={item.events} onReadPassage={onReadPassage}
      describe={event => `${eventLabel(event)} · ${(event as CodexItem['events'][number]).holder}`} />}
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
      : <p className="mt-3 text-sm text-neutral-400">Nothing to check: every change and appearance fits what came before it, and every closing list matches.</p>}
  </details>;
}

const EMPTY: Record<CodexTab, string> = {
  characters: 'No one has stepped onto the page yet. Characters join the Codex as the story meets them.',
  factions: 'No sect, clan or faction has stepped forward yet.',
  items: 'No item has stepped onto the page yet. Items join the Codex as the story shows, gives, takes or uses them.',
};

/**
 * The Codex: a gallery of the cards the reader has collected, one tab per
 * category (characters, factions, items), every category built the same way.
 * Each card is its picture first; opening it shows everything the story's
 * record knows about it together. A card shows its unmanifested aura until
 * its picture is made; with the host's pictures, an opened character or item
 * offers Manifest, which makes its picture from the look the record wrote down. Every fact links to the
 * passage that made it, and the chapter behind the Codex moves to it while
 * the Codex stays open. The record's checks close the gallery, for testing.
 */
export function StoryCodex({ codex, storyTitle, pictures, voices, onBack, onReadPassage, onReadChapter }: {
  codex: StoryCodexRecord;
  /** The reader's hold on characters' voices. Without it, a card shows its voice and offers no choice. */
  voices?: CodexVoices;
  /** The host's pictures for this story's cards. Without them, cards show their aura and offer no Manifest. */
  pictures?: CodexPictures;
  storyTitle: string;
  /** Back to the chapter. */
  onBack?: () => void;
  onReadPassage?: ReadPassage;
  /** Opens a chapter, for a check that points at a whole chapter. */
  onReadChapter?: (chapterNumber: number) => void;
}) {
  const [tab, setTab] = useState<CodexTab>('characters');
  const [open, setOpen] = useState<string>();
  // A fact's link moves the chapter behind the Codex, so it asks first (SENSEI: an instant jump lost the reader's place).
  const [goTo, setGoTo] = useState<{ chapterNumber: number; blockId?: string }>();
  const root = useRef<HTMLElement>(null);
  // Pictures being made, and why one could not be, by card.
  const [making, setMaking] = useState<Record<string, true>>({});
  const [problems, setProblems] = useState<Record<string, string>>({});
  const manifest = (card: CodexPictureCard) => {
    if (!pictures || making[card.key]) return;
    setMaking(current => ({ ...current, [card.key]: true }));
    setProblems(({ [card.key]: _, ...rest }) => rest);
    pictures.manifest(card).catch((error: unknown) => {
      setProblems(current => ({ ...current, [card.key]: error instanceof Error && error.message ? error.message : 'The picture could not be made. Please try again.' }));
    }).finally(() => setMaking(({ [card.key]: _, ...rest }) => rest));
  };
  const artOf = (key: string, subject: CodexPictureCard['subject'], name: string, appearance?: CodexAppearance): ProfileArt | undefined => {
    if (!pictures) return undefined;
    const look = appearance?.look;
    return {
      picture: pictures.pictureOf(key), making: Boolean(making[key]), problem: problems[key],
      // A current look makes the picture at once; otherwise the host writes the look first, from the story's words.
      ...(appearance ? { onManifest: () => manifest({ key, subject, name, ...(look && !appearance.lookStale ? { look: { summary: look.summary, traits: look.traits } } : {}) }) } : {}),
    };
  };
  const askToRead: ReadPassage | undefined = onReadPassage && ((chapterNumber, blockId) => setGoTo({ chapterNumber, blockId }));
  const askToReadChapter = onReadChapter && ((chapterNumber: number) => setGoTo({ chapterNumber }));
  const go = () => {
    if (!goTo) return;
    if (goTo.blockId) onReadPassage?.(goTo.chapterNumber, goTo.blockId);
    else onReadChapter?.(goTo.chapterNumber);
    setGoTo(undefined);
  };
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

  const art = (key: string) => ({ picture: pictures?.pictureOf(key), making: Boolean(making[key]) });
  const itemCard = (entry: CodexItem) => <CodexCard key={entry.key} category="items" testId="codex-item" cardKey={entry.key} name={entry.name} {...art(entry.key)}
    badge={entry.count > 1 ? `×${entry.count}` : undefined} line={holderLine(entry)} onOpen={() => setOpen(entry.key)} />;
  const tabs: { id: CodexTab; label: string; count: number; icon: ReactNode }[] = [
    { id: 'characters', label: 'Characters', count: codex.characters.length, icon: <Users size={15} aria-hidden /> },
    { id: 'factions', label: 'Factions', count: codex.factions.length, icon: <Flag size={15} aria-hidden /> },
    { id: 'items', label: 'Items', count: codex.items.length, icon: <Package size={15} aria-hidden /> },
  ];
  const cards = tab === 'characters'
    ? codex.characters.map(entry => <CodexCard key={entry.key} category="characters" testId="codex-character" cardKey={entry.key} name={entry.name} {...art(entry.key)}
        featured={entry.mainCharacter} badge={entry.mainCharacter ? 'Main character' : undefined}
        line={entry.rank?.text ?? `Met in Chapter ${entry.firstSeen.chapterNumber}`} onOpen={() => setOpen(entry.key)} />)
    : tab === 'factions'
      ? codex.factions.map(entry => <CodexCard key={entry.key} category="factions" testId="codex-faction" cardKey={entry.key} name={entry.name} {...art(entry.key)}
          line={`Met in Chapter ${entry.firstSeen.chapterNumber}`} onOpen={() => setOpen(entry.key)} />)
      : codex.items.filter(entry => !isArchived(entry)).map(itemCard);
  // Things lost, used up or given away: kept, below what is held now.
  const archived = tab === 'items' ? codex.items.filter(isArchived).map(itemCard) : [];

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
      {character && <CharacterProfile key={character.key} character={character} voices={voices} onBack={close} onReadPassage={askToRead}
        art={artOf(character.key, 'character', character.name, character.appearance)} />}
      {faction && <FactionProfile key={faction.key} faction={faction} onBack={close} onReadPassage={askToRead} />}
      {item && <ItemProfile key={item.key} item={item} onBack={close} onReadPassage={askToRead}
        art={artOf(item.key, 'thing', item.name, item.appearance)} />}
      {!profileOpen && (cards.length || archived.length
        ? <ul className="grid grid-cols-2 gap-3">{cards}</ul>
        : <p className="py-8 text-center text-sm text-neutral-400">{EMPTY[tab]}</p>)}
      {!profileOpen && archived.length > 0 && <section aria-labelledby="codex-archived-title" className="space-y-3" data-testid="codex-archived">
        <h3 id="codex-archived-title" className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          <Archive size={12} aria-hidden />Archived ({archived.length})
        </h3>
        <ul className="grid grid-cols-2 gap-3 opacity-60">{archived}</ul>
      </section>}
      {!profileOpen && <Checks checks={codex.checks} onReadPassage={askToRead} onReadChapter={askToReadChapter} />}
    </div>
    {goTo && <div role="alertdialog" aria-labelledby="codex-go-title" data-testid="codex-go-confirm"
      className="sticky bottom-3 z-10 rounded-2xl border border-white/15 bg-neutral-950/95 p-4 shadow-[0_12px_32px_#000c] backdrop-blur">
      <p id="codex-go-title" className="text-sm text-neutral-100">Go to Chapter {goTo.chapterNumber}?</p>
      <p className="mt-1 text-xs text-neutral-400">The chapter behind the Codex moves {goTo.blockId ? 'to this passage' : 'there'}, so you leave your place.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={go} className="min-h-11 flex-1 rounded-full bg-white/90 px-4 text-sm font-medium text-black hover:bg-white">Go</button>
        <button type="button" onClick={() => setGoTo(undefined)} className="min-h-11 flex-1 rounded-full border border-white/15 px-4 text-sm text-neutral-200 hover:border-white/30">Stay</button>
      </div>
    </div>}
  </section>;
}
