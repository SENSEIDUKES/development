import { useState } from 'react';
import { MapPin, PawPrint, Plus, Shield, Sparkles, Sword, type LucideIcon } from 'lucide-react';
import type { WorldCardKindId } from '@seihouse/sen/contracts';
import {
  SEED_ABILITY_LIMIT,
  SEED_FACTION_LIMIT,
  SEED_PLACE_LIMIT,
  SEED_SPECIES_LIMIT,
  SEED_THING_LIMIT,
  type StorySeedAbilityCard,
  type StorySeedFaction,
  type StorySeedInput,
  type StorySeedPlace,
  type StorySeedSpecies,
  type StorySeedThing,
} from '@seihouse/sen/story-seed';
import { setFactions, setPlaces, setSpecies, setStartingAbilities, setThings, worldFoundations, type SeedUpdate, type UpdateSeed } from '../seedState';
import { FactionFields } from '../workspaces/FactionFields';
import { WorldCardFields, type WorldListCard } from '../workspaces/WorldCardFields';
import { FateDecides } from '../FateDecides';
import { BlueprintSectionHeading } from './BlueprintDossierPrimitives';
import { BlueprintCardSheet } from './BlueprintCardSheet';
import { CodexCardButton, type CodexCardCategory } from '@seihouse/sen/harness-generation';
import './blueprint.css';

export type ListField = 'factions' | 'things' | 'startingAbilities' | 'places' | 'species';

interface WorldList {
  field: ListField;
  kind: WorldCardKindId;
  /** The Codex category whose card it wears. */
  category: CodexCardCategory;
  title: string;
  /** One card's name: "Faction". */
  label: string;
  tagline: string;
  icon: LucideIcon;
  limit: number;
  /** The slots a tile shows, like a relic's main and sub stats. */
  tileSlots: readonly string[];
  setCards: (cards: WorldListCard[]) => SeedUpdate;
}

/** The world's own card lists, in the order the Codex reads them. */
const WORLD_LISTS: readonly WorldList[] = [
  { field: 'factions', kind: 'faction', category: 'factions', title: 'Factions', label: 'Faction', icon: Shield, limit: SEED_FACTION_LIMIT,
    tagline: 'Sects, guilds, and powers that already shape the world.', tileSlots: ['factionKind', 'role', 'standing', 'leader'],
    setCards: cards => setFactions(cards as unknown as StorySeedFaction[]) },
  { field: 'things', kind: 'thing', category: 'items', title: 'Things', label: 'Thing', icon: Sword, limit: SEED_THING_LIMIT,
    tagline: 'What already exists when the story opens, and who holds it.', tileSlots: ['holder', 'status', 'location'],
    setCards: cards => setThings(cards as StorySeedThing[]) },
  { field: 'startingAbilities', kind: 'ability', category: 'abilities', title: 'Abilities', label: 'Ability', icon: Sparkles, limit: SEED_ABILITY_LIMIT,
    tagline: 'The techniques the world already knows, and how they look when used.', tileSlots: ['appearance', 'ladder'],
    setCards: cards => setStartingAbilities(cards as StorySeedAbilityCard[]) },
  { field: 'places', kind: 'place', category: 'places', title: 'Places', label: 'Place', icon: MapPin, limit: SEED_PLACE_LIMIT,
    tagline: 'Where the story opens, and the places around it.', tileSlots: ['within', 'heldBy', 'condition'],
    setCards: cards => setPlaces(cards as StorySeedPlace[]) },
  { field: 'species', kind: 'species', category: 'species', title: 'Bestiary', label: 'Species', icon: PawPrint, limit: SEED_SPECIES_LIMIT,
    tagline: 'The creatures natural to this world.', tileSlots: ['habitat', 'strength', 'mind'],
    setCards: cards => setSpecies(cards as StorySeedSpecies[]) },
];

const text = (card: WorldListCard, id: string) => (typeof card[id] === 'string' ? (card[id] as string).trim() : '');

/** One world card: the Codex's own card, its line the first of its key slots the world has filled. */
const WorldTile = ({ list, card, onOpen }: { list: WorldList; card: WorldListCard; onOpen: () => void }) => {
  const line = list.tileSlots.map(slot => text(card, slot)).find(Boolean);
  return (
    <CodexCardButton category={list.category} name={card.name?.trim() || 'Unnamed'} line={line || list.label}
      onClick={onOpen} aria-label={`${list.label}: ${card.name?.trim() || 'Unnamed'}`} data-kind={list.kind} />
  );
};

/**
 * One of the world's card lists as Codex cards: a card opens its fields, the
 * Seed's own, in a sheet, and the last card slot adds one. The World Blueprint
 * shows every list under its heading; the Seed on a phone shows the one list
 * its page is about, without one (`heading={false}`).
 */
export const WorldListGrid = ({ seed, updateSeed, field, readOnly = false, heading = true }: {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
  field: ListField;
  readOnly?: boolean;
  heading?: boolean;
}) => {
  const list = WORLD_LISTS.find(entry => entry.field === field)!;
  const [openId, setOpenId] = useState<string | null>(null);
  const cards = (worldFoundations(seed)[field] ?? []) as unknown as WorldListCard[];
  const openIndex = openId ? cards.findIndex(card => card.id === openId) : -1;
  const openCard = openIndex >= 0 ? cards[openIndex] : undefined;

  const update = (patch: Record<string, unknown>) => {
    if (openIndex < 0) return;
    updateSeed(list.setCards(cards.map((card, index) => (index === openIndex ? { ...card, ...patch } : card))));
  };
  const add = () => {
    const card: WorldListCard = field === 'factions'
      ? { id: crypto.randomUUID(), name: '', aliases: [], role: '', powerLevel: '', alignment: '', connectionToMC: '', description: '' }
      : { id: crypto.randomUUID(), name: '' };
    updateSeed(list.setCards([...cards, card]));
    setOpenId(card.id);
  };

  const grid = (
    <div className="bp-tiles">
      {cards.map(card => (
        <WorldTile key={card.id} list={list} card={card} onOpen={() => setOpenId(card.id)} />
      ))}
      {!readOnly && cards.length < list.limit && (
        <button type="button" className="bp-card-add" onClick={add}>
          <Plus size={18} aria-hidden="true" />
          <span>Add {list.label}</span>
          <span className="bp-card-add-count">{cards.length}/{list.limit}</span>
        </button>
      )}
      {readOnly && cards.length === 0 && <p className="bp-tiles-empty"><FateDecides /></p>}
    </div>
  );
  return (
    <>
      {heading ? (
        <section aria-labelledby={`blueprint-${field}-heading`} className="bp-section" data-testid={`blueprint-${field}`}>
          <BlueprintSectionHeading id={`blueprint-${field}-heading`} icon={list.icon} title={list.title} tagline={list.tagline} />
          {grid}
        </section>
      ) : <div data-testid={`seed-${field}-cards`}>{grid}</div>}
      <BlueprintCardSheet open={Boolean(openCard)} onOpenChange={next => { if (!next) setOpenId(null); }} readOnly={readOnly}
        title={openCard ? `${list.label}: ${openCard.name?.trim() || 'Unnamed'}` : ''}
        removeLabel={`Remove ${list.label.toLowerCase()}`}
        onRemove={openIndex >= 0 ? () => updateSeed(list.setCards(cards.filter((_, index) => index !== openIndex))) : undefined}>
        {openCard && (field === 'factions'
          ? <FactionFields faction={openCard as unknown as StorySeedFaction} index={openIndex} onChange={update} />
          : <WorldCardFields kind={list.kind} card={openCard} onChange={update} />)}
      </BlueprintCardSheet>
    </>
  );
};

/**
 * The world's cards (Factions, Things, Abilities, Places and the Bestiary) as
 * Codex cards, each list under its heading.
 */
export const WorldCardGrid = ({ seed, updateSeed, readOnly = false }: {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
  readOnly?: boolean;
}) => (
  <>
    {WORLD_LISTS.map(list => (
      <WorldListGrid key={list.field} seed={seed} updateSeed={updateSeed} field={list.field} readOnly={readOnly} />
    ))}
  </>
);
