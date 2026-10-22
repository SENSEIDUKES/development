import {
  SEED_PLACE_LIMIT,
  SEED_SPECIES_LIMIT,
  SEED_THING_LIMIT,
  type StorySeedPlace,
  type StorySeedSpecies,
  type StorySeedThing,
} from '@seihouse/sen/story-seed';
import { setPlaces, setSpecies, setThings } from '../seedState';
import { WorldCardsWorkspace, type WorldCardsWorkspaceProps } from './WorldCardsWorkspace';

/**
 * The Story Seed sections for the world's own card lists: the things it
 * already holds, the places it opens among, and the Bestiary. Each one is the
 * Codex's card kind, edited through the one world-card editor, and every slot
 * is optional: what the author leaves blank the World Blueprint fills before
 * Chapter 1.
 */

export const ThingsWorkspace = (props: WorldCardsWorkspaceProps) => (
  <WorldCardsWorkspace
    {...props}
    sectionId="things"
    kind="thing"
    field="things"
    limit={SEED_THING_LIMIT}
    setCards={cards => setThings(cards as StorySeedThing[])}
    blurb="The weapons, heirlooms, pills and tokens that already exist when the story opens — who holds each one, and where the unheld ones lie. Left empty, the Blueprint gives the cast what the story needs."
  />
);

export const PlacesWorkspace = (props: WorldCardsWorkspaceProps) => (
  <WorldCardsWorkspace
    {...props}
    sectionId="places"
    kind="place"
    field="places"
    limit={SEED_PLACE_LIMIT}
    setCards={cards => setPlaces(cards as StorySeedPlace[])}
    blurb="The places the story opens among, so the record knows where everyone is and an artist can draw them. Left empty, the Blueprint builds the opening place and the ones around it."
  />
);

export const SpeciesWorkspace = (props: WorldCardsWorkspaceProps) => (
  <WorldCardsWorkspace
    {...props}
    sectionId="species"
    kind="species"
    field="species"
    limit={SEED_SPECIES_LIMIT}
    setCards={cards => setSpecies(cards as StorySeedSpecies[])}
    blurb="The creatures natural to this world — goblins, dragonkin, whatever it has. A named beast is a character of its species, not a card here. Left empty, the Blueprint populates the world."
  />
);
