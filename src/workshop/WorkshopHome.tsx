import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { ArrowUpRight, BookOpen, ChevronLeft, ChevronRight, Compass, Layers, Sparkles, Wrench, Award } from 'lucide-react';
import {
  getWorkshopTrack,
  getWorkshopVersionLabel,
  WORKSHOP_OWNER_LABELS,
  WORKSHOP_SECTIONS,
  workshopEntries,
  type WorkshopEntry,
  type WorkshopGroup,
  type WorkshopOwner,
  type WorkshopSection,
} from './manifest';
import { defaultFamiliar } from '../host/familiar/catalogue';
import { ModelRouterGear } from '../host/model-router/ModelRouterSettings';

const activeEntries = workshopEntries.filter((entry) => entry.status !== 'archived');
const archivedEntries = workshopEntries.filter((entry) => entry.status === 'archived');
const SWIPE_DISTANCE = 44;

const SECTION_ICONS: Record<WorkshopSection, typeof Layers> = {
  pages: Compass,
  rewards: Award,
  customization: Sparkles,
  systems: Wrench,
  components: Layers,
};

function CelestialVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Celestial particle backdrop preview" preserveAspectRatio="xMidYMid slice">
      <circle cx="205" cy="105" r="72" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.45" />
      <path d="M-10 150 C 70 80, 140 190, 210 120 S 330 70, 420 130" fill="none" stroke="#7dd3ff" strokeWidth="1.2" opacity="0.7" />
      <path d="M-10 165 C 70 95, 140 205, 210 135 S 330 85, 420 145" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.45" />
      <path d="M-10 135 C 70 65, 140 175, 210 105 S 330 55, 420 115" fill="none" stroke="#7dd3ff" strokeWidth="1" opacity="0.35" />
      <circle cx="120" cy="98" r="2" fill="#f4d58d" />
      <circle cx="268" cy="70" r="2" fill="#7dd3ff" />
      <circle cx="310" cy="150" r="1.6" fill="#f4d58d" opacity="0.7" />
    </svg>
  );
}

function ManifestationVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Chapter generation manifestation preview" preserveAspectRatio="xMidYMid slice">
      <rect x="74" y="36" width="252" height="164" rx="14" fill="rgba(12, 16, 28, 0.72)" stroke="rgba(212, 175, 55, 0.42)" strokeWidth="1.2" />
      <text x="102" y="114" fontFamily="Georgia, 'Times New Roman', serif" fontSize="42" fill="#e2c46a" opacity="0.85">Aa</text>
      <rect x="164" y="66" width="128" height="9" rx="4.5" fill="rgba(226, 196, 106, 0.45)" />
      <rect x="164" y="88" width="138" height="6" rx="3" fill="rgba(226, 232, 240, 0.25)" />
      <rect x="164" y="102" width="138" height="6" rx="3" fill="rgba(226, 232, 240, 0.2)" />
      <rect x="164" y="116" width="104" height="6" rx="3" fill="rgba(226, 232, 240, 0.16)" />
      <line x1="74" y1="160" x2="326" y2="160" stroke="rgba(212, 175, 55, 0.24)" strokeWidth="1" />
      <circle cx="200" cy="180" r="6" fill="none" stroke="#7dd3ff" strokeWidth="1.5" />
    </svg>
  );
}

function IdleCultivationVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Closed-door cultivation preview" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="cdc-aura" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="#04acff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#04acff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="132" r="88" fill="url(#cdc-aura)" />
      <path d="M200 76 C185 81 175 101 170 121 C165 141 150 156 130 161 C145 171 175 176 200 176 C225 176 255 171 270 161 C250 156 235 141 230 121 C225 101 215 81 200 76 Z" fill="#101a30" stroke="#8ce9ff" strokeWidth="1.8" strokeOpacity="0.65" />
      <circle cx="200" cy="60" r="14" fill="#04060d" stroke="#8ce9ff" strokeWidth="1.8" strokeOpacity="0.65" />
      <ellipse cx="200" cy="176" rx="92" ry="10" fill="none" stroke="#04acff" strokeWidth="1.5" strokeOpacity="0.4" />
    </svg>
  );
}

function RelicsGalleryVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Fate Survival Relics preview" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="relic-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <rect x="140" y="54" width="120" height="120" rx="16" fill="url(#relic-grad)" stroke="#ec4899" strokeWidth="1.2" strokeOpacity="0.45" />
      <polygon points="200,74 232,114 200,154 168,114" fill="none" stroke="#f4d58d" strokeWidth="1.6" strokeOpacity="0.7" />
      <circle cx="200" cy="114" r="11" fill="#7dd3ff" fillOpacity="0.55" />
    </svg>
  );
}

function RewardLoopVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Reward loop preview" preserveAspectRatio="xMidYMid slice">
      <circle cx="200" cy="116" r="70" fill="none" stroke="#e2c46a" strokeWidth="1.2" strokeDasharray="4 6" opacity="0.6" />
      {[[200, 46, '#d4af37'], [270, 116, '#7dd3ff'], [200, 186, '#a855f7'], [130, 116, '#10b981']].map(([cx, cy, color]) => (
        <circle key={`${cx}-${cy}`} cx={cx as number} cy={cy as number} r="13" fill="#090d18" stroke={color as string} strokeWidth="2" />
      ))}
      <text x="200" y="122" textAnchor="middle" fontFamily="Georgia, serif" fontSize="20" fill="#f4d58d">道</text>
    </svg>
  );
}

function AchievementsVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Mystery Scroll preview" preserveAspectRatio="xMidYMid slice">
      <rect x="150" y="58" width="100" height="112" rx="8" fill="rgba(14, 19, 32, 0.82)" stroke="#d4af37" strokeWidth="1.4" />
      <rect x="140" y="50" width="120" height="14" rx="7" fill="#172036" stroke="#e2c46a" strokeWidth="1" />
      <rect x="140" y="164" width="120" height="14" rx="7" fill="#172036" stroke="#e2c46a" strokeWidth="1" />
      <circle cx="200" cy="114" r="18" fill="none" stroke="#b3402f" strokeWidth="1.6" />
      <path d="M200 100 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z" fill="#d4af37" opacity="0.9" />
    </svg>
  );
}

function FamiliarTrainingVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Familiar training preview" preserveAspectRatio="xMidYMid slice">
      {[0, 1, 2, 3].map((step) => (
        <rect
          key={step}
          x={118 + step * 44}
          y={166 - step * 26}
          width="32"
          height={20 + step * 26}
          rx="5"
          fill="rgba(12, 18, 32, 0.8)"
          stroke={step === 3 ? '#d4af37' : '#7dd3ff'}
          strokeWidth="1.3"
          strokeOpacity={step === 3 ? 0.95 : 0.45}
        />
      ))}
      <text x="200" y="66" textAnchor="middle" fontFamily="Georgia, serif" fontSize="26" fill="#f4d58d" opacity="0.9">Aa</text>
      <path d="M176 74 q24 -18 48 0" fill="none" stroke="#04acff" strokeWidth="1.4" opacity="0.7" />
    </svg>
  );
}

function DaoPillarVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Daily Dao Pillar preview" preserveAspectRatio="xMidYMid slice">
      {Array.from({ length: 12 }, (_, index) => (
        <rect
          key={index}
          x={110 + (index % 6) * 32}
          y={66 + Math.floor(index / 6) * 44}
          width="24"
          height="32"
          rx="4"
          fill={index < 7 ? 'rgba(226, 196, 106, 0.22)' : 'rgba(12, 18, 32, 0.72)'}
          stroke={index === 7 ? '#d4af37' : 'rgba(125, 211, 255, 0.3)'}
          strokeWidth={index === 7 ? 1.8 : 1}
        />
      ))}
      <text x="200" y="184" textAnchor="middle" fontFamily="Georgia, serif" fontSize="22" fill="#e2c46a">道</text>
    </svg>
  );
}

function CardWorkshopVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Card workshop preview" preserveAspectRatio="xMidYMid slice">
      <rect x="74" y="38" width="116" height="154" rx="10" fill="#050d1a" stroke="#04acff" strokeWidth="1.2" strokeOpacity="0.5" />
      <rect x="210" y="38" width="116" height="154" rx="10" fill="#090c18" stroke="#eab308" strokeWidth="1.2" strokeOpacity="0.5" />
      <circle cx="132" cy="86" r="24" fill="#04acff" fillOpacity="0.18" stroke="#04acff" strokeWidth="1" strokeOpacity="0.4" />
      <rect x="92" y="126" width="80" height="8" rx="4" fill="#04acff" fillOpacity="0.45" />
      <rect x="92" y="142" width="60" height="6" rx="3" fill="#04acff" fillOpacity="0.25" />
      <rect x="225" y="58" width="86" height="10" rx="2" fill="#eab308" fillOpacity="0.35" />
      <line x1="225" y1="88" x2="311" y2="88" stroke="#eab308" strokeWidth="1" strokeOpacity="0.35" />
      <line x1="225" y1="108" x2="311" y2="108" stroke="#eab308" strokeWidth="1" strokeOpacity="0.25" />
      <line x1="225" y1="128" x2="292" y2="128" stroke="#eab308" strokeWidth="1" strokeOpacity="0.25" />
    </svg>
  );
}

function ProvenanceVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Provenance preview" preserveAspectRatio="xMidYMid slice">
      <rect x="124" y="40" width="152" height="148" rx="12" fill="rgba(10, 14, 24, 0.72)" stroke="#e2c46a" strokeWidth="1.2" opacity="0.65" />
      <rect x="148" y="68" width="104" height="8" rx="4" fill="rgba(226, 196, 106, 0.45)" />
      <rect x="148" y="88" width="86" height="6" rx="3" fill="rgba(226, 232, 240, 0.25)" />
      <rect x="148" y="102" width="94" height="6" rx="3" fill="rgba(226, 232, 240, 0.2)" />
      <circle cx="200" cy="146" r="21" fill="none" stroke="#7dd3ff" strokeWidth="1.5" />
      <path d="M190 146 l7 7 l13 -14" fill="none" stroke="#e2c46a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmblemStageVisual({ entry }: { entry: WorkshopEntry }) {
  const accent =
    entry.owner === 'sen'
      ? '#7dd3ff'
      : entry.owner === 'library'
        ? '#e2c46a'
        : entry.owner === 'library-ui'
          ? '#c7a7ec'
          : '#e89a88';
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label={`${entry.title} stage backdrop`} preserveAspectRatio="xMidYMid slice">
      <circle cx="200" cy="112" r="78" fill="none" stroke={accent} strokeWidth="1.1" opacity="0.38" />
      <circle cx="200" cy="112" r="52" fill="none" stroke={accent} strokeWidth="1" strokeDasharray="3 6" opacity="0.52" />
      <path d="M72 112 H132 M268 112 H328" stroke={accent} strokeWidth="1" opacity="0.3" />
      <polygon points="200,52 216,96 260,112 216,128 200,172 184,128 140,112 184,96" fill="none" stroke={accent} strokeWidth="1.2" opacity="0.55" />
      <circle cx="200" cy="112" r="6" fill={accent} opacity="0.85" />
    </svg>
  );
}

function StageVisual({ entry }: { entry: WorkshopEntry }) {
  const { id } = entry;
  if (id === 'familiar') {
    return (
      <img
        src={defaultFamiliar.definition.placeholderUrl}
        alt={`${defaultFamiliar.definition.displayName} Familiar`}
        className="workshop-stage-hero-image"
      />
    );
  }
  if (id === 'card-workshop') return <CardWorkshopVisual />;
  if (id === 'celestial-backdrop') return <CelestialVisual />;
  if (id === 'chapter-generation-manifestation') return <ManifestationVisual />;
  if (id === 'idle-cultivation') return <IdleCultivationVisual />;
  if (id === 'relics-gallery') return <RelicsGalleryVisual />;
  if (id === 'reward-loop') return <RewardLoopVisual />;
  if (id === 'achievements') return <AchievementsVisual />;
  if (id === 'familiar-training') return <FamiliarTrainingVisual />;
  if (id === 'dao-pillar') return <DaoPillarVisual />;
  if (id === 'provenance') return <ProvenanceVisual />;
  return <EmblemStageVisual entry={entry} />;
}

function EdgeOrbit({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      className={`workshop-orbit workshop-orbit-${side}`}
      viewBox="0 0 300 600"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <circle cx="150" cy="300" r="220" fill="none" stroke="#b3402f" strokeWidth="1" opacity="0.18" />
      <circle cx="150" cy="300" r="170" fill="none" stroke="#b3402f" strokeWidth="1" opacity="0.12" />
      <circle cx="150" cy="80" r="2" fill="#b3402f" opacity="0.5" />
      <circle cx="330" cy="240" r="1.6" fill="#b3402f" opacity="0.4" />
      <circle cx="60" cy="430" r="1.8" fill="#b3402f" opacity="0.45" />
      <circle cx="290" cy="500" r="1.4" fill="#b3402f" opacity="0.3" />
    </svg>
  );
}

/** The package lane that owns an item — independent of which Workshop section shows it. */
function OwnerBadge({ owner }: { owner: WorkshopOwner }) {
  return (
    <span className={`workshop-owner workshop-owner-${owner}`}>
      <span className="workshop-visually-hidden">Owned by </span>
      {WORKSHOP_OWNER_LABELS[owner]}
    </span>
  );
}

function titleOf(id: string) {
  return workshopEntries.find((entry) => entry.id === id)?.title ?? id;
}

function EntryRow({
  entry,
  selected,
  onFocusEntry,
}: {
  entry: WorkshopEntry;
  selected?: boolean;
  onFocusEntry?: (id: string) => void;
}) {
  // A retired route leaves a record, not a link.
  const RowTag = entry.routeRetired ? 'div' : 'a';
  return (
    <RowTag
      className="workshop-card"
      data-selected={selected || undefined}
      onMouseEnter={() => onFocusEntry?.(entry.id)}
      onFocus={() => onFocusEntry?.(entry.id)}
      {...(entry.routeRetired ? { 'aria-disabled': true } : { href: `?preview=${entry.id}` })}
    >
      <div className="workshop-card-body">
        <div className="workshop-row-main">
          <h2>{entry.title}</h2>
          {entry.replacedBy && <p className="workshop-card-archive-note">Superseded by {titleOf(entry.replacedBy)}.</p>}
          {entry.archiveNote && <p className="workshop-card-archive-note">{entry.archiveNote}</p>}
        </div>
        <div className="workshop-row-end">
          <div className="workshop-card-tags">
            <OwnerBadge owner={entry.owner} />
            {entry.status !== 'active' && <span className="workshop-lifecycle">{entry.status}</span>}
          </div>
          <div className="workshop-card-meta">
            <span className={`workshop-status workshop-status-${getWorkshopTrack(entry.version)}`}>
              <span className="workshop-status-dot" aria-hidden="true" />
              {getWorkshopVersionLabel(entry.version)}
            </span>
            {!entry.routeRetired && <span className="workshop-card-arrow" aria-hidden="true">→</span>}
          </div>
        </div>
      </div>
    </RowTag>
  );
}

function EntryGrid({
  entries,
  selectedId,
  onFocusEntry,
}: {
  entries: readonly WorkshopEntry[];
  selectedId?: string;
  onFocusEntry?: (id: string) => void;
}) {
  if (!entries.length) return null;
  return (
    <div className="workshop-grid">
      {entries.map((entry) => (
        <EntryRow
          entry={entry}
          key={entry.id}
          selected={entry.id === selectedId}
          onFocusEntry={onFocusEntry}
        />
      ))}
    </div>
  );
}

function SectionContent({
  section,
  activeGroup,
  selectedId,
  onFocusEntry,
}: {
  section: (typeof WORKSHOP_SECTIONS)[number];
  activeGroup: WorkshopGroup | 'all';
  selectedId?: string;
  onFocusEntry: (id: string) => void;
}) {
  const entries = activeEntries.filter((entry) => entry.section === section.id);
  return (
    <>
      {section.groups
        ? section.groups.map((group) => {
          const groupEntries = entries.filter((entry) => entry.group === group.id);
          if (!groupEntries.length) return null;
          const headingId = `workshop-group-${section.id}-${group.id}`;
          const isGroupFilteredOut = activeGroup !== 'all' && activeGroup !== group.id;
          return (
            <section
              className="workshop-group"
              aria-labelledby={headingId}
              key={group.id}
              data-group={group.id}
              data-group-dimmed={isGroupFilteredOut || undefined}
            >
              <h2 className="workshop-group-title" id={headingId}>{group.label}</h2>
              <EntryGrid
                entries={groupEntries}
                selectedId={selectedId}
                onFocusEntry={onFocusEntry}
              />
            </section>
          );
        })
        : (
          <EntryGrid
            entries={entries}
            selectedId={selectedId}
            onFocusEntry={onFocusEntry}
          />
        )}
    </>
  );
}

function readWorkshopTab(): WorkshopSection {
  const params = new URLSearchParams(window.location.search);
  const requestedTab = params.get('tab');
  return WORKSHOP_SECTIONS.find((section) => section.id === requestedTab)?.id ?? 'pages';
}

export function WorkshopHome() {
  const [activeTab, setActiveTab] = useState(readWorkshopTab);
  const [activeGroup, setActiveGroup] = useState<WorkshopGroup | 'all'>('all');
  const [panelMode, setPanelMode] = useState<'stage' | 'index'>('stage');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const navRef = useRef<HTMLDivElement | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const restoreLocation = () => {
      setActiveTab(readWorkshopTab());
      setActiveGroup('all');
      setSelectedEntryId(null);
    };
    window.addEventListener('popstate', restoreLocation);
    return () => window.removeEventListener('popstate', restoreLocation);
  }, []);

  const currentSection = WORKSHOP_SECTIONS.find((section) => section.id === activeTab) ?? WORKSHOP_SECTIONS[0];
  const sectionEntries = activeEntries.filter((entry) => entry.section === currentSection.id);
  const stageEntries =
    currentSection.groups && activeGroup !== 'all'
      ? sectionEntries.filter((entry) => entry.group === activeGroup)
      : sectionEntries;
  const activeStageIndex = Math.max(
    0,
    selectedEntryId ? stageEntries.findIndex((entry) => entry.id === selectedEntryId) : 0,
  );
  const currentEntry = stageEntries[activeStageIndex] ?? stageEntries[0] ?? sectionEntries[0];
  const currentGroupLabel =
    currentEntry?.group && currentSection.groups
      ? currentSection.groups.find((group) => group.id === currentEntry.group)?.label
      : null;

  function selectTab(tab: WorkshopSection) {
    const query = `?tab=${tab}`;
    if (window.location.search !== query) window.history.pushState(null, '', query);
    setActiveTab(tab);
    setActiveGroup('all');
    setSelectedEntryId(null);
    setArchiveOpen(false);
  }

  function stepEntry(delta: 1 | -1) {
    if (!stageEntries.length) return;
    const nextIndex = (activeStageIndex + delta + stageEntries.length) % stageEntries.length;
    setSelectedEntryId(stageEntries[nextIndex].id);
  }

  function handleStageKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      stepEntry(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stepEntry(-1);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
      stepEntry(dx < 0 ? 1 : -1);
    }
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight': nextIndex = (index + 1) % WORKSHOP_SECTIONS.length; break;
      case 'ArrowLeft': nextIndex = (index - 1 + WORKSHOP_SECTIONS.length) % WORKSHOP_SECTIONS.length; break;
      case 'Home': nextIndex = 0; break;
      case 'End': nextIndex = WORKSHOP_SECTIONS.length - 1; break;
      default: return;
    }
    event.preventDefault();
    selectTab(WORKSHOP_SECTIONS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <main
      className="workshop-home"
      data-workshop-stage
      data-panel-mode={archiveOpen ? 'archive' : panelMode}
      data-owner={currentEntry?.owner ?? 'library'}
    >
      <div className="workshop-stage-backdrop" aria-hidden="true">
        <EdgeOrbit side="left" />
        <EdgeOrbit side="right" />
        <div className="workshop-stage-art">
          {currentEntry ? <StageVisual entry={currentEntry} /> : null}
        </div>
      </div>

      <div className="workshop-shell">
        <header className="workshop-topbar">
          <div className="workshop-brand-row">
            <span className="workshop-brand">SEIHOUSE</span>
            <span className="workshop-topbar-section">{currentSection.label}</span>
          </div>
          <div className="workshop-topbar-actions">
            {/* The app itself: the four pages in a straight line, at its own address. */}
            <a
              href="/app/"
              className="workshop-touch-target workshop-app-pill"
            >
              <BookOpen aria-hidden="true" size={14} />
              <span>NovelExpanded app</span>
            </a>
            <ModelRouterGear />
          </div>
        </header>

        <div className="workshop-hud-bar">
          <div className="workshop-mode-pills" role="group" aria-label="Workspace view mode">
            <button
              type="button"
              className="workshop-mode-pill"
              aria-pressed={!archiveOpen && panelMode === 'stage'}
              data-workshop-mode="stage"
              onClick={() => {
                setArchiveOpen(false);
                setPanelMode('stage');
              }}
            >
              Stage
            </button>
            <button
              type="button"
              className="workshop-mode-pill"
              aria-pressed={!archiveOpen && panelMode === 'index'}
              data-workshop-mode="index"
              onClick={() => {
                setArchiveOpen(false);
                setPanelMode('index');
              }}
            >
              Index · {sectionEntries.length}
            </button>
            {archivedEntries.length > 0 && (
              <button
                type="button"
                id="workshop-archive-toggle"
                className="workshop-mode-pill workshop-archive-toggle"
                aria-expanded={archiveOpen}
                aria-controls="workshop-archive-panel"
                onClick={() => setArchiveOpen((open) => !open)}
              >
                Archive · {archivedEntries.length}
              </button>
            )}
          </div>

          {currentSection.groups && !archiveOpen && (
            <div className="workshop-group-pills" role="group" aria-label={`${currentSection.label} subsections`}>
              <button
                type="button"
                className="workshop-group-pill"
                aria-pressed={activeGroup === 'all'}
                data-workshop-group-pill="all"
                onClick={() => {
                  setActiveGroup('all');
                  setSelectedEntryId(null);
                }}
              >
                All
              </button>
              {currentSection.groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className="workshop-group-pill"
                  aria-pressed={activeGroup === group.id}
                  data-workshop-group-pill={group.id}
                  onClick={() => {
                    setActiveGroup(group.id);
                    setSelectedEntryId(null);
                  }}
                >
                  {group.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {WORKSHOP_SECTIONS.map((tab) => (
          <section
            key={tab.id}
            id={`workshop-panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`workshop-tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            tabIndex={0}
            className="workshop-tabpanel"
          >
            {activeTab === tab.id && (
              <div className="workshop-stage-grid">
                {currentEntry && (
                  <div
                    className="workshop-stage-view"
                    data-workshop-stage-view
                    role="group"
                    aria-roledescription="carousel"
                    aria-label={`${tab.label} feature stage`}
                    tabIndex={0}
                    onKeyDown={handleStageKeyDown}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={() => { pointerStart.current = null; }}
                  >
                    <div className="workshop-stage-window">
                      <button
                        type="button"
                        className="workshop-stage-step is-previous"
                        aria-label="Previous feature"
                        onClick={() => stepEntry(-1)}
                        data-workshop-step="previous"
                      >
                        <ChevronLeft size={20} aria-hidden="true" />
                      </button>
                      <span className="workshop-stage-counter" data-workshop-counter>
                        {activeStageIndex + 1} / {stageEntries.length}
                      </span>
                      <button
                        type="button"
                        className="workshop-stage-step is-next"
                        aria-label="Next feature"
                        onClick={() => stepEntry(1)}
                        data-workshop-step="next"
                      >
                        <ChevronRight size={20} aria-hidden="true" />
                      </button>
                    </div>

                    <div className="workshop-stage-hud">
                      <header className="workshop-header">
                        <p className="workshop-kicker">
                          {tab.label}{currentGroupLabel ? ` · ${currentGroupLabel}` : ''}
                        </p>
                        <h1 className="workshop-title" data-workshop-stage-title>{currentEntry.title}</h1>
                        <p className="workshop-subtitle">{currentEntry.description}</p>
                      </header>

                      <dl className="workshop-kv-list" aria-label="Feature details">
                        <div className="workshop-kv-row">
                          <dt>Package owner</dt>
                          <dd>{WORKSHOP_OWNER_LABELS[currentEntry.owner]}</dd>
                        </div>
                        <div className="workshop-kv-row">
                          <dt>Release track</dt>
                          <dd>{getWorkshopVersionLabel(currentEntry.version)}</dd>
                        </div>
                        <div className="workshop-kv-row">
                          <dt>Section</dt>
                          <dd>{currentGroupLabel ? `${tab.label} · ${currentGroupLabel}` : tab.label}</dd>
                        </div>
                        <div className="workshop-kv-row">
                          <dt>Source</dt>
                          <dd className="workshop-kv-mono">{currentEntry.source.path}</dd>
                        </div>
                      </dl>

                      <div className="workshop-stage-actions">
                        <button
                          type="button"
                          className="workshop-touch-target workshop-thumb-step"
                          aria-label="Previous in section"
                          onClick={() => stepEntry(-1)}
                        >
                          <ChevronLeft size={18} aria-hidden="true" />
                        </button>
                        <a
                          href={`?preview=${currentEntry.id}`}
                          className="workshop-touch-target workshop-stage-cta"
                          data-workshop-open={currentEntry.id}
                        >
                          <h2 className="workshop-visually-hidden">{currentEntry.title}</h2>
                          <span className="workshop-status workshop-visually-hidden">
                            {getWorkshopVersionLabel(currentEntry.version)}
                          </span>
                          <span>Open {currentEntry.title}</span>
                          <ArrowUpRight size={16} aria-hidden="true" />
                        </a>
                        <button
                          type="button"
                          className="workshop-touch-target workshop-thumb-step"
                          aria-label="Next in section"
                          onClick={() => stepEntry(1)}
                        >
                          <ChevronRight size={18} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="workshop-index-view" data-workshop-index-view>
                  <SectionContent
                    section={tab}
                    activeGroup={activeGroup}
                    selectedId={currentEntry?.id}
                    onFocusEntry={(id) => setSelectedEntryId(id)}
                  />
                </div>
              </div>
            )}
          </section>
        ))}

        {archivedEntries.length > 0 && (
          <section className="workshop-archive" aria-label="Archive" id="workshop-archive-panel" hidden={!archiveOpen}>
            {archiveOpen && (
              <div className="workshop-archive-hud">
                <p className="workshop-group-description">
                  Retired previews, kept intact and reachable at their original links for reference.
                </p>
                <EntryGrid entries={archivedEntries} />
              </div>
            )}
          </section>
        )}

        <nav className="workshop-dock" aria-label="Primary Workshop dock">
          <div className="workshop-nav" aria-label="Workshop sections" role="tablist" ref={navRef}>
            {WORKSHOP_SECTIONS.map((tab, index) => {
              const Icon = SECTION_ICONS[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`workshop-tab-${tab.id}`}
                  ref={(element) => { tabRefs.current[index] = element; }}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`workshop-panel-${tab.id}`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  className={`workshop-nav-tab ${activeTab === tab.id ? 'workshop-nav-tab-active' : ''}`}
                  onClick={() => selectTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                >
                  <Icon size={16} aria-hidden="true" className="workshop-nav-icon" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </main>
  );
}
