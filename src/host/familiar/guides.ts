import type { FamiliarGuide } from '@seihouse/library/familiar';

/**
 * The Familiar's guides: the how-tos it teaches a new reader, in the order
 * the Guides tab lists them (Familiar page → Guides).
 *
 * HOW TO ADD A VIDEO (no code knowledge needed)
 * 1. Record the screen (6–60 seconds, silent; wide or tall both work).
 * 2. Upload it to media.seihouse.org under SEN/VIDEO/Guides/.
 * 3. Paste its link as `videoUrl` on that guide, between the quotes, e.g.
 *      videoUrl: 'https://media.seihouse.org/SEN/VIDEO/Guides/Start%20a%20story%20seed.mp4',
 *    A guide without a `videoUrl` shows "Coming soon".
 *
 * `line` is what the Familiar says over the clip. Rewrite any of them in
 * your own words; keep each to one or two sentences. A recorded reading can
 * go in `audioUrl` the same way; without one, the device voice reads `line`.
 *
 * To add a guide, copy a block, give it a new `id` (lowercase, dashes), and
 * place it where it should appear in the list.
 */
export const FAMILIAR_GUIDES: readonly FamiliarGuide[] = [
  {
    id: 'meet-your-familiar',
    title: 'Meet your Familiar',
    line: 'I go everywhere you go. Tap me any time and I will explain what you are looking at, or do it for you.',
  },
  {
    id: 'start-a-story-seed',
    title: 'Start a story seed',
    line: 'Every story begins as a seed. Open Create and tap Create to plant one, or try Sparks for an idea. We will grow it from there.',
  },
  {
    id: 'read-and-direct',
    title: 'Read and direct a chapter',
    line: 'Read the chapter, then tell the story where to go next. Your choice shapes the chapter that follows.',
  },
  {
    id: 'highlight-engine',
    title: 'Use the highlight engine',
    line: 'Highlight a line in your chapter to give it sound and life. Pick the words, then choose what they become.',
  },
  {
    id: 'offer-qi',
    title: 'Offer QI and grow your bond',
    line: 'Offer me QI from the Familiar page. Each bond rank strengthens my element on your name.',
  },
  {
    id: 'make-it-yours',
    title: 'Name me and rewrite my story',
    line: 'Open settings on the Familiar page to give me a name of your own, or rewrite my story in your words.',
  },
  {
    id: 'familiar-settings',
    title: 'Change your Familiar’s settings',
    line: 'Tap the gear on the Familiar page to change my size, keep me in the header, or turn on Live talk.',
  },
  {
    id: 'talk-to-your-familiar',
    title: 'Talk to your Familiar',
    line: 'Tap my microphone and talk, or type. Say Explain to learn, or Action to have me do it for you.',
  },
];

/** The guide the first-meeting welcome opens on. */
export const FAMILIAR_FIRST_GUIDE_ID = FAMILIAR_GUIDES[0].id;
