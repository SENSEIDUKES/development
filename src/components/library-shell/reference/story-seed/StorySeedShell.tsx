import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import type { StorySeedInput } from '../../../story-seed/shared/storySeedSchema';
import type { SeedUpdate } from './seedState';
import { missingRequiredSections, REQUIRED_STORY_SECTIONS, type SeedSectionId } from './seedSections';
import { StorySeedHeader } from './StorySeedHeader';
import { StorySeedSelector } from './StorySeedSelector';
import { StorySeedMobileNavigation } from './StorySeedMobileNavigation';
import { NarrativePanel as LibraryPanel, CreationButton as ManifestButton } from '../../../../presentation';
import './story-seed.css';
export interface StorySeedShellProps {
 seed: StorySeedInput; updateSeed: (update: SeedUpdate) => void;
 activeSection: SeedSectionId; setActiveSection: (section: SeedSectionId) => void;
 equippedRelicTitle?: string | null; isGenerating: boolean; savedFeedback: boolean;
 activeAgentId?: 'versa' | null;
 showStoryBank: boolean; helpOpen: boolean; error: string | null;
 requestSaveDraft: () => void; toggleStoryBank: () => void; openHelp: () => void;
 requestGenerateBlueprint: () => void; children: ReactNode; storyBank: ReactNode; help: ReactNode;
}
/** Frozen CreationModal shell. Domain editors, bank, and help are host slots. */
export function StorySeedShell({ seed, updateSeed, activeSection, setActiveSection,
 equippedRelicTitle, activeAgentId, isGenerating, savedFeedback, showStoryBank, helpOpen, error,
 requestSaveDraft, toggleStoryBank, openHelp, requestGenerateBlueprint, children, storyBank, help }: StorySeedShellProps) {
 const seedError = null;
 const selectMobileSection = setActiveSection;
 const missing = missingRequiredSections(seed);
 const requiredComplete = REQUIRED_STORY_SECTIONS.length - missing.length;
 const canGenerate = missing.length === 0 && !isGenerating;
 const missingRequiredLabels = missing.map(section => section.label).join(', ');
  return (
    // `pb-24` clears the sticky Manifest strip at the end of scroll; on mobile
    // the in-flow bottom navigation occupies that space instead.
    <div className="story-seed-development-surface mx-auto max-w-7xl pb-24 max-lg:pb-0" id="creation-portal-root">
      {/* Header — wraps on narrow screens so the action buttons drop to a
          second row instead of overflowing the viewport. */}
      <StorySeedHeader
        seed={seed}
        updateSeed={updateSeed}
        isGenerating={isGenerating}
        savedFeedback={savedFeedback}
        showStoryBank={showStoryBank}
        onSaveDraft={requestSaveDraft}
        onToggleStoryBank={toggleStoryBank}
        onOpenHelp={openHelp}
        onStoryBankIntent={undefined}
        onHelpIntent={undefined}
      />

      {showStoryBank && storyBank}

      {(seedError || error) && (
        <div className="mt-6 rounded border border-red-900 bg-red-950/30 p-3 text-center font-sans text-xs text-red-200" role="alert">
          {seedError || error}
        </div>
      )}

      {/* Two-panel creation workspace — shelled in the Celestial Library
          glass panel; the action bar below is its footer strip. The Story
          Bank view replaces it while the bank is open. */}
      {!showStoryBank && (
      <LibraryPanel padding="none" className="mt-6 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-neutral-900/70 lg:block">
          <StorySeedSelector
            seed={seed}
            activeSection={activeSection}
            equippedTitle={equippedRelicTitle}
            onSelect={setActiveSection}
          />
        </aside>

        <div className="relative min-w-0">
          {/* Restrained celestial ambience the glass fields float over —
              gradients only, no blur, so mobile scrolling stays cheap. */}
          <div aria-hidden="true" className="seed-workspace-ambience" />
          <main className="relative p-4 sm:p-8">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </main>

          {/* Action bar — required tracking + Manifest as the single primary
              action, rendered as the panel's footer strip (luminous top
              divider, translucent blur). Section navigation lives in the
              bottom navigation on mobile and the sidebar on desktop. On
              mobile the strip rests in flow at the panel bottom (sticky is
              off) so it always stays clear of the bottom navigation. */}
          <LibraryPanel variant="footer" padding="none" className="sticky bottom-0 max-lg:static z-30 px-4 py-3.5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="hidden min-w-0 flex-1 items-center gap-3 sm:flex">
                <div className="flex shrink-0 items-center gap-2" aria-label={`${requiredComplete} of ${REQUIRED_STORY_SECTIONS.length} required Story inputs complete`}>
                  {REQUIRED_STORY_SECTIONS.map(section => {
                    const filled = section.isFilled(seed);
                    return (
                      <span
                        key={section.id}
                        title={`${section.label}: ${filled ? 'complete' : 'missing'}`}
                        className={`h-2 w-2 rounded-full ${
                          filled
                            ? 'bg-portal shadow-[0_0_6px_rgba(4,172,255,0.65)]'
                            : 'border border-human/70 bg-human/10'
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="truncate font-sc text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                  {missing.length > 0 ? (
                    <>
                      Missing required:{' '}
                      <span className="text-human/80">{missing.map(section => section.label).join(', ')}</span>
                    </>
                  ) : (
                    'All required Story inputs complete'
                  )}
                </p>
              </div>
              <p className="flex-1 font-sc text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 sm:hidden">
                {requiredComplete}/{REQUIRED_STORY_SECTIONS.length} required
              </p>

              <ManifestButton
                size="lg"
                onClick={requestGenerateBlueprint}
                disabled={!canGenerate}
                loading={isGenerating}
                // While VERSA drafts, its mark replaces the generic spinner.
                loadingIndicator={activeAgentId === 'versa' ? (
                  <img src="/library-shell/versa.png" className="h-5 w-5 shrink-0 animate-pulse object-contain" alt="" aria-hidden="true" />
                ) : undefined}
                aria-label={missing.length > 0 ? `Manifest disabled — missing: ${missingRequiredLabels}` : undefined}
                title={missing.length > 0 ? `Missing required: ${missingRequiredLabels}` : 'Manifest the World Blueprint'}
                className="shrink-0"
              >
                {isGenerating ? (
                  <span>{activeAgentId === 'versa' ? 'VERSA is drafting...' : 'Manifesting...'}</span>
                ) : (
                  <>
                    <span className="hidden sm:inline">Manifest World Blueprint</span>
                    <span className="sm:hidden">Manifest</span>
                  </>
                )}
              </ManifestButton>
            </div>
          </LibraryPanel>
        </div>
      </LibraryPanel>
      )}

      {!showStoryBank && (
        <p className="mt-4 text-center font-sans text-[11px] leading-relaxed text-neutral-400">
          Every empty field will be intelligently extrapolated using Chinese light-novel logic.
          A World Blueprint is generated for your review before the story begins.
        </p>
      )}

      {/* Mobile section drawer — the Library navigation shell focused purely
          on Story/World section navigation, with no unfinished destination. */}
      <StorySeedMobileNavigation
        seed={seed}
        updateSeed={updateSeed}
        activeSection={activeSection}
        equippedTitle={equippedRelicTitle}
        showStoryBank={showStoryBank}
        helpOpen={helpOpen}
        isGenerating={isGenerating}
        savedFeedback={savedFeedback}
        canManifest={canGenerate && !showStoryBank}
        onSelectSection={selectMobileSection}
        onToggleStoryBank={toggleStoryBank}
        onOpenHelp={openHelp}
        onSaveDraft={requestSaveDraft}
        onManifest={requestGenerateBlueprint}
      />

      {/* Story Seed Help — the `?` guidance menu shared by the mobile bottom
          navigation and the desktop header button. */}
      {helpOpen && help}
    </div>
  );
}
