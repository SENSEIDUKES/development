import { useState, type ComponentType } from 'react';
import {
  Feather,
  Globe,
  Layers,
  List,
  Scroll,
  Settings,
  Sparkles,
  User,
} from 'lucide-react';
import {
  LibraryBottomNavigation,
  LibraryButton,
  LibraryCard,
  LibraryDragonCycleIcon,
  LibraryHeaderBadge,
  LibraryNavigationDrawer,
  LibraryNavigationDrawerPanel,
  LibraryPanel,
  LibraryTextArea,
  LibraryTextBox,
  ManifestButton,
  type LibraryNavigationDrawerSection,
} from '../components/library';

/**
 * LibraryComponents — the home page's Library Components tab.
 *
 * A live inventory of the reusable Celestial Library primitives owned by
 * `src/components/library/` (see its README for the ownership contract).
 * Every card below renders the real component imported from the shared
 * barrel — no replicas, no screenshots — so the tab always shows what
 * actually exists today. When a primitive is added to or renamed in the
 * barrel, update this one list; there is no second source of truth.
 *
 * The structural and visual foundation is the Development tab: the same
 * `workshop-grid` of `workshop-card`s, with the placeholder SVG visual
 * swapped for a dark `library-preview-stage` (the glass skin is drawn for
 * the void page, so it can only be judged on a dark backdrop).
 * `SEIButton`, `SEIBottomNavigation`, and `cn` are intentionally not
 * inventoried — they are base layers for building new Library-skinned
 * controls, never page-level imports.
 */

function PanelPreview() {
  return (
    <LibraryPanel className="w-full max-w-xs">
      <p className="font-sc text-xs font-bold uppercase tracking-[0.2em] text-gold-accent/90">
        Section container
      </p>
      <p className="mt-2 text-sm leading-relaxed text-neutral-400">
        Every Library surface shells its content in this glass panel.
      </p>
      <LibraryPanel variant="callout" padding="sm" className="mt-4">
        <p className="text-xs leading-relaxed text-neutral-400">
          The callout variant — quiet gold inset glass for guidance and notices.
        </p>
      </LibraryPanel>
    </LibraryPanel>
  );
}

function CardPreview() {
  return (
    <LibraryCard
      className="w-full max-w-xs"
      accentColor="#F59E0B"
      eyebrow="Legendary relic"
      title="Compass of Returning Stars"
      description="A relic that remembers every road home."
      metadata="+120 Qi"
      footer="First claim reward"
      elevateOnHover
    />
  );
}

function ButtonPreview() {
  return (
    <div className="flex w-full max-w-xs flex-col items-stretch gap-2.5">
      <LibraryButton variant="primary" icon={Sparkles}>
        Forge
      </LibraryButton>
      <div className="flex flex-wrap gap-2.5">
        <LibraryButton variant="secondary" className="flex-1">
          Save Draft
        </LibraryButton>
        <LibraryButton variant="ghost">Skip</LibraryButton>
        <LibraryButton variant="danger">Delete</LibraryButton>
      </div>
    </div>
  );
}

function ManifestPreview() {
  const [busy, setBusy] = useState(false);
  return (
    <ManifestButton
      loading={busy}
      onClick={() => {
        if (busy) return;
        setBusy(true);
        window.setTimeout(() => setBusy(false), 1400);
      }}
    >
      Manifest World Blueprint
    </ManifestButton>
  );
}

function TextBoxPreview() {
  const [value, setValue] = useState('');
  return (
    <div className="w-full max-w-xs">
      <LibraryTextBox
        label="Story title"
        required
        icon={Feather}
        helpText="The name readers see across the Library."
        placeholder="Chronicle of the Ninth Peak"
        value={value}
        onChange={setValue}
      />
    </div>
  );
}

function TextAreaPreview() {
  const [value, setValue] = useState('');
  return (
    <div className="w-full max-w-xs">
      <LibraryTextArea
        label="Origin premise"
        helpText="One or two sentences the world grows from."
        maxLength={160}
        rows={3}
        placeholder="A courier inherits a map that redraws itself every dawn…"
        value={value}
        onChange={setValue}
      />
    </div>
  );
}

function HeaderBadgePreview() {
  return (
    <LibraryHeaderBadge
      title="Story Seed"
      subtitle="Grow Your Universe"
      emblemSrc="/favicon.jpg"
      emblemAlt="Celestial Library emblem"
    />
  );
}

function NavigationDrawerPreview() {
  const [active, setActive] = useState('origin');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sections: LibraryNavigationDrawerSection[] = [
    {
      id: 'story',
      label: 'Story',
      tagline: 'The seed and its direction',
      items: [
        { id: 'origin', label: 'Origin', icon: <Feather size={15} />, active: active === 'origin', onSelect: setActive },
        { id: 'arc', label: 'ARC', icon: <Scroll size={15} />, accent: 'portal', active: active === 'arc', onSelect: setActive },
      ],
    },
    {
      id: 'world',
      label: 'World',
      items: [
        { id: 'geography', label: 'Geography', icon: <Globe size={15} />, active: active === 'geography', onSelect: setActive },
        { id: 'power', label: 'Power System', icon: <Layers size={15} />, active: active === 'power', onSelect: setActive },
      ],
    },
  ];
  return (
    <>
      {/* The content half, rendered standalone the way a desktop sidebar
          uses it. */}
      <div className="h-[22rem] w-full max-w-[15rem] overflow-hidden rounded-2xl border border-white/10 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)]">
        <LibraryNavigationDrawerPanel aria-label="Story Seed sections preview" sections={sections} />
      </div>
      <LibraryButton variant="secondary" size="sm" icon={List} onClick={() => setDrawerOpen(true)}>
        Open Drawer
      </LibraryButton>
      {/* The full drawer with its scrim, Escape handling, and scroll lock.
          mobileOnly={false} so the preview opens on desktop too. */}
      <LibraryNavigationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mobileOnly={false}
        aria-label="Story Seed sections drawer preview"
        sections={sections}
      />
    </>
  );
}

function BottomNavigationPreview() {
  const [active, setActive] = useState('sections');
  return (
    <div className="w-full">
      <LibraryBottomNavigation
        aria-label="Library page navigation preview"
        items={[
          { id: 'sections', label: 'Sections', icon: <List size={20} />, active: active === 'sections', onSelect: setActive },
          { id: 'settings', label: 'Settings', icon: <Settings size={20} />, active: active === 'settings', onSelect: setActive },
          { id: 'profile', label: 'Profile', icon: <User size={20} />, active: active === 'profile', onSelect: setActive },
        ]}
      />
    </div>
  );
}

function DragonCycleIconPreview() {
  const [cycleIndex, setCycleIndex] = useState(0);
  const examples = ['Cycle Premise', 'Reshuffle Fate', 'Reroll Destiny', 'Renew Insight'];

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-end gap-6">
        <LibraryDragonCycleIcon size={16} className="text-neutral-400" title="Small dragon cycle icon" />
        <LibraryDragonCycleIcon size={24} className="text-portal" title="Medium portal dragon cycle icon" />
        <LibraryDragonCycleIcon size={40} className="text-gold-accent" title="Large gold dragon cycle icon" />
      </div>
      <LibraryButton
        variant="secondary"
        size="sm"
        onClick={() => setCycleIndex(i => (i + 1) % examples.length)}
        iconLeft={<LibraryDragonCycleIcon size={13} />}
      >
        {examples[cycleIndex]}
      </LibraryButton>
    </div>
  );
}

type LibraryComponentEntry = {
  /** The exact export name in the `src/components/library` barrel. */
  name: string;
  /** One line on what the primitive is for, so reuse starts from the right component. */
  description: string;
  /** Live render of the real component. */
  Preview: ComponentType;
  /** Optional stage modifier (e.g. bottom-anchored previews). */
  stageClassName?: string;
};

const LIBRARY_COMPONENTS: LibraryComponentEntry[] = [
  {
    name: 'LibraryPanel',
    description: 'The official Library glass panel — the section container every Library surface shells its content in.',
    Preview: PanelPreview,
  },
  {
    name: 'LibraryCard',
    description: 'The official Library card — the composable item primitive (media, header, body, metadata, actions, footer) that future Library cards build on.',
    Preview: CardPreview,
  },
  {
    name: 'LibraryButton',
    description: 'The official button for every Library surface — primary, secondary, ghost, and danger variants with icon and loading behavior.',
    Preview: ButtonPreview,
  },
  {
    name: 'ManifestButton',
    description: 'The universal creation action — every primary "Manifest …" generation button, with the spectral rainbow halo. Press to see the busy state.',
    Preview: ManifestPreview,
  },
  {
    name: 'LibraryTextBox',
    description: 'The official single-line glass field — label, help text, errors, icon slots, and touch-friendly sizes.',
    Preview: TextBoxPreview,
  },
  {
    name: 'LibraryTextArea',
    description: 'The official multi-line glass field — the same contract as LibraryTextBox, with a live character counter.',
    Preview: TextAreaPreview,
  },
  {
    name: 'LibraryHeaderBadge',
    description: 'The reusable Library identity header — optional linked emblem, luminous title, and shimmering subtitle.',
    Preview: HeaderBadgePreview,
  },
  {
    name: 'LibraryNavigationDrawer',
    description: 'The navigation menu shell — a slide-in drawer over a scrim (open it with the button); the standalone panel shown here doubles as a desktop sidebar.',
    Preview: NavigationDrawerPreview,
  },
  {
    name: 'LibraryBottomNavigation',
    description: 'The official mobile bottom navigation — a soft floating glass dock of icon and label tabs.',
    Preview: BottomNavigationPreview,
    stageClassName: 'library-preview-stage-end',
  },
  {
    name: 'LibraryDragonCycleIcon',
    description: 'The shared cycle glyph (Re-do / Re-try / shuffle) — a dragon chasing its own tail, tinting like the Lucide icons it sits beside.',
    Preview: DragonCycleIconPreview,
  },
];

export function LibraryComponentsGrid() {
  return (
    <>
      <section id="workshop-component-grid" className="workshop-grid" aria-label="Library components">
        {LIBRARY_COMPONENTS.map(({ name, description, stageClassName, Preview }) => (
          <article className="workshop-card workshop-card-library" key={name}>
            <div className={`workshop-card-visual library-preview-stage${stageClassName ? ` ${stageClassName}` : ''}`}>
              <Preview />
            </div>
            <div className="workshop-card-body">
              <h2>{name}</h2>
              <p>{description}</p>
              <div className="workshop-card-meta">
                <span className="workshop-status workshop-status-library">
                  <span className="workshop-status-dot" aria-hidden="true" />
                  Library primitive
                </span>
              </div>
            </div>
          </article>
        ))}
      </section>
      <p className="workshop-library-note">
        Every preview above renders the real component from <code>src/components/library</code> — import from
        that barrel instead of rebuilding. <code>SEIButton</code>, <code>SEIBottomNavigation</code>, and{' '}
        <code>cn</code> are exported only as bases for building new Library-skinned controls.
      </p>
    </>
  );
}
