import { useState } from 'react';
import { Plus } from 'lucide-react';
import { SEED_CHARACTER_LIMIT, type StorySeedCharacter, type StorySeedInput } from '@seihouse/sen/story-seed';
import { setAdditionalCharacters, worldFoundations, type UpdateSeed } from '../seedState';
import { AdditionalCharacterFields, MainCharacterFields } from '../workspaces/CharacterFields';
import { BlueprintCardSheet } from './BlueprintCardSheet';
import { CodexCardButton } from '@seihouse/sen/harness-generation';
import './blueprint.css';

const MAIN = 'main';

/**
 * The cast as Codex cards, the main character first: a card opens that
 * character's fields, the Seed's own, in a sheet, and the last card slot adds
 * a character. The Seed's Characters page uses it on a phone, where every
 * character's whole form one after another ran to six screens.
 */
export const CastCardGrid = ({ seed, updateSeed }: { seed: StorySeedInput; updateSeed: UpdateSeed }) => {
  const [open, setOpen] = useState<string | null>(null);
  const foundations = worldFoundations(seed);
  const main = foundations.mainCharacter ?? {};
  const cast = foundations.additionalCharacters ?? [];
  const sideIndex = open && open !== MAIN ? cast.findIndex(character => character.id === open) : -1;
  const side = sideIndex >= 0 ? cast[sideIndex] : undefined;
  const mainName = main.name?.trim();

  const updateSide = (patch: Partial<StorySeedCharacter>) =>
    updateSeed(setAdditionalCharacters(cast.map((character, index) => (index === sideIndex ? { ...character, ...patch } : character))));
  const add = () => {
    const character: StorySeedCharacter = { id: crypto.randomUUID(), name: '', aliases: [], age: '', skinTone: '', eyeColor: '', powerType: '', rankLevel: '', role: '', connectionToMC: '', bio: '' };
    updateSeed(setAdditionalCharacters([...cast, character]));
    setOpen(character.id);
  };

  return (
    <>
      <div className="bp-tiles" data-testid="seed-cast-cards">
        <CodexCardButton category="characters" name={mainName || 'Unnamed'} line={main.startingIdentity?.trim() || 'Main character'}
          badge="Main" featured aria-label={`Main character: ${mainName || 'Unnamed'}`} onClick={() => setOpen(MAIN)} />
        {cast.map(character => (
          <CodexCardButton key={character.id} category="characters" name={character.name?.trim() || 'Unnamed'}
            line={character.role?.trim() || 'Character'} aria-label={`Character: ${character.name?.trim() || 'Unnamed'}`}
            onClick={() => setOpen(character.id)} />
        ))}
        {cast.length < SEED_CHARACTER_LIMIT && (
          <button type="button" className="bp-card-add" onClick={add}>
            <Plus size={18} aria-hidden="true" />
            <span>Add Character</span>
            <span className="bp-card-add-count">{cast.length}/{SEED_CHARACTER_LIMIT}</span>
          </button>
        )}
      </div>
      <BlueprintCardSheet open={open === MAIN || Boolean(side)} onOpenChange={next => { if (!next) setOpen(null); }}
        title={open === MAIN ? (mainName || 'Main character') : side?.name?.trim() || 'New character'}
        onRemove={side ? () => updateSeed(setAdditionalCharacters(cast.filter((_, index) => index !== sideIndex))) : undefined}
        removeLabel="Remove character">
        {open === MAIN
          ? <MainCharacterFields seed={seed} updateSeed={updateSeed} />
          : side && <AdditionalCharacterFields character={side} index={sideIndex} onChange={updateSide} />}
      </BlueprintCardSheet>
    </>
  );
};
