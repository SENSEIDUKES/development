import { useState } from 'react';
import {
  getWorkshopTrack,
  getWorkshopVersionLabel,
  workshopEntries,
} from './manifest';
import { LibraryComponentsGrid } from './LibraryComponents';

/**
 * The home page has two tabs: Development (the workshop feature grid, driven
 * by the manifest) and Library Components (the live inventory of the shared
 * Celestial Library primitives, driven by LibraryComponentsGrid).
 */
type HomeTab = 'development' | 'library';

const HOME_TABS: ReadonlyArray<{ id: HomeTab; label: string }> = [
  { id: 'development', label: 'Development' },
  { id: 'library', label: 'Library Components' },
];

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
    <svg viewBox="0 0 400 240" role="img" aria-label="Relics gallery preview" preserveAspectRatio="xMidYMid slice">
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

function CardVisual({ id }: { id: string }) {
  if (id === 'card-workshop') return <CardWorkshopVisual />;
  if (id === 'celestial-backdrop') return <CelestialVisual />;
  if (id === 'chapter-generation-manifestation') return <ManifestationVisual />;
  if (id === 'idle-cultivation') return <IdleCultivationVisual />;
  if (id === 'relics-gallery') return <RelicsGalleryVisual />;
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

export function WorkshopHome() {
  const [activeTab, setActiveTab] = useState<HomeTab>('development');
  const isDevelopment = activeTab === 'development';
  const visibleEntries = workshopEntries;

  return (
    <main className="workshop-home">
      <EdgeOrbit side="left" />
      <EdgeOrbit side="right" />

      <div className="workshop-shell">
        <div className="workshop-topbar">
          <span className="workshop-brand">SEIHOUSE</span>
          <nav className="workshop-nav" aria-label="Workshop tracks" role="tablist">
            {HOME_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls="workshop-component-grid"
                className={`workshop-nav-tab ${activeTab === tab.id ? 'workshop-nav-tab-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <span className="workshop-topbar-spacer" aria-hidden="true" />
        </div>

        <header className="workshop-header">
          <h1 className="workshop-title">{isDevelopment ? 'Development' : 'Library Components'}</h1>
          <p className="workshop-kicker">Component Workshop</p>
          <p className="workshop-subtitle">
            {isDevelopment
              ? 'Explore and refine the building blocks of our interface.'
              : 'The reusable Celestial Library primitives, rendered live. See what already exists before building something new — and import it instead of rebuilding it.'}
          </p>
        </header>

        {isDevelopment ? (
          <section id="workshop-component-grid" className="workshop-grid" aria-label="Development components">
            {visibleEntries.map((entry) => (
              <a className="workshop-card" href={`?preview=${entry.id}`} key={entry.id}>
                <div className="workshop-card-visual">
                  <CardVisual id={entry.id} />
                </div>
                <div className="workshop-card-body">
                  <h2>{entry.title}</h2>
                  <p>{entry.description}</p>
                  <div className="workshop-card-meta">
                    <span className={`workshop-status workshop-status-${getWorkshopTrack(entry.version)}`}>
                      <span className="workshop-status-dot" aria-hidden="true" />
                      {getWorkshopVersionLabel(entry.version)}
                    </span>
                    <span className="workshop-card-arrow" aria-hidden="true">→</span>
                  </div>
                </div>
              </a>
            ))}
          </section>
        ) : (
          <LibraryComponentsGrid />
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
