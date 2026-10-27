import { type StorySeedCharacter, type StorySeedInput, SEED_CHARACTER_LIMIT } from '@seihouse/sen/story-seed';
import { getSeedSection } from '../seedSections';
import { setAdditionalCharacters, worldFoundations, type UpdateSeed } from '../seedState';
import { SeedSectionFrame, WorkspaceSubheading } from './SeedSectionFrame';
import { AdditionalCharacterFields, MainCharacterFields } from './CharacterFields';
import { usePhone } from '../../../library-shell/development/workspaceMedia';
import { CastCardGrid } from '../blueprint/CastCardGrid';

interface CharactersWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}

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
  // A phone shows the cast as Codex cards, each opening its fields in a sheet,
  // instead of every character's whole form one after another.
  const phone = usePhone();
  if (phone) return (
    <SeedSectionFrame section={section} complete={section.isFilled(seed)}>
      <CastCardGrid seed={seed} updateSeed={updateSeed} />
    </SeedSectionFrame>
  );
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
