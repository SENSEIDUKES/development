import { buildCanonicalStoryView } from './canonicalState';
import { GENERATION_PACKET_BUDGET, estimatePacketTokens } from './packetBudget';
import type { CanonicalEntityState, CanonicalIdentityAmbiguity, CanonicalResourceState, CanonicalStateProjection, HarnessCanonicalKind, HarnessCanonicalRecord, HarnessWorkspaceState, PacketOmission } from '../../../narrative/generation';

/** Packet groups and the canonical record kinds that feed each one. */
const PROJECTED_KINDS: ReadonlyArray<{ group: keyof Omit<CanonicalStateProjection, 'resources'>; kind: HarnessCanonicalKind }> = [
  { group: 'characters', kind: 'character' },
  { group: 'relationships', kind: 'relationship' },
  { group: 'locations', kind: 'location-world' },
  { group: 'factions', kind: 'faction' },
  { group: 'artifacts', kind: 'artifact' },
  { group: 'abilities', kind: 'progression' },
];

/** Mechanics facts become resources, never entity facts. */
const RESOURCE_KEYS = new Set(['subject', 'name', 'value', 'unit']);
/** Storage-only keys that never enter the model-facing projection. */
const HIDDEN_FACT_KEYS = new Set(['entityKey']);

export const normalizeIdentityLabel = (label: string) => label
  .normalize('NFKC')
  .toLowerCase()
  .replace(/\([^)]*\)/g, ' ')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

const tokensOf = (label: string) => normalizeIdentityLabel(label).split(' ').filter(Boolean);

const compactValue = (value: unknown, limit: number = GENERATION_PACKET_BUDGET.canonicalFactCharacters): string | undefined => {
  const text = Array.isArray(value) ? value.map(String).join(', ') : typeof value === 'boolean' ? String(value) : typeof value === 'string' ? value : undefined;
  const trimmed = text?.replace(/\s+/g, ' ').trim();
  if (!trimmed) return undefined;
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 1)}…` : trimmed;
};

interface EntityGroup {
  key: string;
  kind: HarnessCanonicalKind;
  label: string;
  aliases: Set<string>;
  records: HarnessCanonicalRecord[];
}

export interface CanonicalProjectionInput {
  state: HarnessWorkspaceState;
  storyId: string;
  /** Text the immediate request and active arc goal care about; entities named there are prioritized. */
  focusText?: string;
  /** Names the Foundation declares as cast; always prioritized. */
  castNames?: string[];
  /** Chapter numbers whose entities count as active. */
  activeChapterNumbers?: number[];
  budgetTokens?: number;
}

export interface CanonicalProjectionResult {
  projection: CanonicalStateProjection;
  omitted: PacketOmission[];
  identityAmbiguities: CanonicalIdentityAmbiguity[];
  /** Every record that fed the projection, for the diagnostics storage count. */
  activeRecordCount: number;
}

/**
 * Builds the compact current canonical state: one latest applicable entry per
 * resolved entity, deterministic alias merging only, near-duplicate identities
 * flagged instead of merged, and budget selection by relevance rather than
 * first-come-first-served. Raw evidence passages, chapter prose, memory
 * extractions, threads, mysteries, and timelines never enter it.
 */
export const projectCanonicalState = (input: CanonicalProjectionInput): CanonicalProjectionResult => {
  const { state, storyId } = input;
  const view = buildCanonicalStoryView(state, storyId);
  const chapterNumbers = new Map(state.chapters.filter(chapter => chapter.storyId === storyId).map(chapter => [chapter.id, chapter.chapterNumber]));
  const correctionOrder = new Map(state.corrections.map((correction, index) => [correction.id, index]));
  // Story order, never processing order: Foundation identities first, then
  // committed chapters, then author corrections (which always win).
  const position = (record: HarnessCanonicalRecord): [number, number] => [
    record.sourceCorrectionId ? 2 : record.sourceFoundationRevisionId ? 0 : 1,
    record.sourceCorrectionId ? correctionOrder.get(record.sourceCorrectionId) ?? -1 : chapterNumbers.get(record.chapterId ?? '') ?? -1,
  ];
  const byPosition = (left: HarnessCanonicalRecord, right: HarnessCanonicalRecord) => {
    const a = position(left);
    const b = position(right);
    return a[0] - b[0] || a[1] - b[1] || left.createdAt.localeCompare(right.createdAt);
  };

  const projectedKinds = new Set(PROJECTED_KINDS.map(entry => entry.kind));
  const candidates = view.records.filter(record => projectedKinds.has(record.kind) && record.confidence === 'resolved');
  const omitted: PacketOmission[] = [];
  const ambiguities: CanonicalIdentityAmbiguity[] = [];
  for (const record of view.records.filter(record => projectedKinds.has(record.kind) && record.confidence !== 'resolved')) {
    omitted.push({ section: 'canonicalState', label: record.label ?? record.kind, sourceRecordIds: [record.id],
      reason: `${record.confidence} interpretation stays in storage; only resolved canonical state enters the packet.` });
  }

  // Declared aliases: Foundation identities, record aliases, and accepted correction aliases.
  const aliasOwners = new Map<string, Set<string>>();
  const addAlias = (kind: HarnessCanonicalKind, alias: string, key: string) => {
    const normalized = normalizeIdentityLabel(alias);
    if (!normalized) return;
    const owners = aliasOwners.get(`${kind}:${normalized}`) ?? new Set<string>();
    owners.add(key);
    aliasOwners.set(`${kind}:${normalized}`, owners);
  };
  // An unlabeled record (a progression observation) is named by its resolved subject.
  const displayLabel = (record: HarnessCanonicalRecord) => record.label
    ?? record.references?.find(reference => reference.resolution !== 'unresolved' && reference.resolution !== 'conflicted')?.label
    ?? (typeof record.facts.subject === 'string' ? record.facts.subject : undefined);
  const groupKey = (record: HarnessCanonicalRecord) => record.entityId ? `entity:${record.entityId}` : `label:${record.kind}:${normalizeIdentityLabel(displayLabel(record) ?? record.id)}`;
  const groups = new Map<string, EntityGroup>();
  for (const record of [...candidates].sort(byPosition)) {
    const key = groupKey(record);
    const label = displayLabel(record);
    const group = groups.get(key) ?? { key, kind: record.kind, label: label ?? record.kind, aliases: new Set<string>(), records: [] };
    group.records.push(record);
    if (label) group.label = label;
    for (const alias of record.aliases ?? []) { group.aliases.add(alias); addAlias(record.kind, alias, key); }
    groups.set(key, group);
  }
  const resolvedByCorrection = new Map<string, string>();
  for (const correction of state.corrections.filter(correction => correction.storyId === storyId)) {
    const target = correction.resolvedRecordId ? candidates.find(record => record.id === correction.resolvedRecordId) : undefined;
    if (!target) continue;
    for (const alias of [correction.acceptedAlias, correction.kind === 'resolve-entity' ? correction.referenceLabel : undefined]) {
      if (alias) { resolvedByCorrection.set(`${target.kind}:${normalizeIdentityLabel(alias)}`, groupKey(target)); addAlias(target.kind, alias, groupKey(target)); }
    }
  }

  // Deterministic alias merging: a group whose label is a declared alias of exactly one other group.
  const merged = new Map<string, EntityGroup>();
  const mergeInto = new Map<string, string>();
  for (const group of groups.values()) {
    const normalized = `${group.kind}:${normalizeIdentityLabel(group.label)}`;
    const corrected = resolvedByCorrection.get(normalized);
    const owners = [...(aliasOwners.get(normalized) ?? [])].filter(owner => owner !== group.key);
    const target = corrected && corrected !== group.key ? corrected : owners.length === 1 ? owners[0] : undefined;
    if (target && groups.has(target)) mergeInto.set(group.key, target);
    else if (owners.length > 1) {
      ambiguities.push({ kind: group.kind, labels: [group.label, ...owners.map(owner => groups.get(owner)!.label)], recordIds: group.records.map(record => record.id),
        reason: 'This name is a declared alias of more than one identity; the records were kept apart for inspection.' });
    }
  }
  const resolveTarget = (key: string) => { let current = key; const seen = new Set<string>(); while (mergeInto.has(current) && !seen.has(current)) { seen.add(current); current = mergeInto.get(current)!; } return current; };
  for (const group of groups.values()) {
    const targetKey = resolveTarget(group.key);
    const target = merged.get(targetKey) ?? { ...groups.get(targetKey)!, aliases: new Set(groups.get(targetKey)!.aliases), records: [] };
    if (targetKey !== group.key) { target.aliases.add(group.label); for (const alias of group.aliases) target.aliases.add(alias); }
    target.records.push(...group.records);
    merged.set(targetKey, target);
  }
  for (const group of merged.values()) group.records.sort(byPosition);

  // Probable near-duplicates: flagged, never merged. Same kind, one name's tokens
  // contained in the other's (e.g. "Yi Chen" and "Elder Yi Chen"), and no declared alias.
  const entities = [...merged.values()];
  for (let left = 0; left < entities.length; left += 1) {
    for (let right = left + 1; right < entities.length; right += 1) {
      const a = entities[left]; const b = entities[right];
      if (a.kind !== b.kind) continue;
      const aTokens = tokensOf(a.label); const bTokens = tokensOf(b.label);
      if (!aTokens.length || !bTokens.length) continue;
      const subset = aTokens.every(token => bTokens.includes(token)) || bTokens.every(token => aTokens.includes(token));
      const sameCore = normalizeIdentityLabel(a.label) === normalizeIdentityLabel(b.label);
      if (subset || sameCore) {
        ambiguities.push({ kind: a.kind, labels: [a.label, b.label], recordIds: [...a.records, ...b.records].map(record => record.id),
          reason: sameCore ? 'The names match apart from a parenthetical or punctuation, but no declared alias links them; both were kept.'
            : 'One name is contained in the other, but no declared alias links them; both were kept rather than merged.' });
      }
    }
  }

  // Latest applicable state per entity: facts merged oldest to newest so the
  // newest value of every fact wins, with the newest description kept.
  // Foundation identities already travel in Current Story Information, so a
  // Foundation-only entity is not repeated here and a Foundation record
  // contributes only its name and aliases.
  const resources = new Map<string, CanonicalResourceState>();
  const entries = entities.filter(group => group.records.some(record => !record.sourceFoundationRevisionId)).map(group => {
    const facts: Record<string, string> = {};
    let asOfChapter: number | undefined;
    for (const record of group.records) {
      if (record.sourceFoundationRevisionId) continue;
      const chapter = chapterNumbers.get(record.chapterId ?? '');
      if (chapter !== undefined) asOfChapter = Math.max(asOfChapter ?? 0, chapter);
      const mechanics = record.facts.subject && record.facts.name && record.facts.value !== undefined
        ? { owner: String(record.facts.subject), name: String(record.facts.name), value: String(record.facts.value), unit: compactValue(record.facts.unit) } : undefined;
      if (mechanics) {
        const key = `${normalizeIdentityLabel(mechanics.owner)}:${normalizeIdentityLabel(mechanics.name)}`;
        const previous = resources.get(key);
        if (!previous || (previous.asOfChapter ?? -1) <= (chapter ?? -1)) {
          resources.set(key, { owner: mechanics.owner, name: mechanics.name, value: mechanics.value, ...(mechanics.unit ? { unit: mechanics.unit } : {}), ...(chapter !== undefined ? { asOfChapter: chapter } : {}) });
        }
      }
      for (const [key, value] of Object.entries(record.facts)) {
        if (HIDDEN_FACT_KEYS.has(key) || (mechanics && RESOURCE_KEYS.has(key))) continue;
        // A resource observation's description restates the balance; the resource entry carries it.
        if (mechanics && key === 'description') continue;
        // The entity's own name is not a fact about it.
        if (key === 'name' && typeof value === 'string' && normalizeIdentityLabel(value) === normalizeIdentityLabel(group.label)) continue;
        const compact = compactValue(value);
        if (compact) facts[key] = compact;
      }
    }
    const entry: CanonicalEntityState = {
      name: group.label,
      ...(group.aliases.size ? { aliases: [...group.aliases].filter(alias => alias.trim().toLowerCase() !== group.label.trim().toLowerCase()) } : {}),
      ...(asOfChapter !== undefined ? { asOfChapter } : {}),
      facts,
    };
    if (entry.aliases && !entry.aliases.length) delete entry.aliases;
    // Each entry also costs its separator inside the serialized list.
    return { group, entry, tokens: estimatePacketTokens(entry) + 1 };
  }).filter(item => item.group.kind !== 'progression' || Object.keys(item.entry.facts).length > 0);

  // Relevance: named in the focus text, declared cast, active in recent chapters, then recency.
  const focus = normalizeIdentityLabel(input.focusText ?? '');
  const cast = new Set((input.castNames ?? []).map(normalizeIdentityLabel));
  const active = new Set(input.activeChapterNumbers ?? []);
  const score = (item: typeof entries[number]) => {
    const names = [item.entry.name, ...(item.entry.aliases ?? [])].map(normalizeIdentityLabel).filter(Boolean);
    let value = 0;
    if (focus && names.some(name => focus.includes(name))) value += 4;
    if (names.some(name => cast.has(name))) value += 3;
    if (item.entry.asOfChapter !== undefined && active.has(item.entry.asOfChapter)) value += 2;
    if (item.entry.facts.isMainCharacter === 'true') value += 3;
    return value;
  };
  const ranked = [...entries].sort((left, right) => score(right) - score(left)
    || (right.entry.asOfChapter ?? -1) - (left.entry.asOfChapter ?? -1) || left.entry.name.localeCompare(right.entry.name));

  const projection: CanonicalStateProjection = { characters: [], relationships: [], locations: [], factions: [], artifacts: [], abilities: [], resources: [...resources.values()] };
  const budget = input.budgetTokens ?? GENERATION_PACKET_BUDGET.sections.canonicalState.tokens;
  // Reserve the projection's own structure and the resources list before entities compete.
  let remaining = budget - estimatePacketTokens({ ...projection, resources: [] }) - estimatePacketTokens(projection.resources);
  const fullShare = Math.floor(budget * GENERATION_PACKET_BUDGET.canonicalFullEntryShare);
  const groupFor = (kind: HarnessCanonicalKind) => PROJECTED_KINDS.find(entry => entry.kind === kind)!.group;
  const compacted: typeof entries = [];
  for (const item of ranked) {
    if (item.tokens <= remaining && budget - remaining + item.tokens <= fullShare) {
      projection[groupFor(item.group.kind)].push(item.entry);
      remaining -= item.tokens;
    } else compacted.push(item);
  }
  // Older supporting entities are compacted to a one-line summary before any are omitted.
  for (const item of compacted) {
    const summary = compactValue(item.entry.facts.description ?? Object.values(item.entry.facts)[0], 96);
    const compact: CanonicalEntityState = { name: item.entry.name, ...(item.entry.asOfChapter !== undefined ? { asOfChapter: item.entry.asOfChapter } : {}), facts: summary ? { summary } : {} };
    const tokens = estimatePacketTokens(compact) + 1;
    if (tokens <= remaining) {
      projection[groupFor(item.group.kind)].push(compact);
      remaining -= tokens;
      omitted.push({ section: 'canonicalState', label: item.entry.name, sourceRecordIds: item.group.records.map(record => record.id),
        reason: 'Compacted to a one-line summary: lower relevance to the current arc, request, cast, and recent chapters than the full entries.' });
    } else {
      omitted.push({ section: 'canonicalState', label: item.entry.name, sourceRecordIds: item.group.records.map(record => record.id),
        reason: 'Omitted: the canonical-state allocation was spent on more relevant entities. The records remain in storage.' });
    }
  }
  return { projection, omitted, identityAmbiguities: ambiguities, activeRecordCount: view.records.length };
};
