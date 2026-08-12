import React, { useState, useMemo, useCallback } from 'react';
import { Camera, Eye, MapPin, Sparkles, BookOpen, Clock, Calendar, ArrowRight, User, Download, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StoryWorld, StoryMemory, Chapter, GeneratedImage } from '../types';
import { handleDownload as utilHandleDownload } from '../codexCompatibility';
import { useHistoricalMediaUrls } from '../hooks/useHistoricalMediaUrls';
import { canonicalAssetId, isSameAssetId } from '../codexCompatibility';

interface ReaderCodexCollageProps {
  activeStory: StoryWorld;
  memory: StoryMemory;
  onJumpToChapter?: (chapterNumber: number) => void;
  onSwitchTab?: (tab: 'reader' | 'codex' | 'memory') => void;
}

export interface VisualMemory {
  id: string;
  /** Canonical R2 asset identity. The only stable key across a cloud reload. */
  assetId?: string;
  /** Transient delivery URL. Empty when the asset could not be resolved yet. */
  url: string;
  title: string;
  subtitle: string;
  description: string;
  type: 'scene' | 'character' | 'beast' | 'location' | 'artifact' | 'faction' | 'cover';
  chapterNumber?: number;
  promptUsed?: string;
  dateStr?: string;
  tiltAngle: number;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric'
});

// Gentle synthetic chime using AudioContext for premium sensory experience
let sharedAudioContext: AudioContext | null = null;
function playAuraChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!sharedAudioContext) {
      sharedAudioContext = new AudioContextClass();
    }
    const ctx = sharedAudioContext;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Pentatonic scale frequency (glowing mystical chime)
    osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc.frequency.exponentialRampToValueAtTime(987.77, ctx.currentTime + 0.15); // B5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (e) {
    console.warn("Aetherial audio synthesizer blocked or unsupported:", e);
  }
}


interface CollageItemProps {
  mem: VisualMemory;
  isDownloading: boolean;
  handleDownload: (mem: VisualMemory, e?: React.MouseEvent) => void;
  handleOpenLightbox: (mem: VisualMemory) => void;
}

const CollageItem = React.memo(({ mem, isDownloading, handleDownload, handleOpenLightbox }: CollageItemProps) => {
  return (
    <motion.div
      layout
      layoutId={`polaroid-${mem.id}`}
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        rotate: mem.tiltAngle
      }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      whileHover={{
        scale: 1.05,
        rotate: 0,
        zIndex: 30,
        boxShadow: '0 10px 30px rgba(4,172,255,0.25)'
      }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => handleOpenLightbox(mem)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenLightbox(mem); } }}
      className="cursor-pointer bg-neutral-950 border border-neutral-900/90 rounded-sm p-2.5 pb-5 hover:border-portal/40 transition-colors relative flex flex-col justify-between group shadow-lg"
    >
      {/* Silver Push Pin Indicator */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-neutral-400 border border-neutral-600 shadow-md z-10 group-hover:bg-portal group-hover:border-portal/60 transition-colors" />

      {/* Polaroid Photo Frame */}
      <div className="aspect-square w-full rounded-sm overflow-hidden bg-neutral-900 border border-neutral-900/60 relative">
        {/* An asset whose signed delivery URL has not resolved yet renders as a
            legible placeholder. A bare <img> with an empty src showed the
            browser's broken-image glyph, which reads as data loss. */}
        {mem.url ? (
          <img
            src={mem.url}
            alt={mem.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-2 text-center bg-neutral-950">
            <Sparkles className="w-4 h-4 text-neutral-700 animate-pulse" />
            <span className="text-[7.5px] font-mono uppercase tracking-widest text-neutral-600 leading-tight">
              Aura Resealing
            </span>
          </div>
        )}

        {/* Subtle overlay download button mirroring 'Burn Story' button */}
        {mem.url && (
        <button
          type="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
          onClick={(e) => handleDownload(mem, e)}
          aria-label={`Download portrait of ${mem.title}`}
          className="absolute top-2 left-2 p-1.5 text-neutral-400 bg-black/60 border border-neutral-800 backdrop-blur-sm hover:text-portal hover:border-portal/40 rounded-xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-20 cursor-pointer"
          title="Download Portrait"
        >
          {isDownloading ? (
            <Loader2 size={11} className="animate-spin text-portal" />
          ) : (
            <Download size={11} />
          )}
        </button>
        )}

        {/* Subtle color category border overlay */}
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
          mem.type === 'scene' ? 'bg-portal' : 'bg-human'
        } opacity-60`} />
      </div>

      {/* Handwritten-Style Caption Section */}
      <div className="mt-3.5 space-y-1 text-center">
        <h4 className="font-display font-medium text-[11px] text-signal/90 leading-tight truncate px-1 italic">
          {mem.title}
        </h4>
        <div className="flex items-center justify-center gap-1.5 text-[8px] font-sans text-neutral-500 uppercase tracking-widest">
          <span>{mem.subtitle}</span>
          {mem.dateStr && (
            <>
              <span className="w-1 h-1 rounded-full bg-neutral-800" />
              <span>{mem.dateStr}</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export function ReaderCodexCollage({
  activeStory,
  memory,
  onJumpToChapter,
  onSwitchTab
}: ReaderCodexCollageProps) {
  const [filter, setFilter] = useState<'all' | 'scenes' | 'entities'>('all');
  const [selectedMemory, setSelectedMemory] = useState<VisualMemory | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  // Date formatter is now a module-level constant for efficiency

  const handleDownload = useCallback(async (mem: VisualMemory, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setDownloadingIds(prev => {
      const next = new Set(prev);
      next.add(mem.id);
      return next;
    });

    try {
      const cleanName = mem.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      await utilHandleDownload(mem.url, `${cleanName}_portrait.jpg`);
    } finally {
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(mem.id);
        return next;
      });
    }
  }, []);


  // Parse and assemble all scene/chapter memories and entity portraits

  const { characters, locations, artifacts } = memory;

  // Performance Optimization: Cache Intl.DateTimeFormat instance to avoid O(N) instantiation overhead inside the useMemo loop and across re-renders.
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }), []);
  const safeFormatDate = useCallback((dateVal: any) => {
    if (!dateVal) return 'Unknown';
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? 'Unknown' : dateFormatter.format(d);
  }, [dateFormatter]);

  const { factions } = memory;

  /**
   * Assemble the collage from the records that actually survive a cloud
   * round-trip.
   *
   * `activeStory.imageHistory` looks like the natural source, but PostgreSQL
   * rebuilds it from `targetKind: 'STORY'` media attachments alone — covers.
   * Every Codex manifestation is attached to its own entity (CHARACTER,
   * LOCATION, ARTIFACT, FACTION) and every chapter hero to its chapter, so the
   * story-level copy the browser appends on generation is dropped the moment
   * Harmony replaces the local replica with the cloud shape. Reading the
   * entities and chapters directly means a portrait that persisted is a
   * portrait that renders.
   */
  const memories = useMemo(() => {
    const items: VisualMemory[] = [];
    // Assets are keyed by their canonical id; a delivery URL is transient and
    // two renders of the same asset can legitimately carry different ones.
    const seenKeys = new Set<string>();

    const push = (item: VisualMemory) => {
      const key = item.assetId ? canonicalAssetId(item.assetId) : item.url;
      if (!key || seenKeys.has(key)) return;
      seenKeys.add(key);
      items.push(item.assetId
        ? { ...item, assetId: canonicalAssetId(item.assetId) }
        : item);
    };

    const tiltFor = (seed: string) => {
      const pseudoIndex = seed.charCodeAt(0) + seed.charCodeAt(seed.length - 1);
      return ((pseudoIndex * 9) % 10) - 5;
    };

    // 1. Scene memories from the chapter that owns every hero version. Cached
    // and imported stories can predate the array-backed schema, so reject a
    // malformed container instead of letting one stale record break the album.
    const arcs = Array.isArray(activeStory.arcs) ? activeStory.arcs : [];
    arcs.forEach((arc) => {
      const chapters = Array.isArray(arc.chapters) ? arc.chapters : [];
      chapters.forEach((ch) => {
        const url = ch.assetManifest?.heroImage;
        const imageHistory = Array.isArray(ch.imageHistory) ? ch.imageHistory : [];
        imageHistory.forEach((img) => {
          const isCurrentHero = Boolean(img.assetId)
            && Boolean(ch.heroImageAssetId)
            && isSameAssetId(img.assetId, ch.heroImageAssetId);
          push({
            id: img.id,
            assetId: img.assetId,
            url: img.imageUrl || (isCurrentHero ? url || '' : ''),
            title: `Chapter ${ch.number}: ${ch.title}`,
            subtitle: arc.title || 'Visual Record',
            description: ch.summary || 'A defining event inscribed into the aetherial tapestry.',
            type: 'scene',
            chapterNumber: ch.number,
            promptUsed: img.promptUsed,
            dateStr: img.createdAt ? safeFormatDate(img.createdAt) : 'Ascended',
            tiltAngle: ((ch.number * 7) % 10) - 5,
          });
        });
        // A legacy/current chapter without history is still a valid scene.
        if (imageHistory.length || (!url && !ch.heroImageAssetId)) return;
        push({
          id: `scene-${ch.number}`,
          assetId: ch.heroImageAssetId,
          url: url || '',
          title: `Chapter ${ch.number}: ${ch.title}`,
          subtitle: arc.title || 'Visual Record',
          description: ch.summary || 'A defining event inscribed into the aetherial tapestry.',
          type: 'scene',
          chapterNumber: ch.number,
          promptUsed: `A cinematic scene memory. Summary: ${ch.summary}`,
          dateStr: ch.sealedAt ? safeFormatDate(ch.sealedAt) : 'Ascended',
          // Seed a consistent tilt angle based on chapter number
          tiltAngle: ((ch.number * 7) % 10) - 5
        });
      });
    });

    // 2. Entity portraits, read from the Codex entities that persist them
    const entityGroups: Array<{
      entries: Array<{
        id: string;
        name: string;
        description?: string;
        imageUrl?: string;
        imageAssetId?: string;
        imageHistory?: GeneratedImage[];
      }>;
      resolve: (entry: any) => { type: VisualMemory['type']; subtitle: string };
    }> = [
      {
        entries: characters ?? [],
        resolve: (c) => ({
          type: c.isBeast ? 'beast' : 'character',
          subtitle: c.isBeast ? 'Sacred Beast' : 'Immortal cultivator'
        })
      },
      {
        entries: locations ?? [],
        resolve: () => ({ type: 'location', subtitle: 'Sacred Domain Scenery' })
      },
      {
        entries: artifacts ?? [],
        resolve: (a) => ({ type: 'artifact', subtitle: `${a.tier || 'Mortal'} Tier Relic` })
      },
      {
        entries: factions ?? [],
        resolve: (f) => ({ type: 'faction', subtitle: `${f.alignment || 'Neutral'} Sect Banner` })
      }
    ];

    for (const group of entityGroups) {
      for (const entry of group.entries) {
        const { type, subtitle } = group.resolve(entry);
        const description = entry.description || 'Captured memory core.';
        // History first: it carries the prompt and the inscription date.
        entry.imageHistory?.forEach((img) => {
          // Borrow the entity's live URL only for the version that genuinely is
          // the current one. Comparing the ids alone matched two `undefined`s,
          // so a legacy entry without an asset id adopted the current portrait
          // and rendered it under an older version's prompt and date.
          const isCurrentManifestation = Boolean(img.assetId)
            && Boolean(entry.imageAssetId)
            && isSameAssetId(img.assetId, entry.imageAssetId);
          push({
            id: img.id,
            assetId: img.assetId,
            url: img.imageUrl || (isCurrentManifestation ? entry.imageUrl || '' : ''),
            title: entry.name,
            subtitle,
            description,
            type,
            chapterNumber: img.chapterNumber,
            promptUsed: img.promptUsed,
            dateStr: img.createdAt ? safeFormatDate(img.createdAt) : undefined,
            tiltAngle: tiltFor(entry.name || entry.id)
          });
        });
        // An entity whose history never round-tripped still has its current
        // manifestation, so it must not vanish from the collage.
        if (entry.imageAssetId || entry.imageUrl) {
          push({
            id: `entity-${entry.id}`,
            assetId: entry.imageAssetId,
            url: entry.imageUrl || '',
            title: entry.name,
            subtitle,
            description,
            type,
            tiltAngle: tiltFor(entry.name || entry.id)
          });
        }
      }
    }

    // 3. Story-level history owns covers only; Codex and chapter images stay
    //    with their actual owners.
    const coverHistory = Array.isArray(activeStory.imageHistory) ? activeStory.imageHistory : [];
    coverHistory.filter((img) => img.entityType === 'cover').forEach((img) => {

      push({
        id: img.id,
        assetId: img.assetId,
        url: img.imageUrl
          || (
            isSameAssetId(img.assetId, activeStory.coverAssetId)
              ? activeStory.imageUrl || ''
              : ''
          ),
        title: activeStory.title,
        subtitle: 'Chronicle Book Cover',
        description: activeStory.customPremise || img.promptUsed || 'Captured memory core.',
        type: 'cover',
        chapterNumber: img.chapterNumber,
        promptUsed: img.promptUsed,
        dateStr: img.createdAt ? safeFormatDate(img.createdAt) : undefined,
        tiltAngle: tiltFor(activeStory.title)
      });
    });

    // 4. The current cover, for a story whose cover history never round-tripped.
    if (activeStory.coverAssetId || activeStory.imageUrl) {
      push({
        id: `cover-${activeStory.id}`,
        assetId: activeStory.coverAssetId,
        url: activeStory.imageUrl || '',
        title: activeStory.title,
        subtitle: 'Chronicle Book Cover',
        description: activeStory.customPremise || 'The sealed face of this chronicle.',
        type: 'cover',
        tiltAngle: tiltFor(activeStory.title || activeStory.id)
      });
    }

    // Sort chronologically by chapter number, falling back to id creation order
    return items.sort((a, b) => {
      const chA = a.chapterNumber || 0;
      const chB = b.chapterNumber || 0;
      return chA - chB;
    });
  }, [
    activeStory,
    characters,
    locations,
    artifacts,
    factions,
    safeFormatDate
  ]);

  const historicalReferences = useMemo(
    () => memories.map((memoryItem) => ({
      assetId: memoryItem.assetId,
      imageUrl: memoryItem.url,
    })),
    [memories],
  );
  const historicalUrls = useHistoricalMediaUrls(
    historicalReferences,
    activeStory.userId,
  );
  const displayMemories = useMemo(
    () => memories.map((memoryItem) => {
      if (memoryItem.url || !memoryItem.assetId) return memoryItem;
      const url = historicalUrls[canonicalAssetId(memoryItem.assetId)];
      return url ? { ...memoryItem, url } : memoryItem;
    }),
    [historicalUrls, memories],
  );

  React.useEffect(() => {
    setSelectedMemory((current) => {
      if (!current) return current;
      const refreshed = displayMemories.find((memoryItem) => memoryItem.id === current.id);
      return refreshed?.url && refreshed.url !== current.url ? refreshed : current;
    });
  }, [displayMemories]);

  const { scenesCount, entitiesCount } = useMemo(() => {
    let sCount = 0;
    let eCount = 0;

    for (const m of displayMemories) {
      const isScene = m.type === 'scene';

      if (isScene) sCount++;
      else eCount++;
    }

    return {
      scenesCount: sCount,
      entitiesCount: eCount
    };
  }, [displayMemories]);

  const filteredMemories = useMemo(() => {
    const filtered: VisualMemory[] = [];

    for (const m of displayMemories) {
      const isScene = m.type === 'scene';

      if (filter === 'scenes' && isScene) {
        filtered.push(m);
      } else if (filter === 'entities' && !isScene) {
        filtered.push(m);
      } else if (filter !== 'scenes' && filter !== 'entities') {
        filtered.push(m);
      }
    }

    return filtered;
  }, [displayMemories, filter]);

  const handleOpenLightbox = useCallback((memoryItem: VisualMemory) => {
    playAuraChime();
    setSelectedMemory(memoryItem);
  }, []);

  const handleRevisitScene = useCallback((chapterNum: number) => {
    if (onJumpToChapter) {
      onJumpToChapter(chapterNum);
    }
    if (onSwitchTab) {
      onSwitchTab('reader');
    }
    setSelectedMemory(null);
  }, [onJumpToChapter, onSwitchTab]);

  return (
    <div className="space-y-6 animate-fadeIn" id="codex-collage-panel">
      {/* Header and Controller */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
        <div>
          <h3 className="font-sc text-sm text-portal font-bold uppercase tracking-[0.25em] flex items-center gap-2">
            <Camera className="w-4 h-4 text-portal" />
            Aetherial Chronicle Collage
          </h3>
          <p className="text-[10px] text-neutral-500 font-sans mt-0.5">
            A visual capsule of your journey. Cinematic story memories and entity portraits are automatically catalogued here.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 self-start md:self-center">
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setFilter('all')}
            className={`px-3 py-1 text-[9px] uppercase tracking-wider font-mono rounded-sm border transition-all ${
              filter === 'all'
                ? 'bg-portal/10 border-portal text-portal shadow-[0_0_8px_rgba(4,172,255,0.2)]'
                : 'bg-transparent border-neutral-900 text-neutral-500 hover:border-neutral-800 hover:text-neutral-300'
            }`}
          >
            All Memories ({displayMemories.length})
          </button>
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setFilter('scenes')}
            className={`px-3 py-1 text-[9px] uppercase tracking-wider font-mono rounded-sm border transition-all ${
              filter === 'scenes'
                ? 'bg-portal/10 border-portal text-portal shadow-[0_0_8px_rgba(4,172,255,0.2)]'
                : 'bg-transparent border-neutral-900 text-neutral-500 hover:border-neutral-800 hover:text-neutral-300'
            }`}
          >
            Scene Cruxes ({scenesCount})
          </button>
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setFilter('entities')}
            className={`px-3 py-1 text-[9px] uppercase tracking-wider font-mono rounded-sm border transition-all ${
              filter === 'entities'
                ? 'bg-portal/10 border-portal text-portal shadow-[0_0_8px_rgba(4,172,255,0.2)]'
                : 'bg-transparent border-neutral-900 text-neutral-500 hover:border-neutral-800 hover:text-neutral-300'
            }`}
          >
            Aura Portraits ({entitiesCount})
          </button>
        </div>
      </div>

      {/* Grid Container */}
      {filteredMemories.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-neutral-900 rounded bg-neutral-950/20 px-6">
          <Sparkles className="w-6 h-6 text-neutral-600 mx-auto mb-3 animate-pulse" />
          <h4 className="font-display font-medium text-xs text-neutral-400">Chronicle Album Empty</h4>
          <p className="text-[10px] text-neutral-500 max-w-sm mx-auto mt-1 leading-relaxed">
            {filter === 'scenes'
              ? 'No key scenes have been visually captured. Proceed in the Reader Chamber—climax scenes automatically crystallize.'
              : filter === 'entities'
              ? 'No entity aura portraits have been awakened yet. Forge portraits in the Characters & Locations tabs.'
              : 'Begin generating and reading your light novel! Key story moments and unlocked entities will populate this collage.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 py-4">
          <AnimatePresence mode="popLayout">
            {filteredMemories.map((mem) => (
              <CollageItem
                key={mem.id}
                mem={mem}
                isDownloading={downloadingIds.has(mem.id)}
                handleDownload={handleDownload}
                handleOpenLightbox={handleOpenLightbox}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Immersive Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-void/95 backdrop-blur-md z-[200] flex items-center justify-center p-4 sm:p-6 md:p-8"
            onClick={() => setSelectedMemory(null)}
          >
            {/* Modal Body Container */}
            <motion.div
              layoutId={`polaroid-${selectedMemory.id}`}
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className="bg-neutral-950 border border-neutral-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden grid grid-cols-1 md:grid-cols-12 shadow-[0_0_50px_rgba(0,0,0,0.85)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image side - spans 7 columns */}
              <div className="md:col-span-7 bg-black relative flex items-center justify-center aspect-[4/3] md:aspect-auto md:h-[65vh] overflow-hidden border-b md:border-b-0 md:border-r border-neutral-900">
                {selectedMemory.url ? (
                  <img
                    src={selectedMemory.url}
                    alt={selectedMemory.title}
                    className="max-w-full max-h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 px-8 text-center">
                    <Sparkles className="w-6 h-6 text-neutral-700 animate-pulse" />
                    <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                      Aura Resealing
                    </p>
                    <p className="text-[10px] font-sans text-neutral-600 max-w-xs leading-relaxed">
                      This manifestation is inscribed in the Codex, but its aetherial link has
                      not reformed yet. It returns once the connection settles.
                    </p>
                  </div>
                )}

                {/* Category tag */}
                <div className={`absolute top-4 left-4 px-3 py-1 rounded text-[9px] font-mono uppercase tracking-widest flex items-center gap-1.5 shadow ${
                  selectedMemory.type === 'scene'
                    ? 'bg-portal/20 border border-portal/30 text-portal'
                    : 'bg-human/20 border border-human-brand/30 text-human'
                }`}>
                  {selectedMemory.type === 'scene' ? <BookOpen className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {selectedMemory.type.toUpperCase()} MEMORY
                </div>
              </div>

              {/* Chronicle details side - spans 5 columns */}
              <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto max-h-[35vh] md:max-h-[65vh] space-y-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-[8px] font-sans font-extrabold uppercase tracking-[0.3em] text-neutral-500 block mb-1">
                      {selectedMemory.subtitle}
                    </span>
                    <h3 className="font-sc font-bold text-lg sm:text-xl text-signal leading-tight">
                      {selectedMemory.title}
                    </h3>
                  </div>

                  {/* Chronicle Logs Divider */}
                  <div className="h-px bg-gradient-to-r from-neutral-900 to-transparent" />

                  {/* Narrative Body */}
                  <div className="space-y-2">
                    <span className="text-[8.5px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-neutral-500" />
                      Inscribed Chronicle Summary
                    </span>
                    <p className="font-serif italic text-xs leading-relaxed text-neutral-300">
                      "{selectedMemory.description}"
                    </p>
                  </div>

                  {/* Prompt Blueprint Log */}
                  {selectedMemory.promptUsed && (
                    <div className="p-3 bg-void border border-neutral-900 rounded space-y-1.5">
                      <span className="text-[7.5px] font-mono uppercase tracking-widest text-neutral-500 block">
                        Aura Manifestation Blueprint Prompt
                      </span>
                      <p className="text-[9px] text-neutral-400 font-mono leading-relaxed line-clamp-3">
                        {selectedMemory.promptUsed}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-neutral-900 flex flex-col gap-2">
                  {selectedMemory.chapterNumber && onJumpToChapter && (
                    <button
                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleRevisitScene(selectedMemory.chapterNumber!)}
                      className="w-full px-4 py-2 bg-portal text-void font-mono text-[10px] uppercase font-bold tracking-widest rounded hover:bg-portal/90 active:scale-98 transition-all flex items-center justify-center gap-2"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Revisit Chapter {selectedMemory.chapterNumber}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                     tabIndex={0}
                     disabled={!selectedMemory.url}
                     onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
                     onClick={(e) => handleDownload(selectedMemory, e)}
                     className="w-full px-4 py-2 border border-neutral-900 hover:border-portal/40 hover:text-portal text-neutral-400 font-mono text-[9px] uppercase tracking-wider rounded transition-all text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-neutral-900 disabled:hover:text-neutral-400"
                  >
                    {downloadingIds.has(selectedMemory.id) ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Downloading Aura...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        Download Chronicle Portrait
                      </>
                    )}
                  </button>

                  <button
                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setSelectedMemory(null)}
                    className="w-full px-4 py-2 border border-neutral-900 hover:border-neutral-800 text-neutral-400 hover:text-signal font-mono text-[9px] uppercase tracking-wider rounded transition-colors text-center"
                  >
                    Close Codex View
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
