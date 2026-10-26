import {
  Eye,
  HeartCrack,
  Hourglass,
  Scale,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  User,
} from 'lucide-react';
import { LibraryCharactersIcon as SENCharactersIcon } from '@seihouse/library-ui';
import { type StorySeedCharacter, type StorySeedInput, SEED_CHARACTER_LIMIT } from '@seihouse/sen/story-seed';
import { normalizeCodexAliases, parseCodexAliases } from '@seihouse/sen/story-seed';
import { getSeedSection } from '../seedSections';
import {
  patchMainCharacter,
  setAdditionalCharacters,
  worldFoundations,
  type UpdateSeed,
} from '../seedState';
import { NarrativeTextArea as LibraryTextArea, NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';
import { SeedSectionFrame, WorkspaceSubheading } from './SeedSectionFrame';
import { WorldCardSlotFields } from './WorldCardFields';

interface CharactersWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}

/** The Seed's main-character fields; the Seed workspace and Blueprint review share them. */
export const MainCharacterFields = ({ seed, updateSeed }: CharactersWorkspaceProps) => {
  const mainCharacter = worldFoundations(seed).mainCharacter || {};
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <LibraryTextBox
          id="a11y-control-7b2mqtu"
          label="Main Character Name"
          icon={User}
          value={mainCharacter.name || ''}
          onChange={(val) => updateSeed(patchMainCharacter({ name: val }))}
          placeholder="e.g., Lin Fan"
        />
        <LibraryTextBox
          id="mc-age-input"
          label="Age"
          icon={Hourglass}
          value={mainCharacter.age || ''}
          onChange={(val) => updateSeed(patchMainCharacter({ age: val }))}
          placeholder="e.g., 16, Ancient, Unknown"
        />
        <LibraryTextBox
          id="mc-appearance-input"
          label="Appearance"
          icon={Eye}
          value={mainCharacter.appearance || ''}
          onChange={(val) => updateSeed(patchMainCharacter({ appearance: val }))}
          placeholder="e.g., Gaunt, ash-grey eyes, a scar across one palm..."
        />
        <LibraryTextBox
          id="mc-starting-identity-input"
          label="Starting Identity"
          icon={Shield}
          value={mainCharacter.startingIdentity || ''}
          onChange={(val) => updateSeed(patchMainCharacter({ startingIdentity: val }))}
          placeholder="e.g., Crippled young master, modern transmigrator..."
        />
        <LibraryTextBox
          id="mc-personality-input"
          label="Personality & Alignment"
          icon={Star}
          value={mainCharacter.personality || ''}
          onChange={(val) => updateSeed(patchMainCharacter({ personality: val }))}
          placeholder="e.g., Ruthless but protective, chaotic neutral..."
        />
        <LibraryTextBox
          id="mc-secret-advantage-input"
          label="Secret Advantage / Cheat"
          icon={Sparkles}
          value={mainCharacter.secretAdvantage || ''}
          onChange={(val) => updateSeed(patchMainCharacter({ secretAdvantage: val }))}
          placeholder="e.g., System interface, primeval bloodline..."
        />
        <LibraryTextBox
          id="mc-starting-weakness-input"
          label="Starting Weakness"
          icon={ShieldAlert}
          value={mainCharacter.startingWeakness || ''}
          onChange={(val) => updateSeed(patchMainCharacter({ startingWeakness: val }))}
          placeholder="e.g., Destroyed meridians, demonic curse..."
        />
        <LibraryTextBox
          id="mc-main-flaw-input"
          label="Main Flaw"
          icon={HeartCrack}
          value={mainCharacter.mainFlaw || ''}
          onChange={(val) => updateSeed(patchMainCharacter({ mainFlaw: val }))}
          placeholder="e.g., Cannot trust allies, crippling pride..."
        />
        <LibraryTextBox
          id="mc-moral-alignment-input"
          label="Moral Alignment"
          icon={Scale}
          value={mainCharacter.moralAlignment || ''}
          onChange={(val) => updateSeed(patchMainCharacter({ moralAlignment: val }))}
          placeholder="e.g., Chaotic neutral, lawful evil..."
        />
      </div>
      <LibraryTextArea
        id="mc-bio-input"
        label="Main Character Biography & Backstory"
        icon={SENCharactersIcon}
        maxLength={2000}
        helpText="Describe their backstory, personality quirks, hidden talents, major flaws, or specific fated ties. High-density characterization forces a highly customized narrative."
        value={mainCharacter.bio || ''}
        onChange={(val) => updateSeed(patchMainCharacter({ bio: val }))}
        rows={3}
        placeholder="e.g., Born as the son of a fallen patriarch, carrying the blood of a Primordial dragon, extremely lazy but protective..."
      />
      <WorkspaceSubheading>Where they stand when the story opens</WorkspaceSubheading>
      <p className="font-sans text-xs text-neutral-400">
        Their own Codex card, as the world begins: where they are, what they hold and know, and who
        they stand with. Left blank, the World Blueprint fills it before Chapter 1.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        <WorldCardSlotFields
          kind="character"
          card={mainCharacter}
          idPrefix="mc-world"
          only={CHAPTER_ZERO_MAIN_CHARACTER_SLOTS}
          onChange={patch => updateSeed(patchMainCharacter(patch))}
        />
      </div>
    </>
  );
};

/**
 * The character card's own slots, beside the fields the Seed already asks for
 * by hand above. They come from the Codex's one definition of a character
 * card, so the Seed holds every slot the Codex shows.
 */
export const CHAPTER_ZERO_MAIN_CHARACTER_SLOTS = [
  'gender', 'skinTone', 'eyeColor', 'species', 'location',
  'powerType', 'rankLevel', 'status', 'holds', 'knows', 'goals', 'ties', 'belongsTo', 'voice',
];
export const CHAPTER_ZERO_CHARACTER_SLOTS = [
  'gender', 'species', 'location', 'status', 'appearance', 'holds', 'knows', 'goals', 'ties', 'belongsTo', 'voice',
];

/**
 * One side character's fields: the Seed's list editor and the Blueprint's
 * character sheet share them, so the two can never ask for different things.
 */
export const AdditionalCharacterFields = ({ character, index, onChange }: {
  character: StorySeedCharacter;
  /** Its place in the cast; the first keeps the Seed's original field id. */
  index: number;
  onChange: (patch: Partial<StorySeedCharacter>) => void;
}) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
    <LibraryTextBox
      size="compact"
      label="Name"
      id={index === 0 ? 'a11y-control-boqy7nd' : `char-name-${character.id}`}
      value={character.name || ''}
      onChange={(val) => onChange({ name: val })}
      placeholder="e.g. Lin Yue"
    />
    <LibraryTextBox
      size="compact"
      label="Age"
      id={`char-age-${character.id}`}
      value={character.age || ''}
      onChange={(val) => onChange({ age: val })}
      placeholder="e.g. 18, Ancient..."
    />
    <LibraryTextBox
      size="compact"
      label="Skin Tone"
      id={`char-skin-${character.id}`}
      value={character.skinTone || ''}
      onChange={(val) => onChange({ skinTone: val })}
      placeholder="e.g. Pale, Olive..."
    />
    <LibraryTextBox
      size="compact"
      label="Eye Color"
      id={`char-eyes-${character.id}`}
      value={character.eyeColor || ''}
      onChange={(val) => onChange({ eyeColor: val })}
      placeholder="e.g. Crimson, Blue..."
    />
    <LibraryTextBox
      size="compact"
      label="Power Type"
      id={`char-power-${character.id}`}
      value={character.powerType || ''}
      onChange={(val) => onChange({ powerType: val })}
      placeholder="e.g. Frost Dao, Sword..."
    />
    <LibraryTextBox
      size="compact"
      label="Rank / Level"
      id={`char-rank-${character.id}`}
      value={character.rankLevel || ''}
      onChange={(val) => onChange({ rankLevel: val })}
      placeholder="e.g. Foundation Est."
    />
    <LibraryTextBox
      size="compact"
      label="Role"
      id={`char-role-${character.id}`}
      value={character.role || ''}
      onChange={(val) => onChange({ role: val })}
      placeholder="e.g. Sect Elder, Rogue..."
    />
    <LibraryTextBox
      size="compact"
      label="Connection to MC"
      id={`mc-char-connection-${character.id}`}
      value={character.connectionToMC || ''}
      onChange={(val) => onChange({ connectionToMC: val })}
      placeholder="e.g. Rival, Foe, Ally..."
    />
    <div className="col-span-1 sm:col-span-2 md:col-span-4">
      <LibraryTextArea
        size="compact"
        label="Aliases / Known Titles"
        key={`${character.id}-${normalizeCodexAliases(character.aliases, character.name).join('|')}`}
        id={`char-aliases-${character.id}`}
        rows={2}
        defaultValue={normalizeCodexAliases(character.aliases, character.name).join(', ')}
        onBlur={(e) => {
          const aliases = parseCodexAliases(e.currentTarget.value, character.name);
          e.currentTarget.value = aliases.join(', ');
          onChange({ aliases });
        }}
        placeholder="e.g. Sister Mei; Pavilion Mistress"
      />
      <p className="mt-1 font-sans text-[9px] text-neutral-400">User-authored only. Separate names or titles with commas, semicolons, or new lines.</p>
    </div>
    <div className="col-span-1 sm:col-span-2 md:col-span-4">
      <LibraryTextArea
        size="compact"
        label="Biography & Traits"
        id={`char-bio-${character.id}`}
        value={character.bio || ''}
        onChange={(val) => onChange({ bio: val })}
        maxLength={2000}
        rows={2}
        placeholder="Vivid biography, personality quirks, hidden talents, major flaws, or specific fated actions..."
      />
    </div>
    {/* The rest of their Codex card, as the world stands at Chapter 0. */}
    <WorldCardSlotFields
      kind="character"
      card={character}
      idPrefix={`char-world-${character.id}`}
      only={CHAPTER_ZERO_CHARACTER_SLOTS}
      onChange={patch => onChange(patch as Partial<StorySeedCharacter>)}
    />
  </div>
);

/** The Seed's additional-character editor; the Seed workspace and Blueprint review share it. */
export const AdditionalCharactersEditor = ({ seed, updateSeed }: CharactersWorkspaceProps) => {
  const characters = worldFoundations(seed).additionalCharacters || [];
  const updateCharacter = (index: number, patch: Partial<StorySeedCharacter>) => {
    const next = [...characters];
    next[index] = { ...next[index], ...patch };
    updateSeed(setAdditionalCharacters(next));
  };
  return (
    <>
      <p className="font-sans text-xs text-neutral-400">
        Pre-define characters for your world. Include core traits or relationships to the main character.
        If left blank or partially filled, the Library will guess.
      </p>
      {characters.map((char, index) => (
        <div key={char.id} className="glass-panel relative space-y-3 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-sc text-xs font-bold uppercase tracking-widest text-signal">Character {index + 1}</h4>
            <button
              type="button"
              onClick={() => updateSeed(setAdditionalCharacters(characters.filter((_, i) => i !== index)))}
              className="font-sc text-xs uppercase tracking-widest text-neutral-400 transition-colors hover:text-human"
            >
              Remove
            </button>
          </div>
          <AdditionalCharacterFields character={char} index={index} onChange={patch => updateCharacter(index, patch)} />
        </div>
      ))}
      {characters.length < SEED_CHARACTER_LIMIT && (
        <button
          type="button"
          onClick={() => {
            updateSeed(setAdditionalCharacters([
              ...characters,
              { id: crypto.randomUUID(), name: '', aliases: [], age: '', skinTone: '', eyeColor: '', powerType: '', rankLevel: '', role: '', connectionToMC: '', bio: '' },
            ]));
          }}
          className="w-full rounded-xl border border-dashed border-neutral-700/70 py-2.5 font-sc text-xs uppercase tracking-widest text-neutral-400 transition-all hover:border-portal/50 hover:bg-portal/5 hover:text-portal"
        >
          + Add Character ({characters.length}/{SEED_CHARACTER_LIMIT})
        </button>
      )}
    </>
  );
};

/**
 * Optional World workspace (`world.optional.worldFoundations.mainCharacter`
 * and `.additionalCharacters`): the main character plus any pre-defined cast.
 */
export const CharactersWorkspace = ({ seed, updateSeed }: CharactersWorkspaceProps) => {
  const section = getSeedSection('characters');
  return (
    <SeedSectionFrame section={section} complete={section.isFilled(seed)}>
      <div className="space-y-4">
        <WorkspaceSubheading>Main Character</WorkspaceSubheading>
        <MainCharacterFields seed={seed} updateSeed={updateSeed} />
      </div>

      <div className="space-y-4">
        <WorkspaceSubheading>Additional Characters</WorkspaceSubheading>
        <AdditionalCharactersEditor seed={seed} updateSeed={updateSeed} />
      </div>
    </SeedSectionFrame>
  );
};
