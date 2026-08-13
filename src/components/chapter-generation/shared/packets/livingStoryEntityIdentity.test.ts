import { describe, expect, it } from "vitest";
import {
  mergeLivingStoryRecords,
  reconcileLivingStoryRecords,
  splitDescriptiveLivingStoryEntityLabel,
} from "./livingStoryEntityIdentity";

describe("Living Story entity identity", () => {
  it("merges case, punctuation, and explicit alias variants into the existing entity", () => {
    const merged = mergeLivingStoryRecords(
      [{
        id: "minister-sui",
        name: "Minister Sui",
        aliases: ["The Quiet Minister"],
        role: "Witness",
      }],
      [
        { name: "minister-sui", relationshipToMC: "Trusted ally" },
        { name: "The Quiet Minister", rankLevel: "Seal Heart" },
      ],
    );

    expect(merged).toEqual([{
      id: "minister-sui",
      name: "Minister Sui",
      aliases: ["The Quiet Minister"],
      role: "Witness",
      relationshipToMC: "Trusted ally",
      rankLevel: "Seal Heart",
    }]);
  });

  it("preserves same-named entities when DEV gives them different stable IDs", () => {
    const merged = mergeLivingStoryRecords([
      { id: "elder-past", name: "Elder Kang", status: "deceased" },
      { id: "elder-present", name: "Elder Kang", status: "alive" },
    ], []);

    expect(merged).toHaveLength(2);
    expect(merged.map(record => record.id)).toEqual(["elder-past", "elder-present"]);
  });

  it("keeps a persistence identity stable while applying a name-only update", () => {
    const merged = mergeLivingStoryRecords(
      [{ persistenceId: "character-42", name: "Minister Sui", role: "Witness" }],
      [{ name: "minister sui", relationshipToMC: "Trusted ally" }],
    );

    expect(merged).toEqual([{
      persistenceId: "character-42",
      name: "Minister Sui",
      role: "Witness",
      relationshipToMC: "Trusted ally",
    }]);
  });

  it("splits Blueprint character labels into canonical names and descriptions", () => {
    expect(splitDescriptiveLivingStoryEntityLabel("Yan Shi (Protagonist)")).toEqual({
      name: "Yan Shi",
      descriptiveInformation: "Protagonist",
      originalLabel: "Yan Shi (Protagonist)",
    });
    expect(splitDescriptiveLivingStoryEntityLabel(
      "Sect Master Feng (The antagonist of the outer sect)",
    )).toMatchObject({
      name: "Sect Master Feng",
      descriptiveInformation: "The antagonist of the outer sect",
    });
  });

  it("matches descriptive character labels while keeping code-owned identity", () => {
    const result = reconcileLivingStoryRecords({
      entityKind: "character",
      current: [{ name: "Yan Shi", role: "main_character" }],
      updates: [{
        id: "model-id",
        name: "Yan Shi (Protagonist)",
        originChapter: 99,
        resolve: "Unbroken",
      }],
      chapterNumber: 2,
    });

    expect(result.warnings).toEqual([]);
    expect(result.records).toEqual([expect.objectContaining({
      id: "dev-character-yan-shi",
      name: "Yan Shi",
      aliases: ["Yan Shi (Protagonist)"],
      blueprintDescription: "Protagonist",
      role: "main_character",
      resolve: "Unbroken",
      lastMajorInvolvement: 2,
    })]);
    expect(JSON.stringify(result.records)).not.toContain("model-id");
    expect(JSON.stringify(result.records)).not.toContain("originChapter");
  });

  it("resolves Sect Master Feng and descriptive location labels without duplicates", () => {
    const character = reconcileLivingStoryRecords({
      entityKind: "character",
      current: [{ name: "Sect Master Feng" }],
      updates: [{ name: "Sect Master Feng (The antagonist of the outer sect)", status: "Hostile" }],
      chapterNumber: 1,
    });
    const location = reconcileLivingStoryRecords({
      entityKind: "location",
      current: [{ name: "The Lower Periphery" }],
      updates: [{
        name: "The Lower Periphery, a sprawling district beneath the outer sect",
        state: "Under curfew",
      }],
      chapterNumber: 1,
    });

    expect(character.records).toHaveLength(1);
    expect(character.records[0]).toMatchObject({
      name: "Sect Master Feng",
      status: "Hostile",
    });
    expect(location.records).toHaveLength(1);
    expect(location.records[0]).toMatchObject({
      id: "dev-location-the-lower-periphery",
      name: "The Lower Periphery",
      aliases: ["The Lower Periphery, a sprawling district beneath the outer sect"],
      blueprintDescription: "a sprawling district beneath the outer sect",
      state: "Under curfew",
    });
  });

  it("preserves genuinely ambiguous entities separately and reports the ambiguity", () => {
    const result = reconcileLivingStoryRecords({
      entityKind: "character",
      current: [
        { id: "feng-past", name: "Sect Master Feng", era: "past" },
        { id: "feng-present", name: "Sect Master Feng", era: "present" },
      ],
      updates: [{ name: "Sect Master Feng", status: "Watching Yan Shi" }],
      chapterNumber: 3,
    });

    expect(result.records).toHaveLength(3);
    expect(result.records.map(record => record.id)).toEqual([
      "feng-past",
      "feng-present",
      "dev-character-sect-master-feng",
    ]);
    expect(result.warnings).toEqual([expect.objectContaining({
      code: "ambiguous-entity-match",
      canonicalName: "Sect Master Feng",
    })]);
  });

  it("matches later updates by an existing stable ID without accepting a replacement ID", () => {
    const result = reconcileLivingStoryRecords({
      entityKind: "character",
      current: [{ id: "dev-character-yan-shi", name: "Yan Shi", role: "Protagonist" }],
      updates: [{ id: "dev-character-yan-shi", name: "Disciple Yan", status: "Promoted" }],
      chapterNumber: 4,
    });

    expect(result.records).toEqual([expect.objectContaining({
      id: "dev-character-yan-shi",
      name: "Yan Shi",
      aliases: ["Disciple Yan"],
      status: "Promoted",
      lastMajorInvolvement: 4,
    })]);
  });

  it("rejects an ID and name that point to different deterministic entities", () => {
    expect(() => reconcileLivingStoryRecords({
      entityKind: "character",
      current: [
        { id: "dev-character-yan-shi", name: "Yan Shi" },
        { id: "dev-character-feng", name: "Sect Master Feng" },
      ],
      updates: [{ id: "dev-character-yan-shi", name: "Sect Master Feng", status: "Contradiction" }],
      chapterNumber: 4,
    })).toThrow("contradicts deterministic current identity");
  });
});
