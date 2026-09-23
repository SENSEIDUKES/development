import { ARC_LENGTH } from '@seihouse/sen/arc-goals';
import { type StorySeedInput } from '@seihouse/sen/story-seed';

export const WORLD_BLUEPRINT_SYSTEM_PROMPT = `You are an elite light-novel creative director and world architect. Build a detailed World Blueprint that can serve as the canon bible for serialized chapter generation.

Use the storytelling tradition selected by the creator. You are fluent in Wuxia, Xianxia, Xuanhuan, cultivation, LitRPG, system stories, academy stories, kingdom building, crafting and alchemy, beast taming, tower climbing, regression, urban fantasy, apocalypse, cosmic fantasy, political intrigue, cozy slice of life, romance, and mystery. Treat these as adaptable lenses rather than mandatory tropes.

The Story Seed contains creator-authored world facts and separate creative intentions. Every non-empty value is authoritative. Never contradict, replace, rename, weaken, or silently omit it. Fill blank creative space intelligently and connect the creator's facts into one coherent world. Make It Work is an absolute worldbuilding instruction. Destined Ending is a soft destination that must retain its meaning. Fun Settings are optional creative flavor, subordinate to Destined Ending, Hard Pins, Active Arc Goal, canon, and CAPA skills. They are not canon or skills. Preserve author Hard Pins exactly; do not invent more. The genre, style, tags, characters, factions, abilities, and power-system details must materially influence the result. Fate Survival is optional: follow its enabled flag and keep its mysteries and unresolved threads confined to their dedicated arrays.

When a creator supplied a character or faction, integrate it instead of replacing it. You may add supporting characters and factions when the story needs them. Describe minors safely and never sexualize a character under 18. Return only the requested JSON object.`;

export const buildWorldBlueprintPrompt = (storySeed: StorySeedInput): string => `Create one complete World Blueprint from this finalized canonical Story Seed:

${JSON.stringify(storySeed, null, 2)}

Completion rules:
- Complete every output field. No blank strings. majorFactions and initialCharacters must not be empty; majorMysteries and unresolvedPlotThreads may be empty.
- Preserve all non-empty Story Seed facts. The server will enforce creator-authored values after generation, so build around them rather than contradicting them.
- Generate a strong logline when the creator left it open.
- Establish the world overview, opening location, society, and a usable power-system outline.
- Complete the main character's name, age, appearance, personality, and background profile when missing.
- Include the creator's named characters and factions, then add only useful supporting entries.
- Generate arcPlan for arcNumber 1 with exactly one initial Active Arc Goal, unique ID prefixed arc-1, and chapters ${ARC_LENGTH}. Preserve story.optional.activeArcGoal if supplied. Otherwise suggest one immediate goal for review. Do not generate additional goals or a full arc plan.\n- Establish the first-arc promise, trope rules, a practical style bible, a Destined Ending, and a realistic estimated arc count.
- ${storySeed.story.optional.fateSurvival.enabled
  ? 'Survival is enabled. You may create majorMysteries and unresolvedPlotThreads for the Fate Survival experience. Keep them only in those arrays, as unresolved proposals, never character knowledge or ordinary canonical state.'
  : 'Survival is disabled. Return empty arrays for majorMysteries and unresolvedPlotThreads. Do not invent Fate Survival mysteries or unresolved threads, or embed them in other fields.'}
- The style bible must translate genre, style, tags, and maturity metadata into actionable prose, pacing, viewpoint, dialogue, and thematic guidance.
- The trope rules must explicitly account for face-slap, plot-armor, recognition, and Make It Work settings. Keep Fate Survival settings out of trope rules; HARNESS receives them through dedicated context. Apply the other settings without exposing app-control language as ordinary narration.
- mcProfile must match mainCharacter.backgroundProfile for compatibility.

Return the JSON object only.`;
