import { Route } from 'lucide-react';
import { LibraryAbilityIcon as SENAbilityIcon } from '@seihouse/library-ui';
import { SEED_ABILITY_LIMIT, type StorySeedAbilityCard, type StorySeedInput } from '@seihouse/sen/story-seed';
import { getSeedSection } from '../seedSections';
import { patchAbilities, setStartingAbilities, worldFoundations, type UpdateSeed } from '../seedState';
import { NarrativeTextArea as LibraryTextArea, NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';
import { GuidanceNote, SeedSectionFrame } from './SeedSectionFrame';
import { WorldCardsEditor } from './WorldCardsWorkspace';

interface AbilitiesWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}

/** The Seed's ability fields; the Seed workspace and Blueprint review share them. */
export const AbilitiesFields = ({ seed, updateSeed }: AbilitiesWorkspaceProps) => {
  const abilities = worldFoundations(seed).abilities || {};
  return (
    <div className="grid grid-cols-1 gap-4">
      <LibraryTextBox
        id="a11y-control-itgsjgw"
        label="Starting Ability"
        icon={SENAbilityIcon}
        value={abilities.startingPowerConcept || ''}
        onChange={(val) => updateSeed(patchAbilities({ startingPowerConcept: val }))}
        placeholder="e.g., Qi Condensation Tier 1, Feng Shui Level 1..."
      />
      <LibraryTextArea
        id="unique-path-input"
        label="Unique Growth Path"
        icon={Route}
        maxLength={1200}
        helpText="What makes the main character's way of growing power unlike anyone else's — a forbidden method, a twisted bloodline, a borrowed system."
        value={abilities.uniquePath || ''}
        onChange={(val) => updateSeed(patchAbilities({ uniquePath: val }))}
        rows={2}
        placeholder="e.g., Cultivates by severing other people's fates instead of gathering qi..."
      />
    </div>
  );
};

/** Optional World workspace (`world.optional.worldFoundations.abilities`). */
export const AbilitiesWorkspace = ({ seed, updateSeed }: AbilitiesWorkspaceProps) => {
  const section = getSeedSection('abilities');
  return (
    <SeedSectionFrame section={section} complete={section.isFilled(seed)}>
      <AbilitiesFields seed={seed} updateSeed={updateSeed} />

      <h4 className="pt-2 font-sc text-xs font-bold uppercase tracking-widest text-neutral-300">
        Techniques the world already knows
      </h4>
      <p className="font-sans text-xs text-neutral-400">
        Each one becomes its own Codex card. Name the ones your characters already know, and what
        they look like when they are used, so an artist can draw them. Left empty, the Blueprint
        writes the ones the story needs.
      </p>
      <WorldCardsEditor
        seed={seed}
        updateSeed={updateSeed}
        kind="ability"
        field="startingAbilities"
        limit={SEED_ABILITY_LIMIT}
        setCards={cards => setStartingAbilities(cards as StorySeedAbilityCard[])}
      />

      <GuidanceNote title="Abilities vs. World Rules" tone="world">
        Abilities belong to the main character and the cast — what they start with and what sets
        them apart. The World Rules section belongs to the world — the ladder everyone climbs.
      </GuidanceNote>
    </SeedSectionFrame>
  );
};
