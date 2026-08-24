import React from 'react';
import { motion } from 'motion/react';
import {
  LibraryCard,
  LibraryCardActions,
  LibraryCardBody,
  LibraryCardContent,
  LibraryCardDescription,
  LibraryCardHeader,
  LibraryCardMedia,
  LibraryCardTitle,
} from '../../library/LibraryCard';
import { LibraryDragonCycleIcon } from '../../library/LibraryDragonCycleIcon';
import { isManifestationEligible } from '../shared/manifestationEligibility';
import { CodexCardAmbience } from '../../reader-codex/development/CodexCardAmbience';
import { resolveCodexEntityAccent, resolveCodexEntityColorCode } from '../../reader-codex/development/codexEntityAccent';
import { MANIFEST_BACKDROPS, getManifestBackdrop } from '../../reader-codex/development/codexManifestBackdrop';
import './CodexCardInscription.css';
import './CodexCardSeal.css';

/**
 * The Manifest backdrop pool and its stable per-entity picker live in
 * `reader-codex/development/codexManifestBackdrop.ts` so the highlighted-term
 * hovercard renders the same real "IMMORTAL LAND" art without a reverse
 * import. The established CodexCard export names are preserved for
 * `ReaderViewport` and the Workshop previews.
 */
export const FALLBACK_BACKDROPS = MANIFEST_BACKDROPS;
export const getFallbackBackdrop = getManifestBackdrop;

export interface CodexCardTerm {
  entry: {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    imageAssetId?: string;
    manifestationImportance?: any;
    [key: string]: any;
  };
  type: string;
}

export interface CodexCardProps {
  revealTerm: CodexCardTerm;
  activeStory?: {
    mcName?: string;
    assignedRevealBackdrops?: Record<string, string>;
    [key: string]: any;
  };
  isSenMode?: boolean;
  isRevealed?: boolean;
  generatingRevealId?: string | null;
  onManifestReveal?: (entry: any, type: string) => void;
  className?: string;
}

// The shared primitive owns the card regions AND the surface: the Codex reveal
// now wears the approved LibraryCard spectral glass — translucent black-blue
// depth, top-light falloff, inner rim lighting, and the masked 1px spectral
// edge — with the accent driven by the entity's own identity color. The
// LibraryCard accent hairline is suppressed (`after:!content-none`): on the
// Codex reveal the accent speaks through the aura, motes, seal, and eyebrow,
// never as a solid line across the top edge. Only the Reader reveal layout
// (centering, width, rhythm) is added on top.
const CODEX_CARD_SURFACE_CLASS = [
  'group/reveal w-full max-w-sm mx-auto my-6',
  'items-center justify-center text-center',
  'after:!content-none',
].join(' ');

const TRANSPARENT_REGION_CLASS = '!contents';

const REVEAL_HEADER_REGION_CLASS = [
  TRANSPARENT_REGION_CLASS,
  '[&>div]:!contents',
  '[&>div>div]:!contents',
  '[&>div>div>div]:!contents',
].join(' ');

/**
 * The Manifest seal is the dragon itself: an enlarged `LibraryDragonCycleIcon`
 * forms the entire portal boundary — cyan head chasing violet tail — rotating
 * slowly counterclockwise inside a soft cyan→violet aura, around a dark glass core holding the
 * Manifest label and the awakening caption. The seal is the button:
 * keyboard-operable, with the Manifesting state inside the core. The Library's
 * cycle glyph is reused unchanged and purely decorative — two stacked
 * `currentColor` copies, the cyan one masked so it dissolves down the body,
 * tint the single silhouette into the cyan→violet gradient. The aura's conic
 * gradient carries two diametrically opposed bright bands so the blurred glow
 * stays centered through the whole spin. Aura spin, dragon rotation, and the
 * Manifesting spinner all rest under `prefers-reduced-motion` (motion-reduce
 * utilities + the CodexCardSeal.css backstop).
 */
const SEAL_BUTTON_CLASS = [
  'codex-seal group/seal relative flex h-44 w-44 sm:h-52 sm:w-52 shrink-0 items-center justify-center rounded-full',
  'cursor-pointer transition-transform duration-300 active:scale-[0.97]',
  'outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
  'focus-visible:ring-[rgba(4,172,255,0.7)]',
  'disabled:cursor-wait',
].join(' ');

const SEAL_AURA_CLASS = [
  'pointer-events-none absolute -inset-2 rounded-full blur-lg transition-opacity duration-500',
  'bg-[conic-gradient(from_210deg,#04ACFF,#7C5CFF_25%,#04ACFF_50%,#7C5CFF_75%,#04ACFF)]',
  'opacity-35 animate-[spin_26s_linear_infinite] motion-reduce:animate-none',
  'group-hover/seal:opacity-70 group-active/seal:opacity-80 group-disabled/seal:opacity-60',
].join(' ');

const SEAL_DRAGON_CLASS = [
  'pointer-events-none absolute inset-0',
  'animate-[spin_24s_linear_infinite_reverse] motion-reduce:animate-none',
  '[filter:drop-shadow(0_0_9px_rgba(4,172,255,0.42))_drop-shadow(0_0_26px_rgba(124,92,255,0.36))]',
  'transition-[filter] duration-500',
  'group-hover/seal:[filter:drop-shadow(0_0_13px_rgba(4,172,255,0.62))_drop-shadow(0_0_38px_rgba(124,92,255,0.55))]',
  'group-active/seal:[filter:drop-shadow(0_0_15px_rgba(4,172,255,0.72))_drop-shadow(0_0_44px_rgba(124,92,255,0.62))]',
].join(' ');

const SEAL_DRAGON_VIOLET_CLASS = 'absolute inset-0 h-full w-full text-[#7C5CFF]';

// The cyan twin wears a vertical mask so it owns the head and upper coil and
// dissolves before the tail — the single-tone glyph reads as one cyan→violet
// dragon without touching the shared primitive.
const SEAL_DRAGON_CYAN_CLASS = [
  'absolute inset-0 h-full w-full text-[#04ACFF]',
  '[-webkit-mask-image:linear-gradient(180deg,black_15%,transparent_68%)]',
  '[mask-image:linear-gradient(180deg,black_15%,transparent_68%)]',
].join(' ');

// The core sizes up a touch on mobile (62% vs. the 58% it settles to from
// `sm:` up) so the Manifest label and "Awaken Portrait" caption sit fully
// inside the circular boundary at the seal's smallest rendered size, without
// touching the dragon glyph or aura, which are sized off the button itself.
const SEAL_CORE_CLASS = [
  'relative z-10 flex h-[62%] w-[62%] sm:h-[58%] sm:w-[58%] flex-col items-center justify-center gap-0.5 rounded-full px-2 text-center',
  'border border-white/10 bg-[rgba(1,11,20,0.72)] backdrop-blur-sm',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
].join(' ');

/**
 * The inline Reader reveal card for a Codex entity: spectral-glass surface,
 * entity ambient accent and mote field, manifested portrait (or the dragon-cycle
 * Manifest seal while none exists), the entity's name in the inscribed-name
 * treatment (settle-in reveal, frayed oath-thread underline, hover sheen —
 * see `CodexCardInscription.css`), and the entity's description.
 */
export const CodexCard: React.FC<CodexCardProps> = React.memo(({
  revealTerm,
  activeStory,
  isSenMode = false,
  isRevealed = true,
  generatingRevealId = null,
  onManifestReveal,
  className = '',
}) => {
  const entry = revealTerm.entry;
  const revealImageUrl = entry && 'imageUrl' in entry ? entry.imageUrl : undefined;
  const revealImageAssetId = entry && 'imageAssetId' in entry ? entry.imageAssetId : undefined;
  const entryId = entry?.id || 'reveal-entity';
  const assignedBackdrop = activeStory?.assignedRevealBackdrops?.[entryId] || getFallbackBackdrop(entryId);
  const colorCode = resolveCodexEntityColorCode(revealTerm.type, entry, activeStory?.mcName);
  const accent = resolveCodexEntityAccent(revealTerm.type, entry, activeStory?.mcName);
  // The inscription treatment sleeps until the card's own reveal fires, so
  // the name settle and thread draw never play inside a hidden card.
  const [titleEntered, setTitleEntered] = React.useState(false);
  const titleAwake = isSenMode ? isRevealed : titleEntered;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={!isSenMode ? { opacity: 1, scale: 1 } : undefined}
      animate={isSenMode ? (isRevealed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }) : undefined}
      viewport={{ once: true, margin: "-50px" }}
      onViewportEnter={!isSenMode ? () => setTitleEntered(true) : undefined}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full"
    >
      <LibraryCard
        as="div"
        padding="none"
        accentColor={accent}
        data-color-code={colorCode}
        className={`${CODEX_CARD_SURFACE_CLASS} ${className}`}
      >
        {!revealImageUrl && (
          <LibraryCardMedia className="!absolute inset-0 h-full w-full !overflow-hidden pointer-events-none">
            <img
              src={assignedBackdrop}
              alt="Backdrop"
              className="absolute inset-0 w-full h-full object-cover opacity-[0.25] pointer-events-none transition-transform duration-1000 group-hover/reveal:scale-105 mix-blend-screen"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent pointer-events-none" />
          </LibraryCardMedia>
        )}

        <CodexCardAmbience accent={accent} />

        <LibraryCardContent
          padding="sm"
          className="relative z-10 w-full !items-center !justify-center !gap-0"
        >
          <LibraryCardBody className={TRANSPARENT_REGION_CLASS}>
            <LibraryCardHeader
              eyebrow={(
                <span className="mb-2.5 sm:mb-3 flex items-center justify-center gap-2.5 sm:gap-3">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none h-px w-8 min-w-3 sm:w-12 bg-[linear-gradient(to_right,transparent,color-mix(in_srgb,var(--library-card-accent)_50%,transparent))]"
                  />
                  <span className="whitespace-nowrap font-mono text-[10px] sm:text-[11px] text-[var(--library-card-accent)] uppercase tracking-widest font-bold [text-shadow:0_0_14px_color-mix(in_srgb,var(--library-card-accent)_45%,transparent)]">
                    {revealTerm.type}
                  </span>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none h-px w-8 min-w-3 sm:w-12 bg-[linear-gradient(to_left,transparent,color-mix(in_srgb,var(--library-card-accent)_50%,transparent))]"
                  />
                </span>
              )}
              className={REVEAL_HEADER_REGION_CLASS}
            />
            {revealImageUrl ? (
              <LibraryCardMedia className="relative w-full shrink-0 rounded-lg overflow-hidden border bg-neutral-950 mb-3 border-[color-mix(in_srgb,var(--library-card-accent)_30%,#171717)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6),0_0_28px_-8px_color-mix(in_srgb,var(--library-card-accent)_45%,transparent)]">
                <img
                  src={revealImageUrl}
                  alt={entry.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="block w-full h-auto transition-transform duration-500 group-hover/reveal:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              </LibraryCardMedia>
            ) : (
              !revealImageAssetId &&
              isManifestationEligible(entry) && (
                <LibraryCardActions className={TRANSPARENT_REGION_CLASS}>
                  <div className="mb-3 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => onManifestReveal?.(entry, revealTerm.type)}
                      disabled={generatingRevealId === entry.id}
                      aria-busy={generatingRevealId === entry.id || undefined}
                      className={SEAL_BUTTON_CLASS}
                      aria-label={
                        generatingRevealId === entry.id
                          ? `Manifesting portrait for ${entry.name}`
                          : `Manifest portrait for ${entry.name}`
                      }
                    >
                      <span aria-hidden="true" className={SEAL_AURA_CLASS} />
                      <span aria-hidden="true" className={SEAL_DRAGON_CLASS}>
                        <LibraryDragonCycleIcon className={SEAL_DRAGON_VIOLET_CLASS} />
                        <LibraryDragonCycleIcon className={SEAL_DRAGON_CYAN_CLASS} />
                      </span>
                      <span className={SEAL_CORE_CLASS}>
                        {generatingRevealId === entry.id ? (
                          <>
                            <LibraryDragonCycleIcon className="h-5 w-5 text-cyan-300 animate-spin motion-reduce:animate-none drop-shadow-[0_0_6px_rgba(4,172,255,0.6)]" />
                            <span className="font-mono text-[9px] leading-none text-cyan-300 uppercase tracking-widest animate-pulse font-medium">
                              Manifesting...
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-violet-300 text-sm leading-none transition-transform duration-300 group-hover/seal:scale-110">✦</span>
                            <span className="codex-seal__manifest-label font-sc text-[11px] sm:text-xs leading-none text-signal tracking-widest font-bold uppercase">
                              Manifest
                            </span>
                            <span className="font-mono text-[8px] leading-none text-neutral-400 tracking-wider">
                              Awaken Portrait
                            </span>
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                </LibraryCardActions>
              )
            )}
            <LibraryCardTitle
              as="h4"
              className={`codex-inscription${titleAwake ? ' codex-inscription--awake' : ''} font-display !font-medium !text-lg !leading-[normal] !tracking-wide !wrap-normal drop-shadow-md`}
            >
              <span className="codex-inscription__name">{entry.name}</span>
              <svg
                className="codex-inscription__thread"
                viewBox="0 0 120 8"
                aria-hidden="true"
                focusable="false"
              >
                <path className="codex-inscription__thread-base" pathLength={60} d="M60 4.2 C 48 3, 30 5.4, 7 3.6" />
                <path className="codex-inscription__thread-base" pathLength={60} d="M60 4.2 C 74 5.2, 94 2.8, 113 4.4" />
                <path className="codex-inscription__thread-shimmer" pathLength={60} d="M60 4.2 C 48 3, 30 5.4, 7 3.6" />
                <path className="codex-inscription__thread-shimmer" pathLength={60} d="M60 4.2 C 74 5.2, 94 2.8, 113 4.4" />
              </svg>
            </LibraryCardTitle>
            {entry.description && (
              <LibraryCardDescription className="font-serif italic !text-xs !leading-[normal] !text-neutral-300 !mt-1 !max-w-[280px] !line-clamp-2 !wrap-normal drop-shadow">
                {entry.description}
              </LibraryCardDescription>
            )}
          </LibraryCardBody>
        </LibraryCardContent>
      </LibraryCard>
    </motion.div>
  );
});

export default CodexCard;
