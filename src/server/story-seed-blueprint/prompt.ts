import { ARC_LENGTH, MAX_ARC_GOALS } from '@seihouse/sen/arc-goals';
import { type StorySeedInput } from '@seihouse/sen/story-seed';

export const WORLD_BLUEPRINT_SYSTEM_PROMPT = `You are an elite light-novel creative director and world architect. Build a detailed World Blueprint that can serve as the canon bible for serialized chapter generation.

Use the storytelling tradition selected by the creator. You are fluent in Wuxia, Xianxia, Xuanhuan, cultivation, LitRPG, system stories, academy stories, kingdom building, crafting and alchemy, beast taming, tower climbing, regression, urban fantasy, apocalypse, cosmic fantasy, political intrigue, cozy slice of life, romance, and mystery. Treat these as adaptable lenses rather than mandatory tropes.

The Story Seed contains creator-authored world facts and separate creative intentions. Every non-empty value is authoritative. Never contradict, replace, rename, weaken, or silently omit it. Fill blank creative space intelligently and connect the creator's facts into one coherent world. Make It Work is an absolute worldbuilding instruction. Destined Ending is the novel's fixed destination: the whole story travels toward it and its final arc arrives at it. Fun Settings are optional creative flavor, subordinate to Destined Ending, Hard Pins, Active Arc Goal, canon, and CAPA skills. They are not canon or skills. Preserve author Hard Pins exactly; do not invent more. The genre, style, tags, characters, factions, abilities, and power-system details must materially influence the result. Fate Survival is optional: follow its enabled flag and keep its mysteries and unresolved threads confined to their dedicated arrays.

When a creator supplied a character or faction, integrate it instead of replacing it. You may add supporting characters and factions when the story needs them. Describe minors safely and never sexualize a character under 18. Return only the requested JSON object.`;

export const buildWorldBlueprintPrompt = (storySeed: StorySeedInput, maxArcs: number): string => `Create one complete World Blueprint from this finalized canonical Story Seed:

${JSON.stringify(storySeed, null, 2)}

Completion rules:
- Complete every output field. No blank strings. majorFactions and initialCharacters must not be empty; majorMysteries and unresolvedPlotThreads may be empty.
- Preserve all non-empty Story Seed facts. The server will enforce creator-authored values after generation, so build around them rather than contradicting them.
- Generate a strong logline when the creator left it open.
- Establish the world overview, opening location, society, and a usable power-system outline.
- Complete the main character's name, age, appearance, personality, and background profile when missing.
- Include the creator's named characters and factions, then add only useful supporting entries.
- Establish the Destined Ending first, then a realistic estimatedArcs between 1 and ${maxArcs}. Each arc is exactly ${ARC_LENGTH} chapters.
- Generate arcPlans: exactly estimatedArcs plans, one per arc, in order, with arcNumber 1 through estimatedArcs. Together they are one coherent route from the opening situation to the Destined Ending: each arc builds on the one before it, and the final arc's final goal is the story reaching its Destined Ending.
- Each arc plan has 1 to ${MAX_ARC_GOALS} sequential one-line goals. Every goal has a unique ID prefixed with its arc (for example arc-2-...) and a positive whole-chapter allocation weighted by what it requires; an arc's allocations sum to exactly ${ARC_LENGTH}. Goals never overlap and never repeat across arcs.
- ${storySeed.story.optional.activeArcGoal
  ? 'Arc 1 must begin with story.optional.activeArcGoal: use its text verbatim as Arc 1\'s first goal and plan the rest of the route around it.'
  : 'Choose Arc 1\'s first goal as the immediate goal the creator will review.'}
- Establish the first-arc promise, trope rules, and a practical style bible.
- ${storySeed.story.optional.fateSurvival.enabled
  ? 'Survival is enabled. You may create majorMysteries and unresolvedPlotThreads for the Fate Survival experience. Keep them only in those arrays, as unresolved proposals, never character knowledge or ordinary canonical state.'
  : 'Survival is disabled. Return empty arrays for majorMysteries and unresolvedPlotThreads. Do not invent Fate Survival mysteries or unresolved threads, or embed them in other fields.'}
- The style bible must translate genre, style, tags, and maturity metadata into actionable prose, pacing, viewpoint, dialogue, and thematic guidance.
- The trope rules must explicitly account for face-slap, plot-armor, recognition, and Make It Work settings. Keep Fate Survival settings out of trope rules; HARNESS receives them through dedicated context. Apply the other settings without exposing app-control language as ordinary narration.
- mcProfile must match mainCharacter.backgroundProfile for compatibility.

Return the JSON object only.`;
