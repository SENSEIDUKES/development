/**
 * Splitting a chapter into what a reader sees and what the application runs on.
 *
 * `buildReaderFacingChapter` is the only thing ever sent for translation.
 * `mergeReaderTranslation` is the only thing that ever combines a translation
 * with canonical blocks, and it does so at render time: it returns new block
 * objects for display and leaves the stored chapter untouched.
 */

import type { ReaderChapter, StoryBlock, SystemEvent } from '../types';
import type {
  ReaderFacingBlock,
  ReaderFacingChapter,
  ReaderFacingLabelledValue,
  ReaderFacingSystem,
} from './contract';

const text = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  return value.trim() ? value : undefined;
};

const labelled = (value: { label: string; value: string }): ReaderFacingLabelledValue =>
  ({ label: value.label, value: value.value });

const omitEmpty = <T extends object>(value: T): T | undefined =>
  Object.keys(value).length ? value : undefined;

/** The reader-visible half of a System Panel. */
const readerFacingSystem = (system: SystemEvent): ReaderFacingSystem | undefined => {
  const fields: ReaderFacingSystem = {};
  if (text(system.title)) fields.title = system.title;
  if (text(system.flavor)) fields.flavor = system.flavor;
  if (text(system.rarity)) fields.rarity = system.rarity;
  if (system.rows?.length) fields.rows = system.rows.map(labelled);
  if (system.badge) fields.badge = labelled(system.badge);
  if (system.changes?.length) fields.changes = system.changes.map(change => change.label);

  if ('worldNotice' in system && system.worldNotice?.entries.length) {
    fields.worldNotice = {
      entries: system.worldNotice.entries.map(entry => ({
        title: entry.title,
        ...(text(entry.body) ? { body: entry.body } : {}),
        ...(entry.details?.length ? { details: entry.details.map(labelled) } : {}),
      })),
    };
  }

  if ('status' in system && system.status) {
    const status = system.status;
    const projected = {
      ...(text(status.level) ? { level: status.level } : {}),
      // Only the authored display figure travels; `value`/`max` drive the fill
      // and stay canonical numbers.
      ...(status.bars?.length ? {
        bars: status.bars.map(bar => ({
          label: bar.label,
          ...(text(bar.display) ? { display: bar.display } : {}),
        })),
      } : {}),
      ...(status.stats?.length ? {
        stats: status.stats.map(stat => ({ label: stat.label, value: stat.value })),
      } : {}),
      ...(status.effects?.length ? {
        effects: status.effects.map(effect => ({
          name: effect.name,
          ...(text(effect.detail) ? { detail: effect.detail } : {}),
          ...(text(effect.value) ? { value: effect.value } : {}),
        })),
      } : {}),
      ...(status.abilities?.length ? {
        abilities: status.abilities.map(ability => ({
          name: ability.name,
          ...(text(ability.detail) ? { detail: ability.detail } : {}),
        })),
      } : {}),
    };
    const kept = omitEmpty(projected);
    if (kept) fields.status = kept;
  }

  if ('fateResult' in system && system.fateResult) {
    const fate = system.fateResult;
    // `outcome` is an enum the Reader colours by; it is never translated.
    const projected = {
      ...(text(fate.timelineScar) ? { timelineScar: fate.timelineScar } : {}),
      ...(fate.permanentCosts?.length ? { permanentCosts: [...fate.permanentCosts] } : {}),
      ...(text(fate.newStoryState) ? { newStoryState: fate.newStoryState } : {}),
      ...(fate.newActiveStats?.length ? { newActiveStats: [...fate.newActiveStats] } : {}),
      ...(text(fate.genreShift) ? { genreShift: fate.genreShift } : {}),
    };
    const kept = omitEmpty(projected);
    if (kept) fields.fate = kept;
  }

  return omitEmpty(fields);
};

/**
 * The chapter's reader-facing material, in canonical block order. Blocks
 * without a stable ID are skipped: an overlay can only be keyed by an ID that
 * already exists, and inventing one would let a translation address a block
 * the canonical chapter does not recognise.
 */
export const buildReaderFacingChapter = (chapter: ReaderChapter): ReaderFacingChapter => {
  const blocks: ReaderFacingBlock[] = [];
  for (const block of chapter.blocks ?? []) {
    if (!block.id) continue;
    const blockText = text(block.text);
    const system = block.system ? readerFacingSystem(block.system) : undefined;
    if (!blockText && !system) continue;
    blocks.push({
      id: block.id,
      ...(blockText ? { text: blockText } : {}),
      ...(system ? { system } : {}),
    });
  }
  return { title: chapter.title, blocks };
};

/**
 * A stable content hash of the reader-facing material. Any edit to what a
 * reader sees changes it, so an existing translation is recognised as stale;
 * machine-facing changes deliberately do not, because they were never
 * translated. FNV-1a run over two offsets, so no crypto dependency is needed
 * in the browser or in jsdom.
 */
export const readerFacingContentHash = (chapter: ReaderFacingChapter): string => {
  const serialized = JSON.stringify(chapter);
  let low = 0x811c9dc5;
  let high = 0x01000193;
  for (let index = 0; index < serialized.length; index += 1) {
    const code = serialized.charCodeAt(index);
    low = Math.imul(low ^ code, 0x01000193) >>> 0;
    high = Math.imul(high ^ (code + index), 0x85ebca6b) >>> 0;
  }
  return `${low.toString(16).padStart(8, '0')}${high.toString(16).padStart(8, '0')}`;
};

const mergedSystem = (system: SystemEvent, overlay: ReaderFacingSystem): SystemEvent => {
  const merged = { ...system } as SystemEvent;
  if (overlay.title !== undefined) merged.title = overlay.title;
  if (overlay.flavor !== undefined) merged.flavor = overlay.flavor;
  if (overlay.rarity !== undefined) merged.rarity = overlay.rarity;
  if (overlay.rows && merged.rows) {
    // `trend` is a canonical semantic direction and survives the swap.
    merged.rows = merged.rows.map((row, index) => ({
      ...row,
      ...(overlay.rows![index] ?? {}),
    }));
  }
  if (overlay.badge && merged.badge) merged.badge = { ...overlay.badge };
  if (overlay.changes && merged.changes) {
    merged.changes = merged.changes.map((change, index) => ({
      ...change,
      ...(overlay.changes![index] === undefined ? {} : { label: overlay.changes![index] }),
    }));
  }

  if (overlay.worldNotice && 'worldNotice' in merged && merged.worldNotice) {
    const entries = merged.worldNotice.entries;
    merged.worldNotice = {
      entries: entries.map((entry, index) => {
        const translated = overlay.worldNotice!.entries[index];
        if (!translated) return entry;
        return {
          ...entry,
          title: translated.title,
          ...(translated.body !== undefined ? { body: translated.body } : {}),
          ...(translated.details && entry.details ? {
            details: entry.details.map((detail, detailIndex) => ({
              ...detail,
              ...(translated.details![detailIndex] ?? {}),
            })),
          } : {}),
        };
      }),
    };
  }

  if (overlay.status && 'status' in merged && merged.status) {
    const status = merged.status;
    merged.status = {
      ...status,
      ...(overlay.status.level !== undefined ? { level: overlay.status.level } : {}),
      ...(overlay.status.bars && status.bars ? {
        bars: status.bars.map((bar, index) => {
          const translated = overlay.status!.bars![index];
          return translated
            ? { ...bar, label: translated.label, ...(translated.display !== undefined ? { display: translated.display } : {}) }
            : bar;
        }),
      } : {}),
      ...(overlay.status.stats && status.stats ? {
        stats: status.stats.map((stat, index) => ({ ...stat, ...(overlay.status!.stats![index] ?? {}) })),
      } : {}),
      ...(overlay.status.effects && status.effects ? {
        effects: status.effects.map((effect, index) => ({ ...effect, ...(overlay.status!.effects![index] ?? {}) })),
      } : {}),
      ...(overlay.status.abilities && status.abilities ? {
        abilities: status.abilities.map((ability, index) => ({ ...ability, ...(overlay.status!.abilities![index] ?? {}) })),
      } : {}),
    };
  }

  if (overlay.fate && 'fateResult' in merged && merged.fateResult) {
    merged.fateResult = {
      ...merged.fateResult,
      ...(overlay.fate.timelineScar !== undefined ? { timelineScar: overlay.fate.timelineScar } : {}),
      ...(overlay.fate.permanentCosts ? { permanentCosts: [...overlay.fate.permanentCosts] } : {}),
      ...(overlay.fate.newStoryState !== undefined ? { newStoryState: overlay.fate.newStoryState } : {}),
      ...(overlay.fate.newActiveStats ? { newActiveStats: [...overlay.fate.newActiveStats] } : {}),
      ...(overlay.fate.genreShift !== undefined ? { genreShift: overlay.fate.genreShift } : {}),
    };
  }

  return merged;
};

/**
 * Canonical blocks with reader-facing values swapped for display. Block
 * identity, order, type, metadata, and every machine-facing field come
 * straight from the canonical block; a block the overlay does not mention is
 * returned untouched and still readable.
 */
export const mergeReaderTranslation = (
  blocks: readonly StoryBlock[],
  overlay: readonly ReaderFacingBlock[],
): StoryBlock[] => {
  const byId = new Map(overlay.map(block => [block.id, block]));
  return blocks.map(block => {
    const translated = block.id ? byId.get(block.id) : undefined;
    if (!translated) return block;
    return {
      ...block,
      ...(translated.text !== undefined ? { text: translated.text } : {}),
      ...(translated.system && block.system
        ? { system: mergedSystem(block.system, translated.system) }
        : {}),
    };
  });
};
