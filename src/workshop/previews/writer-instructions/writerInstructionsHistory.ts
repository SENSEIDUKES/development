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
    date: '2026-10-29',
    summary: 'The Chapter Tagger writes in the margin, not on the page (SENSEI, 2026-10-29: "You\'re in school. You write a page. Your teacher looks over it, writes marks. That\'s the whole concept here."). Until now the tagger handed the whole chapter back with tags written into it, and the HARNESS compared that retyped copy to the real one, word for word, to prove nothing changed — and when a word had changed, every tag of the chapter was dropped. Measured on The Nine-Fold Furnace (gpt-6-luna, 2026-10-29), that is what happened to all three chapters: six paragraphs out of 110 came back changed, because the tag teaching was written for an author composing a sentence and told the tagger two things it could not both do (keep the paragraph complete without the tag, and put a sound\'s words inside the tag; start the paragraph with its speaker, and change nothing), so the Reader was silent and the Codex empty. Now the tagger returns notes: each names a paragraph, the exact words the tag belongs to, and the tag, and the HARNESS places every note on the chapter\'s own paragraphs. There is one copy of the novel, so the tagger cannot change a word of it, and a note whose words are not in its paragraph is dropped on its own while every other note lands. The tag teaching is rewritten for that reader. The tag rules say what a note is; the five kinds keep their exact tag forms and each shows its example as one note, as the tagger returns it; Speakers asks for a note on every spoken line, since "one speaker per paragraph" was a rule for an author composing a paragraph and the chapter writer no longer follows it; Sound Cues takes the words out of the tag ([[sound: Sound Word | Energy]]) and into the note, so the two instructions that contradicted each other are gone; Soundtrack opens the chapter as two notes on paragraph 1 with no words. The sentence that re-pointed the author-era teaching at finished prose is retired with the teaching it bridged; the tagger\'s own words now say it writes notes and never returns the chapter.',
    changed: { tagger: '08c6c09fa9efdd', 'tag-rules': '0a14c961220f1e', speakers: '0e90e31fa8a643', holdings: '15a15aeaeead4c', appearance: '0ce963b2b4f7b3', 'sound-cues': '022e4b54431568', soundtrack: '04382d4d108c08' },
  },
  {
    date: '2026-10-26',
    summary: 'Tagging leaves the chapter writer, the step the tagger was built for (SENSEI, 2026-10-24): "we simply take out whatever we\'re currently having the writer model tag and put it inside a second model call." HOW TO TAG is gone from the writer\'s instructions, and with it the whole part: the writer now reads eight parts, not nine, and its opening line no longer lists "how to tag" among them. Not a word of the tag teaching changed or was lost — the tag rules and the five kinds read exactly as they did, in the tagger\'s own prompt, where this page now lists them. The writer is still asked for the closing list of the main character\'s holdings, now on every chapter rather than only when a Holdings skill was loaded: it is the independent cross-check the Holdings fixer reads against the tagger\'s holding tags, so two models agree instead of one checking itself. The five tag slots leave the CAPA Schema with them, so a host no longer installs or equips the tag teaching at all.',
    changed: { role: '0caa5bae80d4c7', 'tag-rules': '05725f53084b4c', 'sound-cues': '1e60adbee817ef', soundtrack: '0678b200b9e691', speakers: '0ccefe7937d610', holdings: '0955a0ebe105cf', appearance: '049d5947f0feb8' },
  },
  {
    date: '2026-10-26',
    summary: 'The HARNESS stops teaching craft, from SENSEI\'s reading of the writer\'s own instructions: "a lot of it seems like we\'re restricting the creativity too much, not actually simply enforcing the structure." Three rules leave the HARNESS writing rules, which no skill can replace, for the Author skill, which any author can: OPENINGS, CHARACTER DESCRIPTIONS and WORD CHOICE. All three were added on 2026-10-07 after the Sundered Heavens test, where 7 of 8 chapters opened by describing the scenery and Gu Chen\'s full portrait came back nearly every chapter — real failures, but the fixes went well past them, prescribing a menu of four ways to open a chapter, five occasions that deserve a full character description (a breakthrough, a power-up, new gear, an injury, a new rank) and a count of twice per chapter for any distinctive phrase. What the failures actually asked for is now three lines in SEN Novel Author 1.1.0, under its own Never do: do not open every chapter the same way, scenery is one way to begin and not a habit; do not repeat a character\'s full portrait chapter after chapter, give the full picture when the moment earns it and a light touch between; do not lean on a pet word or image. OPENINGS also carried a second copy of "continue from the latest Previously On recap", which the rule three paragraphs above it already said. The HARNESS keeps the four rules the app itself depends on: the point of view it records, telling plans apart from what happened, continuing from the recaps the writer is actually given, and putting every change in the prose, which is where Holdings and the Codex read it from.',
    changed: { author: '0adc4cb625f916', 'writing-rules': '19d5ab1b38d688' },
  },
  {
    date: '2026-10-25',
    summary: 'Story Tags, from SENSEI\'s tag audit: "the story tags are quietly some of the most important things in this entire experience, because they tell the model how to give you your story." Until now they reached the writer inside declared canon as "Story tags: …", the place for facts the story may never break, and nothing said what a tag is, so "death flags" read as a fact about the world. They now travel as their own storyTags field in Current Story Information, and How to read the story information names them and says what they are: the experience the author wants this novel to give its reader (its genres, its tone, and the tropes and elements they came for), to shape what happens and how it feels across the story; not facts, not events and not a checklist, so no chapter has to show every tag, but the story as a whole must deliver them.',
    changed: { 'reading-guide': '0cf085095b68a9' },
  },
  {
    date: '2026-10-25',
    summary: 'The chapter tagger, SENSEI\'s architecture for tagging (2026-10-24): "we simply take out whatever we\'re currently having the writer model tag and put it inside a second model call where his job is just to read the chapter and add the tags for us", and the reason it matters most — "if you take the AI generation of the novel out, this tagger needs to be able to still tag the story with sound cues, etc." So the tagger is told the chapter, who and what the story already has, what each character was carrying, and the words it may name, and nothing about how the story got here: no Foundation, no arc, no Destined Ending, no Story Information Packet. A chapter an author wrote themselves and brought in here has none of those and has to tag exactly as well. Three new blocks of HARNESS words, approved 2026-10-25: what the tagger does; one sentence that re-points the five tag skills at finished prose, because they were written for an author writing the chapter and say "your sentence" and "describe them there" where a tagger can only tag what is already on the page; and how it hands the chapter back, which is the same paragraphs with tags written in. That last one is what lets the HARNESS check the tagger instead of trusting it: the tags are read and removed exactly as they always are, and the prose that falls out is compared to the prose that was sent, so an answer that changed a word of the chapter is refused whole. The five tag skills themselves are untouched and the chapter writer still reads them: this step adds the tagger beside the writer, and tagging leaves the writer in its own change, with its own approval.',
    changed: { tagger: '100a01c387f7f6' },
  },
  {
    date: '2026-10-24',
    summary: 'The World at Chapter 0, step two: the chapter writer finally reads it. Until now every section describing the world was built from chapters already written, so Chapter 1 was written by a model told "none recorded yet" about a world the Blueprint had just filled with eighteen cards — the eye colours, voices, places and factions went to the Codex and never to the prose. The world now travels as its own Story Information section, ahead of what the chapters changed, and How to read the story information says what it is: established fact, not a plan and not a checklist of things to mention; the facts its slots mark as unchanging hold for the whole story; where a later chapter changed something, Current Canonical State and Holdings carry what it is now and take precedence. Holdings starts from the same record, so the packet can no longer say a character holds a sword in one section and nothing in another. Appeared is deliberately left empty at Chapter 1: it means already described on the page, and nobody has been.',
    changed: { 'reading-guide': '01d64139c7e2f5' },
  },
  {
    date: '2026-10-24',
    summary: 'Voice, as SENSEI asked for it after reading the Korean Test\'s cards: "Voice should be described like \'Energetic Middle age man\' or \'An old voice filled with wisdom\'... we\'re trying to match ElevenLabs voices to a character." The world builder asked for "how they speak", so it answered with manner — "low and controlled, with short sentences" — which tells a reader how a line sounds and tells a voice catalog nothing. It now asks for the voice to cast the character with: its age, weight and energy in a few words, with both of SENSEI\'s own examples. The slot is the Codex\'s, whose test is other-media, and the chapter writer never reads it, so no chapter changes; what reads it is the voice the character is cast in.',
    changed: { 'world-builder': '13f60da4796967' },
  },
  {
    date: '2026-10-22',
    summary: 'The World at Chapter 0, step one (SENSEI, 2026-10-21: "everything that\'s going to be on the Codex needs to be fillable inside the story seed first"). A new block, the world builder, is the first words on this page that no chapter writer reads: the one call that builds a story\'s world from its Story Seed now fills every Codex card the world opens with, slot by slot — characters, things, abilities, places, factions, the Bestiary and the one World rules sheet. The words are written from the Codex\'s own definition of its card kinds, so this instruction can never ask for a slot the Story Seed cannot hold or the Codex cannot show, and the two tests that decide what belongs on a card (an artist can draw the opening scene; a game can load the world as it stands) are stated to the model. The chapter writer\'s own instructions are untouched: what it reads from this world is its own step, with its own approval.',
    changed: { 'world-builder': '1e4680615fba0d' },
  },
  {
    date: '2026-10-17',
    summary: 'SENSEI\'s looks on demand. No model call follows a chapter any more: the per-chapter look step is gone. The HARNESS keeps, by code, the writer\'s own description from the paragraph a tag marks, and Story Information\'s Appeared section shows it, with every change since. A full look is written only when something made from the story needs it (a picture, a manga, a game): one call for that one entry, from every passage that shows it, kept on its Codex entry and written again only after a new tag changes it. That call is the look writer\'s new instruction: the core record every picture, comic and game draws from; keep only how the subject looks; a later passage wins, and the whole look is written as it stands after it. A long answer is now cut, not thrown away, and a failed one is kept with the model\'s own words. SEN Sound Cues 2.6.0: in Blade Chapter 17 a sound tag stood between sentences with words of its own and was dropped; the tag now wraps words of the writer\'s own sentence where they stand, and the example shows it inside one.',
    changed: { 'sound-cues': '1e60adbee817ef', 'look-step': '152184b2a3d5d4' },
  },
  {
    date: '2026-10-17',
    summary: 'SENSEI\'s rewrite of How to tag, step two of the prompt skeleton: concise, to the point and working, because more tags are coming. The FORMAT / REQUIRED / FORBIDDEN / CHECK wall is gone from every tag skill: each now says what it marks, its format, one example and its few real rules, about 480 words where there were about 1,250. How a tag names someone (MC for the main character, anyone else by the name Story Information uses) is said once, in the tag rules, for every kind. Every tag keeps its exact format, so the HARNESS reads them as before. Sound Cues 2.5.0 and Soundtrack 3.1.0 each show one example made from the story\'s own first word and categories (the sound example\'s words are a placeholder, so no phrase can be copied into the prose), the sound words now on one line; Soundtrack adds "Use only the categories below" (Chapter 15 of the Blade test wrote "Conflict"). Speakers 2.2.0, Holdings 2.2.0 (each tag written out in full, no slashes, so no model writes one literally; the closing list is asked for by the reply\'s own schema) and Appearance 1.2.0 (its example names no character a story is likely to have).',
    changed: { 'tag-rules': '05725f53084b4c', 'sound-cues': '0ac08f7f9d47ed', soundtrack: '0678b200b9e691', speakers: '0ccefe7937d610', holdings: '0955a0ebe105cf', appearance: '049d5947f0feb8' },
  },
  {
    date: '2026-10-16',
    summary: 'SENSEI\'s prompt skeleton, step one: the same words, placed the way AI companies lay out a system prompt, with the story information clearly apart from the instructions. The system instruction now reads in named parts, each under its heading: # ROLE AND MISSION (who the writer is and its job, first), # HOW TO WRITE (the CAPA writing skills, then the HARNESS writing rules: point of view, openings, character descriptions, word choice, carrying consequences forward), # HOW TO TAG (the tag rules once, then the tag skills), # HOW TO READ THE STORY INFORMATION, # HOW TO RETURN THE CHAPTER, and # HARD RULES (what wins over what, plans are proposals, never invent IDs). The response and evidence contract is split by job into the role, writing rules, reading guide, return format and hard rules; its paragraphs are unchanged, apart from one new line in the role naming the parts, and "You are the author of this novel" opening it. The next message reads # STORY INFORMATION, then # THIS CHAPTER, then # MISSION REMINDER last, closing the call ("the chapter requested above"). Wording changes come next, one part at a time, with SENSEI.',
    changed: { role: '036fa7fbdce1d9', 'writing-rules': '023e28d5340793', 'reading-guide': '0ab31edf36aba3', 'return-format': '02ff11976fc54d', 'hard-rules': '18b9cb67d0b56c' },
  },
  {
    date: '2026-10-16',
    summary: 'SENSEI\'s design for the soundtrack: the writer names a category and its SEN audio tags, never a recording, and the HARNESS chooses the recording ("wind, high energy"). SEN Soundtrack 3.0.0, in the words SENSEI approved: [[soundscape: Category | Tone | Tension | Energy]] [[atmosphere: Category | Energy]], once each at the chapter\'s start, under the music and atmosphere categories and the tag words (Tone bright/neutral/dark, Tension calm/suspenseful/urgent, Energy low/medium/high). The 15 music moods and 20 atmosphere names are gone, and the list no longer grows with the library. The FORMAT / REQUIRED / FORBIDDEN / CHECK template is gone from this skill. Until the packs carry SEN audio tags, each piece\'s and bed\'s group stands in for its category and each bed\'s proposed intensity for its energy, so the choice is looser, never silent. Older mood and atmosphere words still read. Sound Cues are unchanged.',
    changed: { soundtrack: '098118001876bd' },
  },
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
