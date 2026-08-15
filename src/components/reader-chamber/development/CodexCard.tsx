import React from 'react';
import { motion } from 'motion/react';
import { LoaderCircle as Loader2 } from 'lucide-react';
import { isManifestationEligible } from '../shared/manifestationEligibility';

export const FALLBACK_BACKDROPS = [
  "https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/images/LIBRARY%20BACKDROPS/LIBRARY_THUNDER.PNG",
  "https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/images/LIBRARY%20BACKDROPS/LIBRARY_RAIN.PNG",
  "https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/images/LIBRARY%20BACKDROPS/LIBRARY_MOUNTAINS.PNG",
  "https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/images/LIBRARY%20BACKDROPS/LIBRARY_FOREST.PNG",
  "https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/images/LIBRARY%20BACKDROPS/LIBRARY_DAYTIME.PNG",
];

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
    assignedRevealBackdrops?: Record<string, string>;
    [key: string]: any;
  };
  isSenMode?: boolean;
  isRevealed?: boolean;
  generatingRevealId?: string | null;
  onManifestReveal?: (entry: any, type: string) => void;
  className?: string;
}

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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={!isSenMode ? { opacity: 1, scale: 1 } : undefined}
      animate={isSenMode ? (isRevealed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }) : undefined}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`relative overflow-hidden w-full max-w-sm mx-auto my-6 p-4 min-h-[300px] rounded-xl border border-portal/30 bg-void/80 backdrop-blur-md shadow-[0_0_25px_rgba(4,172,255,0.15)] flex flex-col items-center justify-center text-center group/reveal ${className}`}
    >
      {!revealImageUrl && (
        <>
          <img
            src={assignedBackdrop}
            alt="Backdrop"
            className="absolute inset-0 w-full h-full object-cover opacity-[0.25] pointer-events-none transition-transform duration-1000 group-hover/reveal:scale-105 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent pointer-events-none" />
        </>
      )}

      <div className="relative z-10 flex flex-col items-center w-full">
        {revealImageUrl ? (
          <div className="relative w-[180px] h-[180px] shrink-0 rounded-lg overflow-hidden border border-neutral-900 bg-neutral-950 mb-3 shadow-inner">
            <img
              src={revealImageUrl}
              alt={entry.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain transition-transform duration-500 group-hover/reveal:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          </div>
        ) : (
          !revealImageAssetId &&
          isManifestationEligible(entry) && (
            <button
              type="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
              onClick={() => onManifestReveal?.(entry, revealTerm.type)}
              disabled={generatingRevealId === entry.id}
              className="relative w-[180px] h-[180px] shrink-0 mb-3 overflow-hidden rounded-lg bg-[#010b14] border border-portal/40 hover:border-portal flex flex-col items-center justify-center cursor-pointer transition-all duration-500 group/revealmanifest shadow-[0_0_15px_rgba(4,172,255,0.15)] hover:shadow-[0_0_25px_rgba(4,172,255,0.35)] backdrop-blur-sm"
              aria-label={`Manifest portrait for ${entry.name}`}
            >
              <div className="absolute inset-x-0 bottom-0 top-0 h-full w-full bg-[radial-gradient(circle_at_center,rgba(4,172,255,0.18)_0%,transparent_70%)] animate-pulse pointer-events-none" />
              <div className="absolute w-20 h-20 rounded-full border border-dashed border-portal/25 animate-[spin_12s_linear_infinite] group-hover/revealmanifest:border-portal/50" />
              <div className="absolute w-[88px] h-[88px] rounded-full border border-dotted border-portal/15 animate-[spin_20s_linear_infinite_reverse]" />

              {generatingRevealId === entry.id ? (
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <Loader2 size={18} className="text-portal animate-spin" />
                  <span className="font-mono text-[9px] text-portal/90 uppercase tracking-widest animate-pulse font-medium">
                    Summoning...
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 z-10 transition-transform duration-300 group-hover/revealmanifest:scale-105">
                  <span className="text-portal text-sm group-hover/revealmanifest:animate-bounce">✦</span>
                  <span className="font-sc text-[10px] text-signal tracking-widest font-bold uppercase">
                    Manifest
                  </span>
                  <span className="font-mono text-[8px] text-neutral-500 tracking-wider">
                    Awaken Portrait
                  </span>
                </div>
              )}
            </button>
          )
        )}
        <span className="font-mono text-[9px] text-portal uppercase tracking-widest mb-1 font-bold">
          Reveal · {revealTerm.type}
        </span>
        <h4 className="font-display font-medium text-lg text-signal tracking-wide drop-shadow-md">
          {entry.name}
        </h4>
        {entry.description && (
          <p className="font-serif italic text-xs text-neutral-300 mt-1 max-w-[280px] line-clamp-2 drop-shadow">
            {entry.description}
          </p>
        )}
      </div>
    </motion.div>
  );
});

export default CodexCard;
