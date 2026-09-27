import { Eye } from 'lucide-react';
import { LibraryCard, LibraryCardMedia, LibraryCardTitle } from '@seihouse/library-ui';
import { SEIBadge } from '@seihouse/ui';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';

/**
 * LOCKED REFERENCE — do not edit during Workshop refinement.
 * The Home discovery card exactly as the production replica renders it
 * (light-novels-home/reference/LightNovelsHome.tsx, captured 2026-09-27).
 */
export function WorldCardFullReference({ world, onOpen }: { world: HomeWorld; onOpen: () => void }) {
  const inLibraryStory = world.acquired;
  const isWorldRecentlyRead = world.recentlyRead;
  const isWorldDraft = world.draft;

  return (
    <LibraryCard
      interactive
      padding="none"
      contentClassName="gap-3"
      className="h-full"
      onClick={onOpen}
      aria-label={`View published world ${world.title}`}
    >
      <LibraryCardMedia className="aspect-[2/3]">
        <img
          src={world.imageUrl}
          alt={world.title}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm border border-neutral-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-signal tracking-wider font-sc flex items-center space-x-1">
          <Eye size={10} className="text-portal" />
          <span>{world.reads}</span>
        </div>
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm border border-neutral-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-signal tracking-wider font-sc">
          {world.chapterCount} Ch
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex flex-col items-start gap-1">
          <div className="flex flex-wrap gap-1">
            <SEIBadge size="sm" variant="success" truncate>
              {world.genre}
            </SEIBadge>
            <SEIBadge size="sm" variant="info" truncate>
              {world.chapterWritingStyle ?? "Standard"}
            </SEIBadge>
          </div>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {isWorldRecentlyRead && (
              <SEIBadge size="sm" variant="info" truncate>
                ✦ Recently Read
              </SEIBadge>
            )}
            {inLibraryStory ? (
              isWorldDraft ? (
                <SEIBadge size="sm" variant="danger" truncate>
                  ✍ Draft
                </SEIBadge>
              ) : (
                <SEIBadge size="sm" variant="accent" truncate>
                  🔒 Sealed
                </SEIBadge>
              )
            ) : (
              <SEIBadge size="sm" variant="neutral" truncate>
                ✧ Unacquired
              </SEIBadge>
            )}
          </div>
        </div>
      </LibraryCardMedia>

      <div className="space-y-1 p-3">
        <LibraryCardTitle
          as="h4"
          className="font-display font-bold text-base text-signal group-hover:text-portal transition-colors leading-tight line-clamp-2"
        >
          {world.title}
        </LibraryCardTitle>
        <p className="text-[10px] text-neutral-500 font-sans truncate">
          MC: {world.mcName} • {world.powerStage}
        </p>
      </div>
    </LibraryCard>
  );
}
