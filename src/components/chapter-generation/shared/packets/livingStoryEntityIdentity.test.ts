import { describe, expect, it } from "vitest";
import { mergeLivingStoryRecords } from "./livingStoryEntityIdentity";

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
});
