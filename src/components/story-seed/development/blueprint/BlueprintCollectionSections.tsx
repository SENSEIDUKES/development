import { memo } from 'react';
import { MapPin, PawPrint, Shield, Sparkles, Sword } from 'lucide-react';
import { LibraryCharactersIcon as SENCharactersIcon } from '@seihouse/library-ui';
import {
  SEED_ABILITY_LIMIT,
  SEED_PLACE_LIMIT,
  SEED_SPECIES_LIMIT,
  SEED_THING_LIMIT,
  type StorySeedAbilityCard,
  type StorySeedInput,
  type StorySeedPlace,
  type StorySeedSpecies,
  type StorySeedThing,
} from '@seihouse/sen/story-seed';
import { setPlaces, setSpecies, setStartingAbilities, setThings, type UpdateSeed } from '../seedState';
import { AdditionalCharactersEditor } from '../workspaces/CharactersWorkspace';
import { FactionsEditor } from '../workspaces/FactionsWorkspace';
import { WorldCardsEditor } from '../workspaces/WorldCardsWorkspace';
import { NarrativePanel as LibraryPanel } from '@seihouse/sen/presentation';
import { BlueprintSectionHeading } from './BlueprintDossierPrimitives';

interface BlueprintCollectionSectionsProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}

/** The world's own card lists, in the order the Codex reads them. */
const WORLD_LISTS = [
  {
    kind: 'thing' as const, field: 'things' as const, limit: SEED_THING_LIMIT, icon: Sword, title: 'Things',
    tagline: 'What already exists when the story opens, and who holds it.',
    setCards: (cards: { id: string; name: string }[]) => setThings(cards as StorySeedThing[]),
  },
  {
    kind: 'ability' as const, field: 'startingAbilities' as const, limit: SEED_ABILITY_LIMIT, icon: Sparkles, title: 'Abilities',
    tagline: 'The techniques the world already knows, and how they look when used.',
    setCards: (cards: { id: string; name: string }[]) => setStartingAbilities(cards as StorySeedAbilityCard[]),
  },
  {
    kind: 'place' as const, field: 'places' as const, limit: SEED_PLACE_LIMIT, icon: MapPin, title: 'Places',
    tagline: 'Where the story opens, and the places around it.',
    setCards: (cards: { id: string; name: string }[]) => setPlaces(cards as StorySeedPlace[]),
  },
  {
    kind: 'species' as const, field: 'species' as const, limit: SEED_SPECIES_LIMIT, icon: PawPrint, title: 'Bestiary',
    tagline: 'The creatures natural to this world.',
    setCards: (cards: { id: string; name: string }[]) => setSpecies(cards as StorySeedSpecies[]),
  },
];

/** Side characters and factions: the Seed's own lists, edited from the Blueprint review. */
export const BlueprintCollectionSections = memo(({
  seed,
  updateSeed,
}: BlueprintCollectionSectionsProps) => (
  <>
    <LibraryPanel as="section" aria-labelledby="blueprint-side-characters-heading" padding="md">
      <BlueprintSectionHeading
        id="blueprint-side-characters-heading"
        icon={SENCharactersIcon}
        title="Side Characters"
        tagline="Cast members the story can draw on. Edits save to the Story Seed."
      />

      <div className="mt-5 space-y-4">
        <AdditionalCharactersEditor seed={seed} updateSeed={updateSeed} />
      </div>
    </LibraryPanel>

    <LibraryPanel as="section" aria-labelledby="blueprint-factions-heading" padding="md">
      <BlueprintSectionHeading
        id="blueprint-factions-heading"
        icon={Shield}
        title="Factions"
        tagline="Sects, guilds, and powers that already shape the world. Edits save to the Story Seed."
      />

      <div className="mt-5 space-y-4">
        <FactionsEditor seed={seed} updateSeed={updateSeed} />
      </div>
    </LibraryPanel>

    {/* The rest of the world at Chapter 0, as the Blueprint filled it. */}
    {WORLD_LISTS.map(list => (
      <LibraryPanel key={list.field} as="section" aria-labelledby={`blueprint-${list.field}-heading`} padding="md">
        <BlueprintSectionHeading
          id={`blueprint-${list.field}-heading`}
          icon={list.icon}
          title={list.title}
          tagline={`${list.tagline} Edits save to the Story Seed.`}
        />

        <div className="mt-5 space-y-4">
          <WorldCardsEditor seed={seed} updateSeed={updateSeed} kind={list.kind} field={list.field} limit={list.limit} setCards={list.setCards} />
        </div>
      </LibraryPanel>
    ))}
  </>
));

BlueprintCollectionSections.displayName = 'BlueprintCollectionSections';
