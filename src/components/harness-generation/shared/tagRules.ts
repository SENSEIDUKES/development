import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * The HARNESS tag rules: what holds for every kind of tag a chapter carries
 * (sounds, speakers, holding changes, appearances, statuses, places, ties, settings, and any kinds
 * still to come). They are said once, before the first kind's own teaching, so each
 * kind's own section carries only what it marks, its format, one example and
 * its few rules. How a tag names someone is said here once, for every kind
 * (SENSEI, 2026-10-17). In a story with cards the tagger uncovers and never
 * invents (SENSEI, 2026-11-11): the cards are who and what the story is about,
 * and anyone else is a minor figure, who gets where they appear and what they
 * say and nothing more. A story with no cards at all (chapters brought in
 * from outside) has nothing to tell a minor figure from, so it keeps the
 * naming line it had (`HARNESS_TAG_RULES_WITHOUT_CARDS`).
 * What a tag is, since 2026-10-29: a note in the margin
 * naming a paragraph, the exact words, and the tag, never a mark written into
 * the prose. The tagger reads them: the chapter writer places no tags (SENSEI,
 * 2026-10-24). This is HARNESS text, which no installed skill can replace,
 * remove or reorder.
 */
const tagRules = (naming: string) => `HARNESS TAG RULES
A tag is a note in the margin, never a mark on the page: it names a paragraph, the exact words it belongs to, and the tag. The chapter is not retyped and not changed; the app places each note on the words it names.
Tag only what the prose shows, where it shows it.
${naming}
Each example below is one note, written as you return it.`;

/** The tag rules of a story with cards. */
export const HARNESS_TAG_RULES = tagRules(`In every tag, Name is ${MAIN_CHARACTER_SPEAKER_TAG} for the main character; anyone else goes by the name listed below.
The story's cards are listed below: its characters, things, abilities and places. Your work is to find them on the page. When the prose shows one of them, by name or by a description that fits its card, tag it by the card's name.
Anyone who is not a card is a minor figure. A minor figure gets two tags only: appears, where they first step onto the page, and their speaker tag on each line they speak. Never a holding, a condition, a place, a tie or a look of their own.
A thing or place that is not a card is named only in a card character's own tag (what they gained, where they arrived). It gets no appears tag.`);

/** The tag rules of a story with no cards at all: everyone it names is tagged in full, as before. */
export const HARNESS_TAG_RULES_WITHOUT_CARDS = tagRules(`In every tag, Name is ${MAIN_CHARACTER_SPEAKER_TAG} for the main character; anyone else goes by the name the story already has, listed below.`);
