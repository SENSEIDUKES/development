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
import { FactionFields } from '../workspaces/FactionsWorkspace';
import { WorldCardFields, type WorldListCard } from '../workspaces/WorldCardsWorkspace';
import { worldCardSlots } from '../workspaces/WorldCardFields';
import { FateDecides } from '../FateDecides';
import { BlueprintSectionHeading } from './BlueprintDossierPrimitives';
import { BlueprintCardSheet } from './BlueprintCardSheet';
import { PortraitFrame } from './PortraitFrame';

type ListField = 'factions' | 'things' | 'startingAbilities' | 'places' | 'species';

interface WorldList {
  field: ListField;
  kind: WorldCardKindId;
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
  { field: 'factions', kind: 'faction', title: 'Factions', label: 'Faction', icon: Shield, limit: SEED_FACTION_LIMIT,
    tagline: 'Sects, guilds, and powers that already shape the world.', tileSlots: ['factionKind', 'standing', 'leader'],
    setCards: cards => setFactions(cards as unknown as StorySeedFaction[]) },
  { field: 'things', kind: 'thing', title: 'Things', label: 'Thing', icon: Sword, limit: SEED_THING_LIMIT,
    tagline: 'What already exists when the story opens, and who holds it.', tileSlots: ['holder', 'status', 'location'],
    setCards: cards => setThings(cards as StorySeedThing[]) },
  { field: 'startingAbilities', kind: 'ability', title: 'Abilities', label: 'Ability', icon: Sparkles, limit: SEED_ABILITY_LIMIT,
    tagline: 'The techniques the world already knows, and how they look when used.', tileSlots: ['appearance', 'ladder'],
    setCards: cards => setStartingAbilities(cards as StorySeedAbilityCard[]) },
  { field: 'places', kind: 'place', title: 'Places', label: 'Place', icon: MapPin, limit: SEED_PLACE_LIMIT,
    tagline: 'Where the story opens, and the places around it.', tileSlots: ['within', 'heldBy', 'condition'],
    setCards: cards => setPlaces(cards as StorySeedPlace[]) },
  { field: 'species', kind: 'species', title: 'Bestiary', label: 'Species', icon: PawPrint, limit: SEED_SPECIES_LIMIT,
    tagline: 'The creatures natural to this world.', tileSlots: ['habitat', 'strength', 'mind'],
    setCards: cards => setSpecies(cards as StorySeedSpecies[]) },
];

const text = (card: WorldListCard, id: string) => (typeof card[id] === 'string' ? (card[id] as string).trim() : '');

/** One world card as a Star Rail relic tile: a gold header tab, its emblem, its name and its key slots. */
const WorldTile = ({ list, card, index, onOpen }: { list: WorldList; card: WorldListCard; index: number; onOpen: () => void }) => {
  const Icon = list.icon;
  return (
    <button type="button" className="bp-tile" data-kind={list.kind} onClick={onOpen}
      aria-label={`${list.label}: ${card.name?.trim() || 'Unnamed'}`}>
      <span className="bp-tile-head"><Icon size={12} aria-hidden="true" />{list.label}<span className="bp-tile-index">#{index + 1}</span></span>
      <span className="bp-tile-emblem"><PortraitFrame name={card.name ?? ''} kind={list.kind} size="emblem" /></span>
      <span className="bp-tile-name">{card.name?.trim() || 'Unnamed'}</span>
      <span className="bp-tile-rows">
        {worldCardSlots(list.kind, list.tileSlots).map(slot => (
          <span key={slot.id} className="bp-tile-row">
            <span className="bp-tile-label">{slot.label}</span>
            <span className="bp-tile-value">{text(card, slot.id) || <FateDecides />}</span>
          </span>
        ))}
      </span>
    </button>
  );
};

/**
 * The world's cards (Factions, Things, Abilities, Places and the Bestiary) as
 * Star Rail relic grids. A tile opens its card's fields, the Seed's own, in a
 * sheet; the last tile in each grid adds a card.
 */
export const WorldCardGrid = ({ seed, updateSeed, readOnly = false }: {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
  readOnly?: boolean;
}) => {
  const [open, setOpen] = useState<{ field: ListField; id: string } | null>(null);
  const foundations = worldFoundations(seed);
  const cardsOf = (field: ListField) => (foundations[field] ?? []) as unknown as WorldListCard[];
  const openList = open ? WORLD_LISTS.find(list => list.field === open.field) : undefined;
  const openCards = openList ? cardsOf(openList.field) : [];
  const openIndex = open ? openCards.findIndex(card => card.id === open.id) : -1;
  const openCard = openIndex >= 0 ? openCards[openIndex] : undefined;

  const update = (patch: Record<string, unknown>) => {
    if (!openList || openIndex < 0) return;
    updateSeed(openList.setCards(openCards.map((card, index) => (index === openIndex ? { ...card, ...patch } : card))));
  };
  const add = (list: WorldList) => {
    const card: WorldListCard = list.field === 'factions'
      ? { id: crypto.randomUUID(), name: '', aliases: [], role: '', powerLevel: '', alignment: '', connectionToMC: '', description: '' }
      : { id: crypto.randomUUID(), name: '' };
    updateSeed(list.setCards([...cardsOf(list.field), card]));
    setOpen({ field: list.field, id: card.id });
  };

  return (
    <>
      {WORLD_LISTS.map(list => {
        const cards = cardsOf(list.field);
        return (
          <section key={list.field} aria-labelledby={`blueprint-${list.field}-heading`} className="bp-section" data-testid={`blueprint-${list.field}`}>
            <BlueprintSectionHeading id={`blueprint-${list.field}-heading`} icon={list.icon} title={list.title} tagline={list.tagline} />
            <div className="bp-tiles">
              {cards.map((card, index) => (
                <WorldTile key={card.id} list={list} card={card} index={index} onOpen={() => setOpen({ field: list.field, id: card.id })} />
              ))}
              {!readOnly && cards.length < list.limit && (
                <button type="button" className="bp-tile bp-tile-add" onClick={() => add(list)}>
                  <Plus size={18} aria-hidden="true" />
                  <span>Add {list.label}</span>
                  <span className="bp-tile-count">{cards.length}/{list.limit}</span>
                </button>
              )}
              {readOnly && cards.length === 0 && <p className="bp-tiles-empty"><FateDecides /></p>}
            </div>
          </section>
        );
      })}
      <BlueprintCardSheet open={Boolean(openCard)} onOpenChange={next => { if (!next) setOpen(null); }} readOnly={readOnly}
        title={openCard ? `${openList!.label}: ${openCard.name?.trim() || 'Unnamed'}` : ''}
        removeLabel={openList ? `Remove ${openList.label.toLowerCase()}` : undefined}
        onRemove={openList && openIndex >= 0
          ? () => updateSeed(openList.setCards(openCards.filter((_, index) => index !== openIndex)))
          : undefined}>
        {openList && openCard && (openList.field === 'factions'
          ? <FactionFields faction={openCard as unknown as StorySeedFaction} index={openIndex} onChange={update} />
          : <WorldCardFields kind={openList.kind} card={openCard} onChange={update} />)}
      </BlueprintCardSheet>
    </>
  );
};
