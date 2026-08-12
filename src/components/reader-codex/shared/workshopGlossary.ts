import type { MultiModelRouting } from './types';

export interface WorkshopGlossaryInput {
  storyTitle: string;
  mcName: string;
  powerSystem?: string;
  characterNames: string[];
  factionNames: string[];
  routingConfig?: MultiModelRouting;
}

export interface WorkshopGlossaryTerm {
  term: string;
  category: string;
  definition: string;
}

const clean = (value: string | undefined) => value?.trim().replace(/\s+/g, ' ') || '';

/** Deterministic, local stand-in for production's model-backed lore scout. */
export async function extractWorkshopGlossaryTerms(
  input: WorkshopGlossaryInput,
): Promise<WorkshopGlossaryTerm[]> {
  const terms: WorkshopGlossaryTerm[] = [];
  const storyTitle = clean(input.storyTitle) || 'Active Light Novel Matrix';
  const mcName = clean(input.mcName);
  const powerSystem = clean(input.powerSystem);

  if (powerSystem) {
    terms.push({
      term: 'Story Power System',
      category: 'Story Lore',
      definition: powerSystem,
    });
  }
  if (mcName) {
    terms.push({
      term: `${mcName}'s Path`,
      category: 'Destiny',
      definition: `${mcName} is the recorded central path-bearer of ${storyTitle}.`,
    });
  }

  for (const factionName of [...new Set(input.factionNames.map(clean).filter(Boolean))]) {
    terms.push({
      term: factionName,
      category: 'Faction',
      definition: `${factionName} is a faction recorded in the living Codex of ${storyTitle}.`,
    });
  }

  for (const characterName of [...new Set(input.characterNames.map(clean).filter(Boolean))]) {
    if (characterName === mcName) continue;
    terms.push({
      term: characterName,
      category: 'Character',
      definition: `${characterName} is a named figure recorded in the living Codex of ${storyTitle}.`,
    });
  }

  return terms;
}
