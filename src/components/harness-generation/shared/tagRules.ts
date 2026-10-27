import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * The HARNESS tag rules: what holds for every kind of tag written into a
 * chapter's prose (sounds, speakers, holding changes, and the kinds still to
 * come). They are said once, before the first kind's own teaching, so
 * each kind's own section carries only what it marks, its format, one example and its few rules. How a tag names someone is said here once, for every kind (SENSEI, 2026-10-17).
 * The tagger reads them: the chapter writer places no tags (SENSEI,
 * 2026-10-24). This is HARNESS text, which no installed skill can replace,
 * remove or reorder.
 */
export const HARNESS_TAG_RULES = `HARNESS TAG RULES
Tags are notes the app removes before anyone reads, so each paragraph must read complete without them. Tag only what your prose shows, where it happens.
In every tag, Name is ${MAIN_CHARACTER_SPEAKER_TAG} for the main character; anyone else goes by the name Story Information uses.`;
