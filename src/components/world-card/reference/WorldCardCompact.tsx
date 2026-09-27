import { useState } from 'react';
import { FileText } from 'lucide-react';
import { LibraryCard, LibraryCardMedia, LibraryCardTitle } from '@seihouse/library-ui';
import type { CreatorWorld, CreatorWorldStatus } from '../../creator-space/shared/creatorSpaceContracts';
import './world-card-reference.css';

const STATUS_LABELS: Record<CreatorWorldStatus, string> = {
  draft: 'Draft', shared: 'Shared', public: 'Public', complete: 'Complete',
};

/**
 * LOCKED REFERENCE — do not edit during Workshop refinement.
 * Create's "Your worlds" tile as it stood before World Card extraction
 * (creator-space/development/CreatorSpace.tsx, captured 2026-09-27).
 */
export function WorldCardCompactReference({ world, cover = world.imageUrl, fallbackCover = false, selected = false, onSelect }: {
  world: CreatorWorld; cover?: string; fallbackCover?: boolean; selected?: boolean; onSelect: () => void;
}) {
  return <LibraryCard interactive padding="none"
    className="world-card-ref-compact" aria-pressed={selected}
    aria-label={`${world.title}, Ch. ${world.chapterCount} · ${STATUS_LABELS[world.status]}`}
    onClick={onSelect}>
    <LibraryCardMedia className="world-card-ref-compact-media">
      <WorldCover src={cover} fallback={fallbackCover} />
      <span className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" aria-hidden="true" />
      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3">
        <LibraryCardTitle as="h3" className="font-display text-lg font-bold leading-tight text-signal line-clamp-2 sm:text-xl">{world.title}</LibraryCardTitle>
        <span className="flex items-center gap-1.5 font-sans text-xs text-neutral-200">
          Ch. {world.chapterCount}<span aria-hidden="true">•</span>
          <FileText size={12} aria-hidden="true" />{STATUS_LABELS[world.status]}
        </span>
      </span>
    </LibraryCardMedia>
  </LibraryCard>;
}

function WorldCover({ src, fallback }: { src?: string; fallback: boolean }) {
  const [failed, setFailed] = useState<string>();
  if (!src || failed === src) return null;
  return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(src)}
    className={`h-full w-full object-cover ${fallback ? 'world-card-ref-compact-fallback' : ''}`} />;
}
