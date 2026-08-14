import { describe, expect, it } from "vitest";
import { normalizeCreatureCodexRecords } from "./creatureCodex";

const normalize = (overrides: Partial<Parameters<typeof normalizeCreatureCodexRecords>[0]> = {}) => (
  normalizeCreatureCodexRecords({
    currentCharacters: [],
    currentBestiary: [],
    characterUpdates: [],
    bestiaryUpdates: [],
    chapterNumber: 3,
    ...overrides,
  })
);

describe("creature Codex normalization", () => {
  it("creates a species-only Bestiary entry for a generic encounter", () => {
    const result = normalize({
      bestiaryUpdates: [{
        id: "model-provided-species-id",
        name: "Ember Foxes",
        description: "Fox spirits that leave ember tracks through ruined courts.",
        classification: "Spirit beast",
        traits: ["Ember step", "Pack illusion"],
        threatLevel: "Moderate",
        signatureSound: "A crackling chitter",
        imageUrl: "https://model.invalid/ember-fox.png",
      }],
    });

    expect(result.characters).toEqual([]);
    expect(result.bestiary).toEqual([expect.objectContaining({
      id: "dev-creature-ember-foxes",
      name: "Ember Foxes",
      firstEncounteredChapter: 3,
      appearanceChapters: [3],
      notableIndividualIds: [],
    })]);
    expect(JSON.stringify(result.bestiary)).not.toContain("model-provided-species-id");
    expect(JSON.stringify(result.bestiary)).not.toContain("model.invalid");
  });

  it("keeps an important non-human individual as a Portrait when no real species is known", () => {
    const result = normalize({
      characterUpdates: [{
        name: "Morrow",
        portraitKind: "non-human",
        role: "Bonded companion",
        description: "A singular raven who remembers the protagonist's first life.",
      }],
    });

    expect(result.characters).toEqual([expect.objectContaining({
      id: "dev-character-morrow",
      name: "Morrow",
      portraitKind: "non-human",
    })]);
    expect(result.characters[0]).not.toHaveProperty("speciesId");
    expect(result.bestiary).toEqual([]);
  });

  it("links a new individual to a new species through application-owned IDs", () => {
    const result = normalize({
      characterUpdates: [{
        id: "model-character-id",
        name: "Lei",
        portraitKind: "non-human",
        speciesName: "Thunder Dragons",
        imageAssetId: "model-asset-id",
        imageUrl: "https://model.invalid/lei.png",
      }],
      bestiaryUpdates: [{
        id: "model-species-id",
        name: "Thunder Dragons",
        description: "Storm-born drakes that carry living lightning beneath their scales.",
        classification: "Celestial dragon",
        traits: ["Storm flight"],
        threatLevel: "High",
        signatureSound: "A rolling sky-crack",
        storageKey: "model-storage-key",
      }],
    });

    const species = result.bestiary[0];
    const individual = result.characters[0];
    expect(species).toMatchObject({ id: "dev-creature-thunder-dragons" });
    expect(individual).toMatchObject({
      id: "dev-character-lei",
      portraitKind: "non-human",
      speciesId: species.id,
    });
    expect(species.notableIndividualIds).toEqual([individual.id]);
    expect(JSON.stringify(result)).not.toContain("model-character-id");
    expect(JSON.stringify(result)).not.toContain("model-species-id");
    expect(JSON.stringify(result)).not.toContain("model-asset-id");
    expect(JSON.stringify(result)).not.toContain("model-storage-key");
    expect(JSON.stringify(result)).not.toContain("model.invalid");
  });

  it("adds a later named individual to an existing species without replacing its stable identity", () => {
    const result = normalize({
      currentBestiary: [{
        id: "creature-night-wolves",
        name: "Night Wolves",
        description: "Predators formed from moonless fog.",
        classification: "Shadow beast",
        traits: ["Silent pursuit"],
        threatLevel: "High",
        firstEncounteredChapter: 1,
        appearanceChapters: [1, 2],
        notableIndividualIds: [],
      }],
      characterUpdates: [{
        name: "Sable Fang",
        portraitKind: "non-human",
        speciesName: "Night Wolves",
        role: "Recurring hunter",
      }],
      chapterNumber: 4,
    });

    expect(result.bestiary).toEqual([expect.objectContaining({
      id: "creature-night-wolves",
      firstEncounteredChapter: 1,
      appearanceChapters: [1, 2, 4],
      notableIndividualIds: ["dev-character-sable-fang"],
    })]);
    expect(result.characters).toEqual([expect.objectContaining({
      id: "dev-character-sable-fang",
      speciesId: "creature-night-wolves",
    })]);
  });

  it("does not manufacture a Portrait for a generic species with no named individual", () => {
    const result = normalize({
      bestiaryUpdates: [{
        name: "Ridge Kites",
        description: "Migratory hunters that circle the northern cliffs.",
        classification: "Sky predator",
        traits: ["Keen sight"],
        threatLevel: "Low",
      }],
    });

    expect(result.bestiary).toHaveLength(1);
    expect(result.characters).toHaveLength(0);
    expect(result.bestiary[0].notableIndividualIds).toEqual([]);
  });

  it("normalizes legacy beast Portrait data without discarding its identity or sonic profile", () => {
    const result = normalize({
      currentCharacters: [{
        id: "legacy-fox",
        name: "Vermilion Debt Fox",
        role: "beast",
        isBeast: true,
        beastProfile: { threatTier: "Mythic", signatureSound: "A low foxfire chitter" },
      }],
    });

    expect(result.characters).toEqual([expect.objectContaining({
      id: "legacy-fox",
      name: "Vermilion Debt Fox",
      role: "Companion",
      portraitKind: "non-human",
      creatureProfile: { threatTier: "Mythic", signatureSound: "A low foxfire chitter" },
    })]);
    expect(result.characters[0]).not.toHaveProperty("isBeast");
    expect(result.characters[0]).not.toHaveProperty("beastProfile");
  });
});
