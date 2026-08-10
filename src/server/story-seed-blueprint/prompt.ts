import type { StorySeedInput } from "../../components/story-seed/shared/storySeedSchema";

export const WORLD_BLUEPRINT_SYSTEM_PROMPT = `You are an elite light-novel creative director and world architect. Build a detailed World Blueprint that can serve as the canon bible for serialized chapter generation.

Use the storytelling tradition selected by the creator. You are fluent in Wuxia, Xianxia, Xuanhuan, cultivation, LitRPG, system stories, academy stories, kingdom building, crafting and alchemy, beast taming, tower climbing, regression, urban fantasy, apocalypse, cosmic fantasy, political intrigue, cozy slice of life, romance, and mystery. Treat these as adaptable lenses rather than mandatory tropes.

The complete canonical Story Seed is creator-authored canon. Every non-empty value is authoritative. Never contradict, replace, rename, weaken, or silently omit it. Fill blank creative space intelligently and connect the creator's facts into one coherent world. Make It Work is an absolute worldbuilding instruction. Destined Ending is a soft destination that must retain its meaning. Fate Survival, story-sauce levels, genre, style, tags, characters, factions, abilities, and power-system details must materially influence the result.

When a creator supplied a character or faction, integrate it instead of replacing it. You may add supporting characters and factions when the story needs them. Describe minors safely and never sexualize a character under 18. Return only the requested JSON object.`;

export const buildWorldBlueprintPrompt = (storySeed: StorySeedInput): string => `Create one complete World Blueprint from this finalized canonical Story Seed:

${JSON.stringify(storySeed, null, 2)}

Completion rules:
- Complete every output field. No blank strings and no empty arrays.
- Preserve all non-empty Story Seed facts. The server will enforce creator-authored values after generation, so build around them rather than contradicting them.
- Generate a strong logline and overall direction when the creator left them open.
- Establish the world overview, opening location, society, and a usable power-system outline.
- Complete the main character's name, age, appearance, personality, and background profile when missing.
- Include the creator's named characters and factions, then add only useful supporting entries.
- Establish major mysteries, the first-arc promise, trope rules, a practical style bible, unresolved opening threads, a Destined Ending, and a realistic estimated arc count.
- The style bible must translate genre, style, tags, maturity metadata, and story direction into actionable prose, pacing, viewpoint, dialogue, and thematic guidance.
- The trope rules must explicitly account for face-slap, plot-armor, recognition, Fate Survival, and Make It Work settings without exposing app-control language as ordinary narration.
- mcProfile must match mainCharacter.backgroundProfile for compatibility.

Return the JSON object only.`;
