import ownerExport from './owner-looks.json';
import { decodeLooks, encodeLooks, STORAGE_KEY, writeLooks, type SavedLook } from './model';

// The owner's uploaded export is the source of these looks, not a new app theme.
export const STARTING_LOOKS_KEY = `${STORAGE_KEY}.owner-export-2026-10-27`;
export const STARTING_LOOKS_REVISION = 'owner-v1';
export const startingLooks = (): SavedLook[] => decodeLooks(JSON.stringify(ownerExport));

/** Add the supplied work once, without replacing browser work or reviving deletions. */
export function loadStartingLooks(storage: Pick<Storage, 'getItem' | 'setItem'>): { looks: SavedLook[]; warning: string } {
  let existing: SavedLook[];
  let included: boolean;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    existing = raw === null ? [] : decodeLooks(raw);
    included = storage.getItem(STARTING_LOOKS_KEY) === STARTING_LOOKS_REVISION;
  } catch {
    return { looks: startingLooks(), warning: 'Browser looks could not be read. Your exported looks are available for this visit; stored data was left untouched. Export before leaving.' };
  }
  if (included) return { looks: existing, warning: '' };
  const supplied = startingLooks();
  const remaining = [...existing];
  const previous: SavedLook[] = [];
  const defaults = supplied.map(seed => {
    const exact = remaining.findIndex(look => look.name === seed.name
      && encodeLooks([{ ...look, id: seed.id }]) === encodeLooks([seed]));
    const sameId = remaining.findIndex(look => look.id === seed.id);
    if (sameId !== -1 && sameId !== exact) {
      const old = remaining[sameId];
      previous.push({ ...old, id: crypto.randomUUID(), name: `${old.name.slice(0, 69)} (previous)` });
    }
    // The owner explicitly updated these defaults. Keep conflicting local work
    // as a separate look, and retain IDs for identical previously imported looks.
    const match = exact === -1 ? seed : remaining[exact];
    for (const index of [sameId, exact].filter((n, i, all) => n !== -1 && all.indexOf(n) === i).sort((a, b) => b - a)) remaining.splice(index, 1);
    return match;
  });
  // The newly supplied final combination is the default on this revision's first
  // visit. Subsequent visits use saved browser work and respect deletions.
  const looks = [...previous, ...remaining, ...defaults];
  if (looks.length > 100) return { looks: existing, warning: 'There is not enough room to add the four exported looks. Your browser looks were kept. Export and remove a few looks to make room.' };
  try {
    writeLooks(storage, looks);
    storage.setItem(STARTING_LOOKS_KEY, STARTING_LOOKS_REVISION);
    return { looks, warning: '' };
  } catch {
    return { looks, warning: 'Browser storage is unavailable or full. Your exported and browser looks are available for this visit. Export before leaving.' };
  }
}
