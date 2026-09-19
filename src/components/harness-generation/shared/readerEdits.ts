import type { ReaderCodexStoryPatch, StoryWorld } from '../../../narrative/story';
import type { HarnessReaderChange } from '../../../narrative/generation';

const FIELDS = new Set(['assignedRevealBackdrops', 'bookmarks', 'karmaNodes', 'lastReadAt', 'lastReadChapter', 'lastReadScrollPosition', 'mediaDescriptors', 'memory', 'motionCoverActive', 'readerPreferences', 'readingAnchor', 'readingStats', 'relationships']);
const UNSAFE = new Set(['__proto__', 'prototype', 'constructor']);
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const keyed = (value: unknown): value is Array<{ id: string; [key: string]: unknown }> => Array.isArray(value) && value.every(item => object(item) && typeof item.id === 'string' && item.id.length > 0) && new Set(value.map(item => item.id)).size === value.length;

/** Store only actual edits, addressed by entity identity, never a second StoryWorld snapshot. */
export function diffHarnessReaderPatch(before: StoryWorld, patch: ReaderCodexStoryPatch): HarnessReaderChange[] {
  const changes: HarnessReaderChange[] = [];
  const diff = (left: unknown, right: unknown, path: HarnessReaderChange['path']) => {
    if (JSON.stringify(left) === JSON.stringify(right)) return;
    if (keyed(left) && keyed(right)) {
      const old = new Map(left.map(item => [item.id, item]));
      const next = new Map(right.map(item => [item.id, item]));
      for (const id of new Set([...old.keys(), ...next.keys()])) diff(old.get(id), next.get(id), [...path, { id }]);
    } else if (object(left) && object(right)) {
      for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
        if (UNSAFE.has(key)) throw new Error('Unsafe Reader field.');
        diff(left[key], right[key], [...path, key]);
      }
    } else changes.push(right === undefined ? { path, remove: true } : { path, value: JSON.parse(JSON.stringify(right)) });
  };
  for (const [key, value] of Object.entries(patch)) {
    if (!FIELDS.has(key)) throw new Error(`Reader cannot replace canonical story field ${key}.`);
    diff(before[key as keyof StoryWorld], value, [key]);
  }
  return changes;
}

/** Apply author deltas on a freshly derived view; new generated entities are retained. */
export function applyHarnessReaderChanges(story: StoryWorld, changes: readonly HarnessReaderChange[]): StoryWorld {
  const result = structuredClone(story);
  for (const change of changes) {
    if (!change.path.length || typeof change.path[0] !== 'string' || !FIELDS.has(change.path[0])) throw new Error('Invalid Reader edit path.');
    let target: any = result;
    for (let index = 0; index < change.path.length; index++) {
      const part = change.path[index];
      if (typeof part === 'string' && UNSAFE.has(part)) throw new Error('Unsafe Reader edit path.');
      const end = index === change.path.length - 1;
      if (typeof part !== 'string') {
        if (!Array.isArray(target)) break;
        let position = target.findIndex(item => item?.id === part.id);
        if (position < 0) {
          if (change.remove) break;
          position = target.length;
          target.push({ id: part.id });
        }
        if (end) {
          if (change.remove) target.splice(position, 1);
          else target[position] = structuredClone(change.value);
        } else target = target[position];
      } else if (end) {
        if (change.remove) delete target[part];
        else target[part] = structuredClone(change.value);
      } else {
        target[part] ??= typeof change.path[index + 1] === 'string' ? {} : [];
        target = target[part];
      }
    }
  }
  return result;
}

/** Art, audio and reading preferences are never Generation Model Call content. */
export function semanticReaderChanges(changes: readonly HarnessReaderChange[]) {
  const presentation = /image|voice|audio|media|backdrop|thumbnail|cover|visual|portrait/i;
  return changes.filter(change => ['memory', 'relationships', 'karmaNodes'].includes(String(change.path[0])) && !change.path.some(part => typeof part === 'string' && presentation.test(part)))
    .map(change => ({ ...change, value: change.value === undefined ? undefined : sanitize(change.value) }));
  function sanitize(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(sanitize);
    if (object(value)) return Object.fromEntries(Object.entries(value).filter(([key]) => !presentation.test(key)).map(([key, item]) => [key, sanitize(item)]));
    return value;
  }
}
