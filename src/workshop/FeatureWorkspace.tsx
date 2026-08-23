import React, { useEffect, useId, useState } from 'react';
import {
  Activity,
  ChevronDown,
  Clapperboard,
  Columns2,
  FlaskConical,
  Layers3,
  Lock,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { LibraryButton, LibraryPanel } from '@seihouse/sen/library';
import { getWorkshopVersionLabel, type WorkshopEntry } from './manifest';

export type WorkspaceView = 'reference' | 'development' | 'compare';
export type WorkshopControlSectionId = 'pages' | 'states' | 'scenes' | 'effects' | 'advanced';

export interface WorkshopControlSection {
  id: WorkshopControlSectionId;
  /** Optional context shown above this feature's controls. The menu label stays canonical. */
  description?: React.ReactNode;
  /** Feature-owned options. Product-facing navigation must never be placed here. */
  content: React.ReactNode;
}

export interface WorkshopControlsConfig {
  /** Optional short explanation of what the controls simulate. */
  description?: React.ReactNode;
  /** Which available canonical section opens first. Defaults to the first supplied section. */
  defaultSection?: WorkshopControlSectionId;
  sections: readonly WorkshopControlSection[];
}

export interface FeatureWorkspaceProps {
  entry: WorkshopEntry;
  /** Renders the untouched, locked replica of production. Never edited during normal Workshop tweaking. */
  renderReference: () => React.ReactNode;
  /** Renders the active Workshop version. The only version agents are allowed to change. */
  renderDevelopment: () => React.ReactNode;
  /** Preview-only options rendered by the shared Workshop Controls menu. */
  workshopControls?: WorkshopControlsConfig;
  /** Disable the Compare viewing mode for features where it doesn't make sense. Defaults to true. */
  allowCompare?: boolean;
  /** Optional preload used by deferred reference panes before Reference or Compare is selected. */
  onReferenceIntent?: () => void;
  /** Optional notification for previews whose scripted state must follow pane remounts. */
  onViewChange?: (view: WorkspaceView) => void;
}

const WORKSHOP_CONTROL_SECTIONS = [
  { id: 'pages', label: 'Pages', icon: Layers3 },
  { id: 'states', label: 'States', icon: Activity },
  { id: 'scenes', label: 'Scenes', icon: Clapperboard },
  { id: 'effects', label: 'Effects', icon: Sparkles },
  { id: 'advanced', label: 'Advanced', icon: SlidersHorizontal },
] as const satisfies readonly {
  id: WorkshopControlSectionId;
  label: string;
  icon: typeof Layers3;
}[];

function WorkshopControls({ config }: { config?: WorkshopControlsConfig }) {
  const panelId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);
  const availableSections = WORKSHOP_CONTROL_SECTIONS.flatMap(section => {
    const supplied = config?.sections.find(candidate => candidate.id === section.id);
    return supplied && React.Children.count(supplied.content) > 0
      ? [{ ...section, ...supplied }]
      : [];
  });
  const requestedDefault = config?.defaultSection;
  const initialSection = availableSections.some(section => section.id === requestedDefault)
    ? requestedDefault!
    : availableSections[0]?.id;
  const [activeSection, setActiveSection] = useState<WorkshopControlSectionId | undefined>(initialSection);

  useEffect(() => {
    if (!availableSections.some(section => section.id === activeSection)) {
      setActiveSection(initialSection);
    }
  }, [activeSection, availableSections, initialSection]);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileOpen]);

  const active = availableSections.find(section => section.id === activeSection) ?? availableSections[0];
  const contentId = `${panelId}-content`;

  return (
    <div className="relative z-[200] px-4 pt-2 sm:px-6 sm:pt-4" data-workshop-controls>
      <LibraryPanel
        as="section"
        padding="none"
        aria-label="Workshop Controls"
        className="mx-auto w-full max-w-7xl !rounded-xl sm:!rounded-2xl"
      >
        <header className="relative z-10 flex min-h-12 sm:min-h-16 items-center justify-between gap-3 px-3 py-2 sm:px-5 sm:py-3">
          <div className="min-w-0">
            <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-cyan-200/45">
              Preview tooling
            </p>
            <h2 className="mt-0.5 text-xs sm:text-sm font-semibold tracking-wide text-white/90">
              Workshop Controls
            </h2>
            {config?.description && (
              <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] leading-relaxed text-white/45">
                {config.description}
              </div>
            )}
          </div>
          <LibraryButton
            variant="ghost"
            size="sm"
            className="shrink-0 md:hidden !px-2.5 !py-1 text-xs"
            aria-controls={contentId}
            aria-expanded={mobileOpen}
            icon={SlidersHorizontal}
            iconRight={
              <ChevronDown
                size={13}
                className={`transition-transform motion-reduce:transition-none ${mobileOpen ? 'rotate-180' : ''}`}
              />
            }
            onClick={() => setMobileOpen(open => !open)}
          >
            {mobileOpen ? 'Close' : 'Open'}
          </LibraryButton>
        </header>

        <div
          id={contentId}
          className={`${mobileOpen ? 'grid' : 'hidden'} border-t border-white/10 md:grid md:grid-cols-[11rem_minmax(0,1fr)]`}
        >
          {availableSections.length > 0 ? (
            <>
              <nav
                aria-label="Workshop control sections"
                className="flex min-w-0 gap-1 overflow-x-auto border-b border-white/10 bg-black/15 p-2 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-3"
              >
                {availableSections.map(section => {
                  const Icon = section.icon;
                  const selected = active?.id === section.id;
                  return (
                    <button
                      key={section.id}
                      id={`${panelId}-${section.id}-button`}
                      type="button"
                      aria-controls={`${panelId}-${section.id}`}
                      aria-pressed={selected}
                      onClick={() => setActiveSection(section.id)}
                      className={`workshop-touch-target flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors md:w-full ${
                        selected
                          ? 'border-cyan-400/35 bg-cyan-500/15 text-cyan-100'
                          : 'border-transparent text-white/50 hover:border-white/10 hover:bg-white/5 hover:text-white/85'
                      }`}
                    >
                      <Icon aria-hidden="true" size={14} />
                      {section.label}
                    </button>
                  );
                })}
              </nav>

              {active && (
                <div
                  id={`${panelId}-${active.id}`}
                  role="region"
                  aria-labelledby={`${panelId}-${active.id}-button`}
                  data-workshop-control-section={active.id}
                  className="relative min-w-0 p-4 sm:p-5"
                >
                  {active.description && (
                    <div className="mb-4 max-w-3xl text-[11px] leading-relaxed text-white/45">
                      {active.description}
                    </div>
                  )}
                  {active.content}
                </div>
              )}
            </>
          ) : (
            <p className="px-4 py-4 text-xs leading-relaxed text-white/40 md:col-span-2 md:px-5">
              This preview has no external Workshop options. Use the component's own controls below.
            </p>
          )}
        </div>
      </LibraryPanel>
    </div>
  );
}

/**
 * The one shared shell every Workshop feature opens into: Original Reference,
 * Development, and an optional Compare viewing mode over the same preview
 * canvas. This is the structural guarantee that no feature can quietly grow
 * a second homepage card — a "V2" is just a Development version inside this
 * shell, never a new entry point.
 */
export function FeatureWorkspace({
  entry,
  renderReference,
  renderDevelopment,
  workshopControls,
  allowCompare = true,
  onReferenceIntent,
  onViewChange,
}: FeatureWorkspaceProps) {
  const [view, setView] = useState<WorkspaceView>('development');
  const [mobilePane, setMobilePane] = useState<'reference' | 'development'>('development');

  useEffect(() => {
    if (!allowCompare && view === 'compare') {
      setView('development');
      onViewChange?.('development');
    }
  }, [allowCompare, onViewChange, view]);

  return (
    <div className="relative min-h-screen bg-[#04060d] text-slate-300 font-sans flex flex-col">
      <header className="px-4 py-3 sm:px-6 sm:py-5 border-b border-white/5">
        <h1 className="text-lg sm:text-2xl font-display font-medium tracking-wide text-white/90 uppercase">
          {entry.title}
        </h1>
        <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-white/40 font-mono">
          {getWorkshopVersionLabel(entry.version)}
          {entry.source?.lastCompared ? ` · Source checked ${entry.source.lastCompared}` : ''}
        </p>

        <div className="mt-2.5 sm:mt-4 inline-flex max-w-full flex-wrap rounded-xl sm:rounded-full border border-white/10 bg-white/5 p-0.5 sm:p-1 gap-0.5 sm:gap-1">
          <button
            type="button"
            onPointerEnter={onReferenceIntent}
            onPointerDown={onReferenceIntent}
            onFocus={onReferenceIntent}
            onClick={() => {
              onReferenceIntent?.();
              setView('reference');
              onViewChange?.('reference');
            }}
            className={`workshop-touch-target flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-lg sm:rounded-full text-[11px] sm:text-xs font-medium transition-colors ${
              view === 'reference' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Lock size={11} className="sm:w-3 sm:h-3" /> Original Reference
          </button>
          <button
            type="button"
            onClick={() => {
              setView('development');
              onViewChange?.('development');
            }}
            className={`workshop-touch-target flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-lg sm:rounded-full text-[11px] sm:text-xs font-medium transition-colors ${
              view === 'development' ? 'bg-cyan-500/20 text-cyan-100' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <FlaskConical size={11} className="sm:w-3 sm:h-3" /> Development
          </button>
          {allowCompare && (
            <button
              type="button"
              onPointerEnter={onReferenceIntent}
              onPointerDown={onReferenceIntent}
              onFocus={onReferenceIntent}
              onClick={() => {
                onReferenceIntent?.();
                setView('compare');
                onViewChange?.('compare');
              }}
              className={`workshop-touch-target flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-lg sm:rounded-full text-[11px] sm:text-xs font-medium transition-colors ${
                view === 'compare' ? 'bg-violet-500/20 text-violet-100' : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Columns2 size={11} className="sm:w-3 sm:h-3" /> Compare
            </button>
          )}
        </div>
      </header>

      <WorkshopControls config={workshopControls} />

      {view !== 'compare' ? (
        <div className="relative flex-1">
          {view === 'reference' ? renderReference() : renderDevelopment()}
        </div>
      ) : (
        <div className="relative flex-1">
          {/* Both panes stay mounted so state and scroll position survive switching — on
              desktop they sit side by side, on mobile only the selected pane is visible. */}
          <div className="hidden md:grid md:grid-cols-2 md:divide-x md:divide-white/10 min-h-full">
            <div className="relative">
              <span className="absolute top-3 left-3 z-[201] px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-[10px] uppercase tracking-widest text-white/50">
                Original Reference
              </span>
              {renderReference()}
            </div>
            <div className="relative">
              <span className="absolute top-3 left-3 z-[201] px-2 py-0.5 rounded-full bg-black/60 border border-cyan-500/30 text-[10px] uppercase tracking-widest text-cyan-200/70">
                Development
              </span>
              {renderDevelopment()}
            </div>
          </div>

          <div className="md:hidden">
            <div className="sticky top-0 z-[201] flex justify-center gap-2 py-2 bg-[#04060d]/95 backdrop-blur border-b border-white/10">
              <button
                type="button"
                onPointerEnter={onReferenceIntent}
                onPointerDown={onReferenceIntent}
                onFocus={onReferenceIntent}
                onClick={() => {
                  onReferenceIntent?.();
                  setMobilePane('reference');
                }}
                className={`workshop-touch-target px-3 py-1 rounded-full text-[11px] uppercase tracking-widest ${
                  mobilePane === 'reference' ? 'bg-white/15 text-white' : 'text-white/40'
                }`}
              >
                Reference
              </button>
              <button
                type="button"
                onClick={() => setMobilePane('development')}
                className={`workshop-touch-target px-3 py-1 rounded-full text-[11px] uppercase tracking-widest ${
                  mobilePane === 'development' ? 'bg-cyan-500/20 text-cyan-100' : 'text-white/40'
                }`}
              >
                Development
              </button>
            </div>
            <div className={mobilePane === 'reference' ? 'relative' : 'hidden'}>{renderReference()}</div>
            <div className={mobilePane === 'development' ? 'relative' : 'hidden'}>{renderDevelopment()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
