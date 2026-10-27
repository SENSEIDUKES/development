import ownerExport from './owner-looks.json';
import { decodeLooks, encodeLooks, STORAGE_KEY, writeLooks, type SavedLook } from './model';

// The owner's uploaded export is the source of these looks, not a new app theme.
export const STARTING_LOOKS_KEY = `${STORAGE_KEY}.owner-export-2026-10-27`;
export const startingLooks = (): SavedLook[] => decodeLooks(JSON.stringify(ownerExport));

/** Add the supplied work once, without replacing browser work or reviving deletions. */
export function loadStartingLooks(storage: Pick<Storage, 'getItem' | 'setItem'>): { looks: SavedLook[]; warning: string } {
  let existing: SavedLook[];
  let included: boolean;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    existing = raw === null ? [] : decodeLooks(raw);
    included = storage.getItem(STARTING_LOOKS_KEY) === 'included';
  } catch {
    return { looks: startingLooks(), warning: 'Browser looks could not be read. Your exported looks are available for this visit; stored data was left untouched. Export before leaving.' };
  }
  if (included) return { looks: existing, warning: '' };
  const missing = startingLooks().filter(seed => !existing.some(look => look.id === seed.id
    || (look.name === seed.name && encodeLooks([{ ...look, id: seed.id }]) === encodeLooks([seed]))));
  // Existing browser work stays last, and remains the starting experiment.
  const looks = [...missing, ...existing];
  if (looks.length > 100) return { looks: existing, warning: 'There is not enough room to add the four exported looks. Your browser looks were kept. Export and remove a few looks to make room.' };
  try {
    writeLooks(storage, looks);
    storage.setItem(STARTING_LOOKS_KEY, 'included');
    return { looks, warning: '' };
  } catch {
    return { looks, warning: 'Browser storage is unavailable or full. Your exported and browser looks are available for this visit. Export before leaving.' };
  }
}
