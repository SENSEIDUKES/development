import { WORLD_CARD_KINDS, type WorldCardKindId, type WorldCardSlot } from '@seihouse/sen/contracts';
import { NarrativeTextArea as LibraryTextArea, NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';

/**
 * The Story Seed's fields for one Codex card kind, written from that kind's one
 * definition (`WORLD_CARD_KINDS`). A new slot on a card kind appears here, in
 * the Blueprint's answer and on the Codex card together, so the Seed can never
 * be missing a slot the Codex shows.
 *
 * Each field says what it holds, so the author knows what the slot is for, and
 * every one is optional: what they leave blank the World Blueprint fills before
 * Chapter 1.
 */

/** Slots long enough to want a box of their own. */
const WIDE_SLOTS = new Set(['appearance', 'bio', 'description', 'goals', 'ties', 'laws', 'era', 'holds', 'knows']);

export const worldCardSlots = (kind: WorldCardKindId, only?: readonly string[]): WorldCardSlot[] => {
  const slots = WORLD_CARD_KINDS.find(candidate => candidate.id === kind)!.slots.filter(slot => !slot.aliases);
  return only ? slots.filter(slot => only.includes(slot.id)) : slots;
};

export const WorldCardSlotFields = <Card extends object>({ kind, card, idPrefix, only, onChange }: {
  kind: WorldCardKindId;
  card: Card;
  /** Keeps every field's id unique on a page with several cards. */
  idPrefix: string;
  /** The slots to show here; the rest of the kind's slots are shown by their own fields. */
  only?: readonly string[];
  onChange: (patch: Partial<Record<string, string>>) => void;
}) => <>
  {worldCardSlots(kind, only).map(slot => {
    const value = (card as Record<string, unknown>)[slot.id];
    const id = `${idPrefix}-${slot.id}`;
    const common = {
      size: 'compact' as const,
      label: slot.label,
      id,
      value: typeof value === 'string' ? value : '',
      onChange: (next: string) => onChange({ [slot.id]: next }),
      placeholder: slot.asks.charAt(0).toUpperCase() + slot.asks.slice(1),
    };
    return WIDE_SLOTS.has(slot.id)
      ? <div key={slot.id} className="col-span-1 sm:col-span-2 md:col-span-3">
          <LibraryTextArea {...common} rows={2} maxLength={600} />
        </div>
      : <LibraryTextBox key={slot.id} {...common} />;
  })}
</>;

/** A card in one of the Seed's world lists. */
export type WorldListCard = { id: string; name: string } & Record<string, unknown>;

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
