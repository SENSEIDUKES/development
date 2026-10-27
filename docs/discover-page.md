# Discover page

- **Created:** 2026-10-19
- **Owner:** SENSEI
- **Status:** structure built, with sample worlds (2026-10-20); the look and
  feel is being refined. The features below are a working list; the
  philosophy is what's locked in. [`NOVEL_EXPANDED.md`](../NOVEL_EXPANDED.md)
  stays the source of truth for what is built.

## Purpose and philosophy

Discover is Expanded Novels' front door: what Novel Updates got right in
function, rebuilt for today. Novel Updates still looks like 2015 and is still the
only place of its kind. That gap is wide open.

It is not a separate site. It is the Discover page inside Expanded Novels, where
every series opens straight into the expanded reader.

## What fills it

Worlds SEIHouse can stand behind, so the piracy question that hangs over Novel
Updates never comes up.

1. **SEIHouse in-house IP:** the first worlds on the page.
2. **Creators' public worlds:** posted by subscribers.
3. **Licensed catalogs, later:** from publishers and platforms that license SEN.

## Core features

- **Eastern Fantasy Encyclopedia:** a genre-wide lore and terminology reference,
  with original scripts, pronunciation, common fan-translated aliases and
  explanations in the reader's language. It lives inside Discover and is
  separate from every individual story's Codex.
- **Latest Releases:** a neutral feed, newest first, with no algorithm deciding
  what you see. A new chapter shows up the moment it's out. This is how readers
  stumble onto stories nobody is promoting.
- **My updates:** the same feed, limited to the series you track.
- **Precise discovery:** find exactly the genre and kind of story you want,
  whatever its style.
- **Tracker:** where you are in every series.
- **Community lists:** "similar novels" lists readers make.
- **Credits and connections:** every world links to its creator, and the
  creator's page shows all their other worlds. Licensed series link back to the
  original author and publisher.
- **Branch lineage:** a world shows where it was branched from and the versions
  branched from it.
- **Straight into the reader:** every series page opens the expanded experience.

## Signals

Discover ranks worlds by what people do and spend, not by star ratings. Each
signal costs something, so it means something.

| Signal | What it measures |
| --- | --- |
| Activity | Whether people actually read it and keep coming back |
| Boosts | People spending something limited on it (the MakerWorld model) |
| Views | How many people found it |
| Branches | How many people took the World Blueprint and made their own version |

Branches give **world designers** a place to shine: creators with great universe
ideas who don't want to write 1,000 chapters, but whose Blueprints others run
with.

**Reviews, if any, are curated:** written by a trusted reviewer or moderator
group under an honor system, not open to everyone.

## Rankings and events

Expanded Novels isn't only a reader; the reader is the creator. Discover gives
both something to chase.

- **Rankings:** leaderboards like Webtoon's character rankings, extended to
  items, beasts, pets and Familiars. Cultivation stories already run on ranking
  lists, so the audience knows this language. Working name: Heavenly Rankings.
- **Events:** themed challenges such as Mystery Week or Dark Fantasy Week, for
  creators and readers.

## Platform guardrails Discover relies on

Two hard limits keep the page clean at the source, before any moderation.
Together they make botting cost real money per account.

- **World limit: 30 per creator (the minimum).** Private drafts and branches
  count, because a branch is a snapshot copy of a world. Deleting a world frees
  its slot. The number may rise by tier if the economics allow; the goal is never
  to stop people creating.
- **Only subscribers post publicly.** Generating anything requires a
  subscription. Free users can read the public worlds.
- **Tiers (being reworked):** roughly a $5 entry tier, $10 as the real base, then
  $20 and a $50 author tier. The old Light-Novels pricing screen is outdated.
- **Free starter Energy is a dial set by scale:** affordable while the platform
  is small, reduced once it's large.

## Not doing

- **Open community reviews.** Not everyone gets a platform to talk trash.
- **Star ratings.** Rarely accurate; signals with real cost replace them.
- **Links to pirated chapters.** Discover lists worlds SEIHouse can stand behind.

## Open questions

- Exact signal set and weighting: activity, boosts, views, branches, or others?
- Whether curated reviews happen at all, and who joins the reviewer group.
- The rankings' name, and which categories launch first.
- Event format and rewards.
- Archiving worlds, and world limits per tier.
- Search, series status (ongoing, completed, hiatus) and content warnings: in or
  out?

## What's built (updated 2026-10-26)

The page's structure, for refining how it looks and feels. It is the Library's
`@seihouse/library/discover` (`src/components/discover/`), at `/app/?page=discover`
in the app and `?preview=discover` in the Workshop. Every world on it is a sample
(`src/novel-expanded/discoverSamples.ts`); opening one says so.

Discover uses a compact header, a persistent row of destinations and a left
browsing rail beside the results. The same layout is intended for every media
format. A separate format-switching control is still undecided and is not added
here; Stories, Creators, Codex and Lore remain the top layer.

- **Navigation:** Stories | Creators | Codex | Lore, in that order. Stories
  is the default; Creators and Codex have reloadable `section` addresses. Lore
  links directly to the existing encyclopedia at `?page=discover&lore=index`.
- **Events** sit directly below that navigation as one expandable row across all
  four destinations. Opening it reveals the Coming soon event cards.
- **All / My updates** follows the selected section: stories use tracked series,
  creators use followed creators, and Codex uses tracked entries. These follows
  are host-supplied samples. Lore's My updates explains that term tracking is
  not available yet; All opens the complete glossary. Article pages keep the
  navigation without the directory's feed toggle. Rankings have a separate,
  explicitly overall view; returning to browsing restores the selected feed.
- **Search and Genre** filter Stories, Creators and Codex. Creator genres come
  from their listed stories; Codex genres come from their source stories.
  Changing the main destination resets its temporary filters.
- **Stories and Creators** share Browse, Genres and Rankings in the left rail.
  Genres shows cover-backed tiles with counts for the current search and feed;
  choosing one opens that genre's catalogue. The rail stays beside the content
  on phones, and expands to labeled rows on desktop.
- **Stories:** the complete story catalogue comes first, then New Chapters ordered
  newest first, Featured and Fate Survival. All / My updates scopes these shelves together.
- **Creators:** eight sample creators, each expandable to their stories using
  the shared World Card family.
- **Codex:** Characters and Items only, with four sample entries in each.
  Each expands to a description and its source story. These are public sample
  projections, not copies of the reader's private story records. Characters,
  Items and Rankings are its left-rail choices.
- **Fate Survival**, its own editorial feature. Its draw is a chapter-by-chapter
  narrative experience with consequences: every choice carries forward.
- **Heavenly Rankings:** a relevant board in Stories, Creators and Codex;
  Codex switches between character and item boards. Search and genre filter the
  host-supplied order while retaining the original rank numbers. The boards
  are labeled Overall ranking and are independent of My updates. Lore has
  neither genres nor leaderboards; its rail uses the encyclopedia's categories.

Not built: real worlds and releases, the Tracker, signals, community
lists, credits pages, branch lineage, curated reviews.

## Eastern Fantasy Encyclopedia (2026-10-26)

The Lore navigation link opens a quiet, text-first directory in the
same Library shell. It starts with **36 entries** across **Cultivation Realms,
Qi & Anatomy, Alchemy & Crafts, Mythology & Beasts, Idioms & Cultural Terms,
and Weapons & Relics**. Each article includes its canonical English term,
original script and pronunciation, explanation, fan-translated aliases,
related entries and further reading.

The directory is `/app/?page=discover&lore=index`; articles use stable addresses
such as `/app/?page=discover&lore=nascent-soul`. Search and category are kept in
the address, including when returning from an article. Search recognizes
canonical names, original scripts, pronunciation, aliases and the selected
reading language's term names. Case, punctuation, spacing and romanization
accents do not prevent a match: `Yuanying`, `Origin Infant`, `Nascent Soul` and
`元嬰` find the same entry. An ambiguous word such as `dao` can return both
the Way and a single-edged saber; related traditions are not silently treated
as interchangeable translations.

The encyclopedia uses the existing **30 supported reading languages** and
the profile's reading-language and Reading Mode defaults. Its language and
mode selectors change this visit without writing a new account preference.
Interface language follows the existing profile choice, with right-to-left
layout where appropriate. Localized term packs load on demand; no model,
generation credit or translation API is involved.

- **Standard:** the definition and genre context.
- **Clear Reading:** direct prose split into separate sentences.
- **Easy Read:** the direct explanation, with larger text and short paragraphs.
- **Literal Reading:** direct prose, with a reminder to read dramatic
  expressions by their meaning rather than their literal wording.

Every mode preserves the full explanation, context and aliases. English has a
separate direct-prose edition shared by the accessibility modes. Localized
entries already use concise, literal definitions and retain their complete
text in each mode. These are authored reference entries, not generated chapters.

English is the editorial reference. The other language packs contain concise
localized definitions and interface text; they are not professionally reviewed
translations. Automated checks cover their completeness and searchable names.
Lore notes explain where meanings, cultivation ranks and names vary by story.
This reference does not prescribe a universal realm ladder or override a
story's own Codex.

Ownership stays in `src/components/discover/`, exported through the existing
`@seihouse/library/discover` entry. The app supplies navigation and the current
profile. The existing `?preview=discover` Workshop iframe shows this same app
and uses its real saved profile preferences. Discover's world shelves remain
the existing sample worlds.
