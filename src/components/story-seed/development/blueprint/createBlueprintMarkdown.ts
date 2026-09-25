import { type StorySeedStoryRequired } from '@seihouse/sen/story-seed';
import { type WorldBlueprint, type WorldBlueprintMainCharacter } from '@seihouse/sen/story-seed';
import { getStoryStyleLabel } from '@seihouse/sen/story-seed';

export const formatBlueprintDate = (value: string): string => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
};

const markdownList = (items: string[]): string => {
  const cleanItems = items.map(item => item.trim()).filter(Boolean);
  return cleanItems.length > 0
    ? cleanItems.map(item => `- ${item}`).join('\n')
    : '_None yet_';
};

export const createBlueprintMarkdown = (
  blueprint: WorldBlueprint,
  origin: StorySeedStoryRequired,
  mainCharacter: WorldBlueprintMainCharacter,
): string => {
  const styleLabel = getStoryStyleLabel(origin.style) || origin.style;
  const metadata = [
    `**Blueprint Version:** ${blueprint.blueprintVersion || 'v1.0'}`,
    blueprint.creator ? `**Creator:** ${blueprint.creator}` : '',
    blueprint.status ? `**Status:** ${blueprint.status}` : '',
    blueprint.createdAt ? `**Created:** ${formatBlueprintDate(blueprint.createdAt)}` : '',
    blueprint.updatedAt ? `**Updated:** ${formatBlueprintDate(blueprint.updatedAt)}` : '',
  ].filter(Boolean).join('\n');

  return `
# ${blueprint.title || 'Untitled Story'}

${metadata}

## Origin Snapshot

### Synopsis (User-Created Origin)
${origin.premise || ''}

**Genre:** ${origin.genre || ''}

**Style / Novel Tradition:** ${styleLabel || ''}

### Story Tags
${markdownList(origin.storyTags)}

## Main Character

**Name:** ${mainCharacter.name}

**Age:** ${mainCharacter.age}

### Personality
${mainCharacter.personality}

### Appearance
${mainCharacter.appearance}

### Background / Profile
${mainCharacter.backgroundProfile}

## World Setting

### World Overview
${blueprint.worldOverview || ''}
${blueprint.worldOverview?.trim() && blueprint.worldOverviewDetail ? `\n**World Detail:** ${blueprint.worldOverviewDetail}\n` : ''}
### Opening Location
${blueprint.startingLocation || ''}
${blueprint.startingLocation?.trim() && blueprint.startingLocationDetail ? `\n**Opening Location Detail:** ${blueprint.startingLocationDetail}\n` : ''}
### World Order
${blueprint.societyStructure || ''}
${blueprint.societyStructure?.trim() && blueprint.societyStructureDetail ? `\n**World Order Detail:** ${blueprint.societyStructureDetail}\n` : ''}
### Power System Outline
${blueprint.powerSystemOutline || ''}

## Arc

### Destined Ending
${blueprint.destinedEnding || ''}

### Hard Pins
${markdownList((blueprint.hardPins ?? []).map(pin => pin.text))}

### Arc Roadmap
${(blueprint.arcPlans ?? []).map(plan => [`#### Arc ${plan.arcNumber}`, ...plan.goals.map((goal, index) => `${index + 1}. ${goal.text} (${goal.chapters} chapters)`)].join('\n')).join('\n\n')}

### Fun Settings
${Object.entries(blueprint.funSettings ?? {}).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

**Estimated Arcs:** ${blueprint.estimatedArcs || ''}

### Generated Style Bible
${blueprint.styleBible || ''}

## Side Characters
${markdownList(blueprint.initialCharacters || [])}

## Factions
${markdownList(blueprint.majorFactions || [])}

## Fate Survival

Unresolved proposals for Survival only; not character knowledge or established canon. Saved entries remain available when Survival is off.

### Major Mysteries
${markdownList(blueprint.majorMysteries || [])}

### Unresolved Plot Threads
${markdownList(blueprint.unresolvedPlotThreads || [])}
`.trim();
};
