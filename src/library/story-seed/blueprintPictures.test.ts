import { expect, it, vi } from 'vitest';
import { createEmptyStorySeedInput } from '@seihouse/sen/story-seed';
import type { HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import type { CodexPictureService } from '../stories/storyCover';
import { characterPortrait, blueprintCharacters, blueprintPictureKey, blueprintPictureOwner, inheritBlueprintPictures, storyPortraitCharacters } from './blueprintPictures';
import { worldCardKey } from '@seihouse/sen/contracts';

function seed() {
  const input = createEmptyStorySeedInput();
  input.world.optional.worldFoundations.mainCharacter = { name: 'Lin Wei', gender: 'male', age: '19', appearance: 'Tall and lean.', hair: 'Black, tied back', clothing: 'Plain pale blue robes' };
  input.world.optional.worldFoundations.additionalCharacters = [{ id: 'shen', name: 'Shen Yue', gender: 'female', age: '18', appearance: 'A poised young woman.', hair: 'Black, silver hairpin', clothing: 'Pale blue with gold trim', role: 'rival', connectionToMC: 'Spirit-bound rival' }];
  return input;
}

it('uses the existing visual traits and explicit identities without an analysis call', () => {
  const [lin, shen] = blueprintCharacters(seed());
  expect(lin).toMatchObject({ key: 'main', mainCharacter: true, look: { summary: 'male, Age 19. Tall and lean.', traits: { hair: 'Black, tied back', clothing: 'Plain pale blue robes' } } });
  expect(shen).toMatchObject({ key: 'shen', relationship: 'female; Spirit-bound rival', look: { summary: 'female, Age 18. A poised young woman.' } });
  const changed = seed(); changed.world.optional.worldFoundations.mainCharacter!.hair = 'Silver';
  expect(blueprintPictureKey(blueprintCharacters(changed)[0])).not.toBe(blueprintPictureKey(lin));
  expect(blueprintPictureKey(blueprintCharacters(seed())[1])).toBe(blueprintPictureKey(shen));
  const renamed = seed(); renamed.world.optional.worldFoundations.mainCharacter!.name = 'Lin Chen';
  expect(blueprintPictureKey(blueprintCharacters(renamed)[0])).toBe(blueprintPictureKey(lin));
});

it('copies the same bytes into Codex identities, resumes after failure, and never overwrites a kept story portrait', async () => {
  const input = seed();
  const source = new Blob(['Lin portrait'], { type: 'image/png' });
  const kept = new Map<string, Blob>([[`${blueprintPictureOwner('seed')}/${blueprintPictureKey(blueprintCharacters(input)[0])}`, source]]);
  const state = { stories: [{ id: 'story', activeFoundationRevisionId: 'foundation' }], foundations: [{ id: 'foundation', input: { sourceSnapshot: { kind: 'story-seed', sourceId: 'seed', seed: input } } }], codexEntries: [{ storyId: 'story', id: 'lin-entry', cardKey: 'world:character:lin-wei' }] } as unknown as HarnessWorkspaceState;
  const keep = vi.fn(async (owner: string, key: string, image: Blob) => { kept.set(`${owner}/${key}`, image); });
  keep.mockRejectedValueOnce(new Error('Device full'));
  const service = { imageOf: async (owner, key) => kept.get(`${owner}/${key}`), keep } as Pick<CodexPictureService, 'imageOf' | 'keep'>;
  await expect(inheritBlueprintPictures(state, 'story', service)).rejects.toThrow('Device full');
  expect(kept.size).toBe(1);
  await inheritBlueprintPictures(state, 'story', service);
  expect(kept.get('story/lin-entry')).toBe(source);
  await inheritBlueprintPictures(state, 'story', service);
  expect(keep).toHaveBeenCalledTimes(2);
});

it('can manifest from structured traits when the optional appearance sentence is empty', () => {
  const character = characterPortrait({ key: 'main', name: 'Ye Chen', slots: { gender: 'male', hair: 'Black', clothing: 'Grey robes' } });
  expect(character?.look).toEqual({ summary: 'male. Ye Chen', traits: { hair: 'Black', clothing: 'Grey robes' } });
  expect(characterPortrait({ key: 'main', name: 'Ye Chen', slots: { gender: 'male' } })).toBeUndefined();
});

it('keeps named Blueprint cards addressable when only the Codex has a saved portrait', () => {
  const input = createEmptyStorySeedInput();
  input.world.optional.worldFoundations.mainCharacter = { name: 'Lin Wei' };
  expect(blueprintCharacters(input)).toMatchObject([{ key: 'main', name: 'Lin Wei', look: { summary: '' } }]);
});

it('uses the Codex look when a Blueprint card has no visual traits of its own', () => {
  const cardKey = worldCardKey('character', 'Lin Wei');
  const state = {
    worldCards: [{ storyId: 'story', key: cardKey, kind: 'character', name: 'Lin Wei', mainCharacter: true, slots: {} }],
    codexEntries: [{ storyId: 'story', id: 'lin-entry', cardKey,
      look: { summary: 'A lean young man in dark robes.', traits: { hair: 'ink black' }, from: [], at: 'now' } }],
    stories: [], foundations: [], chapters: [],
  } as unknown as HarnessWorkspaceState;
  expect(storyPortraitCharacters(state, 'story')).toMatchObject([
    { key: 'lin-entry', mainCharacter: true, look: { summary: 'A lean young man in dark robes.', traits: { hair: 'ink black' } } },
  ]);
});
