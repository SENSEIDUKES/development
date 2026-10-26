import { useState, type ComponentType } from 'react';
import {
  Feather,
  Globe,
  List,
  Sparkles,
} from 'lucide-react';
import {
  CelestialChannel,
  CelestialScrollVessel,
  LibraryArcIcon as SENArcIcon,
  LibraryBottomNavigation,
  LibraryButton,
  LibraryCard,
  LibraryCaveBackdrop,
  LibraryDragonCycleIcon,
  LibraryHeaderBadge,
  LibraryIcon,
  LibraryManifestingIcon as SENManifestingIcon,
  LibraryNavigationDrawer,
  LibraryNavigationDrawerPanel,
  LibraryPanel,
  LibraryPowerSystemIcon as SENPowerSystemIcon,
  LibraryProfileIcon as SENProfileIcon,
  LibraryScrubber,
  LibrarySettingsIcon as SENSettingsIcon,
  LibrarySoundGlyph,
  LibraryTextArea,
  LibraryTextBox,
  ManifestationChamber,
  ManifestButton,
  ParticleEffect,
  SwordCultivatorClash,
  type LibraryNavigationDrawerSection,
  type LibraryScrollPhase,
} from '@seihouse/library-ui';

/** Live Library UI families from UI's workbench catalog, using the installed
 * canonical package. Workshop fixtures and interactions stay here; domain
 * behavior, persistence and media generation are deliberately absent. */

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
      icon={SENManifestingIcon}
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
        { id: 'arc', label: 'ARC', icon: <SENArcIcon size={15} />, accent: 'portal', active: active === 'arc', onSelect: setActive },
      ],
    },
    {
      id: 'world',
      label: 'World',
      items: [
        { id: 'geography', label: 'Geography', icon: <Globe size={15} />, active: active === 'geography', onSelect: setActive },
        { id: 'power', label: 'Power System', icon: <SENPowerSystemIcon size={15} />, active: active === 'power', onSelect: setActive },
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
          { id: 'settings', label: 'Settings', icon: <SENSettingsIcon size={20} />, active: active === 'settings', onSelect: setActive },
          { id: 'profile', label: 'Profile', icon: <SENProfileIcon size={20} />, active: active === 'profile', onSelect: setActive },
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

function SoundGlyphPreview() {
  return (
    <div className="flex flex-col gap-3 font-serif text-sm leading-relaxed text-neutral-200">
      <span>
        Quiet annotation
        <LibrarySoundGlyph
          size={16}
          decorative={false}
          title="Library sound cue"
          className="ml-[0.08em] inline h-[0.76em] w-[0.76em] -translate-y-[0.22em] text-neutral-500"
        />
      </span>
      <span>
        Playing annotation
        <LibrarySoundGlyph
          size={16}
          decorative={false}
          title="Active Library sound cue"
          className="ml-[0.08em] inline h-[0.76em] w-[0.76em] -translate-y-[0.22em] text-portal [filter:drop-shadow(0_0_0.32em_rgba(124,92,255,0.45))]"
        />
      </span>
    </div>
  );
}

function ScrubberPreview() {
  const [progress, setProgress] = useState(45);
  return (
    <div className="w-full min-w-0 space-y-4">
      <label className="block text-xs text-neutral-400">
        Journey progress: {progress}%
        <input className="mt-2 block w-full" type="range" min="0" max="100" value={progress}
          onChange={event => setProgress(Number(event.target.value))} />
      </label>
      {(['cultivator', 'sword-rider', 'spirit-beast'] as const).map((travelerId, index) => (
        <LibraryScrubber key={travelerId} progress={progress / 100} travelerId={travelerId}
          trailStyle={['qi-glow', 'starlight-trail', 'scroll-trail'][index]}
          status={{ title: travelerId, state: progress === 100 ? 'Arrived' : 'Manifesting' }} />
      ))}
      <LibraryScrubber progress={null} status={{ title: 'Unknown progress', state: 'Weaving' }} />
    </div>
  );
}

function IconPreview() {
  return (
    <div className="flex flex-wrap justify-center gap-5 text-gold-accent">
      {(['header-profile', 'header-settings', 'navigation-home', 'navigation-energy', 'story-characters'] as const).map(name => (
        <LibraryIcon key={name} name={name} size={32} role="img" aria-hidden={false} aria-label={name} />
      ))}
    </div>
  );
}

function CaveBackdropPreview() {
  return (
    <div className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-xl bg-neutral-950">
      <LibraryCaveBackdrop src="/manifest-backdrops/immortal-land-1.jpg" />
      <p className="relative z-10 text-sm text-neutral-200">Host-selected Cave artwork</p>
    </div>
  );
}

function ManifestationPreview() {
  const [phase, setPhase] = useState<LibraryScrollPhase>('sealed');
  return (
    <div className="w-full min-w-0 space-y-3">
      <LibraryButton size="sm" variant="secondary" onClick={() => setPhase(
        phase === 'sealed' ? 'unsealing' : phase === 'unsealing' ? 'revealed' : 'sealed'
      )}>Next visual phase</LibraryButton>
      <p role="status" className="text-xs text-neutral-400">{phase}</p>
      <div aria-hidden="true">
        <CelestialScrollVessel state={phase} placeholderLabel="Preview artwork" />
        <div className="grid grid-cols-2">
          <div className="relative flex h-36 items-center justify-center" style={{ containerType: 'size' }}>
            <ManifestationChamber isVersa scene={<SwordCultivatorClash />} />
          </div>
          <div className="relative flex h-36 items-center justify-center" style={{ containerType: 'size' }}>
            <ManifestationChamber isVersa={false} scene={<CelestialChannel />} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ParticlePreview() {
  return (
    <div className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-xl bg-black">
      <ParticleEffect accent="#d4af37" />
      <p className="relative z-10 text-sm text-neutral-200" data-celestial-foreground>Celestial particles</p>
    </div>
  );
}

type LibraryComponentEntry = {
  /** Family name from the canonical UI workbench catalog. */
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
  {
    name: 'LibrarySoundGlyph',
    description: 'The custom Library sound mark — a footnote-scale prose annotation with quiet resonance rings, never a platform emoji or full-size control.',
    Preview: SoundGlyphPreview,
  },
  {
    name: 'LibraryScrubber',
    description: 'Journey progress with three traveler skins, milestone trails and an indeterminate state. Move the slider to preview arrival.',
    Preview: ScrubberPreview,
  },
  {
    name: 'LibraryIcon',
    description: 'Named Library icon assets rendered through one accessible component. The Icons workspace contains the full inventory.',
    Preview: IconPreview,
  },
  {
    name: 'LibraryCaveBackdrop',
    description: 'Decorative Cave atmosphere over host-selected artwork. Artwork selection and persistence belong to the host.',
    Preview: CaveBackdropPreview,
  },
  {
    name: 'LibraryManifestation',
    description: 'The manifestation family: CelestialScrollVessel, ManifestationChamber, SwordCultivatorClash and CelestialChannel. Cycle the local visual phases without generating media.',
    Preview: ManifestationPreview,
  },
  {
    name: 'ParticleEffect',
    description: 'Celestial ambient particles with foreground calm zones and reduced-motion support.',
    Preview: ParticlePreview,
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
        All 16 Library UI families render the real components from <code>@seihouse/library-ui</code>.
        Controls use isolated preview state; they do not save data or call generation services.
        Compound parts and artwork registries are grouped with their parent family. Universal primitives
        belong to <code>@seihouse/ui</code>; the full icon inventory lives in the Icons workspace.
      </p>
    </>
  );
}
