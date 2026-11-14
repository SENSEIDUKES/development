import { storyCodexOf, worldCardLook, type CodexPictureMade, type HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import { worldCardKey } from '@seihouse/sen/contracts';
import type { StorySeedInput, StorySeedRecord } from '@seihouse/sen/story-seed';
import type { CodexPictureService } from '../stories/storyCover';

export interface PortraitCharacter extends CodexPictureMade {
  mainCharacter: boolean;
  relationship?: string;
  /** Visual inputs only: renaming a character must not discard their portrait. */
  visualIdentity?: string;
}

/** The card's stated identity travels with its look; no look-describer call is needed. */
export function characterPortrait(card: { key: string; name: string; mainCharacter?: boolean; slots: Record<string, string> }): PortraitCharacter | undefined {
  const stated = card.slots.appearance?.trim();
  const look = worldCardLook({ kind: 'character', slots: { ...card.slots, appearance: stated || card.name } });
  if (!look || !card.name.trim() || (!stated && !Object.keys(look.traits).length)) return undefined;
  const identity = [card.slots.gender, card.slots.age && `Age ${card.slots.age}`, card.slots.species].filter(Boolean).join(', ');
  return { key: card.key, name: card.name, subject: 'character', mainCharacter: Boolean(card.mainCharacter),
    relationship: [card.slots.gender, card.slots.connectionToMC || card.slots.role].filter(Boolean).join('; '),
    visualIdentity: JSON.stringify([identity, stated ?? '', look.traits]),
    look: { ...look, summary: [identity, look.summary].filter(Boolean).join('. ') } };
}

/** Stable editor IDs, rather than cast positions or names, identify pre-story portraits. */
export function blueprintCharacters(seed: StorySeedInput): PortraitCharacter[] {
  const world = seed.world.optional.worldFoundations;
  return [{ ...world.mainCharacter, id: 'main' }, ...(world.additionalCharacters ?? [])].flatMap((character, index) => {
    const slots = Object.fromEntries(Object.entries(character).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
    const name = character.name?.trim();
    if (!name) return [];
    const portrait = characterPortrait({ key: character.id, name, mainCharacter: index === 0, slots });
    return [portrait ?? { key: character.id, name, mainCharacter: index === 0, subject: 'character' as const, look: { summary: '', traits: {} } }];
  });
}

export const blueprintPictureOwner = (seedId: string) => `blueprint:${seedId}`;
/** Including the visual input prevents a replacement Blueprint from inheriting an unrelated portrait. */
export const blueprintPictureKey = (character: PortraitCharacter) => JSON.stringify([character.key, character.visualIdentity ?? character.look]);

export interface BlueprintPictureService {
  pictureOf: (seedId: string, character: PortraitCharacter) => string | undefined;
  manifest: (record: StorySeedRecord, character: PortraitCharacter) => Promise<void>;
}

export function storyPortraitCharacters(state: HarnessWorkspaceState, storyId: string): PortraitCharacter[] {
  const characters = state.worldCards.filter(card => card.storyId === storyId && card.kind === 'character').flatMap(card => {
    const entry = state.codexEntries.find(candidate => candidate.storyId === storyId && candidate.cardKey === card.key);
    const character = entry && (characterPortrait({ ...card, key: entry.id }) ?? {
      key: entry.id, name: card.name, subject: 'character' as const, mainCharacter: Boolean(card.mainCharacter),
      relationship: [card.slots.gender, card.slots.connectionToMC || card.slots.role].filter(Boolean).join('; '),
      look: entry.look ? { summary: entry.look.summary, traits: entry.look.traits } : { summary: '', traits: {} },
    });
    return character ? [character] : [];
  });
  if (!characters.some(character => character.mainCharacter)) {
    const codex = storyCodexOf(state, storyId, state.chapters.filter(chapter => chapter.storyId === storyId));
    for (const character of codex.characters) if (!characters.some(candidate => candidate.key === character.key)) {
      characters.push({ key: character.key, name: character.name, subject: 'character', mainCharacter: character.mainCharacter,
        look: character.appearance?.look ?? { summary: character.appearance?.description ?? '', traits: {} } });
    }
  }
  return characters.sort((a, b) => Number(b.mainCharacter) - Number(a.mainCharacter));
}

/** Idempotent handoff. The source remains available if any device write fails. */
export async function inheritBlueprintPictures(state: HarnessWorkspaceState, storyId: string, pictures: Pick<CodexPictureService, 'imageOf' | 'keep'>): Promise<void> {
  const story = state.stories.find(candidate => candidate.id === storyId);
  const source = state.foundations.find(candidate => candidate.id === story?.activeFoundationRevisionId)?.input.sourceSnapshot;
  if (source?.kind !== 'story-seed' || !source.sourceId || !source.seed) return;
  for (const character of blueprintCharacters(source.seed as StorySeedInput)) {
    const cardKey = worldCardKey('character', character.name);
    const entry = state.codexEntries.find(candidate => candidate.storyId === storyId && candidate.cardKey === cardKey);
    if (!entry || await pictures.imageOf(storyId, entry.id)) continue;
    const image = await pictures.imageOf(blueprintPictureOwner(source.sourceId), blueprintPictureKey(character));
    if (image) await pictures.keep(storyId, entry.id, image);
  }
}
