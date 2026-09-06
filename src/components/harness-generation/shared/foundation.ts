import { cloneHarnessValue, defaultHarnessRuntime, emptyStoryHead, stableHarnessId, type HarnessRuntime } from './ids';
import type {
  HarnessStory,
  HarnessWorkspaceState,
  StoryFoundationInput,
  StoryFoundationRevision,
  HarnessCanonicalRecord,
} from './types';

export const foundationIdentityRecords = (foundation: StoryFoundationRevision): HarnessCanonicalRecord[] =>
  (foundation.input.identities ?? []).map((identity, index) => ({
    id: stableHarnessId('hcan', foundation.id, 'identity', index), storyId: foundation.storyId,
    sourceFoundationRevisionId: foundation.id,
    entityId: stableHarnessId('hentity', foundation.storyId, identity.kind, identity.name.trim().toLowerCase()),
    kind: identity.kind, label: identity.name, aliases: identity.aliases,
    capabilityId: identity.kind === 'character' ? 'characters' : identity.kind === 'faction' ? 'factions' : 'locations-world',
    capabilityVersion: 'foundation-1', evidence: identity.evidence, confidence: 'resolved',
    facts: { description: identity.evidence }, createdAt: foundation.createdAt, warnings: [],
  }));

const optionalFoundationKeys = [
  'title',
  'permanentInstructions',
  'toneStyle',
  'genre',
  'openingSituation',
  'declaredCanon',
  'characters',
  'worldFacts',
  'intendedDirection',
] as const;

export const normalizeStoryFoundationInput = (input: StoryFoundationInput): StoryFoundationInput => {
  const premise = input.premise?.trim();
  if (!premise) throw new Error('A Story Foundation needs a premise before a chapter can be generated.');

  const normalized: StoryFoundationInput = { premise };
  for (const key of optionalFoundationKeys) {
    const value = input[key]?.trim();
    if (value) normalized[key] = value;
  }
  if (input.sourceSnapshot?.kind === 'story-seed') {
    normalized.sourceSnapshot = cloneHarnessValue(input.sourceSnapshot);
  }
  if (Array.isArray(input.cast)) {
    normalized.cast = input.cast.filter(character => character && typeof character.name === 'string' && character.name.trim()).map(character => ({
      name: character.name.trim(),
      ...(typeof character.role === 'string' && character.role.trim() ? { role: character.role.trim() } : {}),
      ...(typeof character.relationshipToMC === 'string' && character.relationshipToMC.trim() ? { relationshipToMC: character.relationshipToMC.trim() } : {}),
      ...(typeof character.isMainCharacter === 'boolean' ? { isMainCharacter: character.isMainCharacter } : {}),
    }));
  }
  if (input.identities) {
    const identities = new Map<string, NonNullable<StoryFoundationInput['identities']>[number]>();
    for (const identity of input.identities) {
      if (!identity.name.trim() || !identity.evidence.trim()) continue;
      const key = `${identity.kind}:${identity.name.trim().toLowerCase()}`;
      const prior = identities.get(key);
      identities.set(key, prior ? { ...prior, aliases: Array.from(new Set([...(prior.aliases ?? []), ...(identity.aliases ?? [])])),
        evidence: `${prior.evidence}\n${identity.evidence}` } : cloneHarnessValue({ ...identity, name: identity.name.trim() }));
    }
    normalized.identities = [...identities.values()];
  }
  return normalized;
};

export const titleFromFoundation = (foundation: StoryFoundationInput): string => {
  if (foundation.title?.trim()) return foundation.title.trim();
  const firstLine = foundation.premise.split(/\r?\n|[.!?]/)[0]?.trim();
  return firstLine ? firstLine.slice(0, 72) : 'Untitled Harness Story';
};

export const findFoundationRevision = (
  state: HarnessWorkspaceState,
  foundationRevisionId: string,
): StoryFoundationRevision | undefined => state.foundations.find(revision => revision.id === foundationRevisionId);

export const findStory = (state: HarnessWorkspaceState, storyId: string): HarnessStory | undefined =>
  state.stories.find(story => story.id === storyId);

export const createHarnessStory = (
  state: HarnessWorkspaceState,
  input: StoryFoundationInput,
  runtime: HarnessRuntime = defaultHarnessRuntime,
): { state: HarnessWorkspaceState; story: HarnessStory; foundation: StoryFoundationRevision } => {
  const normalizedInput = normalizeStoryFoundationInput(input);
  const createdAt = runtime.now();
  const storyId = runtime.createId('hst');
  const foundation: StoryFoundationRevision = {
    id: runtime.createId('hfr'),
    storyId,
    revision: 1,
    createdAt,
    input: normalizedInput,
  };
  const story: HarnessStory = {
    id: storyId,
    title: titleFromFoundation(normalizedInput),
    createdAt,
    updatedAt: createdAt,
    activeFoundationRevisionId: foundation.id,
    foundationRevisionIds: [foundation.id],
    head: emptyStoryHead(),
  };
  return {
    state: {
      ...state,
      stories: [...state.stories, story],
      foundations: [...state.foundations, foundation],
      canonicalRecords: [...state.canonicalRecords, ...foundationIdentityRecords(foundation)],
    },
    story,
    foundation,
  };
};

export const reviseStoryFoundation = (
  state: HarnessWorkspaceState,
  storyId: string,
  input: StoryFoundationInput,
  runtime: HarnessRuntime = defaultHarnessRuntime,
): { state: HarnessWorkspaceState; story: HarnessStory; foundation: StoryFoundationRevision } => {
  const story = findStory(state, storyId);
  if (!story) throw new Error('The selected Harness story no longer exists.');
  const normalizedInput = normalizeStoryFoundationInput(input);
  const createdAt = runtime.now();
  const foundation: StoryFoundationRevision = {
    id: runtime.createId('hfr'),
    storyId,
    revision: story.foundationRevisionIds.length + 1,
    createdAt,
    input: normalizedInput,
  };
  const revisedStory: HarnessStory = {
    ...story,
    title: titleFromFoundation(normalizedInput),
    updatedAt: createdAt,
    activeFoundationRevisionId: foundation.id,
    foundationRevisionIds: [...story.foundationRevisionIds, foundation.id],
  };
  return {
    state: {
      ...state,
      stories: state.stories.map(candidate => candidate.id === storyId ? revisedStory : candidate),
      foundations: [...state.foundations, foundation],
      canonicalRecords: [
        ...state.canonicalRecords.map(record => record.storyId === storyId && record.sourceFoundationRevisionId && !record.supersededAt
          ? { ...record, supersededAt: createdAt } : record),
        ...foundationIdentityRecords(foundation),
      ],
    },
    story: revisedStory,
    foundation,
  };
};
