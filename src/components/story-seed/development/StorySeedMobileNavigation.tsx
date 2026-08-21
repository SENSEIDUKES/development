import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Bookmark, Check, CircleHelp, List, Settings, Sparkles, Sprout, X } from 'lucide-react';
import type { StorySeedInput } from '../shared/storySeedSchema';
import {
  LibraryBottomNavigation,
  type LibraryBottomNavigationItem,
  LibraryButton,
  LibraryNavigationDrawer,
  LibraryPanel,
} from '../../library';
import { haveSameSeedSectionState, type SeedSectionId } from './seedSections';
import type { SeedUpdate } from './seedState';
import { buildStorySeedDrawerSections, storySeedDrawerProfile } from './StorySeedSelector';
import { haveSameStorySeedSettings, StorySeedSettings } from './StorySeedSettings';

interface StorySeedMobileNavigationProps {
  seed: StorySeedInput;
  updateSeed: (update: SeedUpdate) => void;
  activeSection: SeedSectionId;
  equippedTitle?: string | null;
  showStoryBank: boolean;
  helpOpen: boolean;
  isGenerating: boolean;
  savedFeedback: boolean;
  canManifest: boolean;
  onSelectSection: (id: SeedSectionId) => void;
  onToggleStoryBank: () => void;
  onOpenHelp: () => void;
  onSaveDraft: () => void;
  onManifest: () => void;
}

/** Mobile drawer, bottom navigation, and utility sheets as one shared owner. */
const StorySeedMobileNavigationComponent = ({
  seed,
  updateSeed,
  activeSection,
  equippedTitle,
  showStoryBank,
  helpOpen,
  isGenerating,
  savedFeedback,
  canManifest,
  onSelectSection,
  onToggleStoryBank,
  onOpenHelp,
  onSaveDraft,
  onManifest,
}: StorySeedMobileNavigationProps) => {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const mobileSheetRef = useRef<HTMLDivElement>(null);
  const mobileSheetTriggerRef = useRef<HTMLElement | null>(null);
  const settingsScrollRef = useRef<HTMLDivElement>(null);
  const [settingsScrollEnd, setSettingsScrollEnd] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!settingsOpen) return;
    const sheet = mobileSheetRef.current;
    const trigger = mobileSheetTriggerRef.current;
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const focusableElements = () => Array.from(
      sheet?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    ).filter(element => !element.hasAttribute('hidden'));

    (focusableElements()[0] ?? sheet)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusableElements();
      if (elements.length === 0) {
        event.preventDefault();
        sheet?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
      trigger?.focus();
    };
  }, [settingsOpen]);

  const updateSettingsScrollEnd = useCallback(() => {
    const region = settingsScrollRef.current;
    if (!region) return;
    // Slack keeps sub-pixel rounding from pinning the "more below" fade on at
    // the scroll end.
    setSettingsScrollEnd(region.scrollTop + region.clientHeight >= region.scrollHeight - 8);
  }, []);

  // Re-measure on open and when the Fate Survival toggle changes the content
  // height, so the edge fade only shows while scrolling can reveal more.
  useEffect(() => {
    if (!settingsOpen) return;
    const frame = requestAnimationFrame(updateSettingsScrollEnd);
    return () => cancelAnimationFrame(frame);
  }, [settingsOpen, seed.story.optional.fateSurvival.enabled, updateSettingsScrollEnd]);

  // Re-measure when the scroll region's clientHeight changes (e.g., viewport
  // resize, keyboard open/close, orientation change) while the sheet is open.
  useEffect(() => {
    if (!settingsOpen) return;
    const region = settingsScrollRef.current;
    if (!region) return;
    const observer = new ResizeObserver(() => {
      updateSettingsScrollEnd();
    });
    observer.observe(region);
    return () => observer.disconnect();
  }, [settingsOpen, updateSettingsScrollEnd]);

  const toggleSettings = useCallback(() => {
    setSelectorOpen(false);
    if (settingsOpen) {
      setSettingsOpen(false);
      return;
    }
    mobileSheetTriggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setSettingsOpen(true);
  }, [settingsOpen]);

  const closeSelector = useCallback(() => setSelectorOpen(false), []);
  const selectDrawerSection = useCallback((id: SeedSectionId) => {
    onSelectSection(id);
    setSelectorOpen(false);
  }, [onSelectSection]);
  const drawerProfile = useMemo(() => storySeedDrawerProfile(equippedTitle), [equippedTitle]);
  const drawerSections = useMemo(
    () => selectorOpen
      ? buildStorySeedDrawerSections(seed, activeSection, selectDrawerSection)
      : [],
    [activeSection, seed, selectDrawerSection, selectorOpen],
  );

  const bottomNavItems = useMemo<LibraryBottomNavigationItem[]>(() => [
    {
      id: 'sections',
      label: 'Sections',
      icon: <List size={20} />,
      active: selectorOpen,
      onSelect: () => {
        setSettingsOpen(false);
        setSelectorOpen(true);
      },
    },
    {
      id: 'story-bank',
      label: 'Story Bank',
      icon: <Sprout size={20} />,
      active: showStoryBank,
      onSelect: () => {
        setSettingsOpen(false);
        onToggleStoryBank();
      },
    },
    {
      id: 'help',
      label: 'Help',
      icon: <CircleHelp size={20} />,
      active: helpOpen,
      onSelect: () => {
        setSettingsOpen(false);
        onOpenHelp();
      },
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={20} />,
      active: settingsOpen,
      onSelect: toggleSettings,
    },
    ...(canManifest ? [{
      id: 'manifest',
      label: 'Manifest',
      icon: <Sparkles size={20} />,
      onSelect: () => {
        setSettingsOpen(false);
        onManifest();
      },
    }] : []),
  ], [canManifest, helpOpen, onManifest, onOpenHelp, onToggleStoryBank, selectorOpen, settingsOpen, showStoryBank, toggleSettings]);

  return (
    <>
      <LibraryNavigationDrawer
        open={selectorOpen}
        onClose={closeSelector}
        aria-label="Story Seed sections"
        closeLabel="Close sections"
        profile={drawerProfile}
        sections={drawerSections}
      />

      <LibraryBottomNavigation
        aria-label="Story Seed navigation"
        items={bottomNavItems}
        showLabels
        className="lg:hidden [&_button]:px-1 [&_button]:text-[9px] [&_button]:tracking-normal [&_button>span:last-child]:max-w-none [&_button>span:last-child]:overflow-visible"
      />

      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-[240] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              onClick={() => setSettingsOpen(false)}
              className="story-seed-overlay-scrim absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }}
              role="dialog"
              aria-modal="true"
              aria-label="Story Seed settings"
              ref={mobileSheetRef}
              tabIndex={-1}
              className="absolute inset-x-0 bottom-0"
            >
              <LibraryPanel
                padding="none"
                className="story-seed-overlay-panel flex max-h-[calc(100dvh-3rem)] flex-col rounded-b-none border-x-0 border-b-0 [padding-left:env(safe-area-inset-left)] [padding-right:env(safe-area-inset-right)]"
              >
                <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-3">
                  <p className="font-sc text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                    Settings
                  </p>
                  <LibraryButton
                    variant="ghost"
                    size="icon"
                    onClick={() => setSettingsOpen(false)}
                    aria-label="Close settings"
                    icon={X}
                  />
                </div>

                <div
                  ref={settingsScrollRef}
                  onScroll={updateSettingsScrollEnd}
                  data-scroll-end={settingsScrollEnd ? 'true' : undefined}
                  className="story-seed-sheet-scroll mt-2 min-h-0 flex-1 overscroll-contain overflow-y-auto px-4"
                >
                  <div className="space-y-3 pb-3">
                    <StorySeedSettings seed={seed} updateSeed={updateSeed} />
                  </div>
                </div>

                <LibraryPanel
                  variant="footer"
                  padding="none"
                  className="shrink-0 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3"
                >
                  <LibraryButton
                    fullWidth
                    onClick={onSaveDraft}
                    disabled={isGenerating}
                    title="Save this Story Seed draft"
                    icon={savedFeedback ? Check : Bookmark}
                  >
                    {savedFeedback ? 'Saved' : 'Save Draft'}
                  </LibraryButton>
                </LibraryPanel>
              </LibraryPanel>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export const StorySeedMobileNavigation = memo(
  StorySeedMobileNavigationComponent,
  (previous, next) => previous.updateSeed === next.updateSeed
    && previous.activeSection === next.activeSection
    && previous.equippedTitle === next.equippedTitle
    && previous.showStoryBank === next.showStoryBank
    && previous.helpOpen === next.helpOpen
    && previous.isGenerating === next.isGenerating
    && previous.savedFeedback === next.savedFeedback
    && previous.canManifest === next.canManifest
    && previous.onSelectSection === next.onSelectSection
    && previous.onToggleStoryBank === next.onToggleStoryBank
    && previous.onOpenHelp === next.onOpenHelp
    && previous.onSaveDraft === next.onSaveDraft
    && previous.onManifest === next.onManifest
    && haveSameSeedSectionState(previous.seed, next.seed)
    && haveSameStorySeedSettings(previous.seed, next.seed),
);
