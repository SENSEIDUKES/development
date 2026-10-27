import { WORLD_CARD_KINDS, type WorldCardKindId } from '@seihouse/sen/contracts';
import type { StorySeedInput } from '@seihouse/sen/story-seed';
import { getSeedSection, type SeedSectionId } from '../seedSections';
import { worldFoundations, type UpdateSeed } from '../seedState';
import { SeedSectionFrame } from './SeedSectionFrame';
import { WorldCardFields, type WorldListCard } from './WorldCardFields';
import { usePhone } from '../../../library-shell/development/workspaceMedia';
import { WorldListGrid } from '../blueprint/WorldCardGrid';

/**
 * One Story Seed section for a Codex card kind the world keeps as a list:
 * things, abilities, places and the Bestiary's species. Every card is the
 * Codex's own card, with its own slots, and every slot is optional: what the
 * author leaves blank the World Blueprint fills before Chapter 1.
 *
 * One editor serves every kind, from the kind's one definition, so a new card
 * kind needs no new form.
 */

export interface WorldCardsWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}


export const WorldCardsEditor = ({ seed, updateSeed, kind, field, limit, setCards }: WorldCardsWorkspaceProps & {
  kind: WorldCardKindId;
  field: 'things' | 'startingAbilities' | 'places' | 'species';
  limit: number;
  setCards: (cards: WorldListCard[]) => (seed: StorySeedInput) => StorySeedInput;
}) => {
  // A phone shows the list as Codex cards, each opening its fields in a sheet,
  // instead of every card's whole form one after another.
  const phone = usePhone();
  const definition = WORLD_CARD_KINDS.find(candidate => candidate.id === kind)!;
  const cards = (worldFoundations(seed)[field] ?? []) as WorldListCard[];
  const update = (index: number, patch: Record<string, string>) => {
    const next = cards.map((card, position) => (position === index ? { ...card, ...patch } : card));
    updateSeed(setCards(next));
  };
  if (phone) return <WorldListGrid seed={seed} updateSeed={updateSeed} field={field} heading={false} />;
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
