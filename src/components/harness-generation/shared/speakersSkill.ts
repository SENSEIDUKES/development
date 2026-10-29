import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * How who speaks is said, in the tiny SEN language: a speaker tag on the
 * spoken line it names. The main character's is always `[[@MC]]`; everyone
 * else's is `[[@Name]]`. The HARNESS places the tag at the line's opening
 * mark and the Reader voices the line. Every line gets its own note, so a
 * paragraph with several speakers is voiced right: the old "one speaker per
 * paragraph" was a rule for an author composing a paragraph, and a tagger
 * reads paragraphs as they come. Its example uses the main character's tag,
 * so no real name leans on the casting, and no tag form holds a placeholder
 * name a writer could copy (a copied `[[@Name]]` is read as no tag). It never
 * mentions point of view: the Style skill chooses that, and the HARNESS keeps
 * it (`CurrentStoryProjection.pointOfView`). What a note is, and where tags
 * may go, is said once for every tag kind by the HARNESS tag rules.
 */
export const SEN_SPEAKERS_INSTRUCTIONS = `Every spoken line gets its speaker: [[@Name]], on the words of that line.
Example: {"paragraph": 4, "words": "“Hold the gate,”", "tag": "[[@${MAIN_CHARACTER_SPEAKER_TAG}]]"}
A line is what stands inside one pair of quotation marks. A paragraph with several lines gets a note for each.`;
