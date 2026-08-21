# Celestial Library component set

Shared, reusable Library-skinned components. Not a Workshop preview feature —
these primitives back the feature replicas (Story Seed, Story Seed Settings,
Relics, Reader surfaces) and transfer to production alongside them.

The Workshop home page's **Library Components** tab renders the eleven page-level
primitives live from this folder — `LibraryPanel`, `LibraryCard`,
`LibraryButton`, `ManifestButton`, `LibraryTextBox`, `LibraryTextArea`,
`LibraryHeaderBadge`, `LibraryNavigationDrawer`, `LibraryBottomNavigation`,
`LibraryDragonCycleIcon`, and `LibrarySoundGlyph` — the quick visual inventory of what already
exists. The base layers `SEIButton`, `SEIBottomNavigation`, and `cn` are
intentionally excluded: they back the primitives above and pages never import
them. The inventory list lives in `src/workshop/LibraryComponents.tsx`;
update it whenever one of these eleven primitives is added to or renamed in the
barrel.

## Component ownership

`src/components/library/` is the single Workshop owner for the reusable
Celestial Library UI system:

- `LibraryButton`, `LibraryPanel`, `LibraryCard`, and
  `LibraryNavigationDrawer`
- `ManifestButton` — the universal spectral creation action ("Manifest …")
  for primary generation buttons
- `LibraryBottomNavigation` — the mobile bottom navigation bar
- `LibraryTextBox` and `LibraryTextArea`
- `LibraryHeaderBadge` and its emblem/header spectrum treatments
- `LibraryDragonCycleIcon` — the shared cycle glyph (Re-do / Re-try /
  shuffle): a dragon chasing its own tail
- `LibrarySoundGlyph` — the shared open-folio resonance mark for neutral,
  non-platform audio actions such as inline World Cues
- `SEIButton`, `SEIBottomNavigation`, `cn`, shared glass-field styles, and the
  Library spectrum styles
- the public `index.ts` exports used by feature consumers

Feature folders import these components from the Library barrel; Workshop
code and other package consumers import the same barrel through
`@seihouse/sen/library`. They must not
keep local copies or compatibility barrels. Feature-only presentation remains
with the feature; for example, Story Seed owns only its workspace ambience in
`src/components/story-seed/development/story-seed.css`.

Reusable visual names use the `library-*` namespace:
`library-spectrum-glow`, `library-spectrum-flow`,
`library-title-presence`, and `library-subtitle-shimmer`. There are no legacy
`seed-*` aliases.

- **2026-08-21:** Moved the shared celestial particle canvas from
  `src/ParticleEffect.tsx` into the Library set as `ParticleEffect` and added
  it to the barrel, so relic reveals, loading veils, and the celestial
  backdrop draw their motes from a Library-owned component instead of an
  application-root file. The barrel is now published as
  `@seihouse/sen/library`; see `src/package/README.md` for the package
  surface.

- **2026-08-19:** Added `LibrarySoundGlyph`, the custom neutral open-folio and
  resonance mark used by inline World Cue controls, and added it to the live
  Library Components inventory. Refined its Reader presentation into a
  circle-free, footnote-scale annotation with a separate invisible pointer
  target and a soft active glow.

- **2026-08-18:** Enhanced `LibraryDragonCycleIcon` with full accessibility
  support (`title`, `titleId`, `decorative`, `role`, and `aria-*` attributes),
  defensive `size` normalization, `React.memo` wrapping, and dedicated contract
  tests (`LibraryDragonCycleIcon.test.tsx`). Refined the Story Seed premise
  cycle button with a comfortable 40px visual affordance (`h-10 w-10`),
  smooth rotational feedback on cycle with reduced-motion suppression,
  restrained press feedback (`active:scale-95`), and cleaned up redundant
  title tooltips.
- **2026-08-15:** Ported the finalized `SEICard` from the SEIHouse UI repo
  (source commit `53fb8934e7b126807194654c9af10a504b4db6e8` on UI `main`) and added
  `LibraryCard`, the official Celestial Library card primitive: the full
  region set (media / content / header / title / description / body /
  metadata / actions / footer), the static vs. interactive-link vs.
  interactive-button contract, entity-category / Relic-rarity accent
  identity colors, and focused contract tests. No feature consumer yet —
  the Codex / World / Relic card rebuilds adopt it in a later pass.
- **2026-08-06:** Added `ManifestButton` — the Library's universal creation
  action. "Manifest" is the Library's creation language: every primary
  generation button uses it with a label naming what it creates (Manifest
  World Blueprint, Manifest Story). Behavior comes from `SEIButton`; shape
  and rhythm are shared with `LibraryButton` (now-exported `BASE`, `SIZES`,
  `ICON_GLYPH_SIZE`), and the skin echoes the Library header emblem: a gold
  rim over gilded obsidian, the iridescent 1px conic edge shared with
  `LibraryPanel` (now-exported `SPECTRAL_EDGE`), and the emblem's flowing
  rainbow spectrum masked to a soft halo band just outside the button that
  brightens on hover and while busy.
  First consumer: Story Seed (intake action bar + Blueprint review footer).
  Secondary actions stay on the quieter `LibraryButton` variants.

- **2026-08-04:** Added `LibraryDragonCycleIcon` — a custom ouroboros glyph
  (dragon chasing its own tail, spiked serpentine body, tail wisp rising into
  the open jaws) that joins the ecosystem's icon language as the shared
  "Re-do / Re-try / shuffle" mark. `fill: currentColor` with a `size` prop so
  it tints like the Lucide icons it sits beside. First consumer: the Story
  Seed Origin page's system-premise cycler. Reuse it wherever the Library
  needs the cycle meaning; never redraw a one-off shuffle icon per page.
- **2026-08-04:** Ported `SEIBottomNavigation` from the SEIHouse UI repo and
  added `LibraryBottomNavigation`, the Celestial Library mobile bottom
  navigation skin. Story Seed is the first consumer (Sections / Settings /
  Profile); future Library pages import it from this barrel.
- **2026-08-04:** Consolidated `LibraryTextBox`, `LibraryTextArea`,
  `LibraryHeaderBadge`, the glass-field skin, and the shared spectrum styles
  from Story Seed into this canonical folder. Updated the public barrel and
  removed the Story Seed compatibility path without changing component APIs or
  presentation.

## LibraryTextBox and LibraryTextArea

The official single-line and multi-line Library fields. Both preserve the
existing controlled/uncontrolled behavior, forwarded refs, generated IDs,
accessible descriptions and errors, required markers, compact/comfortable
sizes, icon slots, completion state, and the shared glass skin.

Import them through the shared barrel:

```tsx
import { LibraryTextArea, LibraryTextBox } from '../../library';
```

## LibraryHeaderBadge

The reusable Library identity header: optional linked emblem, spectral aura,
luminous title, and optional shimmering subtitle. Its reduced-motion handling
and spectrum classes live in `library-spectrum.css`.

## LibraryPanel

Glass panel shell — the official Celestial Library section container (main
content surfaces, guidance callouts, footer action strips).

- **Source repository:** SENSEIDUKES UI repo (`UI`)
- **Source location:** `packages/seihouse-ui/src/primitives/sei-panel.tsx`
  (exports `SEIPanel` + `SEIPanelProps`) with `seiPanelVariants` in
  `packages/seihouse-ui/src/styles/variants.ts` (inspected 2026-08-04)
- **Workshop consumer:** `?preview=story-seed` (development fork — the
  two-panel creation workspace shell and its action-bar footer strip)
- **Replica created:** 2026-08-04
- **Last Workshop update:** 2026-08-04
- **Last source comparison:** 2026-08-04
- **Replica status:** faithful port (re-skinned as the Celestial Library glass)

### What was ported

- The component shape: polymorphic `as` (div / section / article / aside /
  header / footer), `variant` + `padding` props, `cn` composition, and the
  `min-w-0 overflow-hidden` containment base.
- The SEIPanel `glass` variant technique: the sheen is an explicit
  `background-image` layer (a `bg-[gradient,color]` list compiles to an
  invalid `background-color` and is dropped); the base color stays opaque
  enough for browsers without `backdrop-filter`, with the translucent body
  layered on behind a `supports-[backdrop-filter]` guard; blur is lighter on
  small screens and fuller from `sm` up.

### What was adapted (stack differences from the source)

- No `tailwind-variants` dependency — plain Record class maps, same pattern
  as `LibraryButton`.
- SEIHouse `--sh-*` theme variables → Library theme tokens (`portal`,
  `gold-accent`, neutral ink).
- Variants trimmed to `default` / `callout` / `footer`; SEIPanel's
  `interactive` and `glow` props were intentionally not carried over.
- The glass is re-skinned to the Celestial Library target: translucent
  black-blue depth with a top-light falloff, a crisp luminous cool border,
  strengthened inner rim lighting, and a gentle portal/gold rim glow that
  lifts the panel off the void page. A thin spectral ring — the SEIHouse
  portal → violet → gold spectrum on a conic gradient, masked to the outer
  1px (longhand masks only: the `mask` shorthand resets `mask-composite` and
  would wash the gradient over the whole panel) and screen-blended at low
  opacity — adds iridescent life along the top edge and corners without ever
  reading as a rainbow stripe. Premium, not flat black, not neon.
- `footer` has no SEIPanel equivalent: a bottom action strip with a crisp
  luminous top divider, a soft portal glow rising above the divider, a
  translucent dark body with its own top sheen, and backdrop blur. Render it
  as the last child of a `padding="none"` panel so the panel's
  `overflow-hidden` clips its corners to the panel radius.

### Usage

```tsx
import { LibraryPanel } from '../library';

// Main section container:
<LibraryPanel>…</LibraryPanel>

// Guidance / notice block inside a panel:
<LibraryPanel variant="callout">…</LibraryPanel>

// Section shell with a footer action strip:
<LibraryPanel padding="none">
  <main className="p-4 sm:p-8">…</main>
  <LibraryPanel variant="footer" padding="none" className="px-4 py-3.5">…</LibraryPanel>
</LibraryPanel>
```

### Workshop history

- **2026-08-04:** Premium refinement pass toward the Celestial Library glass
  reference: crisper, brighter border; deeper body glass with a top-light
  falloff; strengthened inner rim lighting and page-separating rim glow; a
  thin masked spectral edge (SEIHouse portal → violet → gold) adding
  iridescent life along the top edge and corners; and a polished footer
  strip with a crisp luminous divider and soft upward glow. Story Seed
  markup untouched — the refinement is entirely inside the panel skin.
- **2026-08-04:** Ported `SEIPanel` from the UI repo, re-skinned it as the
  Celestial Library glass, and adopted it as the Story Seed
  creation-workspace shell (main glass container + action-bar footer strip).

## LibraryCard

Glass card primitive — the official Celestial Library card: the composable
item surface future Library cards (Codex entries, world entities, relics,
reveals) build on. `LibraryPanel` stays the section container; a card is an
item, never a panel replacement.

- **Source repository:** SENSEIDUKES UI repo (`UI`)
- **Source location:** `packages/seihouse-ui/src/primitives/sei-card.tsx`
  (exports `SEICard` + the region components) with `seiCardVariants` in
  `packages/seihouse-ui/src/styles/variants.ts`, at source commit
  `53fb8934e7b126807194654c9af10a504b4db6e8` on UI `main`
  (inspected 2026-08-15)
- **Workshop consumer:** none yet — shared Library integration only; the
  Codex / World / Relic card rebuilds adopt it in a later pass
- **Replica created:** 2026-08-15
- **Last Workshop update:** 2026-08-15
- **Last source comparison:** 2026-08-15
- **Replica status:** faithful port (re-skinned as the Celestial Library glass)

### What was ported

- The full component shape: the discriminated props union (static card vs.
  `interactive` + `href` link card vs. `interactive` + `onClick` button
  card), the polymorphic `as` props (root article / div / section, media
  div / figure, title h2–h6, description p / div / blockquote), and the
  `cn` composition.
- All composable regions with their `data-slot` hooks: media, content,
  header (+ icon well, eyebrow, title row), title, description, body,
  metadata, actions, footer — plus the convenience content props (`eyebrow`,
  `icon`, `title`, `titleAs`, `description`, `metadata`, `media`, `actions`,
  `footer`, `contentClassName`) that assemble them.
- The accessibility contracts: keyboard-operable button cards (Enter and
  Space both activate; a `defaultPrevented` keydown is respected), native
  link semantics for href cards, disabled cards dropping their href and
  leaving the tab order (`tabIndex={-1}`, `aria-disabled`, pointer-events
  off), and the always-visible focus ring on interactive cards.
- The layout foundations: `flex-col` equal-height cards with `mt-auto`
  footer anchoring, `min-w-0` + `wrap-anywhere` long-content containment,
  the negative-margin media inset per padding size, and the fragment-aware
  `hasRenderableContent` check so empty regions never render.
- `accentColor` identity for entity-category or Relic-rarity colors: the
  `data-accent` hook, the top accent hairline, and the accent-driven icon
  well / hover border / hover glow via custom properties.
- `elevateOnHover` for visual-only lift; interactive cards always elevate.
- Reduced-motion handling (`motion-reduce` on the lift, press, and
  transitions) and the adaptive mobile glass (lighter backdrop blur on
  small screens, fuller from `sm` up, behind a `supports-[backdrop-filter]`
  guard).

### What was adapted (stack differences from the source)

- No `tailwind-variants` dependency — plain Record class maps, same pattern
  as `LibraryPanel`.
- SEIHouse `--sh-*` theme variables → Library theme tokens and the shared
  `--library-card-accent*` custom properties.
- The glass is the `LibraryPanel` `default` recipe at card scale, including
  the exported masked 1px `SPECTRAL_EDGE` ring — the accent hairline moved
  to `after:` because `before:` carries the spectral edge.
- Variants trimmed to `default` / `callout` (the panel's gold-tinted inset
  glass, reused for guidance / notice cards); SEICard's tone lanes (`soft`,
  `outline`, `ghost`, `solid`, `dark`, `light`, `glass-test`, `media-test`)
  were intentionally not carried over.
- Padding follows the LibraryPanel responsive rhythm (`md` = `p-5 sm:p-6`,
  `lg` = `p-6 sm:p-8`) instead of SEICard's fixed `p-4` / `p-5` / `p-6`;
  the content padding and media inset maps track it.
- Muted text maps to `neutral-400` and subtle text to `neutral-450` so body
  and metadata copy hold >= 4.5:1 contrast on the dark glass (the
  `neutral-500` field-helper tone is too quiet here).
- The focus ring is the canonical Library portal ring shared with
  `LibraryButton` and the navigation skins.

### Mock boundaries

- None. `LibraryCard` is a stateless shared primitive with no Workshop state
  simulator, fixture data, authentication, persistence, API calls, routing,
  or production environment dependency. Consumers own all content and actions.

### Transfer instructions

- Do not copy `LibraryCard` back into the UI repo as a replacement for
  `SEICard`; UI `main` remains the source contract. Transfer this
  Library-skinned port into `SENSEIDUKES/Light-Novels` only alongside an
  approved Library feature that adopts it.
- Place the component in the production application's canonical shared
  Library component folder, preserve its public props and `data-slot` hooks,
  and add the named exports to that folder's barrel.
- Reuse the destination's canonical `cn` utility and Library panel spectral
  edge. If those shared dependencies have not yet transferred, move the
  verified Workshop implementations with the card instead of duplicating
  their class-merging or spectral-edge logic.
- Carry the focused contract tests with the component and run the destination
  typecheck plus test suite. Do not transfer Workshop navigation, previews, or
  mock controls; this shared primitive has none.

### Files required for production transfer

- `src/components/library/LibraryCard.tsx`
- `src/components/library/LibraryCard.test.tsx`
- The `LibraryCard` value and type export blocks from
  `src/components/library/index.ts`
- Shared dependencies, when not already present in the destination:
  `src/components/library/cn.ts` and the `SPECTRAL_EDGE` export from
  `src/components/library/LibraryPanel.tsx`

### Usage

```tsx
import {
  LibraryCard,
  LibraryCardActions,
  LibraryCardBody,
  LibraryCardContent,
  LibraryCardDescription,
  LibraryCardFooter,
  LibraryCardHeader,
  LibraryCardMedia,
  LibraryCardMetadata,
} from '../library';

// Convenience composition:
<LibraryCard
  accentColor="#F59E0B"
  eyebrow="Legendary relic"
  title="Compass of Returning Stars"
  description="A relic that remembers every road home."
  metadata="+120 Qi"
  footer="First claim reward"
/>

// Actionable card (link semantics; use onClick for a button role):
<LibraryCard interactive href="/library/relics/compass" title="Open relic" />

// Product-specific composition with explicit regions:
<LibraryCard padding="none" accentColor="var(--color-entity-mc)">
  <LibraryCardMedia as="figure">…</LibraryCardMedia>
  <LibraryCardContent padding="md">
    <LibraryCardHeader eyebrow="Reveal · Companion" title="Lei" titleAs="h2" />
    <LibraryCardBody>
      <LibraryCardDescription as="blockquote">…</LibraryCardDescription>
    </LibraryCardBody>
    <LibraryCardMetadata>…</LibraryCardMetadata>
    <LibraryCardActions>…</LibraryCardActions>
    <LibraryCardFooter>…</LibraryCardFooter>
  </LibraryCardContent>
</LibraryCard>
```

### Workshop history

- **2026-08-15:** Synchronized with finalized UI `SEICard` source commit
  `53fb8934e7b126807194654c9af10a504b4db6e8`: reduced the small-screen glass
  blur, cached populated header-slot checks, and skipped checks for omitted
  slots without changing the rendered contract. Added the disabled-link role,
  prevented-key regression coverage, TypeScript enforcement in
  `test:library`, and the complete production transfer record.
- **2026-08-15:** Ported `SEICard` from the UI repo at source commit
  `ec10d2b711d0316af2056988fc028d07c38d458b`, re-skinned it as the Celestial
  Library glass card, and added focused contract tests
  (`LibraryCard.test.tsx`). No feature adoption yet.

## LibraryNavigationDrawer

Navigation drawer/menu shell used as the Story Seed section menu and reusable
by future Library pages.

- **Source repository:** SENSEIDUKES UI repo (`UI`)
- **Source location:** `packages/seihouse-ui/src/layout/sei-navigation-drawer.tsx`
  (exports `SEINavigationDrawer` + `SEINavigationDrawerPanel`, inspected 2026-08-04)
- **Workshop consumer:** `?preview=story-seed` (development fork — desktop
  sidebar renders the panel; mobile opens the drawer from the bottom
  navigation's Sections tab)
- **Replica created:** 2026-08-04
- **Last Workshop update:** 2026-08-04
- **Last source comparison:** 2026-08-04
- **Replica status:** faithful port (adapted to the Workshop stack)

### What was ported

- Profile/account header with optional close button.
- Grouped icon + label destinations with section headings and taglines.
- 44px+ touch-target rows, truncated labels, `aria-current="page"` active
  state, and a right-side status/trailing slot.
- Mobile drawer behavior: slides in over a scrim, 85vw width capped at 20rem,
  scrim tap / Escape / close button dismissal, body scroll lock,
  overscroll-contained nav, safe-area bottom padding.

### What was adapted (stack differences from the source)

- The source builds on the Base UI `Dialog` primitive (focus trap, scroll
  lock, Escape) and SEIHouse theme CSS variables. This port uses `motion`
  (already a Workshop dependency) for the scrim/slide transition, a small
  Escape listener + body scroll lock, and the Library theme tokens
  (`void`, `signal`, `portal`, `gold-accent`, `human`, `font-sc`).
- Active-row accents are Library-native: `portal` (blue) and `gold`.
- No focus trap — the Base UI Dialog provided it. If production adopts
  `@seihouse/ui` directly, re-base this on the real `SEINavigationDrawer`
  instead of maintaining the port.

### Mocked

- The drawer's optional `profile` block is a placeholder capability for the
  future Library profile tab/menu access — it renders no account behavior.
  Story Seed no longer uses it: profile access lives in the bottom
  navigation's Profile tab, and the Story Seed drawer/sidebar render pure
  Story/World section navigation.

### Usage

```tsx
import {
  LibraryNavigationDrawer,
  LibraryNavigationDrawerPanel,
} from '../library';

// Desktop sidebar — the panel stands alone:
<LibraryNavigationDrawerPanel aria-label="…" profile={…} sections={…} />

// Mobile drawer — controlled by the parent:
<LibraryNavigationDrawer
  open={open}
  onClose={() => setOpen(false)}
  aria-label="…"
  profile={…}
  sections={…}
/>
```

### Workshop history

- **2026-08-04:** Ported `SEINavigationDrawer` from the UI repo and adopted it
  as the Story Seed section menu shell (desktop sidebar + mobile drawer).

## LibraryBottomNavigation

The official mobile bottom navigation — a soft floating dock of icon + label
tabs skinned in the Celestial Library glass, reusable by any Library page.
Story Seed is the first consumer (Sections / Settings / Profile).

- **Source repository:** SENSEIDUKES UI repo (`UI`)
- **Source location:** `packages/seihouse-ui/src/layout/sei-bottom-navigation.tsx`
  (exports `SEIBottomNavigation` + `SEIBottomNavigationProps`, inspected 2026-08-04)
- **Workshop consumer:** `?preview=story-seed` (development fork — mobile
  bottom bar; Sections opens the existing section drawer, Settings opens the
  utility sheet, Profile is a placeholder)
- **Replica created:** 2026-08-04
- **Last Workshop update:** 2026-08-04
- **Last source comparison:** 2026-08-04
- **Replica status:** faithful port (re-skinned as the Celestial Library glass)

### What was ported

- The component shape: required `aria-label` landmark, `items` with stable
  `id` / `label` / decorative `icon` / `active` / `onSelect(id)`, and the
  presentational contract (the page owns routing/state).
- Sticky bottom placement, safe-area bottom padding, the icon-over-label tab
  layout, `max-w-40` tab cap with `flex-1` sharing below it, truncated labels,
  and the `aria-current="page"` / `data-selected` state hooks.
- 44px+ touch targets (`min-h-13` tab rows).

### What was adapted (stack differences from the source)

- Same split as `SEIButton` / `LibraryButton`: `SEIBottomNavigation.tsx`
  keeps structure and behavior only; the SEIHouse `--sh-*` glass and
  interactive colors stayed behind. `--sh-safe-bottom` became the standard
  `env(safe-area-inset-bottom)` used across this app (enabled by
  `viewport-fit=cover` in `index.html`).
- The skin (`LibraryBottomNavigation.tsx`) shapes the base's inner tab row
  into a soft floating dock — a rounded glass pill (`rounded-[1.5rem]`)
  inset 1rem from the screen edges, with a cool top sheen over translucent
  dark depth, a soft luminous border, backdrop blur, and a deep drop shadow
  with a faint portal tint. The outer `<nav>` stays a transparent sticky,
  safe-area-aware container. Tab styling applies from the nav down so the
  base stays unstyled: quiet cloud labels (Alegreya SC, small caps) in
  rounded bubble tabs that wake on hover, settle on press, and light portal
  blue with a soft inner glow when selected, with the standard portal focus
  ring.
- Compose guidance: render the dock as the last element of the page flow
  below the desktop breakpoint (`lg:hidden`) and keep any footer action
  strip in flow above it (no sticky bottom offset on the strip) so the two
  never overlap. The Story Seed Forge strip follows this.

### Usage

```tsx
import { LibraryBottomNavigation } from '../library';

<LibraryBottomNavigation
  aria-label="Story Seed navigation"
  className="lg:hidden"
  items={[
    { id: 'sections', label: 'Sections', icon: <List size={20} />, active: drawerOpen, onSelect: openDrawer },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} />, onSelect: openSettings },
  ]}
/>
```

### Workshop history

- **2026-08-04:** Restyled from a full-bleed bar into a soft floating dock:
  rounded glass pill inset from the screen edges, bubble tab radius, softer
  border, inner-glow portal active state. Same items contract and sticky,
  safe-area-aware behavior.
- **2026-08-04:** Ported `SEIBottomNavigation` from the UI repo, re-skinned it
  as the Celestial Library bottom navigation, and adopted it in Story Seed as
  the first integration proof.
