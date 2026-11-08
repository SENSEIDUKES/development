/**
 * The Familiar's master action list: everything it can do, one line each,
 * with where it may do it. A page never hands the Familiar an action this
 * list does not allow there, so a request on one page can never run another
 * page's action. Every action the app gives the Familiar must be listed here
 * (`src/novel-expanded/appFamiliarActions.test.ts` fails otherwise); a new
 * feature adds its line in the same change. Front Desk reads it through
 * `familiarActionPolicy`.
 */

import type { FrontDeskActionPolicy } from '@seihouse/front-desk';

/** The places the Familiar can be, as the reader sees them. */
export type FamiliarPage = 'home' | 'discover' | 'create' | 'world-info' | 'profile' | 'reader' | 'create-mode';

export interface FamiliarActionEntry {
  id: string;
  label: string;
  /** Where the Familiar may do it: on any page, or only on these. */
  where: 'anywhere' | readonly FamiliarPage[];
  /** Pages where it is left out, for an `anywhere` action that would go where the reader already is. */
  notOn?: readonly FamiliarPage[];
  /** Goes somewhere and changes nothing, so it happens at once; every other action is confirmed first. */
  instant?: true;
}

export const FAMILIAR_ACTION_LIST: readonly FamiliarActionEntry[] = [
  // Anywhere: going places. Nothing changes, so no confirmation.
  { id: 'go-home', label: 'Home', where: 'anywhere', notOn: ['home'], instant: true },
  { id: 'go-create', label: 'Create', where: 'anywhere', notOn: ['create'], instant: true },
  { id: 'go-profile', label: 'Profile', where: 'anywhere', notOn: ['profile'], instant: true },
  { id: 'go-energy', label: 'My Energy', where: 'anywhere', instant: true },
  { id: 'go-settings', label: 'Settings', where: 'anywhere', instant: true },
  { id: 'go-store', label: 'Store', where: 'anywhere', instant: true },
  // The rescue: back to the previous screen, always offered (shown as its own pill, never a tile).
  { id: 'go-back', label: 'Take me back', where: 'anywhere', instant: true },
  // Spoken codes (N3, C12): said, never shown as tiles. Going somewhere, so at once.
  { id: 'open-novel', label: 'Open a story by its code', where: ['home'], instant: true },
  { id: 'open-chapter', label: 'Open a chapter by its code', where: ['reader'], instant: true },
  // The Reader: Fate, how the reader directs the next chapter.
  { id: 'worldBuilding', label: 'World Building', where: ['reader'] },
  { id: 'progression', label: 'Progression', where: ['reader'] },
  { id: 'conflict', label: 'Conflict', where: ['reader'] },
  { id: 'custom', label: 'Custom', where: ['reader'] },
  // Create mode, inside the Reader: authoring the chapter's sound.
  { id: 'sound', label: 'Add sound', where: ['create-mode'] },
];

/** What the Familiar's card shows first on each page: at most four, the rest under See all. */
export const FAMILIAR_FRONT_ACTIONS: Readonly<Record<FamiliarPage, readonly string[]>> = {
  home: ['go-create', 'go-energy', 'go-store', 'go-settings'],
  discover: ['go-home', 'go-create', 'go-energy'],
  create: ['go-energy', 'go-home', 'go-store'],
  'world-info': ['go-home', 'go-create', 'go-energy'],
  profile: ['go-energy', 'go-store', 'go-settings', 'go-home'],
  // The Fate panel's order, so F1–F4 read the same on the card and the panel.
  reader: ['progression', 'worldBuilding', 'conflict', 'custom'],
  'create-mode': ['sound'],
};

/** How many actions the card shows before See all. */
export const FAMILIAR_FRONT_LIMIT = 4;

export const familiarActionEntry = (id: string) => FAMILIAR_ACTION_LIST.find(entry => entry.id === id);

/** Whether the master list lets the Familiar do this action on this page. */
export function familiarActionAllowed(id: string, page: FamiliarPage): boolean {
  const entry = familiarActionEntry(id);
  if (!entry || entry.notOn?.includes(page)) return false;
  return entry.where === 'anywhere' || entry.where.includes(page);
}

/**
 * The actions the Familiar gets on a page: only those the master list allows
 * there (anything else, or unlisted, is dropped), each once, the page's front
 * suggestions first in their order.
 */
export function familiarActionsFor<Action extends { id: string }>(page: FamiliarPage, registered: readonly Action[]): Action[] {
  const allowed: Action[] = [];
  for (const action of registered) if (familiarActionAllowed(action.id, page) && !allowed.some(entry => entry.id === action.id)) allowed.push(action);
  const front = FAMILIAR_FRONT_ACTIONS[page];
  const rank = (id: string) => { const at = front.indexOf(id); return at < 0 ? front.length : at; };
  return allowed.map((action, at) => ({ action, at })).sort((a, b) => rank(a.action.id) - rank(b.action.id) || a.at - b.at).map(({ action }) => action);
}

/** How many of a page's actions are front suggestions (they come first). */
export const familiarFrontCount = (page: FamiliarPage, actions: readonly { id: string }[]) =>
  Math.min(FAMILIAR_FRONT_LIMIT, actions.filter(action => FAMILIAR_FRONT_ACTIONS[page].includes(action.id)).length);

/** The master list as Front Desk's action policy, for the Familiar's pages. */
export const familiarActionPolicy: FrontDeskActionPolicy = {
  actionsFor: (page, actions) => familiarActionsFor(page as FamiliarPage, actions),
  frontCount: (page, actions) => familiarFrontCount(page as FamiliarPage, actions),
  instant: id => Boolean(familiarActionEntry(id)?.instant),
};
