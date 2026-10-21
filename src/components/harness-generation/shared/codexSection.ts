import type { CodexEntry } from '../../../narrative/holdings';
import type { CodexSection, CodexSectionEntry } from '../../../narrative/generation';
import { normalizeIdentityLabel } from './canonicalProjection';
import { abilityLabel, deriveHoldings, thingLabel, UNNAMED_MAIN_CHARACTER, type DeclaredCharacter, type HoldingsChapter } from './holdings';
import { conditionLabel, derivePlanRecord, type RecordChapter, type RecordedEntity } from './planRecord';

/**
 * The Codex section of the planner's Story Information (SENSEI, 2026-10-20):
 * everyone and everything the story knows, as the last chapter left them,
 * worked out from the committed chapters' plans. The main character comes
 * first, always, even before any chapter; then everyone and everything the
 * story has had on the page, the most recent first; then what the record
 * names without having had it on the page (a thing gained, someone owed);
 * then the Story Seed's characters still to come, with the author's notes.
 * Abilities are listed under whoever knows them.
 */
export function buildCodexSection({ entries, chapters, declared }: {
  /** The story's Codex entries. */
  entries: readonly CodexEntry[];
  /** The story's committed chapters. */
  chapters: ReadonlyArray<RecordChapter & HoldingsChapter>;
  /** The characters the Story Seed declares. */
  declared: readonly DeclaredCharacter[];
}): CodexSection {
  const record = derivePlanRecord({ entries, chapters });
  const holdings = deriveHoldings({ entries, chapters });
  const recorded = new Map(record.map(entity => [entity.key, entity]));
  const held = new Map(holdings.characters.map(character => [character.entryId, character]));
  const holderOf = new Map(holdings.characters.flatMap(character => character.things.map(thing => [thing.entryId, character.name] as const)));
  const declaredOf = (entry: CodexEntry) => declared.find(character => [character.name, ...(character.aliases ?? [])]
    .some(name => normalizeIdentityLabel(name) === normalizeIdentityLabel(entry.name)));

  const open = <T extends { outcome?: unknown }>(items: readonly T[]) => items.filter(item => !item.outcome);
  const lineOf = (entry: CodexEntry): CodexSectionEntry => {
    const entity: RecordedEntity | undefined = recorded.get(entry.id);
    const things = held.get(entry.id)?.things ?? [];
    const abilities = held.get(entry.id)?.abilities ?? [];
    const rank = held.get(entry.id)?.rank;
    const story = entity?.castIn.length ? undefined : declaredOf(entry);
    const status = entity ? conditionLabel(entity.condition) : undefined;
    const inHand = things.filter(thing => thing.equipped).map(thingLabel);
    const carries = things.filter(thing => !thing.equipped).map(thingLabel);
    const knows = abilities.filter(ability => ability.stage === 'learned').map(abilityLabel);
    const learning = abilities.filter(ability => ability.stage === 'learning').map(abilityLabel);
    const goals = open(entity?.goals ?? []).map(goal => goal.what);
    const values = (entity?.values ?? []).filter(value => value.stance === 'held').map(value => value.what);
    const owes = open(entity?.commitments ?? []).map(commitment => ({ to: commitment.to.name, what: commitment.what }));
    const owedBy = record.flatMap(other => open(other.commitments).filter(commitment => commitment.to.key === entry.id).map(commitment => ({ by: other.name, what: commitment.what })));
    const stances = (entity?.stances ?? []).map(stance => ({
      toward: stance.toward.name,
      ...(stance.said ? { said: stance.said.polarity } : {}),
      ...(stance.acted ? { acted: stance.acted.polarity } : {}),
    }));
    const heldBy = entry.kind === 'thing' ? holderOf.get(entry.id) : undefined;
    return {
      name: entry.name,
      kind: entry.kind === 'thing' ? 'thing' : 'character',
      ...(entry.mainCharacter ? { mainCharacter: true as const } : {}),
      ...(story ? { fromStorySeed: true as const, ...(story.notes ? { notes: story.notes } : {}) } : {}),
      ...(entity?.who ? { who: entity.who.text } : {}),
      ...(entity?.gender ? { gender: entity.gender } : {}),
      ...(entity?.age ? { age: entity.age } : {}),
      ...(entity?.look ? { look: entity.look.look } : {}),
      ...(entity?.lookChanges.length ? { lookChanges: entity.lookChanges.map(change => ({ change: change.change, chapterNumber: change.passage.chapterNumber })) } : {}),
      ...(status ? { status } : {}),
      ...(rank ? { rank: rank.text } : {}),
      ...(inHand.length ? { inHand } : {}),
      ...(carries.length ? { carries } : {}),
      ...(knows.length ? { knows } : {}),
      ...(learning.length ? { learning } : {}),
      ...(goals.length ? { goals } : {}),
      ...(values.length ? { values } : {}),
      ...(owes.length ? { owes } : {}),
      ...(owedBy.length ? { owedBy } : {}),
      ...(stances.length ? { stances } : {}),
      ...(heldBy ? { heldBy } : {}),
      ...(entity?.castIn.length ? { lastOnPage: entity.castIn.at(-1)!.chapterNumber } : {}),
    };
  };

  const shown = entries.filter(entry => entry.kind !== 'ability');
  const main = shown.find(entry => entry.kind === 'character' && entry.mainCharacter);
  const mainDeclared = declared.find(character => character.mainCharacter);
  const mainLine: CodexSectionEntry = main ? lineOf(main) : {
    name: mainDeclared?.name ?? UNNAMED_MAIN_CHARACTER, kind: 'character', mainCharacter: true,
    ...(mainDeclared ? { fromStorySeed: true as const, ...(mainDeclared.notes ? { notes: mainDeclared.notes } : {}) } : {}),
  };
  const others = shown.filter(entry => entry !== main).map(entry => ({ entry, line: lineOf(entry) }));
  const onPage = others.filter(({ line }) => line.lastOnPage !== undefined)
    .sort((left, right) => right.line.lastOnPage! - left.line.lastOnPage!);
  const offPage = others.filter(({ line }) => line.lastOnPage === undefined);
  // The Story Seed's characters no plan has named yet.
  const named = new Set(entries.flatMap(entry => [entry.name, ...(entry.aliases ?? [])]).map(normalizeIdentityLabel));
  const toCome = declared.filter(character => !character.mainCharacter
    && ![character.name, ...(character.aliases ?? [])].some(name => named.has(normalizeIdentityLabel(name))))
    .map((character): CodexSectionEntry => ({ name: character.name, kind: 'character', fromStorySeed: true, ...(character.notes ? { notes: character.notes } : {}) }));
  return { entries: [mainLine, ...onPage.map(({ line }) => line), ...offPage.map(({ line }) => line), ...toCome] };
}
