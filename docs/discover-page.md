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

## What's built (2026-10-20)

The page's structure, for refining how it looks and feels. It is the Library's
`@seihouse/library/discover` (`src/components/discover/`), at `/app/?page=discover`
in the app and `?preview=discover` in the Workshop. Every world on it is a sample
(`src/novel-expanded/discoverSamples.ts`); opening one says so.

- **Search** across the page: titles, creators, genres and tags.
- **Latest Releases**, newest first, with **My updates** beside it (the sample
  reader tracks two series).
- **Fate Survival**, its own band right after the feed, to push those stories.
- **Browse worlds** by genre, on World Cards.
- **Heavenly Rankings** boards (Worlds, Characters, Items, Beasts & Pets,
  Familiars) and **Events** (Mystery Week, Dark Fantasy Week), all marked Soon.

On laptops Rankings and Events sit beside the feed; on phones and tablets they
come last. Not built: real worlds and releases, the Tracker, signals, community
lists, credits pages, branch lineage, curated reviews.
