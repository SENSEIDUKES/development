import { useCallback, useEffect, useRef, useState } from 'react';
import { StorySeedShell } from '../../../components/library-shell/development/LibraryShell';
import { getSeedSection, type SeedSectionId } from '../../../components/library-shell/reference/story-seed/seedSections';
import type { SeedUpdate } from '../../../components/library-shell/reference/story-seed/seedState';
import { makeSeed } from './previewData';

export function StorySeedPreview({ state }: { state: string }) {
  const [seed, setSeed] = useState(() => makeSeed(state));
  const updateSeed = useCallback((update: SeedUpdate) => setSeed(update), []);
  const [activeSection, setActiveSection] = useState<SeedSectionId>('origin');
  const [showStoryBank, setShowStoryBank] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(state === 'saved');
  const [isGenerating, setIsGenerating] = useState(state === 'generating' || state === 'versa');
  const [action, setAction] = useState('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => { timers.current.forEach(clearTimeout); clearTimeout(savedTimer.current); }, []);
  const panelClass = 'min-h-80 rounded-xl border border-dashed border-neutral-700 p-5 text-sm text-neutral-400 font-sans';
  return <div className="min-h-screen bg-void py-10 px-4 text-slate-300 font-sans" onClickCapture={event => {
    // Keep the copied badge's real link markup, intercept only host navigation.
    if ((event.target as Element).closest('a[href="/"]')) { event.preventDefault(); setAction('Workshop destination: home'); }
  }}>
    <StorySeedShell seed={seed} updateSeed={updateSeed} activeSection={activeSection}
      setActiveSection={section => { setActiveSection(section); setShowStoryBank(false); setAction(''); }}
      equippedRelicTitle={state === 'long-title' ? 'Guardian of the Nine Celestial Libraries and Keeper of the Unfinished Scrolls' : undefined}
      isGenerating={isGenerating} savedFeedback={savedFeedback} showStoryBank={showStoryBank} helpOpen={helpOpen}
      activeAgentId={state === 'versa' ? 'versa' : null}
      error={state === 'error' ? 'Workshop fixture: draft could not be saved. Please try again.' : null}
      requestSaveDraft={() => { setSavedFeedback(true); setAction('Draft saved in preview memory only'); clearTimeout(savedTimer.current); savedTimer.current = setTimeout(() => setSavedFeedback(false), 2500); }}
      toggleStoryBank={() => setShowStoryBank(open => !open)} openHelp={() => setHelpOpen(true)}
      requestGenerateBlueprint={() => { setIsGenerating(true); timers.current.push(setTimeout(() => { setIsGenerating(false); setAction('Workshop destination: World Blueprint review'); }, 1500)); }}
      storyBank={<div className={`mt-6 ${panelClass}`}>Workshop Story Bank destination · 2 saved seed fixtures. Domain bank UI is outside this shell capture.</div>}
      help={helpOpen ? <div className={`mt-6 ${panelClass}`}><p>Workshop Help destination · section guidance is owned by Story Seed Help.</p><button className="mt-4 underline" onClick={() => setHelpOpen(false)}>Close mock Help</button></div> : null}
    >
      <div className={panelClass}>
        <p className="text-xs uppercase tracking-wider">Workshop editor content slot</p>
        <h2 className="mt-3 font-display text-2xl text-signal">{getSeedSection(activeSection).label}</h2>
        <p className="mt-2">{getSeedSection(activeSection).tagline}</p>
        <p className="mt-6">{seed.story.required.premise || 'Empty draft — Style, Genre, and Premise are still required.'}</p>
        <p className="mt-6" role="status">{action || 'The captured shell surrounds this local content fixture.'}</p>
      </div>
    </StorySeedShell>
  </div>;
}
