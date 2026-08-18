import React from 'react';
import { motion } from 'motion/react';
import { LoaderCircle as Loader2 } from 'lucide-react';
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
import { isManifestationEligible } from '../shared/manifestationEligibility';
import { CodexCardAmbience } from '../../reader-codex/development/CodexCardAmbience';
import { resolveCodexEntityAccent } from '../../reader-codex/development/codexEntityAccent';

export const FALLBACK_BACKDROPS = [
  "https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/images/LIBRARY%20BACKDROPS/LIBRARY_THUNDER.PNG",
  "https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/images/LIBRARY%20BACKDROPS/LIBRARY_RAIN.PNG",
  "https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/images/LIBRARY%20BACKDROPS/LIBRARY_MOUNTAINS.PNG",
  "https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/images/LIBRARY%20BACKDROPS/LIBRARY_FOREST.PNG",
  "https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/images/LIBRARY%20BACKDROPS/LIBRARY_DAYTIME.PNG",
];

/**
 * Picks a stable Library backdrop for an entity ID via a simple string hash,
 * so a card without an assigned backdrop always renders the same one.
 */
export function getFallbackBackdrop(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % FALLBACK_BACKDROPS.length;
  return FALLBACK_BACKDROPS[index];
}

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
 * The circular Manifest seal: the entity's portrait sleeps inside a glass orb
 * ringed by two counter-rotating orbit traces (dashed out, dotted in) in the
 * entity's ambient color. The seal is the button — keyboard-operable, with the
 * Summoning state inside — and the awakening caption sits directly beneath it.
 */
const SEAL_RING_OUTER_CLASS = [
  'pointer-events-none absolute inset-0 rounded-full border border-dashed',
  'border-[color-mix(in_srgb,var(--library-card-accent)_32%,transparent)]',
  'animate-[spin_12s_linear_infinite] motion-reduce:animate-none',
  'transition-colors duration-500 group-hover/seal:border-[color-mix(in_srgb,var(--library-card-accent)_55%,transparent)]',
].join(' ');

const SEAL_RING_INNER_CLASS = [
  'pointer-events-none absolute inset-[10px] rounded-full border border-dotted',
  'border-[color-mix(in_srgb,var(--library-card-accent)_18%,transparent)]',
  'animate-[spin_20s_linear_infinite_reverse] motion-reduce:animate-none',
  'transition-colors duration-500 group-hover/seal:border-[color-mix(in_srgb,var(--library-card-accent)_38%,transparent)]',
].join(' ');

const SEAL_CORE_GLOW_CLASS = [
  'pointer-events-none absolute inset-[18px] rounded-full animate-pulse',
  'bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--library-card-accent)_22%,transparent)_0%,transparent_70%)]',
].join(' ');

const SEAL_BUTTON_CLASS = [
  'relative z-10 flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-full',
  'border border-[color-mix(in_srgb,var(--library-card-accent)_42%,transparent)]',
  'bg-[rgba(1,11,20,0.72)] backdrop-blur-sm cursor-pointer transition-all duration-500',
  'shadow-[0_0_18px_-4px_color-mix(in_srgb,var(--library-card-accent)_40%,transparent)]',
  'hover:border-[color-mix(in_srgb,var(--library-card-accent)_85%,transparent)]',
  'hover:shadow-[0_0_30px_-4px_color-mix(in_srgb,var(--library-card-accent)_60%,transparent)]',
  'outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
  'focus-visible:ring-[color-mix(in_srgb,var(--library-card-accent)_70%,transparent)]',
  'disabled:cursor-wait',
].join(' ');

/**
 * The inline Reader reveal card for a Codex entity: spectral-glass surface,
 * entity ambient accent and mote field, manifested portrait (or the circular
 * Manifest seal while none exists), and the entity's name and description.
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
  const accent = resolveCodexEntityAccent(revealTerm.type, entry, activeStory?.mcName);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={!isSenMode ? { opacity: 1, scale: 1 } : undefined}
      animate={isSenMode ? (isRevealed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }) : undefined}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full"
    >
      <LibraryCard
        as="div"
        padding="none"
        accentColor={accent}
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
                  <div className="mb-3 flex flex-col items-center gap-2">
                    <div className="group/seal relative flex h-40 w-40 shrink-0 items-center justify-center">
                      <div className={SEAL_RING_OUTER_CLASS} />
                      <div className={SEAL_RING_INNER_CLASS} />
                      <div className={SEAL_CORE_GLOW_CLASS} />
                      <button
                        type="button"
                        onClick={() => onManifestReveal?.(entry, revealTerm.type)}
                        disabled={generatingRevealId === entry.id}
                        className={SEAL_BUTTON_CLASS}
                        aria-label={
                          generatingRevealId === entry.id
                            ? `Summoning portrait for ${entry.name}`
                            : `Manifest portrait for ${entry.name}`
                        }
                      >
                        {generatingRevealId === entry.id ? (
                          <>
                            <Loader2 size={18} className="text-[var(--library-card-accent)] animate-spin" />
                            <span className="font-mono text-[9px] text-[var(--library-card-accent)] uppercase tracking-widest animate-pulse font-medium">
                              Summoning...
                            </span>
                          </>
                        ) : (
                          <span className="flex flex-col items-center gap-1.5 transition-transform duration-300 group-hover/seal:scale-105">
                            <span className="text-[var(--library-card-accent)] text-sm group-hover/seal:animate-bounce">✦</span>
                            <span className="font-sc text-[10px] text-signal tracking-widest font-bold uppercase">
                              Manifest
                            </span>
                          </span>
                        )}
                      </button>
                    </div>
                    <span className="font-mono text-[8px] text-neutral-500 tracking-wider">
                      Awaken Portrait
                    </span>
                  </div>
                </LibraryCardActions>
              )
            )}
            <LibraryCardHeader
              eyebrow={(
                <span className="font-mono text-[9px] text-[var(--library-card-accent)] uppercase tracking-widest mb-1 font-bold">
                  Reveal · {revealTerm.type}
                </span>
              )}
              className={REVEAL_HEADER_REGION_CLASS}
            />
            <LibraryCardTitle
              as="h4"
              className="font-display !font-medium !text-lg !leading-[normal] !text-signal !tracking-wide !wrap-normal drop-shadow-md"
            >
              {entry.name}
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
