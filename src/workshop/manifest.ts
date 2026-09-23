export type WorkshopCategory =
  | 'backgrounds'
  | 'animations'
  | 'icons'
  | 'rewards'
  | 'reader-ui'
  | 'codex-ui'
  | 'other';

export interface WorkshopSource {
  /** Repository containing the production implementation this feature is compared against. */
  repository: string;
  /** File path of the production implementation, relative to that repository. */
  path: string;
  /** Date the Original Reference was last checked against the real production implementation. */
  lastCompared: string;
}

/**
 * Workshop navigation only: where SENSEI mentally works on something. It never
 * changes package or implementation ownership — see `WorkshopOwner` for that.
 */
export type WorkshopSection = 'pages' | 'rewards' | 'customization' | 'systems' | 'components';

/** Optional subsection inside a Workshop section (Pages and Rewards use them). */
export type WorkshopGroup =
  | 'home' | 'create' | 'read' | 'account' | 'commerce'
  | 'reward-overview' | 'earning' | 'spending' | 'recurring';

/**
 * The package lane that actually owns a Workshop item. Declared explicitly per
 * entry — never inferred from file paths — and kept in step with the real
 * boundaries in `scripts/ownershipInventory.mjs` and `src/package/README.md`.
 *
 * - `sen` — `@seihouse/sen`, the portable narrative engine.
 * - `library` — `@seihouse/library`, SEIHouse's first-party host application.
 * - `library-ui` — `@seihouse/library-ui`, the stateless Celestial Library presentation package.
 * - `workshop` — Workshop-only tooling that ships in no package.
 * - `deferred` — owned by neither package yet, unexported by approval.
 */
export type WorkshopOwner = 'sen' | 'library' | 'library-ui' | 'workshop' | 'deferred';

export const WORKSHOP_OWNER_LABELS: Record<WorkshopOwner, string> = {
  sen: 'SEN',
  library: 'LIBRARY',
  'library-ui': 'LIBRARY UI',
  workshop: 'WORKSHOP',
  deferred: 'DEFERRED',
};

/**
 * Lifecycle filter, separate from navigation. Archived entries leave the four
 * active sections but keep their `?preview=` route and implementation intact.
 */
export type WorkshopStatus = 'active' | 'legacy' | 'archived';

export type WorkshopEntry = {
  id: string;
  title: string;
  description: string;
  category: WorkshopCategory;
  section: WorkshopSection;
  group?: WorkshopGroup;
  owner: WorkshopOwner;
  status: WorkshopStatus;
  /** Preview id of the entry that supersedes this one. */
  replacedBy?: string;
  archiveNote?: string;
  /** Manually maintained Workshop release version. Never inferred from source changes. */
  version: `v${number}.${number}`;
  source: WorkshopSource;
};

export const WORKSHOP_SECTIONS: ReadonlyArray<{
  id: WorkshopSection;
  label: string;
  description: string;
  groups?: ReadonlyArray<{ id: WorkshopGroup; label: string }>;
}> = [
  {
    id: 'pages',
    label: 'Pages',
    description: 'Full screens a reader or creator moves through.',
    groups: [
      { id: 'home', label: 'Home' },
      { id: 'create', label: 'Create' },
      { id: 'read', label: 'Read' },
      { id: 'account', label: 'Account' },
      { id: 'commerce', label: 'Commerce' },
    ],
  },
  {
    id: 'rewards',
    label: 'Rewards',
    description: 'How a cultivator earns and spends: achievements and Mystery Scrolls, Fate Survival Relics, Familiar bonds cultivated with QI, and the recurring Dao Pillar. Start with the Reward Loop to see every piece move together.',
    groups: [
      { id: 'reward-overview', label: 'Start here' },
      { id: 'earning', label: 'Earning' },
      { id: 'spending', label: 'Spending' },
      { id: 'recurring', label: 'Daily & idle' },
    ],
  },
  { id: 'customization', label: 'Customization', description: 'Companions and the looks a cultivator collects and shapes.' },
  { id: 'systems', label: 'Systems', description: 'Generation, voice, economy, and provenance systems behind the pages.' },
  { id: 'components', label: 'Components', description: 'Reusable visual pieces, primitives, and icons.' },
];

/**
 * Live inventories rendered inline on the Workshop home instead of opening a
 * `?preview=` route. They carry the same section and ownership metadata.
 */
export type WorkshopPanelId = 'library-components' | 'icons';

export type WorkshopPanel = {
  id: WorkshopPanelId;
  title: string;
  description: string;
  section: WorkshopSection;
  owner: WorkshopOwner;
};

export const workshopPanels: WorkshopPanel[] = [
  { id: 'library-components', section: 'components', owner: 'library-ui', title: 'Library Components', description: 'Reusable Celestial Library primitives, rendered live.' },
  { id: 'icons', section: 'components', owner: 'library-ui', title: 'Icons', description: 'Every current custom Celestial Library SVG glyph, rendered live.' },
];

export type WorkshopTrack = 'development' | 'production';

/**
 * A feature's track is intentionally derived from its manually assigned version.
 * Updating source code alone must never move a card between tracks.
 */
export function getWorkshopTrack(version: WorkshopEntry['version']): WorkshopTrack {
  return Number.parseFloat(version.slice(1)) >= 2 ? 'production' : 'development';
}

/** Keep milestone labels deliberate while leaving all other versions literal. */
export function getWorkshopVersionLabel(version: WorkshopEntry['version']) {
  if (version === 'v1.0') return 'v1.0 · Prototype';
  if (version === 'v2.0') return 'v2.0 · Production';
  return version;
}

/**
 * One entry per actual feature — never per version. A feature's Original
 * Reference vs Development split lives inside its own Workshop page
 * (see FeatureWorkspace), not as a second manifest entry or homepage card.
 * Array order is display order inside each section and group.
 */
export const workshopEntries: WorkshopEntry[] = [
  {
    id: 'light-novels-home', section: 'pages', group: 'home', owner: 'library', status: 'active', title: 'Light Novels Home',
    description: 'The existing Light Novels homepage and novel detail, with one mock novel showing manga/game seals and an Explore This World lane. Shared Home, Library, Discover and Profile navigation.',
    category: 'other', version: 'v1.0',
    source: { repository: 'SENSEIDUKES/Light-Novels', path: 'src/components/LibraryScreen.tsx; src/components/StoryDetailScreen.tsx', lastCompared: '2026-09-09' },
  },
  {
    id: 'library-shell',
    section: 'pages',
    group: 'home',
    owner: 'library',
    status: 'active',
    title: 'Library Shell',
    description: 'Main Library header and integrated Story Seed/Cultivator Cave Development workspaces with shared headers and responsive navigation at phone, tablet, and desktop sizes; locked shell captures remain available for comparison. Story Seed source is captured from development: CreationModal, StorySeedHeader, StorySeedSelector, StorySeedMobileNavigation, and StorySeedSettings.',
    category: 'other',
    version: 'v1.0',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/components/GlobalHeader.tsx; src/components/DaoInsights.tsx; src/components/LibraryScreen.tsx; src/index.css',
      lastCompared: '2026-09-08',
    },
  },
  {
    id: 'story-seed',
    section: 'pages',
    group: 'create',
    owner: 'library',
    status: 'active',
    title: 'Story Seed',
    description: 'Two-panel creation workspace on the Creator / Story / World contract — compact Origin and ARC editing, Story Seed Settings, the Story Bank home for saved seeds and their World Blueprints (with import/export), and an editable World Blueprint dossier whose hierarchy keeps canonical Origin provenance separate from generated story direction while preserving every editable Blueprint field, now wearing the modern Library glass skin with gold-edged key fields.',
    category: 'other',
    version: 'v1.7',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/components/CreationModal.tsx',
      lastCompared: '2026-08-10',
    },
  },
  {
    id: 'reader-chamber',
    section: 'pages',
    group: 'read',
    owner: 'sen',
    status: 'active',
    title: 'Reader Chamber',
    description: 'The full reading UI with generated five-chapter sessions, chapter-scoped Reader Codex memory, and persisted action-scoped Worldcues resolved through the approved Library catalog.',
    category: 'reader-ui',
    version: 'v1.4',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/components/ReaderChamber.tsx; src/components/ReaderViewport.tsx',
      lastCompared: '2026-08-22',
    },
  },
  {
    id: 'reader-codex',
    section: 'pages',
    group: 'read',
    owner: 'sen',
    status: 'active',
    title: 'Reader Codex',
    description: 'The complete Living Codex sheet with separate Human/Non-Human Portraits, a species Bestiary, Karma, Power Rankings, Artifacts, Fate, and Lore, wired to local Reader story state.',
    category: 'codex-ui',
    version: 'v1.2',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/components/ReaderCodex.tsx; src/components/CodexSheetOverlay.tsx',
      lastCompared: '2026-08-13',
    },
  },
  {
    id: 'user-profile',
    section: 'pages',
    group: 'account',
    owner: 'library',
    status: 'active',
    title: 'User Profile',
    description: "The cultivator's profile. The locked reference is the production Celestial Tools page; Development is the Cultivator Cave redesign — a portrait, identity, a rank coloured by DAO XP alone, and spendable QI over a stock Immortal Land backdrop, destinations for Stories, Rewards (achievements, Mystery Scrolls and Fate Survival Relics), the Dao Pillar and the Familiar (training and its elemental title), the Energy, QI & DAO XP page, a cinematic Spirit Link authentication flow, and one gear-triggered Settings panel. Balances and rewards run on an in-browser copy of the development economy seeded per scenario; profile edits run against local mock adapters.",
    category: 'other',
    version: 'v1.2',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/components/UserProfile.tsx; src/components/UserProfileAdminPanel.tsx; src/components/UserProfileInventoryPanel.tsx; src/components/UserProfilePortraitModal.tsx; src/components/UserProfileSettingsPanel.tsx; src/components/UserProfileStoriesPanel.tsx; src/hooks/useUserProfile.ts',
      lastCompared: '2026-09-08',
    },
  },
  {
    id: 'dao-pillar',
    section: 'rewards',
    group: 'recurring',
    owner: 'library',
    status: 'active',
    title: 'Daily Dao Pillar',
    description: 'The Cultivator Cave’s 30-day reward calendar: one Library-controlled active theme (Beta Test first) over a five-by-six grid of scheduled days, collected / available today / locked / missed states, milestone days, and a server-validated one-claim-per-day collection that deposits QI through the server ledger. Previewed against an in-process calendar; the User Profile preview and the Reward Loop run it on the development economy.',
    category: 'other',
    version: 'v1.0',
    source: {
      repository: 'SENSEIDUKES/development',
      path: 'src/components/dao-pillar/; src/server/dao-pillar/; src/server/qi/',
      lastCompared: '2026-09-18',
    },
  },
  {
    id: 'celestial-store',
    section: 'pages',
    group: 'commerce',
    owner: 'library',
    status: 'active',
    title: 'Celestial Store',
    description: 'The official Store extracted out of the profile into its own Cave destination: live QI and Energy balances over two framed shelves of daily Familiar offers — two Energy, four QI — with catalogue ranks, owned/equipped states, and a focused detail dialog for buying and equipping. Familiars only; the creator User Store on public profiles is a separate, untouched surface.',
    category: 'other',
    version: 'v1.0',
    source: {
      repository: 'SENSEIDUKES/development',
      path: 'src/components/celestial-store/; src/host/familiar/catalogue.ts',
      lastCompared: '2026-09-22',
    },
  },
  {
    id: 'reward-loop', section: 'rewards', group: 'reward-overview', owner: 'workshop', status: 'active', title: 'Reward Loop',
    description: 'The whole reward system on one live development economy: read, create and explore to earn achievements, open Mystery Scrolls, watch DAO XP recolour the cultivator’s rank, spend QI training a Familiar until its elemental title letters the name, survive a Fate Survival challenge for a Relic, collect the Dao Pillar, and buy from the Celestial Store — every balance moved by real server code.',
    category: 'rewards', version: 'v1.0',
    source: { repository: 'SENSEIDUKES/development', path: 'src/workshop/previews/rewards/; src/server/economy/developmentRuntime.ts', lastCompared: '2026-09-23' },
  },
  {
    id: 'achievements', section: 'rewards', group: 'earning', owner: 'library', status: 'active', title: 'Achievements & Mystery Scrolls',
    description: 'Library-defined goals over natural reading, creation and exploration (other media planned), each earning one Mystery Scroll: most conceal their reward until opened, curated milestones show it upfront. A scroll unseals through the celestial scroll vessel into the Relic Reveal’s rarity card, and only the server decides what it holds.',
    category: 'rewards', version: 'v1.0',
    source: { repository: 'SENSEIDUKES/development', path: 'src/components/rewards/; src/server/achievements/', lastCompared: '2026-09-23' },
  },
  {
    id: 'familiar-training', section: 'rewards', group: 'spending', owner: 'library', status: 'active', title: 'Familiar Bonds',
    description: 'Familiar rarity says how rare a Familiar is; Bond Rank says how far you have cultivated it with QI, so an Epic familiar can reach a Legendary bond. Common, Rare and Epic bond letter your name in the Active Familiar’s element, growing stronger; Legendary bond masters the element for good, to wear with any Familiar. Signatures are SEIHouse-written pieces for one Familiar. Nothing grants an advantage.',
    category: 'rewards', version: 'v1.1',
    source: { repository: 'SENSEIDUKES/development', path: 'src/components/familiar-training/; src/server/familiars/', lastCompared: '2026-09-23' },
  },
  {
    id: 'familiar', section: 'customization', owner: 'library', status: 'active', title: 'Familiar',
    description: 'Inspect eleven supplied Familiar atlases, ranks, and hosted heroes through the reusable sprite renderer and live Energy interaction.',
    category: 'animations', version: 'v1.0',
    source: { repository: 'Supplied Familiar packages', path: 'Familiars/Packages/', lastCompared: '2026-09-22' },
  },
  {
    id: 'relics-gallery',
    section: 'rewards',
    group: 'earning',
    owner: 'library',
    status: 'active',
    title: 'Fate Survival Relics',
    description: 'Lightweight Relics earned only in Fate Survival challenges — one per challenge, granting DAO XP and Energy by rarity — with the full-screen Relic Reveal at every rarity. The Fate Survival judge is not built yet; a development simulator stands in for its outcome.',
    category: 'rewards',
    version: 'v1.4',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/components/UserProfileInventoryPanel.tsx',
      lastCompared: '2026-07-29',
    },
  },
  {
    id: 'idle-cultivation',
    section: 'rewards',
    group: 'recurring',
    owner: 'library',
    status: 'active',
    title: 'Closed-Door Cultivation',
    description: 'Idle Qi reward presentation and absorption animation. Kept as it is: its future mechanic is undecided.',
    category: 'rewards',
    version: 'v1.7',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/components/ClosedDoorCultivationModal.tsx',
      lastCompared: '2026-07-29',
    },
  },
  {
    id: 'harness-generation',
    section: 'systems',
    owner: 'sen',
    status: 'active',
    title: 'Harness Generation',
    description: 'Standalone checkpoint-first novel core: a premise-first Story Foundation, one model call per chapter, independent IndexedDB persistence, tolerant prose acceptance, semantic-event ledger, and Chapter 1 → Chapter 2 continuity without Reader or legacy generation dependencies.',
    category: 'other',
    version: 'v1.0',
    source: {
      repository: 'SENSEIDUKES/development',
      path: 'src/components/harness-generation/',
      lastCompared: '2026-08-29',
    },
  },
  {
    id: 'chapter-generation-manifestation',
    section: 'systems',
    owner: 'library',
    status: 'active',
    title: 'Chapter Generation Manifestation',
    description: 'Aura Veil state simulator with two workshop areas — the full-shell Aura Veil (narrative and media manifestation modes, driven by one task-card format) and a focused standalone Manifestation Reveal preview for the agnostic sealed → unsealing → revealed mechanic and its current celestial scroll vessel.',
    category: 'animations',
    version: 'v1.6',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/components/AILoadingVeil.tsx',
      lastCompared: '2026-07-29',
    },
  },
  {
    id: 'character-voice',
    section: 'systems',
    owner: 'sen',
    status: 'active',
    title: 'Character Voice',
    description: 'The Reader Codex signature-quote voice on a named Character Portrait card: a tap calls ElevenLabs through the server and plays the returned audio immediately. Nothing is stored — every tap calls ElevenLabs again.',
    category: 'codex-ui',
    version: 'v1.0',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/components/ReaderCodex.tsx',
      lastCompared: '2026-08-13',
    },
  },
  {
    id: 'provenance',
    section: 'systems',
    owner: 'deferred',
    status: 'active',
    title: 'Provenance',
    description: 'Reusable provenance marks, records, evidence contracts, and future connection maps for AI-generated assets.',
    category: 'other',
    version: 'v1.0',
    source: {
      repository: 'SENSEIDUKES/development',
      path: 'src/components/provenance/; src/workshop/ProvenanceTab.tsx',
      lastCompared: '2026-09-23',
    },
  },
  {
    id: 'energy',
    section: 'systems',
    owner: 'library',
    status: 'active',
    title: 'Energy',
    description: 'The shared, server-owned Energy meter behind SEN generation: balance indicator, action-cost indicator, deduction notice, insufficient-Energy state, and the Energy, QI & DAO XP page the profile opens. The current price schedule is shared with Store offers; no generation flow charges Energy yet.',
    category: 'other',
    version: 'v1.0',
    source: {
      repository: 'SENSEIDUKES/development',
      path: 'src/components/energy/; src/server/energy/',
      lastCompared: '2026-09-18',
    },
  },
  {
    id: 'model-router',
    section: 'systems',
    owner: 'deferred',
    status: 'archived',
    archiveNote: 'Moved to the Model Router gear in the Workshop header and on every preview.',
    title: 'Model Router',
    description: 'Universal router for every generation model, separated by capability: Chapters (Gemini and OpenRouter), Images, and TTS (ElevenLabs). Shows which providers have keys, which models are ready, and each default.',
    category: 'other',
    version: 'v1.0',
    source: {
      repository: 'SENSEIDUKES/development',
      path: 'src/server/model-router/',
      lastCompared: '2026-09-23',
    },
  },
  {
    id: 'motion-picture', section: 'components', owner: 'sen', status: 'active', title: 'Motion Picture',
    description: 'A still that turns into its own motion clip on demand, with an aura sampled from the artwork, for any item that has a picture and a clip: story cards, Familiars, relics. Includes a clip source panel for testing real footage, and compares against the production cover toggle it replaces.',
    category: 'animations', version: 'v1.0',
    source: { repository: 'SENSEIDUKES/Light-Novels', path: 'src/components/StoryDetailScreen.tsx', lastCompared: '2026-09-22' },
  },
  {
    id: 'celestial-backdrop',
    section: 'components',
    owner: 'library-ui',
    status: 'active',
    title: 'Celestial Particle Backdrop',
    description: 'Color-adaptive celestial particle field with a hidden scroll absorption point.',
    category: 'backgrounds',
    version: 'v1.5',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/components/ParticleEffect.tsx',
      lastCompared: '2026-07-29',
    },
  },
  {
    id: 'card-workshop',
    section: 'components',
    owner: 'workshop',
    status: 'active',
    title: 'Card Workshop',
    description: 'Development-only Card Type Tabs and contextual ReaderViewport preview for inspecting Codex Cards, compact or expanded System Panels, Fate results, and independent action-scoped Worldcue annotations without generating a chapter.',
    category: 'reader-ui',
    version: 'v1.5',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/components/SystemBlock.tsx; src/components/FateResultCard.tsx; src/components/ReaderViewport.tsx',
      lastCompared: '2026-08-22',
    },
  },
  {
    id: 'chapter-generation-flow',
    section: 'systems',
    owner: 'workshop',
    status: 'archived',
    replacedBy: 'harness-generation',
    archiveNote: 'The earlier chapter-generation diagnostics flow, kept intact for reference.',
    title: 'Chapter Generation',
    description: 'Development-only one- or five-chapter manifestation harness with sequential server-side Gemini calls, disposable processed-state handoffs, retry checkpoints, token usage, per-chapter Diagnostics, and a completed-batch Reader Chamber handoff.',
    category: 'other',
    version: 'v2.2',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/hooks/chapterPipeline/chapterBatch.ts; src/aiRouter.ts; src/server/routes/storyRouter.ts',
      lastCompared: '2026-08-09',
    },
  },
];
