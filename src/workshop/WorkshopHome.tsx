import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  getWorkshopTrack,
  getWorkshopVersionLabel,
  WORKSHOP_OWNER_LABELS,
  WORKSHOP_SECTIONS,
  workshopEntries,
  workshopPanels,
  type WorkshopEntry,
  type WorkshopOwner,
  type WorkshopPanel,
  type WorkshopSection,
} from './manifest';
import { LibraryComponentsGrid } from './LibraryComponents';
import { IconsGrid } from './Icons';
import { defaultFamiliar } from '../host/familiar/catalogue';
import { ModelRouterGear } from './ModelRouterSettings';
import { WorkshopDocs } from './docs/WorkshopDocs';
import { docsHref } from './docs/catalog';

const activeEntries = workshopEntries.filter((entry) => entry.status !== 'archived');
const archivedEntries = workshopEntries.filter((entry) => entry.status === 'archived');

function CelestialVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Celestial particle backdrop preview" preserveAspectRatio="xMidYMid slice">
      <circle cx="205" cy="105" r="72" fill="none" stroke="#b3a898" strokeWidth="1" opacity="0.55" />
      <path d="M-10 150 C 70 80, 140 190, 210 120 S 330 70, 420 130" fill="none" stroke="#a89c8a" strokeWidth="1.1" opacity="0.9" />
      <path d="M-10 165 C 70 95, 140 205, 210 135 S 330 85, 420 145" fill="none" stroke="#a89c8a" strokeWidth="1" opacity="0.6" />
      <path d="M-10 135 C 70 65, 140 175, 210 105 S 330 55, 420 115" fill="none" stroke="#a89c8a" strokeWidth="1" opacity="0.45" />
      <path d="M-10 180 C 70 110, 140 220, 210 150 S 330 100, 420 160" fill="none" stroke="#a89c8a" strokeWidth="1" opacity="0.3" />
      <circle cx="120" cy="98" r="1.6" fill="#8f8474" />
      <circle cx="268" cy="70" r="1.6" fill="#8f8474" />
      <circle cx="310" cy="150" r="1.4" fill="#8f8474" opacity="0.7" />
    </svg>
  );
}

function ManifestationVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Chapter generation manifestation preview" preserveAspectRatio="xMidYMid slice">
      <rect x="62" y="38" width="276" height="168" rx="8" fill="#fbf8f1" stroke="#ddd4c4" strokeWidth="1" />
      <text x="92" y="118" fontFamily="Georgia, 'Times New Roman', serif" fontSize="44" fill="#b0a696">Aa</text>
      <rect x="158" y="66" width="140" height="10" rx="5" fill="#d8d0bf" />
      <rect x="158" y="88" width="158" height="6" rx="3" fill="#e3dcd0" />
      <rect x="158" y="102" width="158" height="6" rx="3" fill="#e3dcd0" />
      <rect x="158" y="116" width="120" height="6" rx="3" fill="#e3dcd0" />
      <line x1="62" y1="164" x2="338" y2="164" stroke="#ddd4c4" strokeWidth="1" />
      <g stroke="#9d927e" strokeWidth="1.6" strokeLinecap="round">
        <line x1="100" y1="180" x2="112" y2="180" />
        <line x1="100" y1="185" x2="114" y2="185" />
        <line x1="100" y1="190" x2="110" y2="190" />
      </g>
      <text x="152" y="191" fontFamily="Georgia, serif" fontSize="13" fill="#9d927e">Tt</text>
      <text x="196" y="190" fontFamily="Georgia, serif" fontSize="15" fill="#9d927e">“</text>
      <circle cx="240" cy="184" r="5" fill="none" stroke="#9d927e" strokeWidth="1.6" />
      <path d="M286 178 h10 v14 l-5 -4 l-5 4 z" fill="none" stroke="#9d927e" strokeWidth="1.4" strokeLinejoin="round" />
      <rect x="146" y="200" width="24" height="2.5" rx="1.25" fill="#b3402f" />
    </svg>
  );
}

function IdleCultivationVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Closed-door cultivation preview" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="cdc-aura" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#04acff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#04acff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="140" r="80" fill="url(#cdc-aura)" />
      <path d="M200 80 C185 85 175 105 170 125 C165 145 150 160 130 165 C145 175 175 180 200 180 C225 180 255 175 270 165 C250 160 235 145 230 125 C225 105 215 85 200 80 Z" fill="#101a30" stroke="#8ce9ff" strokeWidth="2" strokeOpacity="0.5" />
      <circle cx="200" cy="65" r="14" fill="#04060d" stroke="#8ce9ff" strokeWidth="2" strokeOpacity="0.5" />
      <ellipse cx="200" cy="180" rx="90" ry="10" fill="none" stroke="#04acff" strokeWidth="1.5" strokeOpacity="0.3" />
    </svg>
  );
}

function RelicsGalleryVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Fate Survival Relics preview" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="relic-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <rect x="140" y="60" width="120" height="120" rx="12" fill="url(#relic-grad)" stroke="#ec4899" strokeWidth="1" strokeOpacity="0.3" />
      <polygon points="200,80 230,120 200,160 170,120" fill="none" stroke="#ec4899" strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="200" cy="120" r="10" fill="#4f46e5" fillOpacity="0.4" />
    </svg>
  );
}

function RewardLoopVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Reward loop preview" preserveAspectRatio="xMidYMid slice">
      <circle cx="200" cy="120" r="70" fill="none" stroke="#b3a898" strokeWidth="1.2" strokeDasharray="4 6" opacity="0.7" />
      {[[200, 50, '#d4af37'], [270, 120, '#7dd3ff'], [200, 190, '#a855f7'], [130, 120, '#10b981']].map(([cx, cy, color]) => (
        <circle key={`${cx}-${cy}`} cx={cx as number} cy={cy as number} r="13" fill="#fbf8f1" stroke={color as string} strokeWidth="2" />
      ))}
      <path d="M232 62 l12 4 l-4 12" fill="none" stroke="#9d927e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M168 178 l-12 -4 l4 -12" fill="none" stroke="#9d927e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <text x="200" y="126" textAnchor="middle" fontFamily="Georgia, serif" fontSize="18" fill="#9d927e">道</text>
    </svg>
  );
}

function AchievementsVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Mystery Scroll preview" preserveAspectRatio="xMidYMid slice">
      <rect x="150" y="64" width="100" height="112" rx="6" fill="#fbf8f1" stroke="#d4af37" strokeWidth="1.4" />
      <rect x="140" y="56" width="120" height="14" rx="7" fill="#e3dcd0" stroke="#b3a898" strokeWidth="1" />
      <rect x="140" y="170" width="120" height="14" rx="7" fill="#e3dcd0" stroke="#b3a898" strokeWidth="1" />
      <circle cx="200" cy="120" r="18" fill="none" stroke="#b3402f" strokeWidth="1.6" />
      <path d="M200 106 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z" fill="#d4af37" opacity="0.8" />
    </svg>
  );
}

function FamiliarTrainingVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Familiar training preview" preserveAspectRatio="xMidYMid slice">
      {[0, 1, 2, 3].map(step => (
        <rect key={step} x={118 + step * 44} y={170 - step * 26} width="32" height={20 + step * 26} rx="4" fill="#fbf8f1" stroke={step === 3 ? '#d4af37' : '#b3a898'} strokeWidth="1.2" />
      ))}
      <text x="200" y="70" textAnchor="middle" fontFamily="Georgia, serif" fontSize="26" fill="#7c5cff" opacity="0.8">Aa</text>
      <path d="M176 78 q24 -18 48 0" fill="none" stroke="#04acff" strokeWidth="1.4" opacity="0.6" />
    </svg>
  );
}

function DaoPillarVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Daily Dao Pillar preview" preserveAspectRatio="xMidYMid slice">
      {Array.from({ length: 12 }, (_, index) => (
        <rect key={index} x={110 + (index % 6) * 32} y={70 + Math.floor(index / 6) * 44} width="24" height="32" rx="4"
          fill={index < 7 ? '#e3dcd0' : '#fbf8f1'} stroke={index === 7 ? '#d4af37' : '#ddd4c4'} strokeWidth={index === 7 ? 1.8 : 1} />
      ))}
      <text x="200" y="190" textAnchor="middle" fontFamily="Georgia, serif" fontSize="22" fill="#9d927e">道</text>
    </svg>
  );
}

function CardWorkshopVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Card workshop preview" preserveAspectRatio="xMidYMid slice">
      <rect x="70" y="40" width="120" height="160" rx="8" fill="#030c17" stroke="#04acff" strokeWidth="1.2" strokeOpacity="0.4" />
      <rect x="210" y="40" width="120" height="160" rx="8" fill="#070a14" stroke="#eab308" strokeWidth="1.2" strokeOpacity="0.4" />
      <circle cx="130" cy="90" r="24" fill="#04acff" fillOpacity="0.15" stroke="#04acff" strokeWidth="1" strokeOpacity="0.3" />
      <rect x="90" y="130" width="80" height="8" rx="4" fill="#04acff" fillOpacity="0.4" />
      <rect x="90" y="146" width="60" height="6" rx="3" fill="#04acff" fillOpacity="0.2" />
      <rect x="225" y="60" width="90" height="10" rx="2" fill="#eab308" fillOpacity="0.3" />
      <line x1="225" y1="90" x2="315" y2="90" stroke="#eab308" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="225" y1="110" x2="315" y2="110" stroke="#eab308" strokeWidth="1" strokeOpacity="0.2" />
      <line x1="225" y1="130" x2="295" y2="130" stroke="#eab308" strokeWidth="1" strokeOpacity="0.2" />
    </svg>
  );
}

function ProvenanceVisual() {
  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="Provenance preview" preserveAspectRatio="xMidYMid slice">
      <rect x="120" y="44" width="160" height="152" rx="10" fill="none" stroke="#b3a898" strokeWidth="1.2" opacity="0.7" />
      <rect x="146" y="72" width="108" height="8" rx="4" fill="#d8d0bf" />
      <rect x="146" y="92" width="88" height="6" rx="3" fill="#e3dcd0" />
      <rect x="146" y="106" width="96" height="6" rx="3" fill="#e3dcd0" />
      <circle cx="200" cy="152" r="22" fill="none" stroke="#9d927e" strokeWidth="1.6" />
      <path d="M190 152 l7 7 l13 -14" fill="none" stroke="#b3402f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CardVisual({ id }: { id: string }) {
  if (id === 'familiar') return <img src={defaultFamiliar.definition.placeholderUrl} alt={`${defaultFamiliar.definition.displayName} Familiar`} style={{ height: '100%', width: '100%', objectFit: 'contain' }} />;
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
  return null;
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

function EntryCard({ entry }: { entry: WorkshopEntry }) {
  // A retired route leaves a record, not a link.
  const Card = entry.routeRetired ? 'div' : 'a';
  return (
    <Card className="workshop-card" {...(entry.routeRetired ? { 'aria-disabled': true } : { href: `?preview=${entry.id}` })}>
      <div className="workshop-card-visual">
        <CardVisual id={entry.id} />
      </div>
      <div className="workshop-card-body">
        <div className="workshop-card-tags">
          <OwnerBadge owner={entry.owner} />
          {entry.status !== 'active' && <span className="workshop-lifecycle">{entry.status}</span>}
        </div>
        <h2>{entry.title}</h2>
        <p>{entry.description}</p>
        {entry.replacedBy && <p className="workshop-card-archive-note">Superseded by {titleOf(entry.replacedBy)}.</p>}
        {entry.archiveNote && <p className="workshop-card-archive-note">{entry.archiveNote}</p>}
        <div className="workshop-card-meta">
          <span className={`workshop-status workshop-status-${getWorkshopTrack(entry.version)}`}>
            <span className="workshop-status-dot" aria-hidden="true" />
            {getWorkshopVersionLabel(entry.version)}
          </span>
          {!entry.routeRetired && <span className="workshop-card-arrow" aria-hidden="true">→</span>}
        </div>
      </div>
    </Card>
  );
}

function EntryGrid({ entries }: { entries: readonly WorkshopEntry[] }) {
  if (!entries.length) return null;
  return (
    <div className="workshop-grid">
      {entries.map((entry) => <EntryCard entry={entry} key={entry.id} />)}
    </div>
  );
}

function InlinePanel({ panel }: { panel: WorkshopPanel }) {
  const headingId = `workshop-inline-${panel.id}`;
  return (
    <section className="workshop-group workshop-inline-panel" aria-labelledby={headingId} data-panel={panel.id}>
      <div className="workshop-group-header">
        <h2 className="workshop-group-title" id={headingId}>{panel.title}</h2>
        <OwnerBadge owner={panel.owner} />
      </div>
      <p className="workshop-group-description">{panel.description}</p>
      {panel.id === 'library-components' && <LibraryComponentsGrid />}
      {panel.id === 'icons' && <IconsGrid />}
    </section>
  );
}

function SectionContent({ section }: { section: (typeof WORKSHOP_SECTIONS)[number] }) {
  const entries = activeEntries.filter((entry) => entry.section === section.id);
  const panels = workshopPanels.filter((panel) => panel.section === section.id);
  return (
    <>
      {section.groups
        ? section.groups.map((group) => {
          const groupEntries = entries.filter((entry) => entry.group === group.id);
          if (!groupEntries.length) return null;
          const headingId = `workshop-group-${section.id}-${group.id}`;
          return (
            <section className="workshop-group" aria-labelledby={headingId} key={group.id} data-group={group.id}>
              <h2 className="workshop-group-title" id={headingId}>{group.label}</h2>
              <EntryGrid entries={groupEntries} />
            </section>
          );
        })
        : <EntryGrid entries={entries} />}
      {panels.map((panel) => <InlinePanel panel={panel} key={panel.id} />)}
    </>
  );
}

function readWorkshopLocation(): { tab: WorkshopSection; doc: string } {
  const params = new URLSearchParams(window.location.search);
  const tab = WORKSHOP_SECTIONS.find(section => section.id === params.get('tab'))?.id ?? 'pages';
  return { tab, doc: params.get('doc') || 'overview' };
}

export function WorkshopHome() {
  const [location, setLocation] = useState(readWorkshopLocation);
  const activeTab = location.tab;
  const [archiveOpen, setArchiveOpen] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const navRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const restoreLocation = () => setLocation(readWorkshopLocation());
    window.addEventListener('popstate', restoreLocation);
    return () => window.removeEventListener('popstate', restoreLocation);
  }, []);

  function navigate(tab: WorkshopSection, doc = 'overview') {
    const query = tab === 'docs' ? docsHref(doc) : `?tab=${tab}`;
    if (window.location.search !== query) window.history.pushState(null, '', query);
    setLocation({ tab, doc });
    // A sticky phone tab or a Docs link may be used deep in the previous page.
    if (window.scrollY > 0) window.scrollTo({ top: 0 });
  }

  // On phones the section bar scrolls sideways; keep the selected tab in view.
  useEffect(() => {
    const nav = navRef.current;
    const index = WORKSHOP_SECTIONS.findIndex((section) => section.id === activeTab);
    if (nav && nav.scrollWidth > nav.clientWidth) tabRefs.current[index]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeTab]);

  function selectTab(id: WorkshopSection) {
    navigate(id);
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
    <main className="workshop-home">
      <EdgeOrbit side="left" />
      <EdgeOrbit side="right" />

      <div className="workshop-shell">
        <div className="workshop-topbar">
          <div className="workshop-brand-row">
            <span className="workshop-brand">SEIHOUSE</span>
            <ModelRouterGear />
          </div>
          <div className="workshop-nav" aria-label="Workshop sections" role="tablist" ref={navRef}>
            {WORKSHOP_SECTIONS.map((tab, index) => (
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
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {WORKSHOP_SECTIONS.map((tab) => (
          <section
            key={tab.id}
            id={`workshop-panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`workshop-tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            tabIndex={0}
          >
            {activeTab === tab.id && (tab.id === 'docs' ? (
              <WorkshopDocs topicId={location.doc} onNavigate={doc => navigate('docs', doc)} />
            ) : (
              <>
                <header className="workshop-header">
                  <h1 className="workshop-title">{tab.label}</h1>
                  <p className="workshop-kicker">Component Workshop</p>
                  <p className="workshop-subtitle">
                    {tab.description}
                  </p>
                </header>
                <SectionContent section={tab} />
              </>
            ))}
          </section>
        ))}

        {activeTab !== 'docs' && archivedEntries.length > 0 && (
          <section className="workshop-archive" aria-label="Archive">
            <button
              type="button"
              id="workshop-archive-toggle"
              className="workshop-archive-toggle"
              aria-expanded={archiveOpen}
              aria-controls="workshop-archive-panel"
              onClick={() => setArchiveOpen((open) => !open)}
            >
              Archive · {archivedEntries.length}
            </button>
            <div id="workshop-archive-panel" hidden={!archiveOpen}>
              {archiveOpen && (
                <>
                  <p className="workshop-group-description">
                    Retired previews, kept intact and reachable at their original links for reference.
                  </p>
                  <EntryGrid entries={archivedEntries} />
                </>
              )}
            </div>
          </section>
        )}

        <footer className="workshop-footer">
          <span>Build thoughtful interfaces.</span>
          <span className="workshop-footer-dot" aria-hidden="true" />
          <span>Ship with confidence.</span>
        </footer>
      </div>
    </main>
  );
}
