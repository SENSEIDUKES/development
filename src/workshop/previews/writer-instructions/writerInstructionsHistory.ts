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
    date: '2026-11-11',
    summary: 'The Blueprint builds Arc 1\'s whole pool as it stands before Chapter 1 (SENSEI, 2026-11-11, approving the four changes found in The Frost-Scaled Companion; the first step of making the record lead and the story follow). The World skill gains three paragraphs: a card says how things stand before Chapter 1 and nothing after (Lin\'s card said he was bonded to the fox, which the story only does in Chapter 6); whoever the premise or an Arc 1 goal is about has a card of their own, named or not, and a species card never stands in for one of them (the cub had none); and the places cover the ground Arc 1 stands on, with a card for a larger place others sit inside. The Blueprint\'s own rules gain two lines under One name for one thing: what a Look or Clothing shows someone carrying is a thing card they hold, or it is left out (two looks showed a bow and a staff no card held), and a slot that names a card is left blank when no card fits, never "none" or "unclaimed". No example names a creature or a keepsake, so the model has nothing to copy. SEN World Builder is 1.4.0.',
    changed: { 'world-skill': '19d985ad7f5134', 'blueprint-rules': '02dfb850963132' },
  },
  {
    date: '2026-11-11',
    summary: 'A character card now states its whole look (SENSEI, 2026-11-11, from The Frost-Scaled Companion: the Blueprint gave each character one outfit and one prop, and a card\'s look is now the look the writer, the Codex and Manifest all use). The character card gains six slots, which the Blueprint rules list with the rest: build, face, hair, clothing, marks and bearing (how their nature shows in the way they stand, move and look at people). Its Look is no longer one line: it asks for a short portrait of two or three sentences, what strikes the eye first, with their nature showing in it. The World skill (now SEN World Builder 1.3.0) lets a Look be that portrait while every other slot stays one short fact, asks for the few details that are this person\'s alone so no two people in a cast are described through the same features, says a person\'s nature shows in how they look and is written as something seen, never as the trait\'s name, and leaves Marks blank when they have none. It names no feature and gives no example phrase, because a model repeats whatever it is shown on every character. The Origin skill (now SEN Eastern Fantasy 1.3.0) says these novels take their time over how people look, and that how they do it depends on the kind of story: read the Seed\'s tags, genre and premise for what kind of story this is and who it is written for, and describe its people the way that kind of story does; with no clear signal, describe men and women with the same care; and never the same phrase for two characters. It names no style, since none of this is hidden from the model. The Look writer\'s list of a character\'s traits gains bearing, so a look written from the story\'s own words can carry it too. SENSEI approved the World and Origin words before they were written here.',
    changed: { 'origin-skill': '026c507e353319', 'world-skill': '16c9e00989be57', 'blueprint-rules': '1aaaa5b33136a8', 'look-step': '16254ebd71ddff' },
  },
  {
    date: '2026-11-10',
    summary: 'Story Spark now appears on What the Models Read, built from the same prompt builder that sends the existing call. The request adds up to two reader-chosen catalog tags and their requirement to deliver them, plus Young (teens to twenties), Middle (thirties to forties), Old (fifty and older, ancient beings included), or a reminder to vary age when none is chosen. The system instruction and SENSEI’s flower example are unchanged. Alternative requests record every conditional instruction, including chosen and invented genres, gender, the reader’s idea, Survival and recent premises. No new model call or chapter-writing change.',
    changed: { 'story-spark-system': '167d47d0e49b1b', 'story-spark-requests': '07bbccea37754c' },
  },
  {
    date: '2026-11-10',
    summary: 'Setting, a new tag in place of the planned Scene tag (SENSEI, 2026-11-10: Scene was redundant with Place, Appears and Atmosphere, but nothing recorded when it is). The tagger is taught one more kind: where the prose says when it is or what it is like (the time of day, the weather, the season, time passing, a date in the story), it tags that sentence [[setting: ...]], picking the time of day (dawn, day, dusk, night), the conditions (clear, cloudy, rain, storm, snow, fog, wind) and the season from fixed lists, so a themed Codex view can draw them, with a few of the novel\'s own words beside them. Novels say this only sometimes, so the tag follows the prose and never asks for more; it never names the place (the place tag) or the mood (the atmosphere). The tagger\'s role line now names "when it is" among what a tag marks. A setting belongs to its chapter: nothing of it is listed beside a name, and the writer reads only where each recent chapter ended, as endedIn beside its recap in Previously On; the writing rules now say to carry it on unless the prose lets time pass or the weather turn. Nothing else changed.',
    changed: { 'writing-rules': '0a1c382b91995e', tagger: '19e835797c4cc3', setting: '040871dc19db03' },
  },
  {
    date: '2026-11-08',
    summary: 'Ties, the fourth information tag (SENSEI, 2026-11-08: "Add ties"). The tagger is taught one more kind: where the prose shows a tie between two characters form or change (they swear brotherhood, become master and disciple, turn enemies, betray, marry, bond), it tags that sentence [[tie: Name | Other | how they stand now]], in a few plain words. The second name may be a thing bound to them, like a sword with a spirit. Built the way Status and Place are: a pair\'s latest tie is how they stand now, worked out from every chapter, never stored. The tagger now reads each character\'s ties so far beside their name ("ties: Ning Hao (sworn enemies)"), and the writer reads them in Appeared after each character\'s look; its heading now names ties beside status and place. Nothing else changed.',
    changed: { ties: '0ad6a55030ec8e' },
  },
  {
    date: '2026-11-08',
    summary: 'A Sound Cue may now cover up to 12 words instead of 8 (SENSEI, 2026-11-08, from The Frost-Scaled Companion: "take off the 8-word cap for sound cues. Maybe make it 12 words instead"). The 8-word cap was setting aside sounds the tagger had placed well: all three cues it blocked in that story ran 9 or 10 words, such as "a whimper that rose and fell and rose again". The Sound Cues instruction now reads "tag up to 12 of its own words"; the same limit applies to a cue placed by hand. Nothing else changed.',
    changed: { 'sound-cues': '184d8b3300abf2' },
  },
  {
    date: '2026-11-07',
    summary: 'The Writer\'s Role and mission no longer says who the writer is (SENSEI, 2026-11-07: "That first sentence you got there, delete that shit"). It opened with SEN\'s identity and "Write the next complete chapter of this ongoing novel.", both of which the Author skill right below already says. It now holds only the job: respect the Foundation, author direction, canon and prior chapters, and how these instructions are laid out. Nothing else changed.',
    changed: { role: '1271499a164440' },
  },
  {
    date: '2026-11-07',
    summary: 'The Origin skill (now SEN Eastern Fantasy 1.2.0) no longer says who the Blueprint is (SENSEI, 2026-11-07: "fix the origin skill opening too"). It opened with "You are writing the world of an Eastern fantasy web novel", a second "You are" straight after the Blueprint\'s Role and mission, which already says who it is in SEN\'s identity. It now opens "This is an Eastern fantasy web novel", naming the kind of fiction instead of the Blueprint\'s identity. Nothing else in it changed.',
    changed: { 'origin-skill': '15521a66ebdde9' },
  },
  {
    date: '2026-11-06',
    summary: 'The Writer\'s Role and mission opens with SEN\'s identity, word for word: "You are an elite Eastern fantasy web-novel author specializing in Asian light novels." (SENSEI, 2026-11-06, reading the Writer\'s prompt: "the part that\'s wrong is really just giving its identity before, and then clarifying it up afterwards"). It used to open with a plainer "You are the author of this novel.", which the Author skill then corrected further down. "Write the next complete chapter of the ongoing story" now reads "of this ongoing novel", since the identity names who is writing. Nothing else changed.',
    changed: { role: '1b3bff3eed0ff4' },
  },
  {
    date: '2026-11-06',
    summary: 'The World builder is now the Blueprint, laid out the way the chapter writer is (SENSEI, 2026-11-06: "there\'s actually a correct way to do these things … models read information in a way that actually matters"; "It needs to be called blueprint"). It opens with its Role and mission, in SEN\'s identity word for word: "You are an elite Eastern fantasy web-novel author specializing in Asian light novels." (SENSEI: "Everything is based off this … Please make sure this is the identity"). The identity had been dropped on 2026-11-05 when the old prompt was split into skills, so the Blueprint was opening with a skill instead of who it is; now it is the first thing it reads, and a host that licenses SEN may give its own. Then How to build holds the Origin, World and Arc skills, unchanged, and the Blueprint rules now sit under their own headings: How to read the Story Seed (the creator\'s words and what each of their story-wide answers means), How to return the Blueprint (one name for one thing, the answer\'s order, how lists are written, and the cards), and Hard rules (minors, JSON only). The next message is the Story Seed, marked as story data and never instructions, then This Blueprint (the lines that depend on this Seed), then a short Mission Reminder that repeats the identity and the job. No rule was removed or reworded; only the order, the headings, the role and the reminder are new.',
    changed: { 'blueprint-role': '18c5a179ddc4f3', 'blueprint-rules': '1cf9bfa223225e' },
  },
  {
    date: '2026-11-06',
    summary: 'The ARC page gets the creator\'s own Arc 1 goals and where Arcs 2 and 3 head (SENSEI, 2026-11-06, the Arc page: "Arc 1 goals (up to 5, with chapters each; first goal = what\'s happening when Chapter 1 starts)" and "Where Arcs 2 and 3 head (one line each)"). The single Active Arc Goal is gone: the creator now writes up to five Arc 1 goals in order, each with optional chapters, and one line each for Arc 2 and Arc 3. So the Blueprint rules name the two new Seed fields, and the request tells the World Blueprint to open Arc 1 with the creator\'s goals word for word, in order, with the chapters given, planning any further goals after them so Arc 1 totals 30 chapters, and to use the creator\'s line for Arc 2 or Arc 3 word for word as that arc\'s look-ahead.',
    changed: { 'blueprint-rules': '19dd25605346ff' },
  },
  {
    date: '2026-11-06',
    summary: 'The world moves onto its one World card (SENSEI, 2026-11-06, the Story Form: "World" and "Who rules" join the card; "Where it opens" and the model\'s extra detail copies go). The World rules card gains two slots, read first: Kind of world (what kind of world this is) and Who rules (who holds power and how society is ordered), so the Blueprint rules\' card list now asks for them on the card, and the card\'s purpose says it holds them. The World Blueprint no longer writes worldOverview, startingLocation or societyStructure as text beside the cards, and no longer adds "compatible detail" beside a fact the creator wrote: a world fact the creator wrote is a card slot like any other, which the creator\'s-words rule already covers, so the request\'s "The creator already wrote…" line is gone. Where the story opens is its first Place card. The World skill (now 1.2.0) names only the main character\'s backgroundProfile as a longer field.',
    changed: { 'world-skill': '016ebad3c0f209', 'blueprint-rules': '178cbcae4d7e97' },
  },
  {
    date: '2026-11-06',
    summary: 'The World builder stops writing four things the new Story Form drops (SENSEI, 2026-11-06, going through the form field by field: "why is writing style even in here? That is took care of by the harness"). The style bible is gone: how the prose reads is the Style skill\'s job, and the chapter writer no longer gets a second, model-written version of it. The trope rules are gone: nothing ever read them, and what the Fun Settings mean belongs in a harness skill. The first-arc promise is gone: nothing read it either. The power paragraph is gone: it repeated the World rules card, which now holds power alone. So the Origin skill (now 1.1.0) no longer asks for the style bible or the trope rules, the World skill (1.1.0) no longer lists the power paragraph among its longer fields, and the Arc skill (1.1.0) no longer asks for the first-arc promise. Nothing else in them changed.',
    changed: { 'origin-skill': '0f2d6f5c5dc02b', 'world-skill': '1d9ae292946b76', 'arc-skill': '05e8bd9ef18d07' },
  },
  {
    date: '2026-11-06',
    summary: 'The World builder becomes three skills and its permanent rules (SENSEI, 2026-11-05: "split up the Blueprint prompt into 3 CAPA slots. Origin - World - Arc … a publisher who licenses SEN could simply say \'Western Fantasy\' for the origin"; every word below approved before it was written). The old prompt was built in layers across eras of the app: an opening that named one genre, fifteen completion rules, and the world at Chapter 0, repeating the same rules up to three times. It is now read in four parts, once each. Origin (SEN Eastern Fantasy 1.0.0, replaceable) is the kind of fiction: it says what the creator\'s Chinese, Korean or Japanese choice means, and holds the style bible and the trope rules, with face-slap, plot armor and recognition defined and never written as settings. World (SEN World Builder 1.0.0, replaceable) keeps the artist and game tests word for word, replaces "everything that exists" with the world the opening stands on, says to use fewer cards before padding them, and gives every one of the main character\'s own slots a meaning, telling the flaw (inside them), the weakness (their circumstance) and the secret advantage apart. Arc (SEN Arc Planner 1.0.0, replaceable) decides the Destined Ending and the length first, then Arc 1 and the look-ahead; "the immediate goal the creator will review" is gone. The Blueprint rules (HARNESS, never replaceable) hold the creator\'s authority once, define Make It Work, Hard Pins and the Active Arc Goal instead of only naming them, list every link one card makes to another, state for the first time how a list is written (commas, a count before its name), and carry the same Codex card list. "Never write aliases or Hard Pins" is gone: the answer has no place for either. The request is now the Seed and only the lines that depend on it. The answer, its order and the number of calls are unchanged.',
    changed: { 'origin-skill': '1bbef73ddd6baf', 'world-skill': '13315a3d4ce9d8', 'arc-skill': '027d3a33089eed', 'blueprint-rules': '1827781adc5cf3' },
  },
  {
    date: '2026-11-05',
    summary: 'The World builder writes its answer in the order the world depends on itself (SENSEI, 2026-11-05, reading the World builder\'s prompt on this page: "a huge Frankenstein prompt made from different eras of the app"). A model writes its answer top to bottom, and the answer asked for the characters first, so every place, faction, thing, ability and rank a character card names was made up before the card for it existed, and the Destined Ending came last, after the arcs that were meant to travel toward it, although the prompt said to establish it first. The answer now runs: title and logline, the Destined Ending and the story\'s length, the power system, the overview and society, the places (then the opening location), factions, species, abilities, things, the main character, the supporting characters, then the opposition, Arc 1, the look-ahead, trope rules and style bible. The card list the World builder reads follows the same order and says so; the ability cards now say the character cards name them exactly as written there, since the abilities are written first. No slot, rule or limit changed.',
    changed: { 'world-builder': '0e786bb4cc496d' },
  },
  {
    date: '2026-11-05',
    summary: 'The appears tag goes on the sentence that shows someone, not the one that names them (SENSEI, 2026-11-05, from The Nomad\'s Foundation: "Fix the appearance tags"). The sentence an appears tag sits on is kept as that character\'s look, and the tagger had been putting it where the name first shows up: Lin Yuan\'s on "Lin Yuan.", the line where he gives his name, three paragraphs after the prose showed a thin young man in grey scholar\'s robes; Ah Tai\'s on "The boy\'s name was Ah Tai.", which went on to tell his past. The rule now asks for the sentence that shows what they look like, says that sentence is kept as their look, and says to choose the first one that describes them even when their name only comes later, never one that only says their name, speaks for them or tells their past; when nothing describes them, the sentence where they are first on the page. The example now says Old Wen is named two paragraphs later.',
    changed: { appearance: '188d5cb01a86a0' },
  },
  {
    date: '2026-11-04',
    summary: 'Place, the third information tag (SENSEI, 2026-11-04: "build Place the way we discussed, with its own fixer checks added to this same one fixer"). The tagger is taught one more tag, built like Status: on the sentence where a character arrives somewhere, [[place: Name | Place]], only where they really are now, never a place remembered, planned or heard about. Beside each character\'s name the tagger now also reads where they are so far, and the story\'s places are listed under PLACES (the World Blueprint\'s place cards included, so it uses the names they already have). A place steps onto the page with the appearance tag, now with a third kind: [[appears: Place | place]]. Its role line names "where someone arrives" among what a tag marks. The fixer\'s opening line adds where they are, its tags line adds the place tag and asks for the exact name the record already gives a place (as for a thing or an ability), and THE REST OF THE RECORD says what record and fine mean for someone who acts after the chapter names another place than the one the record has them in. The look writer now also writes a place\'s look, by land, buildings, light, size and condition.',
    changed: { 'holdings-fixer': '081cbc29146a3a', tagger: '0f3d088e30c056', appearance: '110741586147c9', place: '181522ba4ac3bf', 'look-step': '1229d720130e2b' },
  },
  {
    date: '2026-11-04',
    summary: 'One fixer for the whole record (SENSEI, 2026-11-04, from The Echo of Forgotten Blades: the Dean, Qin Dazhao, spoke eight lines in Chapter 6 and was on no card, and the inspector was named Inspector Wei in Chapter 4 while his card still said Summit Inspector; "this was what the whole fixer call is for… expand what the fixer is able to fix", keeping it to the small cases it already reads). The story runs on three calls: the writer, the tagger, and the fixer only when needed. Three more plain rules now find problems with no model, and only what they find goes to the same one short call: someone who speaks for the first time but never appeared, a name in the prose no card has that shares a word with one character\'s, and someone dead who speaks or acts. The fixer\'s opening line now says it keeps the record true (who has appeared, the names they go by and how they are, beside what they have, use and know); its tags line adds the status tag; and a new part, THE REST OF THE RECORD, says what record, fine and major mean for each of the three. A name case may also say which name the card should go by from now on.',
    changed: { 'holdings-fixer': '099a72be7366a9' },
  },
  {
    date: '2026-10-31',
    summary: 'The Status tag, the second information tag (SENSEI, 2026-10-31: finish the information tags before linking names to their colors). The tagger is taught one more tag, built like the appearance tag: on the sentence where the prose shows a character\'s condition change, [[status: Name | how they are now]] (wounded, healed, poisoned, captured, freed, sealed, transformed, dead), in a few plain words, never a mood, a plan or a rumour; rank stays the Holdings rank tag. Beside each character\'s name the tagger now also reads their status so far. Its role line names "how someone is now" among what a tag marks.',
    changed: { tagger: '1e48f05a725f60', status: '1f01efa2b91f6a' },
  },
  {
    date: '2026-10-31',
    summary: 'Chapters stop ending like a ledger (SENSEI, 2026-10-31, from The Vessel of Dying Embers: every chapter closed on a tally, "They had gained a map… They had spent no coal"). Two lines told the writer to state balances in the prose: the writing rules ("state current balances in the prose when they change") and the reading guide on resources ("State new balances in the prose when they change"). With a survival-camps story whose style bible asks for scarcity, the writer did the literal thing and summed up what changed at the end of each chapter. Balances are still carried: the tags and Holdings record them. The writing rules now say: when something is gained, spent or lost, show it happening in the scene; never sum up what changed at the end of a chapter. The reading guide now says: show a change in the scene where it happens, never as a summary.',
    changed: { 'writing-rules': '09877256ff02ba', 'reading-guide': '098b12aae2dbb5' },
  },
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
    changed: { 'world-builder': '0e786bb4cc496d' },
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
    changed: { 'holdings-fixer': '099a72be7366a9' },
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
