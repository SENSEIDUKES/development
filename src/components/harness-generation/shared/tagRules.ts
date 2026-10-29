import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * The HARNESS tag rules: what holds for every kind of tag a chapter carries
 * (sounds, speakers, holding changes, appearances, and the kinds still to
 * come). They are said once, before the first kind's own teaching, so each
 * kind's own section carries only what it marks, its format, one example and
 * its few rules. How a tag names someone is said here once, for every kind
 * (SENSEI, 2026-10-17). What a tag is, since 2026-10-29: a note in the margin
 * naming a paragraph, the exact words, and the tag, never a mark written into
 * the prose. The tagger reads them: the chapter writer places no tags (SENSEI,
 * 2026-10-24). This is HARNESS text, which no installed skill can replace,
 * remove or reorder.
 */
export const HARNESS_TAG_RULES = `HARNESS TAG RULES
A tag is a note in the margin, never a mark on the page: it names a paragraph, the exact words it belongs to, and the tag. The chapter is not retyped and not changed; the app places each note on the words it names.
Tag only what the prose shows, where it shows it.
In every tag, Name is ${MAIN_CHARACTER_SPEAKER_TAG} for the main character; anyone else goes by the name the story already has, listed below.
Each example below is one note, written as you return it.`;
