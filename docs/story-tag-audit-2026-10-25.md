# Story Tag Audit — 2026-10-25

Prepared for SENSEI.

## Decision (SENSEI, 2026-10-25)

Agreed: fix the prompt wording, add the staples, merge true duplicates, and cut the tags that ask for the HARNESS's own jobs. **Not agreed: cutting niche tags or reorganizing the display.** Niche tags (for example the LitRPG point tags, the detailed economy and war tags) stay. The next project, the tagging engine upgrade, gives them proper homes: multiple filters, tagging by genre and niche, and a parent per genre (a LitRPG parent holding its game-element tags, and so on).

First pass, shipped with this document:

- Tags reach the writer as their own `storyTags` field, with a reading instruction in *How to read the story information*, no longer inside declared canon.
- New **Genre** and **Tone** families; staples added (sections 2–4 below).
- True duplicates merged; old wording kept as aliases.
- HARNESS-job tags cut (continuity, memory, tracking, codex, colors, tone/pacing "control"); Meta & Continuity is now **Mystery & Lore**.
- 452 → 406 tags. Everything in sections 5–6 that cuts niche tags or reshapes categories is **deferred to the engine upgrade** and kept here only as input to it.

The rest of this document is the original proposal.

Source: `src/components/story-seed/shared/storyTagCatalog.ts` (452 tags, 10 categories, 12-tag limit per story).

---

## 1. What the tags actually do today

A story's tags reach the models in three places:

| Where | How the model sees them | Problem |
|---|---|---|
| **World Blueprint** (once, before the novel starts) | "The genre, style, tags … must materially influence the result" and turned into the style bible | Works as intended. |
| **Chapter writer** (every chapter) | Pasted as `Story tags: a, b, c` inside **Declared canon** — the slot for facts the story may never break | The writer is never told what a tag *is*. "death flags" or "threat colors" arrive as if they were world facts. There is no line saying "these are the experience the reader asked for." |
| **Cover art** | `Themes: a, b, c` | Fine. |

**Finding 1 — delivery.** Before or alongside the catalog cleanup, tags need their own place in Story Information and one sentence in the writer's *How to read the story information* part: they are the experience the reader asked for, to be felt across the story, not facts and not events every chapter must contain. Without that, even perfect tags are weakly used.

**Finding 2 — no base layer.** There is no Action, Adventure, Drama, Horror, Thriller, Fantasy or Sci-Fi tag. Comedy, Tragedy and Mystery exist but are buried in the black "Meta & Continuity" category. The Genre picker doesn't fill this gap: every genre there is a progression-fantasy setting (Xianxia, System, Tower Climb…), not a feel.

**Finding 3 — about a quarter of the tags aren't story requests.** They are instructions to the app or the HARNESS (continuity, memory, tracking, codex, colors, pacing control). The HARNESS already does those jobs for every story, or should, so a tag for them either does nothing or implies stories without the tag get worse continuity.

**Finding 4 — heavy duplication.** The same idea often appears 3–8 times under different wording (e.g. *tower climbs / tower climbing / dungeon/tower climb / ancient tower rankings*). It eats the 12-tag limit and makes the picker feel endless.

**Finding 5 — misfiling.** Farming, food and healing sit in Romance; comedy and slice of life in Meta; underdog and antihero in Fate Threats; cosmic/star realms in Modern. Category is the chip color and the creator's mental map, so this matters.

### The test every tag should pass

> If you told a writer "this story has **X**", would they write it differently, and would a reader feel it?

If yes → keep. If it's something every good story should do anyway → cut (it belongs to the HARNESS). If another tag already says it → merge.

---

## 2. Add — the main ones (new **Genre** category)

Action · Adventure · Comedy · Drama · Romance · Mystery · Thriller · Horror · Tragedy · Slice of Life · Psychological · Fantasy · Sci-Fi · Martial Arts · Supernatural · Survival

(Comedy, Tragedy, Mystery, Romance, Slice of Life and Survival already exist — they move here instead of being duplicated.)

## 3. Add — **Tone** (new category)

Dark · Lighthearted · Cozy · Gritty · Epic · Bittersweet · Hopeful · Grimdark

These replace the empty "tone control" tag, which carried no actual tone.

## 4. Add — staples that are missing

| Tag | Why |
|---|---|
| overpowered protagonist | One of the most-searched webnovel tags; only exists as the alias "op skill". |
| weak to strong | The core progression-fantasy promise. |
| hiding true strength | "Pretends to be weak / sweeping monk" trope. |
| villain protagonist | Distinct from antihero. |
| clever protagonist | Scheming / genius MC is a reader request on its own. |
| transmigration | Exists only as an alias. |
| reverse harem | Missing counterpart to harem. |
| formations & arrays | Xianxia staple, absent entirely. |
| magic | Plain magic systems have no tag. |
| gods & deities | No direct tag. |
| modern knowledge uplift | "Brings modern knowledge to another world" — currently hiding behind "industrial growth". |

---

## 5. Category by category

Legend: **Keep** · **Merge → target** (the target survives; the others become its aliases so search still finds them) · **Cut** (reason).

### System & Progression (54 → ~24)

- **Keep:** game system, cultivation realms, breakthroughs, tribulation, dao comprehension, martial techniques, bloodline, artifact growth, weapon spirits, inheritance trials, class system, skill trees, leveling, system quests, system penalties, system shop, system corruption, scenario system, awakening, cheat skill, heaven defiance, immortal ascension, forbidden manual, alchemy, forging, death penalties
- **Merge:** player system, status window, system diagnostics, achievement systems → *game system* · breakthrough pressure, bottleneck arcs → *breakthroughs* · tribulation events, heavenly tribulation → *tribulation* · bloodline awakening, bloodline inheritance → *bloodline* · job classes, class evolution → *class system* · level progression, stat growth → *leveling* · quest systems, system missions, system rewards → *system quests* · system awakening → *awakening* · respawn logic → *death penalties* · artifact refining → *forging* · crafting skill → *crafting* (Slice of Life & Craft) · cooking skill → *cooking* · rank system → *hunters* (Modern)
- **Move out:** reincarnation rules, regression rules, time loops, save points → Fate & Second Chances; karma points → *karma*
- **Cut:** influence points, admin points, military points, diplomacy points, logistics points (leftover point-currency game design, not story) · hidden stats (a mechanic detail, not an experience)

### Fate Threats (21 → ~10) — proposed rename **Fate & Second Chances**, absorbing regression/reincarnation from Destiny & Karma

- **Keep:** death flags, doom timer, assassination plots, survival games (death games), foreknowledge, saving the doomed, stolen fate, prophecy, heaven's punishment, borrowed lifespan, regression, reincarnation, time loop, revenge returner, karmic debt
- **Merge:** destined death → *death flags* · changing timelines, future knowledge → *foreknowledge* · fate exchange, fate theft → *stolen fate* · broken prophecy, prophecy tracking → *prophecy* · save points → *time loop* · regression/reincarnation, returner, second chances → *regression* · reincarnation rules → *reincarnation* · revenge through preparation → *revenge returner*
- **Move out:** survival → Genre · chosen one, underdog, antihero, redemption → Protagonist & Tropes
- **Cut:** fate intervention (too vague to act on) · reincarnation debt (no shared meaning) · blood debt → *revenge*

### Society & Economy (48 → ~12) — merges with Politics & War into **Power & Politics**

- **Keep:** kingdom building, city building, resource management, territory control, trade routes, guilds, black market, famine, refugee crisis, auction house, smuggling, debt, business empire, modern knowledge uplift (new)
- **Merge:** settlement upgrades, territory upgrades, city expansion, village growth, infrastructure growth → *kingdom building* / *city building* · supply chains, trade embargo, port economy → *trade routes* · guild systems, guild economy, guild politics, adventurer guild, guild ranks → *guilds* · scarcity economy, famine pressure → *famine* · debt crisis → *debt* · monopoly strategy, market control → *business empire* · spiritual black markets → *black market* · auction politics → *auction house* · industrial growth → *modern knowledge uplift* · tax reform, law reform, laws → *reform* (or cut) · chaebol family → *chaebol* (Modern)
- **Cut:** public order, grain pricing, currency pressure, artisan production, labor shortage, mining economy, rare materials, tribute systems, foreign investment, banking influence, land rights, economic recovery, magical resources, contract enforcement, master workshops, war economy (all too fine-grained to change a chapter; the economy-focused tags above already cover them)

### Politics & War (71 → ~20)

- **Keep:** court intrigue, succession crisis, spy networks, rebellion, alliances, betrayal, rival factions, war, military strategy, siege warfare, guerrilla warfare, mercenaries, sect politics, clan politics, marriage alliances, puppet ruler, conquest, war trauma, revenge, rivalry, young master rivalry, demonic path, orthodox vs unorthodox, diplomacy, religious conflict, cultural clash, ancient grudges
- **Merge:** political intrigue, court factions, imperial oversight, noble resistance, council politics, regional politics, political pressure → *court intrigue* · succession battles, legitimacy crisis → *succession crisis* · intelligence war → *spy networks* · rebellion risk, rebel recruitment → *rebellion* · alliance building, alliance decay → *alliances* · betrayal fallout → *betrayal* · campaign planning, battlefield tactics, military doctrine → *military strategy* · fortress defense → *siege warfare* · mercenary contracts → *mercenaries* · sect diplomacy → *sect politics* · ancient clan → *clan politics* · occupied territory, conquered loyalty, vassal management → *conquest* · veteran trauma → *war trauma* · revenge spiral, revenge climb → *revenge* · righteous sect → *orthodox vs unorthodox* · diplomatic leverage, treaty instability → *diplomacy* · warlord politics, border defense, border raids, background wars → *war* · merchant politics → *business empire*
- **Cut:** faction memory, loyalty tracking, reputation tracking (HARNESS jobs) · hostage diplomacy, proxy war, propaganda war, hidden patrons, troop morale, unit progression, officer loyalty, weapon upgrades, elite units, special corps, war exhaustion, strategic retreat, city evacuation, prisoner politics, enemy generals, battlefield reputation, supply raids (scene-level details the writer invents on its own inside *war* / *military strategy*) · public scandal → *fame & social media* (Modern)

### Romance & Affection (47 → ~14) — proposed rename **Relationships**, absorbing bonds from Destiny & Karma

- **Keep:** romance, slow burn, enemies to lovers, rivals to lovers, forbidden love, arranged marriage, childhood friend, senpai-kouhai, duty versus love, harem, reverse harem (new), dual cultivation, master-disciple, found family, sworn brotherhood, soul bonds, adventuring party
- **Merge:** romantic tension, romantic trust, affection growth → *romance* · slow-burn romance → *slow burn* · forbidden romance → *forbidden love* · political romance → *arranged marriage* · love versus ambition → *duty versus love* · harem harmony, harem jealousy → *harem* · spiritual bond cultivation, adult-only double cultivation politics → *dual cultivation* · master-disciple bond, mentor bond, mentor, disciple growth → *master-disciple* · party chemistry, party conflict, party roles, hero party, companion loyalty → *adventuring party* · fate bonds, karmic bonds → *soul bonds*
- **Move out:** villainess → Protagonist & Tropes · farming, food, healing, village bonds, cozy cultivation, low-stakes daily progress → Slice of Life & Craft
- **Cut:** jealousy tracking, confession timing, trust rupture, trust repair, romantic sacrifice, memory romance, protector bond, grief to love (beats inside a romance, not requests a reader makes up front) · companion arcs, companion growth (×2), companion rivalry, companion betrayal, companion trauma, companion ambition (the writer should give companions arcs in every story)

### Destiny & Karma (34 → dissolved)

Its strong tags move: karma/karmic debt, life debt, oaths & vows, curses, divine contracts (blessings + spirit contracts) stay together under **Fate & Second Chances**; regression/reincarnation go there too; found family, sworn brotherhood, soul bonds go to **Relationships**; chosen one, antihero, redemption to **Protagonist & Tropes**.

- **Cut:** destiny recovery, lost fate, fate repair, fate correction (four wordings of "changing fate" with no clear story difference — keep one *changing fate* if you want it), mercy consequences, moral debt, favor debt (→ *karmic debt*), oath tracking / promise tracking / curse tracking (become *oaths & vows*, *curses* — "tracking" is the HARNESS's job)

### Adventure (56 → ~22) — proposed rename **Adventure & Worlds**

- **Keep:** exploration, ancient ruins, secret realms, dungeons, tower climbing, raids & bosses, loot, hidden quests, summoning, beast taming, monster companions, enchanting, formations & arrays (new), talismans, isekai, transmigration (new), otome game, gates & dungeon breaks, broadcast trials, constellation sponsors, party banishment, demon king, summoned hero, reincarnated monster, cursed relics, ancient secrets, trial grounds
- **Merge:** map expansion → *exploration* · secret realm → *secret realms* · tower climbs, dungeon/tower climb, ancient tower rankings → *tower climbing* · dungeon systems → *dungeons* · floor bosses, boss mechanics, raid mechanics, raid team → *raids & bosses* · loot economy, loot systems, artifact economy → *loot* · quest chains → *hidden quests* · summoning systems → *summoning* · monster evolution, pet evolution, beast-taming / monster evolution, bonded beasts, spirit beast → *beast taming* · crafting systems, crafting/alchemy, alchemy systems, pill refinement → *alchemy* · forging systems, weapon forging → *forging* · enchantment systems → *enchanting* · talisman design → *talismans* · dungeon gates, tower gates, gate outbreaks → *gates & dungeon breaks* · streamed trials → *broadcast trials* · trial rooms → *trial grounds* · bloodline awakenings → *bloodline* · sect rankings, arena rankings → *tournament*
- **Cut:** player factions, NPC memory, NPC agendas, world events, tutorial systems, safe zones, beast sect politics, companion growth (duplicate)

### Modern (44 → ~12) — proposed rename **Settings**, absorbing Academy

- **Keep:** urban fantasy, hidden world, chaebol, idols & celebrity, urban spirits, hunters, fame & social media, rags to riches, apocalypse, cosmic, gangs & underworld
- **Merge:** urban cultivation, urban/modern cultivation, modern artifacts, phone talismans → *urban fantasy* · hidden society, hidden sects in modern cities, underworld sects → *hidden world* · corporate clans, chaebol clans, chaebol family → *chaebol* · celebrity vessels, idol factions → *idols & celebrity* · apartment spirits, subway realms, convenience spirits → *urban spirits* · hunter rankings, hunter society, ranker, awakened citizens, association politics, rank system → *hunters* · media pressure, viral reputation, public scandal → *fame & social media* · social status growth → *rags to riches* · apocalypse cultivation, apocalypse survival, ruined worlds, survival camps, mutated beasts, broken heavenly laws → *apocalypse* · cosmic cultivation, star realms, planetary sects, void beasts, galactic inheritances → *cosmic* · district control, urban territory → *gangs & underworld*
- **Move out:** otome game → Adventure & Worlds · family pressure → Drama-style tag under Protagonist & Tropes · revenge climb → *revenge*
- **Cut:** debt curses, contract rewriting, spiritual real estate

### Academy & Training (24 → ~10)

- **Keep:** academy, school life, class rankings, exams, tournament, rival schools, training arc, hidden master, campus secrets, forbidden libraries
- **Merge:** academy cultivation, sect schools, dungeon academy → *academy* · school hierarchy, academy rankings → *class rankings* · exam arcs → *exams* · tournament arcs → *tournament* · hidden instructors → *hidden master*
- **Cut:** student factions, teacher politics, discipline systems, training schedules, mission boards, rival dorms

### Meta & Continuity (53 → dissolved)

This is the category you flagged, and you're right: almost none of it is a story request.

- **Cut — HARNESS / app jobs** (should be true of every story, or are features, not story content): emotional continuity, long-term consequences, recap tracking, arc continuity, chapter memory, side plot tracking, offscreen growth, offscreen schemes, delayed payoffs, foreshadowing, living codex, dynamic portraits, relationship web, threat colors, faction colors, character status, world state, story momentum, reader hooks, arc escalation, plot persistence, continuity guardrails, chapter consequences, stakes escalation
- **Cut — "control" tags with no value in them:** trope control, tone control, pacing control (replaced by the Tone category)
- **Move to Genre:** comedy, tragedy, mystery, slice of life
- **Move to Tone:** cozy fantasy → *cozy*; slow life → *cozy* alias
- **Move to Protagonist & Tropes:** hidden identity (+ hidden identities), face slapping, nemesis (from recurring enemies), sealed memories (amnesia)
- **Merge elsewhere:** mystery clues, forbidden cases, hidden murders, mystery cultivation → *mystery* · lost history, mythic history, ancient sealed truths → *ancient secrets* · secret bloodlines → *bloodline* · cursed relics → Adventure & Worlds · ancient grudges, cultural tension, religious pressure, regional politics → Power & Politics · background wars → *war* · recurring allies → cut (companions are always expected)

### New: Protagonist & Tropes

overpowered protagonist (new) · weak to strong (new) · hiding true strength (new) · villain protagonist (new) · clever protagonist (new) · underdog · antihero · chosen one · redemption · villainess · hidden identity · face slapping · nemesis · amnesia · family pressure

### New: Slice of Life & Craft

farming · cooking · healing · crafting · village life

---

## 6. Proposed shape after the audit

| Category | Approx. tags | Color |
|---|---|---|
| Genre (new) | 16 | — |
| Tone (new) | 8 | — |
| Protagonist & Tropes (new) | 15 | — |
| Powers & Progression | ~24 | gray |
| Fate & Second Chances | ~18 | red |
| Power & Politics | ~35 | purple |
| Relationships | ~17 | pink |
| Adventure & Worlds | ~27 | blue |
| Settings (academy, modern, apocalypse, cosmic) | ~21 | teal |
| Slice of Life & Craft (new) | 5 | green |

**~450 tags → ~185**, nothing a reader would actually ask for lost. Every merged label stays as an alias, so typing the old wording still finds the new tag.

## 7. Safety notes

- **Existing stories are safe.** Tags are saved as plain text and custom tags are allowed, so a story carrying a cut tag keeps it; it just shows as an uncategorized chip and still reaches the models.
- **Three things point at specific tag names** and must be updated in the same change: the premise auto-suggest rules (several point at Meta tags like *emotional continuity*, *chapter memory*), the genre → starter-tag map, and the Story Spark / demo seeds.
- **The Workshop Story Seed preview** shows the same picker and changes with it automatically.

## 8. Recommended order

1. **Fix delivery** — give tags their own slot and one reading instruction in the writer prompt (small change, biggest effect on chapters).
2. **Add Genre, Tone, Protagonist & Tropes, and the missing staples.**
3. **Cut and merge** per this document.
4. *(Later)* Give each kept tag a one-line meaning the writer reads ("death flags — the main character knows events that would kill them and works to avoid them"). That turns tags from keywords into real instructions.

---

## 9. Tagging engine upgrade, first build (SENSEI, 2026-10-25)

SENSEI's choices:
- **Niches are the 15 genre paths** creators already pick in Origin. A tag can sit under several of them.
- **The creator's tag picker comes first.** Discover and Home filtering by niche and tag follow on the same engine.
- **Tradition (Chinese, Korean, Japanese) stays as it was:** it nudges suggestions and never hides a tag.

What the creator sees in **Browse all tags**:
- **Niches:** a row holding *All tags* and the 15 genre paths. It opens on the story's own genre, or on All tags for a custom genre.
- **Families:** filter chips with counts. Pick one or several, or none to show every family.
- **Search:** searches inside the chosen niche and families. *Search all tags* widens it.
- **Grouping:** tags are grouped under their family, and hovering a tag shows the niches it belongs to.

No tag was renamed or cut in this build. Niches are a second way to reach the same catalog. The writer, saved stories and World Cards are unchanged.

The engine is `src/components/story-seed/shared/storyTagNiches.ts`. Each niche's **core** tags are the ones its genre already nudged suggestions toward; the rest are everything the niche holds.

### Which tags each niche holds

### Xianxia (44)

**Core:** cultivation realms, sect politics, dao comprehension, heavenly tribulation

**Also:** breakthrough pressure, bottleneck arcs, power scaling, martial techniques, bloodline awakening, inheritance trials, artifact growth, weapon spirits, artifact refining, alchemy, formations & arrays, talisman design, forbidden manual, immortal ascension, heaven defiance, heaven's punishment, sect diplomacy, sect rankings, righteous sect, demonic path, ancient clan, clan politics, young master rivalry, face slapping, master-disciple bond, dual cultivation, adult-only double cultivation politics, karmic bonds, karmic debt, secret realms, ancient ruins, spirit beast, auction politics, rare materials, ancient grudges, mythic history, sworn brotherhood, hidden instructors, borrowed lifespan, stolen fate

### Xuanhuan (25)

**Core:** bloodline awakening, martial techniques, heavenly tribulation

**Also:** cultivation realms, power scaling, breakthrough pressure, inheritance trials, artifact growth, weapon spirits, heaven defiance, immortal ascension, magic, secret bloodlines, ancient clan, clan politics, young master rivalry, face slapping, demonic path, secret realms, ancient ruins, spirit beast, gods & deities, mythic history, forbidden manual, auction politics

### System (54)

**Core:** game systems, level progression, system missions, skill trees

**Also:** status window, player system, stat growth, job classes, class evolution, quest systems, achievement systems, system awakening, system rewards, system penalties, system shop, system diagnostics, system corruption, hidden stats, karma points, influence points, admin points, military points, diplomacy points, logistics points, rank system, scenario system, awakening, cheat skill, cooking skill, save points, death penalties, respawn logic, dungeon systems, loot systems, raid mechanics, boss mechanics, party roles, quest chains, hidden quests, tutorial systems, safe zones, player factions, NPC agendas, world events, constellation sponsors, streamed trials, crafting systems, enchantment systems, summoning systems, isekai, summoned hero, demon king, adventurer guild, guild ranks

### Academy Cultivation (26)

**Core:** academy cultivation, exams, class rankings, rival schools

**Also:** academy, school life, school hierarchy, academy rankings, student factions, teacher politics, discipline systems, training schedules, mission boards, campus secrets, forbidden libraries, trial grounds, rival dorms, hidden instructors, dungeon academy, training arc, tournament, arena rankings, master-disciple bond, senpai-kouhai, rivalry, young master rivalry

### Kingdom Building (65)

**Core:** kingdom building, territory control, resource management, laws

**Also:** kingdom economy, city building, village growth, settlement upgrades, territory upgrades, infrastructure growth, trade routes, supply chains, port economy, mining economy, tax reform, law reform, public order, land rights, tribute systems, famine pressure, scarcity economy, refugee crisis, labor shortage, grain pricing, currency pressure, debt crisis, trade embargo, war economy, economic recovery, modern knowledge uplift, diplomacy, vassal management, noble resistance, rebellion risk, military strategy, border defense, troop morale, unit progression, officer loyalty, elite units, special corps, siege warfare, fortress defense, campaign planning, battlefield tactics, military doctrine, weapon upgrades, mercenary contracts, occupied territory, conquered loyalty, war, war exhaustion, guerrilla warfare, border raids, supply raids, strategic retreat, city evacuation, enemy generals, battlefield reputation, veteran trauma, smuggling routes, contract enforcement, logistics points, military points, diplomacy points

### Crafting/Alchemy (22)

**Core:** crafting systems, alchemy, artifact economy

**Also:** artifact refining, artifact growth, weapon forging, weapon spirits, enchantment systems, talisman design, formations & arrays, cooking skill, food, rare materials, magical resources, master workshops, artisan production, guild economy, guild systems, auction politics, market control, monopoly strategy, black market

### Beast Taming (13)

**Core:** beast taming, bonded beasts, bloodline awakening

**Also:** monster evolution, pet evolution, monster companions, spirit beast, summoning systems, beast sect politics, spirit contracts, mutated beasts, void beasts, reincarnated monster

### Tower Climb (26)

**Core:** tower climbing, floor bosses, trial rooms

**Also:** ancient tower rankings, dungeon systems, dungeon gates, boss mechanics, raid mechanics, raid team, hero party, party roles, party chemistry, party conflict, party banishment, loot systems, hidden quests, safe zones, tutorial systems, level progression, status window, death penalties, respawn logic, constellation sponsors, streamed trials, ranker, survival games

### Regression (28)

**Core:** regression, foreknowledge, second chances

**Also:** returner, revenge returner, reincarnation rules, time loops, save points, changing timelines, saving the doomed, destined death, death flags, doom timers, fate correction, fate repair, transmigration, villainess, otome game, revenge, revenge spiral, betrayal, hiding true strength, stolen fate, fate exchange, borrowed lifespan, reincarnation debt, blood debt, broken prophecy

### Urban Cultivation (33)

**Core:** urban cultivation, hidden society, social status growth

**Also:** corporate clans, chaebol clans, district control, urban territory, underworld sects, spiritual black markets, apartment spirits, subway realms, convenience spirits, celebrity vessels, idol factions, media pressure, viral reputation, public scandal, modern artifacts, phone talismans, contract rewriting, spiritual real estate, debt curses, revenge climb, family pressure, hunter rankings, hunter society, awakened citizens, association politics, gate outbreaks, dungeon gates, ranker, face slapping, hiding true strength

### Apocalypse (16)

**Core:** apocalypse cultivation, survival camps, mutated beasts

**Also:** apocalypse survival, ruined worlds, broken heavenly laws, gate outbreaks, system awakening, awakening, survival games, doom timers, monster evolution, scarcity economy, famine pressure, refugee crisis, resource management

### Cosmic (11)

**Core:** cosmic cultivation, star realms, galactic inheritances

**Also:** planetary sects, void beasts, immortal ascension, gods & deities, power scaling, mythic history, map expansion, world events

### Political Intrigue (42)

**Core:** court intrigue, political pressure, spy networks

**Also:** imperial oversight, noble resistance, succession crisis, legitimacy crisis, intelligence war, diplomatic leverage, treaty instability, alliance building, alliance decay, betrayal, betrayal fallout, rival factions, proxy war, hostage diplomacy, merchant politics, council politics, propaganda war, public scandal, hidden patrons, puppet ruler, marriage alliances, political romance, arranged marriage, assassination plots, warlord politics, regional politics, cultural tension, religious pressure, rebellion risk, rebel recruitment, clan politics, sect politics, guild politics, banking influence, foreign investment, prisoner politics, war, villainess, clever protagonist

### Cozy/Slice-of-Life (16)

**Core:** cozy / slice-of-life cultivation, village bonds, low-stakes daily progress

**Also:** farming, food, healing, cooking skill, village growth, found family, childhood friend, affection growth, artisan production, master workshops, crafting systems, spirit beast, monster companions

### Mystery (18)

**Core:** mystery cultivation, forbidden cases, hidden murders

**Also:** secret bloodlines, sealed memories, lost history, mythic history, cursed relics, ancient sealed truths, forbidden libraries, hidden identity, hidden patrons, spy networks, assassination plots, curses, debt curses, campus secrets, ancient ruins

### In every story, no niche (72)

Reached from **All tags**: every Genre and Tone tag, the protagonist archetypes, most romance and bonds, and a few general tags.
