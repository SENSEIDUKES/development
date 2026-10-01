import { type StorySeedStoryRequired } from '@seihouse/sen/story-seed';
import { type WorldBlueprint, type WorldBlueprintMainCharacter } from '@seihouse/sen/story-seed';
import { getStoryStyleLabel, worldFactDetailIsCurrent, type WorldFactDetailField } from '@seihouse/sen/story-seed';

export const formatBlueprintDate = (value: string): string => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
};

/** A detail line, written only while the detail belongs to its fact as that fact reads now. */
const factDetailLine = (blueprint: WorldBlueprint, detail: WorldFactDetailField, fact: string | undefined, label: string): string =>
  worldFactDetailIsCurrent(blueprint, detail, fact) && blueprint[detail] ? `\n**${label}:** ${blueprint[detail]}\n` : '';

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
${factDetailLine(blueprint, 'worldOverviewDetail', blueprint.worldOverview, 'World Detail')}
### Opening Location
${blueprint.startingLocation || ''}
${factDetailLine(blueprint, 'startingLocationDetail', blueprint.startingLocation, 'Opening Location Detail')}
### World Order
${blueprint.societyStructure || ''}
${factDetailLine(blueprint, 'societyStructureDetail', blueprint.societyStructure, 'World Order Detail')}
### Power System Outline
${blueprint.powerSystemOutline || ''}

## Arc

### Destined Ending
${blueprint.destinedEnding || ''}

### Hard Pins
${markdownList((blueprint.hardPins ?? []).map(pin => pin.text))}

### Arc 1 Goals
${(blueprint.arcPlans ?? []).slice(0, 1).map(plan => plan.goals.map((goal, index) => `${index + 1}. ${goal.text} (${goal.chapters} chapters)`).join('\n')).join('')}

### Fun Settings
${Object.entries(blueprint.funSettings ?? {}).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

**Story Length:** ${blueprint.estimatedArcs || ''} arcs. Each later arc is planned when it begins.

### Generated Style Bible
${blueprint.styleBible || ''}

## Side Characters
${markdownList(blueprint.initialCharacters || [])}

## Factions
${markdownList(blueprint.majorFactions || [])}

`.trim();
};
