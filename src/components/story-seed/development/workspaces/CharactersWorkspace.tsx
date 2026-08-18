import {
  BookOpen,
  HeartCrack,
  Scale,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  User,
} from 'lucide-react';
import type { StorySeedCharacter, StorySeedInput } from '../../shared/storySeedSchema';
import { normalizeCodexAliases, parseCodexAliases } from '../../shared/codexContext';
import { getSeedSection } from '../seedSections';
import {
  patchMainCharacter,
  setAdditionalCharacters,
  worldFoundations,
  type UpdateSeed,
} from '../seedState';
import { LibraryTextArea, LibraryTextBox } from '../../../library';
import { WorkspaceShell, WorkspaceSubheading } from './WorkspaceShell';

interface CharactersWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}

/**
 * Optional World workspace (`world.optional.worldFoundations.mainCharacter`
 * and `.additionalCharacters`): the main character plus any pre-defined cast.
 */
export const CharactersWorkspace = ({ seed, updateSeed }: CharactersWorkspaceProps) => {
  const section = getSeedSection('characters');
  const mainCharacter = worldFoundations(seed).mainCharacter || {};
  const characters = worldFoundations(seed).additionalCharacters || [];

  const updateCharacter = (index: number, patch: Partial<StorySeedCharacter>) => {
    const next = [...characters];
    next[index] = { ...next[index], ...patch };
    updateSeed(setAdditionalCharacters(next));
  };

  return (
    <WorkspaceShell section={section} complete={section.isFilled(seed)}>
      <div className="space-y-4">
        <WorkspaceSubheading>Main Character</WorkspaceSubheading>
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
          icon={BookOpen}
          maxLength={2000}
          helpText="Describe their backstory, personality quirks, hidden talents, major flaws, or specific fated ties. High-density characterization forces a highly customized narrative."
          value={mainCharacter.bio || ''}
          onChange={(val) => updateSeed(patchMainCharacter({ bio: val }))}
          rows={3}
          placeholder="e.g., Born as the son of a fallen patriarch, carrying the blood of a Primordial dragon, extremely lazy but protective..."
        />
      </div>

      <div className="space-y-4">
        <WorkspaceSubheading>Additional Characters</WorkspaceSubheading>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              <LibraryTextBox
                size="compact"
                label="Name"
                id={index === 0 ? 'a11y-control-boqy7nd' : `char-name-${char.id}`}
                value={char.name || ''}
                onChange={(val) => updateCharacter(index, { name: val })}
                placeholder="e.g. Lin Yue"
              />
              <LibraryTextBox
                size="compact"
                label="Age"
                id={`char-age-${char.id}`}
                value={char.age || ''}
                onChange={(val) => updateCharacter(index, { age: val })}
                placeholder="e.g. 18, Ancient..."
              />
              <LibraryTextBox
                size="compact"
                label="Skin Tone"
                id={`char-skin-${char.id}`}
                value={char.skinTone || ''}
                onChange={(val) => updateCharacter(index, { skinTone: val })}
                placeholder="e.g. Pale, Olive..."
              />
              <LibraryTextBox
                size="compact"
                label="Eye Color"
                id={`char-eyes-${char.id}`}
                value={char.eyeColor || ''}
                onChange={(val) => updateCharacter(index, { eyeColor: val })}
                placeholder="e.g. Crimson, Blue..."
              />
              <LibraryTextBox
                size="compact"
                label="Power Type"
                id={`char-power-${char.id}`}
                value={char.powerType || ''}
                onChange={(val) => updateCharacter(index, { powerType: val })}
                placeholder="e.g. Frost Dao, Sword..."
              />
              <LibraryTextBox
                size="compact"
                label="Rank / Level"
                id={`char-rank-${char.id}`}
                value={char.rankLevel || ''}
                onChange={(val) => updateCharacter(index, { rankLevel: val })}
                placeholder="e.g. Foundation Est."
              />
              <LibraryTextBox
                size="compact"
                label="Role"
                id={`char-role-${char.id}`}
                value={char.role || ''}
                onChange={(val) => updateCharacter(index, { role: val })}
                placeholder="e.g. Sect Elder, Rogue..."
              />
              <LibraryTextBox
                size="compact"
                label="Connection to MC"
                id={`mc-char-connection-${char.id}`}
                value={char.connectionToMC || ''}
                onChange={(val) => updateCharacter(index, { connectionToMC: val })}
                placeholder="e.g. Rival, Foe, Ally..."
              />
              <div className="col-span-1 sm:col-span-2 md:col-span-4">
                <LibraryTextArea
                  size="compact"
                  label="Aliases / Known Titles"
                  key={`${char.id}-${normalizeCodexAliases(char.aliases, char.name).join('|')}`}
                  id={`char-aliases-${char.id}`}
                  rows={2}
                  defaultValue={normalizeCodexAliases(char.aliases, char.name).join(', ')}
                  onBlur={(e) => {
                    const aliases = parseCodexAliases(e.currentTarget.value, char.name);
                    e.currentTarget.value = aliases.join(', ');
                    updateCharacter(index, { aliases });
                  }}
                  placeholder="e.g. Sister Mei; Pavilion Mistress"
                />
                <p className="mt-1 font-sans text-[9px] text-neutral-400">User-authored only. Separate names or titles with commas, semicolons, or new lines.</p>
              </div>
              <div className="col-span-1 sm:col-span-2 md:col-span-4">
                <LibraryTextArea
                  size="compact"
                  label="Biography & Traits"
                  id={`char-bio-${char.id}`}
                  value={char.bio || ''}
                  onChange={(val) => updateCharacter(index, { bio: val })}
                  maxLength={2000}
                  rows={2}
                  placeholder="Vivid biography, personality quirks, hidden talents, major flaws, or specific fated actions..."
                />
              </div>
            </div>
          </div>
        ))}
        {characters.length < 8 && (
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
            + Add Character ({characters.length}/8)
          </button>
        )}
      </div>
    </WorkspaceShell>
  );
};
