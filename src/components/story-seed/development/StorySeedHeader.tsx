import { memo, useEffect, useRef, useState } from 'react';
import { Bookmark, Check, CircleHelp, Settings, Vault } from 'lucide-react';
import type { StorySeedInput } from '../shared/storySeedSchema';
import {
  LibraryButton,
  LibraryHeaderBadge,
  LibraryPanel,
} from '../../library';
import type { SeedUpdate } from './seedState';
import { haveSameStorySeedSettings, StorySeedSettings } from './StorySeedSettings';

const CELESTIAL_LIBRARY_EMBLEM_URL = '/favicon.jpg';
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface StorySeedHeaderProps {
  seed: StorySeedInput;
  updateSeed: (update: SeedUpdate) => void;
  isGenerating: boolean;
  savedFeedback: boolean;
  showStoryBank: boolean;
  onSaveDraft: () => void;
  onToggleStoryBank: () => void;
  onOpenHelp: () => void;
  /** Optional warm-up for the deferred Story Bank chunk before activation. */
  onStoryBankIntent?: () => void;
  /** Optional warm-up for the deferred Help chunk before activation. */
  onHelpIntent?: () => void;
}

/** Desktop identity and utility actions for the finalized Story Seed shell. */
const StorySeedHeaderComponent = ({
  seed,
  updateSeed,
  isGenerating,
  savedFeedback,
  showStoryBank,
  onSaveDraft,
  onToggleStoryBank,
  onOpenHelp,
  onStoryBankIntent,
  onHelpIntent,
}: StorySeedHeaderProps) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsDialogRef = useRef<HTMLDivElement>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const dialog = settingsDialogRef.current;
    const trigger = settingsTriggerRef.current;
    const focusableElements = () => Array.from(
      dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
    ).filter(element => !element.hasAttribute('hidden'));

    (focusableElements()[0] ?? dialog)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusableElements();
      if (elements.length === 0) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!dialog?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      trigger?.focus();
    };
  }, [settingsOpen]);

  return (
    <header className="relative z-40 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <LibraryHeaderBadge
        title="Story Seed"
        subtitle="Grow Your Universe"
        emblemSrc={CELESTIAL_LIBRARY_EMBLEM_URL}
        emblemAlt="Celestial Library"
        emblemHref="/"
        emblemLinkLabel="Return to Workshop home"
      />

      <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-x-4 gap-y-2 pt-1 max-lg:hidden">
        <LibraryButton
          onClick={onSaveDraft}
          disabled={isGenerating}
          title="Save this Story Seed draft"
          icon={savedFeedback ? Check : Bookmark}
        >
          <span className="hidden sm:inline">{savedFeedback ? 'Saved' : 'Save Draft'}</span>
          <span className="sm:hidden">{savedFeedback ? 'Saved' : 'Save'}</span>
        </LibraryButton>

        <div className="flex items-center gap-1">
          <div className="relative" ref={settingsRef}>
            <LibraryButton
              variant="ghost"
              size="sm"
              onClick={event => {
                if (settingsOpen) {
                  setSettingsOpen(false);
                  return;
                }
                settingsTriggerRef.current = event.currentTarget;
                setSettingsOpen(true);
              }}
              icon={Settings}
              aria-expanded={settingsOpen}
              aria-haspopup="dialog"
            >
              Settings
            </LibraryButton>
            {settingsOpen && (
              <div
                className="absolute right-0 top-[calc(100%+0.5rem)] w-[22rem] max-w-[calc(100vw-2rem)]"
                role="dialog"
                aria-modal="true"
                aria-label="Story Seed settings"
                ref={settingsDialogRef}
                tabIndex={-1}
              >
                <LibraryPanel padding="sm">
                  <StorySeedSettings seed={seed} updateSeed={updateSeed} />
                </LibraryPanel>
              </div>
            )}
          </div>
          <LibraryButton
            variant={showStoryBank ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onToggleStoryBank}
            onPointerEnter={onStoryBankIntent}
            onFocus={onStoryBankIntent}
            icon={Vault}
            aria-pressed={showStoryBank}
            title="Open the Story Bank — saved Story Seeds and their World Blueprints"
          >
            Story Bank
          </LibraryButton>
        </div>

        <LibraryButton
          variant="ghost"
          size="sm"
          onClick={onOpenHelp}
          onPointerEnter={onHelpIntent}
          onFocus={onHelpIntent}
          icon={CircleHelp}
          title="Story Seed Help — guidance for every section"
        >
          Help
        </LibraryButton>
      </div>
    </header>
  );
};

export const StorySeedHeader = memo(
  StorySeedHeaderComponent,
  (previous, next) => previous.updateSeed === next.updateSeed
    && previous.isGenerating === next.isGenerating
    && previous.savedFeedback === next.savedFeedback
    && previous.showStoryBank === next.showStoryBank
    && previous.onSaveDraft === next.onSaveDraft
    && previous.onToggleStoryBank === next.onToggleStoryBank
    && previous.onOpenHelp === next.onOpenHelp
    && previous.onStoryBankIntent === next.onStoryBankIntent
    && previous.onHelpIntent === next.onHelpIntent
    && haveSameStorySeedSettings(previous.seed, next.seed),
);
