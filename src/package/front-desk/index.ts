/**
 * `@seihouse/front-desk`: SEIHouse Front Desk.
 *
 * An app's front desk in one character: help for the page you are on, guides
 * that play while you follow along, actions it always asks before taking,
 * "Take me back", look-ups that never spoil, and voice, typing and live talk.
 * The host supplies the character (name, face), its pages' topics and actions,
 * its docs and its wording; Front Desk supplies the rest.
 *
 * - `@seihouse/front-desk`                — the controller, the card and its provider
 * - `@seihouse/front-desk/docs-knowledge` — the docs catalog shape and look-up
 * - `@seihouse/front-desk/engines`        — the free browser voice, the wake word, and live talk engines
 *
 * It imports nothing from SEN, the Library or any app. SEIHouse's Novel
 * Expanded calls its character the Familiar; SEA will have its own.
 */
export * from '../../front-desk/core/controller';
export { parseSpokenCode, spokenNumber, SPOKEN_CODE_MAX, type SpokenCode, type SpokenCodeWords } from '../../front-desk/core/spokenCodes';
export { FrontDeskProvider, FrontDeskTalkButton, useFrontDeskAvailable, useFrontDeskContext, useFrontDeskInUse, useFrontDeskReadAloud, type FrontDeskGuides } from '../../front-desk/card/FrontDesk';
export { FrontDeskGuideView, type FrontDeskGuide, type FrontDeskGuideViewProps } from '../../front-desk/card/GuideView';
export { FrontDeskClip } from '../../front-desk/card/Clip';
export { FrontDeskGreeting, type FrontDeskGreetingProps } from '../../front-desk/card/Greeting';

/** The package surface version, bumped with the published package. */
export const FRONT_DESK_PACKAGE_VERSION = '0.1.0';
