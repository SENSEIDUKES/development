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

export type WorkshopEntry = {
  id: string;
  title: string;
  description: string;
  category: WorkshopCategory;
  /** Manually maintained Workshop release version. Never inferred from source changes. */
  version: `v${number}.${number}`;
  source: WorkshopSource;
};

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
 */
export const workshopEntries: WorkshopEntry[] = [
  {
    id: 'celestial-backdrop',
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
    id: 'chapter-generation-flow',
    title: 'Chapter Generation',
    description: 'Development-only one- or five-chapter manifestation harness with sequential server-side Gemini calls, disposable processed-state handoffs, retry checkpoints, token usage, per-chapter Diagnostics, and a completed-batch Reader Chamber handoff.',
    category: 'other',
    version: 'v2.1',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/hooks/chapterPipeline/chapterBatch.ts; src/aiRouter.ts; src/server/routes/storyRouter.ts',
      lastCompared: '2026-08-09',
    },
  },
  {
    id: 'chapter-generation-manifestation',
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
    id: 'idle-cultivation',
    title: 'Closed-Door Cultivation',
    description: 'Idle Qi reward presentation and absorption animation.',
    category: 'rewards',
    version: 'v1.7',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/components/ClosedDoorCultivationModal.tsx',
      lastCompared: '2026-07-29',
    },
  },
  {
    id: 'relics-gallery',
    title: 'Relics Gallery',
    description: 'Cosmic Artifact cards separated by rarity rank, with the full-screen Relic Reveal celebration flow.',
    category: 'rewards',
    version: 'v1.3',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/components/UserProfileInventoryPanel.tsx',
      lastCompared: '2026-07-29',
    },
  },
  {
    id: 'story-seed',
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
    id: 'reader-codex',
    title: 'Reader Codex',
    description: 'The complete Living Codex sheet with separate Human/Non-Human Portraits, a species Bestiary, Karma, Power Rankings, Artifacts, Fate, and Lore, wired to local Reader story state.',
    category: 'codex-ui',
    version: 'v1.0',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/components/ReaderCodex.tsx; src/components/CodexSheetOverlay.tsx',
      lastCompared: '2026-08-13',
    },
  },
  {
    id: 'reader-chamber',
    title: 'Reader Chamber',
    description: 'The full reading UI with generated five-chapter sessions, chapter-scoped Reader Codex memory, and persisted action-scoped Worldcues resolved through the approved Library catalog.',
    category: 'reader-ui',
    version: 'v1.3',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/components/ReaderChamber.tsx; src/components/ReaderViewport.tsx',
      lastCompared: '2026-08-19',
    },
  },
  {
    id: 'card-workshop',
    title: 'Card Workshop',
    description: 'Development-only Card Type Tabs and contextual ReaderViewport preview for inspecting Codex Cards, System Panels, Fate results, and independent action-scoped Worldcue annotations without generating a chapter.',
    category: 'reader-ui',
    version: 'v1.2',
    source: {
      repository: 'SENSEIDUKES/Light-Novels',
      path: 'src/components/SystemBlock.tsx; src/components/FateResultCard.tsx; src/components/ReaderViewport.tsx',
      lastCompared: '2026-08-19',
    },
  },
];
