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

  it("preserves ambiguous species updates separately and reports their identity warning", () => {
    const result = normalize({
      currentBestiary: [{
        id: "creature-ash-wolf-past",
        name: "Ash Wolf",
        era: "past",
      }, {
        id: "creature-ash-wolf-present",
        name: "Ash Wolf",
        era: "present",
      }],
      bestiaryUpdates: [{
        name: "Ash Wolf",
        classification: "Cinder predator",
      }],
    });

    expect(result.bestiary.map(record => record.id)).toEqual([
      "creature-ash-wolf-past",
      "creature-ash-wolf-present",
      "dev-creature-ash-wolf",
    ]);
    expect(result.identityWarnings).toEqual([expect.objectContaining({
      code: "ambiguous-entity-match",
      entityKind: "creature",
      canonicalName: "Ash Wolf",
    })]);
  });

  it("does not invent a current-chapter appearance for a legacy species with no encounter history", () => {
    const result = normalize({
      currentBestiary: [{
        id: "creature-forgotten-herons",
        name: "Forgotten Herons",
      }],
    });

    expect(result.bestiary).toEqual([expect.objectContaining({
      id: "creature-forgotten-herons",
      firstEncounteredChapter: 3,
      appearanceChapters: [],
    })]);
  });

  it("preserves an application-owned Character voiceKey while stripping model voice choices", () => {
    const result = normalize({
      currentCharacters: [{
        id: "character-yan-shi",
        name: "Yan Shi",
        voiceKey: "persisted-provider-neutral-key",
        voice_id: "legacy-provider-id",
        voicePresetId: "legacy-browser-preset",
        profile: {
          provider_voice_id: "nested-existing-provider-id",
          combat: { ElevenLabsVoiceId: "deeply-nested-provider-id" },
          epithet: "Ash Disciple",
        },
      }],
      characterUpdates: [{
        name: "Yan Shi",
        role: "Disciple",
        voiceKey: "model-selected-key",
        voice_id: "model-provider-id",
        providerVoiceId: "alternate-model-provider-id",
        voiceAssetId: "model-voice-asset",
        voiceClipUrl: "https://model.invalid/voice.mp3",
      }],
    });

    expect(result.characters).toEqual([expect.objectContaining({
      id: "character-yan-shi",
      name: "Yan Shi",
      role: "Disciple",
      voiceKey: "persisted-provider-neutral-key",
    })]);
    expect(result.characters[0].profile).toEqual({
      combat: {},
      epithet: "Ash Disciple",
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("legacy-provider-id");
    expect(serialized).not.toContain("legacy-browser-preset");
    expect(serialized).not.toContain("nested-existing-provider-id");
    expect(serialized).not.toContain("deeply-nested-provider-id");
    expect(serialized).not.toContain("model-selected-key");
    expect(serialized).not.toContain("model-provider-id");
    expect(serialized).not.toContain("alternate-model-provider-id");
    expect(serialized).not.toContain("model-voice-asset");
    expect(serialized).not.toContain("model.invalid");
  });

  it("removes voice identity and playback artifacts from generic Bestiary species", () => {
    const result = normalize({
      currentBestiary: [{
        id: "creature-ember-foxes",
        name: "Ember Foxes",
        voiceKey: "species-must-not-have-a-voice",
        voice_id: "species-provider-id",
        voiceClipUrl: "/generated/species-voice.mp3",
        voiceAssetId: "species-voice-asset",
        signatureQuote: "A generic species does not speak with one identity.",
        sonicMetadata: {
          profile: { provider_voice_id: "nested-current-species-provider-id" },
          note: "A crackling chitter",
        },
      }],
      bestiaryUpdates: [{
        name: "Ember Foxes",
        voiceKey: "model-species-voice",
        providerId: "model-species-provider-id",
        encounterMetadata: {
          Provider_Voice_ID: "nested-model-species-provider-id",
          note: "Heard beneath the oath bell",
        },
      }],
    });

    expect(result.bestiary).toHaveLength(1);
    expect(result.bestiary[0]).not.toHaveProperty("voiceKey");
    expect(result.bestiary[0]).not.toHaveProperty("voiceClipUrl");
    expect(result.bestiary[0]).not.toHaveProperty("voiceAssetId");
    expect(result.bestiary[0]).not.toHaveProperty("signatureQuote");
    expect(result.bestiary[0].sonicMetadata).toEqual({
      profile: {},
      note: "A crackling chitter",
    });
    expect(result.bestiary[0].encounterMetadata).toEqual({
      note: "Heard beneath the oath bell",
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("species-provider-id");
    expect(serialized).not.toContain("model-species-provider-id");
    expect(serialized).not.toContain("nested-current-species-provider-id");
    expect(serialized).not.toContain("nested-model-species-provider-id");
  });
});
