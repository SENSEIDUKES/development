import type { WriterInstructionId } from './writerInstructions';

export interface WriterInstructionsChange {
  /** The real calendar date of the change, YYYY-MM-DD. */
  date: string;
  /** What changed and why, in plain words. */
  summary: string;
  /** Each block the change touched, with the fingerprint of its text afterwards (`fingerprintText`). */
  changed: Partial<Record<WriterInstructionId, string>>;
}

/**
 * Every change to the writer's instructions, newest first. A test compares
 * each block's text with the fingerprint its latest entry recorded, so any
 * change to the words the writer reads fails until it is written down here.
 *
 * To record a change: add an entry at the top with today's date, say in plain
 * words what changed and why, and list each changed block with the new
 * fingerprint the failing test names.
 */
export const WRITER_INSTRUCTIONS_HISTORY: readonly WriterInstructionsChange[] = [
  {
    date: '2026-10-14',
    summary: 'From SENSEI\'s Test Story - Blade run (chapters 3 to 10): the writer tagged every new character but no thing at all, and in Chapter 9 used a look tag right after an appears tag to describe a first look, so two people got two looks each. SEN Appearance 1.1.0: a look tag is only a later change, never a first description, and an appears tag for a thing is only for a named object no one holds; held things are now recorded from their Holdings tags by the HARNESS, which also ignores a look tag in the paragraph that first shows someone. The chapter request (not a recorded block) now asks for about 1,500 words, 1,200 to 1,700 in 35 paragraphs, down from 1,800 to 2,500 in 50: chapters read too long.',
    changed: { appearance: '175e49662b3faa' },
  },
  {
    date: '2026-10-14',
    summary: 'The information tagging phase begins with the first appearance, with its look (asked for by SENSEI). SEN Appearance 1.0.0 loads on every chapter: the writer reads who and what is already on the page in Story Information\'s new Appeared section, tags each character or named thing the moment it first steps onto the page ([[appears: Name | character]], [[appears: Thing | thing]]) and each change to a look ([[look: Name | what changed]]), and keeps every look Appeared gives until a look tag changes it. Places, factions and sects wait for their own tags. The response contract names the Appeared section among the packet\'s sections. A new step after a chapter is saved, the look step, reads each tagged passage (with the author\'s notes on a character, and the look before a change) and writes the look down: one line and the traits the passage states, in words any medium can use, never how to show it.',
    changed: { appearance: '1d610f13868e09', 'response-contract': '09b181a22b6f51', 'look-step': '143cedc91d6960' },
  },
  {
    date: '2026-10-13',
    summary: 'From SENSEI’s Not A Wave test (chapters 1 and 2): the writer tagged no Sound Cues at all, though its own prose rang a bell five times and "bell rings" was a sound word. The instruction told it that a chapter may have none, beside four warnings against tagging, and a careful writer took the safe reading. SEN Sound Cues 2.4.0 drops "a chapter may have none": a chapter without a cue is still fine, the writer just no longer needs telling. A cue is still earned by the prose, at most 10 a chapter, and never added or bent to fit.',
    changed: { 'sound-cues': '18208ac228e769' },
  },
  {
    date: '2026-10-12',
    summary: 'From SENSEI: the music (the soundscape), the atmosphere and Sound Cues are three separate sounds, so each gets its own tag. SEN Soundtrack 2.0.0 replaces the one tag that named both ([[soundtrack: Music Mood | Atmosphere]]) with two, each once, together at the very start of the chapter: [[soundscape: Music Mood]] and [[atmosphere: Atmosphere]]. The example line shows both. Still no second of either: a change partway through a chapter is now the reader\'s to make in Create mode (at most one of each, after the opening). The HARNESS still reads the combined tag, so no chapter written with it loses its sound.',
    changed: { soundtrack: '01d10abf7679e8' },
  },
  {
    date: '2026-10-11',
    summary: 'Sound Words are the story\'s own, apart from its recordings: a story keeps a list of at most 30, chosen from a preset (the Library\'s own, or one installed from a Sound Words .spp package) and edited in Story Settings, and changing its Sound Cue pack never changes them. SEN Sound Cues 2.3.0 gives the writer the words alone, one per line, after the same header: the example tag made from the first word ([[sound: beast roar | the beast roared | medium]]) and the meanings after some words are gone, so nothing in the list can be copied into a chapter. The instruction itself is unchanged. The Library\'s preset renames three words: "beast growl" is now "growl", "creature screech" "screech" and "blade drawn" "unsheathe"; their recordings answer the new words, with the same files.',
    changed: { 'sound-cues': '05b0f51d5edcd6' },
  },
  {
    date: '2026-10-08',
    summary: 'From SENSEI\'s Sundered Heavens test (chapters 6, 7, 9 and 11): the writer kept writing sound tags as words of their own beside a sentence, often copying the sound list\'s example phrases ("iron scraped stone", "drew his sword", "power surged through him", "alarm horns blared"), and the HARNESS then moved each sound onto a guess ("Key", "drew", "stepping into the open as"). A sound is earned by the prose: SEN Sound Cues 2.2.0 tells the writer to write the chapter as the story needs it and tag a sound only where its own sentence already describes it, that a chapter may have none, and never to add or bend a sentence to fit a sound. The sound list (not a recorded block) now names each sound and its meaning, with no example phrases to copy. The HARNESS no longer guesses: a sound tag written beside a sentence moves only onto nearby words that clearly say it, and is dropped otherwise.',
    changed: { 'sound-cues': '00e7de2bfa3b59' },
  },
  {
    date: '2026-10-07',
    summary: 'From SENSEI\'s Sundered Heavens test: 7 of 8 chapters opened by describing the scenery ("The soot of Rust-Vein Gorge…", "The soot of the mid-tier processing terrace…", "The soot-stained morning wind…"), and Gu Chen\'s full portrait came back nearly every chapter. The response contract now says how a chapter opens: the first chapter of the story or of a new arc may ground the reader in the world, its places and its people; every other chapter picks up from the latest recap and opens however the moment calls for (action, speech, a thought, or the setting when the place is new or has changed), so openings vary naturally; describing the place is one way to begin, never a habit. Character descriptions: full when a character first appears, returns after time away, or changes (a breakthrough, a power-up, new gear, an injury, a new rank), the genre\'s best moments; a light touch between them. The pet-word rule keeps its limit within a chapter and drops "not carried from chapter to chapter", which the writer could never check: it sees recaps, not earlier chapters. The chapter request (not a recorded block) now says where the chapter sits in its arc (Chapter 7 of 30 in Arc 1) and what that means for its opening.',
    changed: { 'response-contract': '14db53b1da5735' },
  },
  {
    date: '2026-10-06',
    summary: 'Phase 4. The Soundtrack instructions begin (SEN Soundtrack 1.0.0): at the very start of every chapter the writer chooses, once, the mood of its music and its atmosphere ([[soundtrack: Music Mood | Atmosphere]]) from the story\'s own lists: the music moods at least three pieces of SEN Soundscapes, Volume 1 share, and the SEN Atmospheres words. Never a second tag, so a passing fight never brings on war music (SENSEI\'s rule: one atmosphere per chapter, chosen at its start). The Reader plays that chapter\'s pieces and atmosphere.',
    changed: { soundtrack: '1744f98aa68929' },
  },
  {
    date: '2026-10-06',
    summary: 'Phase 3. The Holdings fixer begins: after a chapter is saved, a separate small call with the chapter\'s model settles the holdings problems the checks found (a tag that says something was gained twice, a count that does not match, two names for one thing) and keeps a record on the chapter. It reads only small cases, never the chapter, and may correct a tag or one sentence; a bigger contradiction is only recorded. The chapter request (not a recorded block) gains a rewrite section: when the reader asks for the latest chapter again, the writer sees the set-aside version\'s title and recap and the reader\'s note, and never reuses its wording.',
    changed: { 'holdings-fixer': '0053e52b28b7b1' },
  },
  {
    date: '2026-10-06',
    summary: 'Retired the separate story-memory call. The response contract no longer says the HARNESS owns memory extraction; chapter writing, tags, acceptance and saving keep their existing rules.',
    changed: { 'response-contract': '1402cd2335b723' },
  },
  {
    date: '2026-10-06',
    summary: 'Phase 1 fixes from SENSEI\'s Sovereign Hive test. Sound Cues 2.1.0: a sound tag goes around words already in the sentence, never on its own line or with words of its own (14 of 15 tags had left broken lower-case lines or repeated phrases). Speakers 2.1.0: the tag forms no longer show a placeholder name to copy (Chapter 3 labelled 14 lines "Name"). Holdings 2.1.0: things and abilities only, each with one short name and no count or description inside it; never events, news, deadlines, places, people or alliances; the closing list carries names, not tags. The response contract: recaps never carry a countdown ("nine days remain"), an older recap\'s span of time counts from its own chapter, and no pet word repeats more than twice a chapter or from chapter to chapter ("arithmetic" appeared 13 times). The chapter request (not a recorded block) now gives a words-per-paragraph guide and says a chapter under the minimum is too short.',
    changed: {
      'sound-cues': '1ccde674edaa4b',
      speakers: '195c0ed231720b',
      holdings: '01c2c86acb3b53',
      'response-contract': '13daea6bbe16c5',
    },
  },
  {
    date: '2026-10-04',
    summary: 'The tag instructions were rewritten in one shape for every kind of tag, approved by SENSEI: JOB, FORMAT, REQUIRED, FORBIDDEN and CHECK BEFORE YOU RETURN, with nothing the writer does not need. The rules every tag shares are now said once, as the tag rules. Sound Cues 2.0.0: the writer puts a sound tag on the words where a sound happens ([[sound: Sound Word | Words | Energy]]) instead of a numbered mark and a separate list, a sound may cover up to 8 words, and the sound list is one line per word. Speakers 2.0.0: every chapter including the first, and one speaker per paragraph. Holdings 2.0.0: the same rules, reshaped as a table. The official output requirements now say a sound tag\'s words are the story\'s own.',
    changed: {
      'tag-rules': '13b83835cc36f7',
      'sound-cues': '1cdaa989cc05d5',
      speakers: '1d276b8474ca67',
      holdings: '1e5849138affb8',
      'official-requirements': '0eaedd2928918d',
    },
  },
  {
    date: '2026-10-04',
    summary: 'The history begins. The Author, Fate Survival, Reading Mode instructions and the response contract are recorded as they stand.',
    changed: {
      author: '1d2fa67be9baf8',
      'response-contract': '0a407346f7dec8',
      'fate-survival': '0b97dc7c4c673d',
      'clear-reading': '115ccea68dabbc',
      'easy-read': '00d194ac81946a',
      'literal-reading': '004ed5d7b31f69',
    },
  },
];

/** The latest recorded change to one block. */
export const lastChange = (id: WriterInstructionId) => WRITER_INSTRUCTIONS_HISTORY.find(change => change.changed[id] !== undefined);
