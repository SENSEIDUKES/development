import { WORLD_CARD_KINDS, type WorldCardKindId } from '@seihouse/sen/contracts';
import type { StorySeedInput } from '@seihouse/sen/story-seed';
import { NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';
import { getSeedSection, type SeedSectionId } from '../seedSections';
import { worldFoundations, type UpdateSeed } from '../seedState';
import { SeedSectionFrame } from './SeedSectionFrame';
import { WorldCardSlotFields } from './WorldCardFields';

/**
 * One Story Seed section for a Codex card kind the world keeps as a list:
 * things, abilities, places and the Bestiary's species. Every card is the
 * Codex's own card, with its own slots, and every slot is optional: what the
 * author leaves blank the World Blueprint fills before Chapter 1.
 *
 * One editor serves every kind, from the kind's one definition, so a new card
 * kind needs no new form.
 */

/** A card in one of the Seed's world lists. */
export type WorldListCard = { id: string; name: string } & Record<string, unknown>;

export interface WorldCardsWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}

/**
 * One world card's fields (its name, then every slot its kind defines): the
 * Seed's list editor and the Blueprint's card sheet share them.
 */
export const WorldCardFields = ({ kind, card, onChange }: {
  kind: WorldCardKindId;
  card: WorldListCard;
  onChange: (patch: Record<string, string>) => void;
}) => {
  const definition = WORLD_CARD_KINDS.find(candidate => candidate.id === kind)!;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      <LibraryTextBox
        size="compact"
        label="Name"
        id={`${kind}-name-${card.id}`}
        value={card.name || ''}
        onChange={value => onChange({ name: value })}
        placeholder={definition.slots[0].asks.charAt(0).toUpperCase() + definition.slots[0].asks.slice(1)}
      />
      <WorldCardSlotFields
        kind={kind}
        card={card}
        idPrefix={`${kind}-${card.id}`}
        only={definition.slots.filter(slot => slot.id !== 'name').map(slot => slot.id)}
        onChange={patch => onChange(patch as Record<string, string>)}
      />
    </div>
  );
};

export const WorldCardsEditor = ({ seed, updateSeed, kind, field, limit, setCards }: WorldCardsWorkspaceProps & {
  kind: WorldCardKindId;
  field: 'things' | 'startingAbilities' | 'places' | 'species';
  limit: number;
  setCards: (cards: WorldListCard[]) => (seed: StorySeedInput) => StorySeedInput;
}) => {
  const definition = WORLD_CARD_KINDS.find(candidate => candidate.id === kind)!;
  const cards = (worldFoundations(seed)[field] ?? []) as WorldListCard[];
  const update = (index: number, patch: Record<string, string>) => {
    const next = cards.map((card, position) => (position === index ? { ...card, ...patch } : card));
    updateSeed(setCards(next));
  };
  return <>
    {cards.map((card, index) => (
      <div key={card.id} className="glass-panel relative space-y-3 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-sc text-xs font-bold uppercase tracking-widest text-signal">
            {definition.label} {index + 1}
          </h4>
          <button
            type="button"
            onClick={() => updateSeed(setCards(cards.filter((_, position) => position !== index)))}
            className="font-sc text-xs uppercase tracking-widest text-neutral-400 transition-colors hover:text-human"
          >
            Remove
          </button>
        </div>
        <WorldCardFields kind={kind} card={card} onChange={patch => update(index, patch)} />
      </div>
    ))}
    {cards.length < limit && (
      <button
        type="button"
        onClick={() => updateSeed(setCards([...cards, { id: crypto.randomUUID(), name: '' }]))}
        className="w-full rounded-xl border border-dashed border-neutral-700/70 py-2.5 font-sc text-xs uppercase tracking-widest text-neutral-400 transition-all hover:border-portal/50 hover:bg-portal/5 hover:text-portal"
      >
        + Add {definition.label} ({cards.length}/{limit})
      </button>
    )}
  </>;
};

export const WorldCardsWorkspace = ({ seed, updateSeed, sectionId, blurb, ...card }: WorldCardsWorkspaceProps & {
  sectionId: SeedSectionId;
  blurb: string;
  kind: WorldCardKindId;
  field: 'things' | 'startingAbilities' | 'places' | 'species';
  limit: number;
  setCards: (cards: WorldListCard[]) => (seed: StorySeedInput) => StorySeedInput;
}) => {
  const section = getSeedSection(sectionId);
  return (
    <SeedSectionFrame section={section} complete={section.isFilled(seed)}>
      <p className="font-sans text-xs text-neutral-400">{blurb}</p>
      <WorldCardsEditor seed={seed} updateSeed={updateSeed} {...card} />
    </SeedSectionFrame>
  );
};
