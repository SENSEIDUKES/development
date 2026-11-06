# The Story Form (version 6)

What a story is made of: what the creator fills in on the Story Seed, and what the model fills when it's left blank. SENSEI and Claude worked it out together on 2026-11-06 to replace today's Story Seed and World Blueprint, which ask for 23 sections and about 90 things under code names, ask some of them twice, and ask for some that nothing reads.

**This is the design, not yet the code.** The rebuild is checked against it.

## The rules behind it

- **Plain, story-neutral names.** A name says what the field is, so nothing needs explaining. Names fit any story: power fantasy, romance, school drama.
- **One home for every fact.**
- **The creator and the model fill the same form.** The creator fills what they want, and the model fills the blanks.
- **Three layers.**
  - These base names never change.
  - Codex themes relabel them per story later ("Ranks" shows as cultivation realms in one story and social standing in another).
  - CAPA skills teach the model how to fill them in.
- **The user decides what matters; the AI decides how it plays out.** This is HARNESS_PRINCIPLES.md rule 8, balanced by Fate mode: the user is never made to do everything. In Fate Survival the user steers and makes these calls; in Regular mode the app makes most of them for them, and they can still step in.

Examples are given in pairs: *power fantasy / romance or drama*.

---

## SETTINGS: how the app runs the story
- **Mature audiences**: on / off.
- **Accessibility**: Standard, Clear, Easy Read, Literal. *Was* `chapterWritingStyle`.
- **Story language**: the language the story is written in.

## ORIGIN: what the story is
- **Title**
- **Premise**
- **Genre**
- **Culture style**: Chinese, Korean, Japanese. *Was* `style`.
- **Story tags**
- **Fate Survival**: on / off, and how harsh.
- **Pitch**: one sentence that sells the story. *Was* `logline`.

## ARC: where the story goes
- **Ending**
- **Story length**: in arcs. One name only; today there are two, `arcCount` and `estimatedArcs`.
- **Arc 1 goals**: up to 5, with chapters for each.
  - The first goal is the opening situation: *expelled at the sect gate / wakes up as the villainess a week before her engagement ends*.
  - The creator can write any of them; the model fills the rest.
- **Hard Pins**: up to 3 rules for *how the story is told*. They are standing instructions to the writer.
  - *Keep harem members relevant throughout the story.*
  - *Avoid any amnesia cliché.*
- **Fun Settings**: Face Slap, Plot Armor, Recognition.

---

## WORLD: the cards

**Make It Work**: a fact of *the world*, however strange, that the story must make work.
- *All cultivators must use toe kung fu.*
- *Whoever talks to the MC gets an instant heart demon, leading to comedic situations.*

### World card (one per story)
- **Kind of world**: *a cultivation continent / a modern elite academy*
- **Who rules**: *nine sects share the land / the founding families run the school board*
- **Era**
- **Ranks**: who's above whom, lowest to highest. *Was* `knownRanks`.
  - *Qi Refining → Core Formation / commoner → noble → royal*
- **Power source**: *qi / money, family name, popularity, magic*. *Was* `flavor`.
- **Laws**: one per line.

### Place
- **Name**
- **Look**
- **Inside of** (*was* `within`)
- **Controlled by** (*was* `heldBy`)
- **Condition**

### Group: anything that's a group
Sects, clans, empires, guilds, species, beast tribes, families, schools, clubs, courts, companies. A single talking beast is a Character.
- **Name**
- **Type**
- **Part in the story**
- **Look**
- **Home base** (*was* `seat`)
- **Leader**
- **Influence**: how much weight they carry, and whether they're rising or falling. *Merges* `powerLevel` *and* `standing`.
- **Nature and beliefs**: what they stand for, how they're run, and whether they can think or talk. *Merges* `alignment`, `description` *and the creature card's* `mind`.
- **Allies and enemies**
- **Stance toward the main character**: ally, rival, enemy, main enemy, love interest.
- **Arcs**: the arcs they're in play, e.g. 3–6. Blank means the whole story.

### Skill (*was* Ability)
- **Name**
- **What it does**: *cuts through spirit armor / reads anyone's lie on sight*
- **Type**: attack, defense, movement, social, knowledge, craft, magic…
- **Cost or limit**
- **Rank**: the rank it belongs to, if it has one. *Was* `ladder`.
- **Look when used**

### Item
- **Name**
- **What it does**: *a pill that breaks a bottleneck / a letter that proves the duke's betrayal*
- **Look**
- **How many**
- **Who has it**
- **Where it is**: if no one has it.
- **Condition**

### Main character
- **Name**, **Gender**, **Age**, **Species**
- **Look**, **Skin**, **Eyes**, **Voice**
- **Who they are**: one line. *Merges* `bio` *and* `startingIdentity`.
- **Backstory**
- **Personality**
- **Flaw**: a fault inside them.
- **Weakness**: what they lack at the start.
- **Hidden edge**: their secret advantage and growth path. *Merges* `secretAdvantage` *and* `uniquePath`. *A soul in a ring / she remembers how the novel ends.*
- **Good or ruthless**
- **What they want**
- **Where they are**
- **Condition**
- **Rank** (*was* `rankLevel`)
- **Items they have**
- **Skills they know**: includes their starting skill. *Merges* `knows` *and* `startingPowerConcept`.
- **Groups they belong to**
- **Allies, family, enemies**

### Character: any species, not only human
The same as the main character, **without** Backstory, Personality, Flaw, Weakness, Hidden edge and Good or ruthless. **Plus:**
- **Part in the story**
- **Stance toward the main character**: ally, rival, enemy, main enemy, love interest.
- **Arcs**: the arcs they're in play, e.g. 1–3. Blank means the whole story.
- **Nicknames**: only the creator writes these.

### Arcs and the main enemy
- A Character or Group with **Arcs** set is not introduced before its first arc. Its part concludes by the end of its last arc (death, defeat, leaving, redemption).
- There is **one main enemy per arc**. Overlapping arcs (3–6, then 6–9) are where one hands off to the next.

### How many
About **8 of each kind in focus per arc**. That's both a batch a model fills reliably and what the Codex shows up front. It is not a limit on the whole story: earlier cards stay findable, and each new arc's planning adds that arc's cast.

---

## CUT FROM TODAY'S FORM
- **Writing style** (`styleBible`): the harness Style skill does this job.
- **Trope rules**: nothing reads them. The meaning of Fun Settings belongs in a harness skill.
- **Arc 1 promise** (`firstArcPromise`): nothing reads it.
- **Power paragraph** (`powerSystemOutline`): repeats the World card.
- **Where it opens** (`startingLocation`): the first Place card and Arc 1's first goal cover it.
- **The separate World and Who-rules text, and the model's extra "detail" copies**: now on the World card.
- **Kind of power** on characters (`powerType`): it comes from the World card.
- **First goal** (`activeArcGoal`): it's Arc 1's first goal.
- **Where Arcs 2 and 3 head** (`arcLookahead`)
- **Main enemy** as its own field (`mainOpposition`): it's now a stance on a card.
- **The separate Creature card**: merged into Group.

## NEXT, IN ITS OWN CHANGE: passing characters
The arrogant young master of the week, the sneering shopkeeper.
- The writer creates them freely as the story needs them. They're recorded as **mini cards** (name and who they are in one line) behind a side-characters button in the Codex.
- **Only the user promotes one** to the full cast, which gives them a full card and a place in the arc's cast. The AI never decides who matters.
- **The crowd** ("a guard", "the disciples") gets no card at all.

How this splits between Fate Survival (where the user steers) and Regular mode (where the app does most of it) is decided when this change is designed.

This touches the writer, the tagger and the Codex, not only the Story Seed and Blueprint, so it comes after the form is built.
