/**
 * The world record's card kinds: the master schema.
 *
 * The Codex decides the slots (SENSEI, 2026-10-21). Every kind of Codex card
 * is defined once, here, with its slots; the Story Seed holds those same
 * slots, the World Blueprint fills the ones the author left blank, and the
 * Codex shows them. Nothing derives a second list of its own, so the Seed and
 * the Codex can never drift apart again, and a new kind brings its Seed slots
 * and its Codex card with it.
 *
 * A slot is here only because one of the record's two tests needs it
 * (HARNESS_PRINCIPLES, "Translation across media"):
 *
 * - **the artist test:** can someone draw any scene from the record alone?
 * - **the save-game test:** can a game load the world exactly as it stands?
 *
 * The record stays medium-neutral: "at the North Ridge Gate, at dusk,
 * wounded", never a panel, a camera or an art style.
 */

/** Which of the record's tests needs a slot. */
export type WorldRecordTest = 'artist' | 'save-game' | 'both' | 'other-media';

export type WorldCardKindId = 'character' | 'thing' | 'ability' | 'place' | 'faction' | 'species' | 'world-rules';

export interface WorldCardSlot {
  /** The field the Story Seed holds it in, and the field the Blueprint answers with. */
  id: string;
  /** How the Codex and the Story Seed name it. */
  label: string;
  test: WorldRecordTest;
  /** Whether the story changes it after Chapter 0. */
  changes: boolean;
  /** What the slot holds, in one line the author and the model both read. */
  asks: string;
  /** Names that also resolve to this card, rather than a fact about it. Only the author writes them. */
  aliases?: true;
}

export interface WorldCardKind {
  id: WorldCardKindId;
  /** One card's name: "Character". */
  label: string;
  /** The Codex group's name: "Characters". */
  plural: string;
  /** What the kind is for, in one line. */
  purpose: string;
  /** One sheet for the whole story instead of a card per entity (World rules). */
  single?: true;
  slots: WorldCardSlot[];
}

/**
 * Every kind of Codex card, with its slots in the order a card reads.
 *
 * Starting CTE state is deliberately not here: it is the CTE engine's step,
 * and its numbers are the owner's to decide (the World at Chapter 0 plan,
 * phase C). No agent invents them.
 */
export const WORLD_CARD_KINDS: readonly WorldCardKind[] = [
  {
    id: 'character',
    label: 'Character',
    plural: 'Characters',
    purpose: 'Everyone who already exists when the story opens. A named beast is a character too.',
    slots: [
      { id: 'name', label: 'Name', test: 'both', changes: false, asks: 'the name the story writes them by' },
      { id: 'aliases', label: 'Other names', test: 'both', changes: true, asks: 'other names the story calls them by', aliases: true },
      { id: 'bio', label: 'Who they are', test: 'artist', changes: false, asks: 'who they are now, in one line' },
      { id: 'role', label: 'Role', test: 'save-game', changes: false, asks: 'their part in the story: ally, rival, elder, master' },
      { id: 'gender', label: 'Gender', test: 'artist', changes: false, asks: 'their gender' },
      { id: 'age', label: 'Age', test: 'artist', changes: true, asks: 'their age' },
      { id: 'appearance', label: 'Look', test: 'artist', changes: true, asks: 'how they look, in one line an artist could draw them from' },
      { id: 'skinTone', label: 'Skin', test: 'artist', changes: false, asks: 'their skin' },
      { id: 'eyeColor', label: 'Eyes', test: 'artist', changes: false, asks: 'their eyes' },
      { id: 'species', label: 'Species', test: 'artist', changes: false, asks: 'their species, when they are not human' },
      { id: 'location', label: 'Where they are', test: 'save-game', changes: true, asks: 'the place they are in when the story opens' },
      { id: 'powerType', label: 'Power', test: 'both', changes: false, asks: 'the kind of power they use' },
      { id: 'rankLevel', label: 'Rank', test: 'both', changes: true, asks: "their rank on the world's ladder" },
      { id: 'holds', label: 'Holds', test: 'both', changes: true, asks: 'the things they already have, by name' },
      { id: 'knows', label: 'Knows', test: 'both', changes: true, asks: 'the abilities they already know, by name' },
      { id: 'status', label: 'Status', test: 'both', changes: true, asks: 'what condition they are in: well, wounded, sealed, captive' },
      { id: 'goals', label: 'Goals and debts', test: 'save-game', changes: true, asks: 'what they want, hold to, or owe' },
      { id: 'connectionToMC', label: 'Tie to the main character', test: 'save-game', changes: true, asks: 'how they stand with the main character' },
      { id: 'ties', label: 'Ties', test: 'save-game', changes: true, asks: 'who else they are allied, related, hostile or bound to' },
      { id: 'belongsTo', label: 'Belongs to', test: 'save-game', changes: true, asks: 'the factions they belong to, by name' },
      { id: 'voice', label: 'Voice', test: 'other-media', changes: false, asks: 'the voice to cast them with: its age, weight and energy in a few words, as "an energetic young man" or "an old voice full of wisdom"' },
    ],
  },
  {
    id: 'thing',
    label: 'Thing',
    plural: 'Items',
    purpose: 'Everything that already exists when the story opens: weapons, heirlooms, pills, tokens.',
    slots: [
      { id: 'name', label: 'Name', test: 'both', changes: false, asks: 'the name the story writes it by' },
      { id: 'appearance', label: 'Look', test: 'artist', changes: true, asks: 'how it looks, in one line an artist could draw it from' },
      { id: 'count', label: 'How many', test: 'save-game', changes: true, asks: 'how many there are, when more than one' },
      { id: 'holder', label: 'Held by', test: 'save-game', changes: true, asks: 'the character who holds it' },
      { id: 'location', label: 'Where it lies', test: 'save-game', changes: true, asks: 'the place it lies in, when no one holds it' },
      { id: 'status', label: 'Status', test: 'both', changes: true, asks: 'what condition it is in: whole, damaged, sealed' },
    ],
  },
  {
    id: 'ability',
    label: 'Ability',
    plural: 'Abilities',
    purpose: 'The techniques and powers that already exist when the story opens. Who knows each one is on their card.',
    slots: [
      { id: 'name', label: 'Name', test: 'both', changes: false, asks: 'the name the story writes it by' },
      { id: 'appearance', label: 'How it looks', test: 'artist', changes: true, asks: 'what it looks like when it is used' },
      { id: 'ladder', label: 'Levels', test: 'save-game', changes: false, asks: "the rank ladder its levels follow, from the world's rules" },
    ],
  },
  {
    id: 'place',
    label: 'Place',
    plural: 'Places',
    purpose: 'The places the world already has, so the record knows where everyone is.',
    slots: [
      { id: 'name', label: 'Name', test: 'both', changes: false, asks: 'the name the story writes it by' },
      { id: 'appearance', label: 'Look', test: 'artist', changes: true, asks: 'how it looks: its land, its buildings, its light, its size' },
      { id: 'within', label: 'Inside', test: 'save-game', changes: false, asks: 'the larger place it sits inside' },
      { id: 'heldBy', label: 'Held by', test: 'save-game', changes: true, asks: 'the faction that holds it' },
      { id: 'condition', label: 'Condition', test: 'both', changes: true, asks: 'what condition it is in: whole, besieged, burning, ruined' },
    ],
  },
  {
    id: 'faction',
    label: 'Faction',
    plural: 'Factions',
    purpose: 'The sects, clans, empires, guilds, orders and religions the world already has.',
    slots: [
      { id: 'name', label: 'Name', test: 'both', changes: false, asks: 'the name the story writes it by' },
      { id: 'aliases', label: 'Other names', test: 'both', changes: true, asks: 'other names the story calls it by', aliases: true },
      { id: 'factionKind', label: 'Kind', test: 'save-game', changes: false, asks: 'what kind of body it is: sect, clan, empire, guild, order, religion' },
      { id: 'role', label: 'Role', test: 'save-game', changes: false, asks: 'its part in the story: ruling power, rival, patron' },
      { id: 'appearance', label: 'Look', test: 'artist', changes: true, asks: 'its emblem, colours and dress, so its members are drawn right' },
      { id: 'seat', label: 'Seat', test: 'save-game', changes: true, asks: 'the place it rules from' },
      { id: 'leader', label: 'Leader', test: 'save-game', changes: true, asks: 'the character who leads it' },
      { id: 'powerLevel', label: 'Power', test: 'save-game', changes: true, asks: 'how strong it is beside the others' },
      { id: 'standing', label: 'Standing', test: 'save-game', changes: true, asks: 'where it stands: rising, ruling, falling, fallen' },
      { id: 'alignment', label: 'Alignment', test: 'save-game', changes: false, asks: 'what it says it stands for' },
      { id: 'ties', label: 'Ties', test: 'save-game', changes: true, asks: 'the factions it is allied with, rivals with, at war with or vassal to' },
      { id: 'connectionToMC', label: 'Tie to the main character', test: 'save-game', changes: true, asks: 'how it stands with the main character' },
      { id: 'description', label: 'What it is', test: 'save-game', changes: false, asks: 'its hierarchy and what it believes, in one line' },
    ],
  },
  {
    id: 'species',
    label: 'Species',
    plural: 'Bestiary',
    purpose: 'The creatures natural to the world. A named beast is a character of its species.',
    slots: [
      { id: 'name', label: 'Name', test: 'both', changes: false, asks: 'the name the story writes it by' },
      { id: 'appearance', label: 'Look', test: 'artist', changes: false, asks: 'how it looks, in one line an artist could draw it from' },
      { id: 'habitat', label: 'Where it lives', test: 'save-game', changes: true, asks: 'the places it lives in' },
      { id: 'strength', label: 'Strength', test: 'save-game', changes: false, asks: "how dangerous or strong it is, on the world's ladder" },
      { id: 'mind', label: 'Mind', test: 'save-game', changes: false, asks: 'whether it speaks or thinks' },
    ],
  },
  {
    id: 'world-rules',
    label: 'World rules',
    plural: 'World rules',
    purpose: 'The one sheet every other card refers to: the ladder, the laws, and the age the story stands in.',
    single: true,
    slots: [
      { id: 'knownRanks', label: 'The rank ladder', test: 'both', changes: false, asks: "the world's ranks in order, so ranks and levels can be compared" },
      { id: 'flavor', label: 'How power works', test: 'both', changes: false, asks: 'what kind of power this world runs on' },
      { id: 'laws', label: 'Laws and customs', test: 'save-game', changes: true, asks: 'the laws and customs that change what can happen, one line each' },
      { id: 'era', label: 'Era and conditions', test: 'save-game', changes: false, asks: 'the age the story stands in and the conditions people live under' },
    ],
  },
];

export const worldCardKind = (id: WorldCardKindId): WorldCardKind => {
  const kind = WORLD_CARD_KINDS.find(candidate => candidate.id === id);
  if (!kind) throw new Error(`Unknown world card kind: ${id}`);
  return kind;
};

/** A kind's slots that hold a fact, without the names that only resolve to the card. */
export const worldCardFactSlots = (id: WorldCardKindId): WorldCardSlot[] =>
  worldCardKind(id).slots.filter(slot => slot.id !== 'name' && !slot.aliases);

/** Every slot a kind holds, by its field name. */
export const worldCardSlotFields = (id: WorldCardKindId): string[] => worldCardKind(id).slots.map(slot => slot.id);

// ─── The world as it stands at Chapter 0 ─────────────────────────────────────

/**
 * One card of the world the story opens with: what the author filled in the
 * Story Seed, and what the World Blueprint filled for the blanks. It is the
 * world before the first chapter, so no fact points at a passage yet.
 */
export interface WorldCardAtChapterZero {
  /** Stable for this story: its kind and the name the world knows it by. */
  key: string;
  kind: WorldCardKindId;
  name: string;
  aliases?: string[];
  mainCharacter?: true;
  /** The slots that are filled, by field name. */
  slots: Record<string, string>;
}

/**
 * The world at Chapter 0: every card the Story Seed and its World Blueprint
 * made, before a single chapter is written. The story's later chapters add to
 * this record; they never replace it. Characters, factions and anything else
 * that arrives after Chapter 0 are still created by the chapters that bring
 * them in.
 *
 * The record is complete; what the **reader** sees of it is not. A reader
 * meets a card when the story reaches it (SENSEI, 2026-10-22: "this is
 * important for the AI generation side of this to avoid spoilers, the
 * creators are the readers"). The world is still whole underneath, for
 * everything made from it.
 */
export interface WorldAtChapterZero {
  cards: WorldCardAtChapterZero[];
  /**
   * The reader may see every card from the start. Absent, the default, a card
   * waits until the story reaches it, so a world the model wrote never spoils
   * the story it was written for.
   *
   * Set for a novel whose reader already knows its world: an author who brings
   * their own novel in and expands it here (SENSEI, 2026-10-22).
   */
  openToTheReader?: true;
}

/**
 * A stable key for a Chapter 0 card: its kind and its name, however the name
 * is written. Every letter and number of every script is kept, the way the
 * record compares names everywhere else, so two names a story tells apart keep
 * two keys in Chinese, Japanese, Arabic or Hebrew as surely as in English.
 */
export const worldCardKey = (kind: WorldCardKindId, name: string): string =>
  `chapter-0:${kind}:${name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')}`;

export const worldCardsOfKind = (
  world: WorldAtChapterZero | undefined,
  kind: WorldCardKindId,
): WorldCardAtChapterZero[] => (world?.cards ?? []).filter(card => card.kind === kind);

/** The world's one World rules sheet, when it has one. */
export const worldRulesCard = (world: WorldAtChapterZero | undefined): WorldCardAtChapterZero | undefined =>
  worldCardsOfKind(world, 'world-rules')[0];

/** A card's filled facts, in the order its kind reads, with the label each shows under. */
export const worldCardFacts = (card: WorldCardAtChapterZero): Array<{ slot: WorldCardSlot; value: string }> =>
  worldCardFactSlots(card.kind).flatMap(slot => {
    const value = card.slots[slot.id]?.trim();
    return value ? [{ slot, value }] : [];
  });

/** Whether a world holds anything at all. */
export const hasWorldAtChapterZero = (world: WorldAtChapterZero | undefined): boolean => Boolean(world?.cards.length);

/**
 * Whether the reader may see a card the story has not reached yet. False for
 * every world a Story Seed makes: its reader is the story's own reader.
 */
export const worldIsOpenToTheReader = (world: WorldAtChapterZero | undefined): boolean =>
  Boolean(world?.openToTheReader);
