import { useState } from 'react';
import { Eye, HeartCrack, Hourglass, Pencil, Plus, Scale, ScrollText, Shield, ShieldAlert, Sparkles, Star, User, Users, Zap } from 'lucide-react';
import { SEED_CHARACTER_LIMIT, type StorySeedCharacter, type StorySeedInput } from '@seihouse/sen/story-seed';
import { normalizeCodexAliases } from '@seihouse/sen/story-seed';
import { NarrativeButton as LibraryButton, NarrativeTextArea as LibraryTextArea } from '@seihouse/sen/presentation';
import { setAdditionalCharacters, worldFoundations, type UpdateSeed } from '../seedState';
import {
  AdditionalCharacterFields,
  CHAPTER_ZERO_CHARACTER_SLOTS,
  CHAPTER_ZERO_MAIN_CHARACTER_SLOTS,
  MainCharacterFields,
} from '../workspaces/CharactersWorkspace';
import { worldCardSlots } from '../workspaces/WorldCardFields';
import { FateDecides } from '../FateDecides';
import { BlueprintSectionHeading, EditableChip } from './BlueprintDossierPrimitives';
import { BlueprintCardSheet } from './BlueprintCardSheet';
import { CodexCardButton, CodexProfileHeader } from '@seihouse/sen/harness-generation';
import { StatTable, type StatRow } from './StatRows';

type Card = Record<string, unknown>;
const text = (card: Card, id: string) => (typeof card[id] === 'string' ? (card[id] as string) : '');
/** The Codex's own label for a character slot, so the Blueprint and the Codex name it alike. */
const slotRows = (card: Card, ids: readonly string[]): StatRow[] =>
  worldCardSlots('character', ids).map(slot => ({ id: slot.id, label: slot.label, value: text(card, slot.id) }));

/** The main character's rows, in the Seed's own labels. */
const mainRows = (card: Card): StatRow[] => [
  { id: 'age', label: 'Age', value: text(card, 'age'), icon: Hourglass },
  { id: 'startingIdentity', label: 'Starting Identity', value: text(card, 'startingIdentity'), icon: Shield },
  { id: 'personality', label: 'Personality & Alignment', value: text(card, 'personality'), icon: Star },
  { id: 'secretAdvantage', label: 'Secret Advantage', value: text(card, 'secretAdvantage'), icon: Sparkles },
  { id: 'startingWeakness', label: 'Starting Weakness', value: text(card, 'startingWeakness'), icon: ShieldAlert },
  { id: 'mainFlaw', label: 'Main Flaw', value: text(card, 'mainFlaw'), icon: HeartCrack },
  { id: 'moralAlignment', label: 'Moral Alignment', value: text(card, 'moralAlignment'), icon: Scale },
  { id: 'appearance', label: 'Appearance', value: text(card, 'appearance'), icon: Eye },
];

/** A side character's rows, in the Seed's own labels. */
const sideRows = (card: Card): StatRow[] => [
  { id: 'age', label: 'Age', value: text(card, 'age'), icon: Hourglass },
  { id: 'role', label: 'Role', value: text(card, 'role'), icon: Shield },
  { id: 'connectionToMC', label: 'Connection to MC', value: text(card, 'connectionToMC'), icon: Users },
  { id: 'skinTone', label: 'Skin Tone', value: text(card, 'skinTone'), icon: User },
  { id: 'eyeColor', label: 'Eye Color', value: text(card, 'eyeColor'), icon: Eye },
];

/** Who they are now: the Chapter 0 slots, without the ones the hero panels already show. */
const HERO_SLOTS = new Set(['powerType', 'rankLevel', 'holds', 'knows']);
const SIDE_IDENTITY_SLOTS = new Set(['skinTone', 'eyeColor']);

const Chips = ({ value }: { value: string }) => {
  const items = value.split(/[,;\n]/).map(item => item.trim()).filter(Boolean);
  return items.length
    ? <span className="bp-chips">{items.map(item => <span key={item}>{item}</span>)}</span>
    : <FateDecides />;
};

/** The hero's right column, like a Star Rail character's Light Cone and Traces. */
const HeroPanels = ({ card }: { card: Card }) => (
  <div className="bp-hero-panels">
    <section className="bp-mini" aria-label="Power">
      <p className="bp-mini-title"><Zap size={12} aria-hidden="true" />Power</p>
      <p className="bp-mini-value">{text(card, 'powerType') || <FateDecides />}</p>
      <p className="bp-mini-sub">{text(card, 'rankLevel') ? `Rank · ${text(card, 'rankLevel')}` : null}</p>
    </section>
    <section className="bp-mini" aria-label="Holds and knows">
      <p className="bp-mini-title"><Sparkles size={12} aria-hidden="true" />Holds</p>
      <Chips value={text(card, 'holds')} />
      <p className="bp-mini-title mt-2"><ScrollText size={12} aria-hidden="true" />Knows</p>
      <Chips value={text(card, 'knows')} />
    </section>
  </div>
);

/**
 * The Blueprint's cast, as a Star Rail "My Characters" screen: a row of
 * portraits to choose from (the main character first), then the chosen
 * character's portrait card, its stat table, and where it stands when the
 * story opens. Every field is the Seed's own and is edited in a sheet.
 */
export const CastScreen = ({ seed, updateSeed, backgroundProfile, onBackgroundProfileChange, readOnly = false }: {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
  /** The Blueprint's narrative background for the main character. */
  backgroundProfile: string;
  onBackgroundProfileChange: (backgroundProfile: string) => void;
  readOnly?: boolean;
}) => {
  const foundations = worldFoundations(seed);
  const main = (foundations.mainCharacter ?? {}) as Card;
  const cast = foundations.additionalCharacters ?? [];
  const [selected, setSelected] = useState<string>('main');
  const [editing, setEditing] = useState(false);
  const sideIndex = cast.findIndex(character => character.id === selected);
  const side = sideIndex >= 0 ? cast[sideIndex] : undefined;
  const showingMain = !side;
  const card = (side ?? main) as Card;
  const name = text(card, 'name');

  const updateSide = (patch: Partial<StorySeedCharacter>) => {
    if (sideIndex < 0) return;
    updateSeed(setAdditionalCharacters(cast.map((character, index) => (index === sideIndex ? { ...character, ...patch } : character))));
  };
  const addCharacter = () => {
    const character: StorySeedCharacter = { id: crypto.randomUUID(), name: '', aliases: [], age: '', skinTone: '', eyeColor: '', powerType: '', rankLevel: '', role: '', connectionToMC: '', bio: '' };
    updateSeed(setAdditionalCharacters([...cast, character]));
    setSelected(character.id);
    setEditing(true);
  };
  const removeSide = () => {
    updateSeed(setAdditionalCharacters(cast.filter((_, index) => index !== sideIndex)));
    setSelected('main');
  };

  const aliases = side ? normalizeCodexAliases(side.aliases, side.name) : [];
  const identitySlots = (showingMain ? CHAPTER_ZERO_MAIN_CHARACTER_SLOTS : CHAPTER_ZERO_CHARACTER_SLOTS)
    .filter(id => !HERO_SLOTS.has(id) && (showingMain || !SIDE_IDENTITY_SLOTS.has(id)));
  const editLabel = `Edit ${name || (showingMain ? 'main character' : 'character')}`;
  const edit = !readOnly && (
    <LibraryButton variant="ghost" size="sm" icon={Pencil} onClick={() => setEditing(true)} aria-label={editLabel} data-testid="blueprint-cast-edit">
      Edit
    </LibraryButton>
  );

  return (
    <div className="bp-cast" data-testid="blueprint-cast">
      {/* The cast as Codex cards, the main character first: the same card the
          Codex will show once the story begins. */}
      <div className="bp-cast-row" role="group" aria-label="Characters">
        {[{ id: 'main', card: main, main: true }, ...cast.map(character => ({ id: character.id, card: character as unknown as Card, main: false }))]
          .map(entry => {
            const entryName = text(entry.card, 'name');
            return (
              <div key={entry.id} className="bp-cast-pick">
                <CodexCardButton category="characters" name={entryName || 'Unnamed'}
                  line={entry.main ? 'Main character' : text(entry.card, 'role') || 'Character'}
                  featured={selected === entry.id || (entry.main && showingMain)}
                  aria-pressed={selected === entry.id || (entry.main && showingMain)}
                  aria-label={`${entryName || 'Unnamed'}${entry.main ? ', main character' : ''}`}
                  onClick={() => setSelected(entry.id)} />
              </div>
            );
          })}
        {!readOnly && cast.length < SEED_CHARACTER_LIMIT && (
          <div className="bp-cast-pick">
            <button type="button" className="bp-card-add" onClick={addCharacter}
              aria-label={`Add character (${cast.length}/${SEED_CHARACTER_LIMIT})`}>
              <Plus size={18} aria-hidden="true" />
              <span>Add</span>
            </button>
          </div>
        )}
      </div>

      <div className="bp-hero">
        <CodexProfileHeader category="characters" name={name || 'Unnamed'}
          line={[showingMain ? text(card, 'startingIdentity') || 'Main character' : text(card, 'role') || 'Character', text(card, 'age') && `Age ${text(card, 'age')}`].filter(Boolean).join(' · ')}
          badges={[showingMain ? 'Main character' : '', text(card, 'species')].filter(Boolean)} />
        <HeroPanels card={card} />
      </div>

      {aliases.length > 0 && (
        <p className="bp-aliases"><span>Also called</span>{aliases.join(' · ')}</p>
      )}

      <section aria-labelledby="blueprint-cast-stats-heading" className="bp-section">
        <BlueprintSectionHeading id="blueprint-cast-stats-heading" icon={User} title="Character Stats" action={edit} />
        <StatTable label="Character stats" testId="blueprint-cast-stats" rows={showingMain ? mainRows(card) : sideRows(card)} />
      </section>

      <section aria-labelledby="blueprint-cast-standing-heading" className="bp-section">
        <BlueprintSectionHeading id="blueprint-cast-standing-heading" icon={Sparkles} title="When the Story Opens"
          tagline="Their own Codex card, as the world begins." />
        <StatTable label="When the story opens" rows={slotRows(card, identitySlots)} />
      </section>

      <section aria-labelledby="blueprint-cast-bio-heading" className="bp-section">
        <BlueprintSectionHeading id="blueprint-cast-bio-heading" icon={ScrollText} title="Biography" />
        <p className="bp-prose">{text(card, 'bio') || <FateDecides />}</p>
        {showingMain && (
          <div className="blueprint-key-field mt-4">
            <LibraryTextArea
              id="blueprint-mc-profile"
              label="Generated Background"
              rightElement={readOnly ? undefined : <EditableChip />}
              icon={ScrollText}
              value={backgroundProfile}
              onChange={onBackgroundProfileChange}
              disabled={readOnly}
              rows={5}
              className="leading-relaxed"
              placeholder="The Blueprint's narrative background for the main character..."
            />
          </div>
        )}
      </section>

      <BlueprintCardSheet open={editing} onOpenChange={setEditing} readOnly={readOnly}
        title={name || (showingMain ? 'Main character' : 'New character')}
        onRemove={showingMain ? undefined : removeSide} removeLabel="Remove character">
        {showingMain
          ? <MainCharacterFields seed={seed} updateSeed={updateSeed} />
          : side && <AdditionalCharacterFields character={side} index={sideIndex} onChange={updateSide} />}
      </BlueprintCardSheet>
    </div>
  );
};
