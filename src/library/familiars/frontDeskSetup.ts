/**
 * What Novel Expanded hands SEIHouse Front Desk: its docs, its master action
 * list, the letters of the codes on its screens, its wake word, and its own
 * wording: the character's name (the Familiar) in every label and message, its
 * greeting, spoilers (later chapters), and what the Familiar looks things up
 * in (the docs and the story's record).
 */
import type { FrontDeskSetup, FrontDeskWording, SpokenCodeWords } from '@seihouse/front-desk';
import { novelExpandedDocs } from '../docs/catalog';
import { familiarActionPolicy } from './actionList';

/** The word that calls the Familiar while the app is open, like a smart speaker's. */
export const FAMILIAR_WAKE_WORD = 'familiar';

/** The codes on Novel Expanded's screens: N for a story, C for a chapter, F for a Fate path. */
export const FAMILIAR_CODE_WORDS: SpokenCodeWords = {
  N: ['n', 'en', 'and', 'novel', 'story', 'world'],
  C: ['c', 'see', 'sea', 'si', 'chapter'],
  F: ['f', 'ef', 'eff', 'fate', 'path'],
};

/** Said after an answer when later chapters say more: that there is more, never what. */
export const FAMILIAR_SPOILER_OFFER = 'Later chapters say more. Say “spoil” and the name to hear it.';

/** Novel Expanded's word for its character, in every label and message ("Talk to Familiar"). */
export const FAMILIAR_WHO = 'Familiar';

export const FAMILIAR_WORDING: FrontDeskWording = {
  who: FAMILIAR_WHO,
  greeting: 'I’ll be with you through every story: reading, creating, and everything in between. Want me to show you around?',
  greetingNote: 'My guides are always on the Familiar page.',
  spoilerOffer: FAMILIAR_SPOILER_OFFER,
  liveHeldBack: 'Later chapters say more about this. That is a spoiler: do not hint at it, and offer it only if the reader asks to be spoiled.',
  liveNothing: 'Neither the docs nor the story\'s record say anything about that up to here. Tell the reader you do not know, and do not answer it yourself.',
  liveFound: 'What the docs and the story\'s record say:',
  explainHelp: 'shows and tells you how things work here, and answers questions about the app and your story.',
  codesHelp: 'Say a code you see on screen, like N2 or C5.',
};

export const familiarFrontDeskSetup: FrontDeskSetup = {
  docs: novelExpandedDocs,
  policy: familiarActionPolicy,
  codes: FAMILIAR_CODE_WORDS,
  wording: FAMILIAR_WORDING,
};
