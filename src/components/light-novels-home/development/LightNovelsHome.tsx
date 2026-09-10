import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Globe, Eye } from 'lucide-react';
import { LibraryPanel, LibraryCard, LibraryCardMedia, LibraryCardTitle, ManifestButton, ParticleEffect } from '@seihouse/library-ui';
import { SEIBadge, SEIFilterChip, SEISelect, SEIEmptyState } from '@seihouse/ui';
import type { LightNovelsHomeProps } from '../shared/homeContracts';
import '../shared/home.css';
const HERO_VIDEOS = [
  "https://video.seihouse.org/LIGHT%20NOVEL/LIGHT_NOVEL_INTRO.mp4",
  "https://video.seihouse.org/LIGHT%20NOVEL/LIGHT_NOVEL_INTRO2.mp4"
];

const CELESTIAL_FALLBACK_IMAGES = [
  "https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/images/LIBRARY%20BACKDROPS/LIBRARY_THUNDER.PNG",
  "https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/images/LIBRARY%20BACKDROPS/LIBRARY_RAIN.PNG",
  "https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/images/LIBRARY%20BACKDROPS/LIBRARY_MOUNTAINS.PNG",
  "https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/images/LIBRARY%20BACKDROPS/LIBRARY_FOREST.PNG",
  "https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/images/LIBRARY%20BACKDROPS/LIBRARY_DAYTIME.PNG"
];


/** Existing LibraryScreen Home presentation. Data and navigation belong to the host. */
export function LightNovelsHome({ active = true, worlds, onCreateStory, onOpenWorld, children }: LightNovelsHomeProps) {
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  // Rotate backup celestial library images every 6 seconds
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setCurrentImageIdx((prev) => (prev + 1) % CELESTIAL_FALLBACK_IMAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [active]);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (video) {
      if (!active) { video.pause(); return; }
      // Force muted and playsInline properties programmatically to bypass browser autoplay blocks
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setVideoPlaying(true);
            setVideoError(false);
          })
          .catch((error) => {
            console.log("Hero video autoplay prevented or delayed: ", error);
            // Don't set error immediately, let the video element exist for potential user interaction or slow loading
          });
      }
    }
  }, [currentVideoIdx, active]);

  // Filter and sort states for the 'Immortal Hub' tab
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'popularity' | 'genre'>('popularity');

  const uniqueGenres = Array.from(new Set(worlds.map(w => w.genre)));
  const genres = ['All', ...uniqueGenres];

  const filteredAndSortedWorlds = worlds.filter(world => {
    if (selectedGenre === 'All') return true;
    return world.genre.toLowerCase() === selectedGenre.toLowerCase();
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'popularity') {
      return b.reads - a.reads;
    } else if (sortBy === 'genre') {
      return a.genre.localeCompare(b.genre) || (b.reads - a.reads);
    }
    return 0;
  });

  return (
    <motion.div
      key="home-screen"
      data-light-novels-home
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-12 pb-10"
    >
      <LibraryPanel
        padding="none"
        className="relative overflow-hidden h-60 sm:h-80 flex items-end"
      >
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          {active && <ParticleEffect accent="#cffafe" />}
        </div>
        {/* Layer 1: Rotating Celestial Backdrops (Constantly visible behind the video, or fully displayed if video fails to play) */}
        <AnimatePresence initial={false}>
          <motion.div
            key={`fallback-img-${currentImageIdx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 z-0 bg-black"
          >
            <img
              src={CELESTIAL_FALLBACK_IMAGES[currentImageIdx]}
              alt="Celestial Library Backdrop"
              className="w-full h-full object-cover opacity-50 sm:opacity-60 select-none pointer-events-none"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </AnimatePresence>

        {/* Layer 2: Primary Celestial Videos (Always attempted as primary layer overlaying the backdrops) */}
        {!videoError && (
          <div className="absolute inset-0 z-10 overflow-hidden bg-transparent">
            <video
              ref={heroVideoRef}
              id={`hero-banner-video-${currentVideoIdx}`}
              src={HERO_VIDEOS[currentVideoIdx]}
              autoPlay={active}
              muted={true}
              playsInline={true}
              preload="auto"
              poster={CELESTIAL_FALLBACK_IMAGES[0]}
              onPlay={() => {
                setVideoPlaying(true);
                setVideoError(false);
              }}
              onPlaying={() => {
                setVideoPlaying(true);
                setVideoError(false);
              }}
              onError={() => {
                setVideoError(true);
                setVideoPlaying(false);
              }}
              onEnded={() => {
                setCurrentVideoIdx((prev) => (prev === 0 ? 1 : 0));
              }}
              className={`w-full h-full object-cover transition-opacity duration-1000 ease-in-out select-none pointer-events-none ${
                videoPlaying ? "opacity-50 sm:opacity-60" : "opacity-0"
              }`}
            />
          </div>
        )}
        <div className="absolute inset-0 ink-gradient z-10 pointer-events-none"></div>

        <div className="relative z-10 p-5 sm:p-12 w-full flex justify-between items-end">
          <div className="max-w-2xl space-y-2 sm:space-y-3">
            <span className="font-sc text-gold-accent font-bold uppercase tracking-[0.25em] text-[10px] sm:text-xs">
              Featured Ascension
            </span>
            <h2 className="font-display font-bold text-2xl sm:text-4xl md:text-5xl text-signal leading-tight tracking-tight drop-shadow-lg">
              Defying the Heavens
            </h2>
            <p className="text-neutral-300 font-serif text-xs sm:text-sm leading-relaxed max-w-xl shadow-black drop-shadow-md hidden xs:block">
              A mortal rises. The sects tremble. Write your own destiny and
              shatter the limitations of the mortal coil in your customized
              light novel universe.
            </p>
            <div className="pt-2 sm:pt-4 flex flex-wrap gap-4">
              <ManifestButton
                aria-label="Carve New Destiny"
                icon={Sparkles}
                size="md"
                onClick={() => onCreateStory()}
              >
                Carve New Destiny
              </ManifestButton>
            </div>
          </div>
        </div>
      </LibraryPanel>

      {children}
      <div className="space-y-6 animate-fadeIn">
            <div id="published-worlds-list" className="contents">
              {/* Filtering and Sorting Panels */}
              <LibraryPanel
                padding="sm"
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Genre Filter */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-sc font-bold uppercase tracking-[0.2em] text-[#04ACFF]">
                    Realm Filter (Genre)
                  </span>
                  <div
                    className="flex flex-wrap items-center gap-1.5"
                    id="realm-genre-filters"
                  >
                    {genres.map((genre) => (
                      <SEIFilterChip
                        key={genre}
                        label={genre}
                        selected={selectedGenre === genre}
                        onSelectedChange={() => setSelectedGenre(genre)}
                        id={`genre-filter-${genre.replace(/\s+/g, "-").toLowerCase()}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Sorting */}
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <span className="text-[11px] font-sc font-bold uppercase tracking-[0.2em] text-[#FAFAFA]">
                    Ascension Order
                  </span>
                  <div className="relative">
                    <SEISelect
                      aria-label="Ascension Order"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}

                      id="immortal-hub-sort"
                    >
                      <option value="popularity">
                        Popularity (Most Reads)
                      </option>
                      <option value="newest">
                        Newest (Recent Manifestation)
                      </option>
                      <option value="genre">Genre (Alphabetical Codex)</option>
                    </SEISelect>
                  </div>
                </div>
              </LibraryPanel>

              {filteredAndSortedWorlds.length === 0 ? (
                <LibraryPanel className="max-w-lg mx-auto">
                  <SEIEmptyState
                    icon={Globe}
                    titleAs="h4"
                    title="Awaiting Manifestations"
                    description="Curated worlds will return after their chapters are published to the current library format."
                  />
                </LibraryPanel>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
                  {filteredAndSortedWorlds.map((world) => {
                    const inLibraryStory = world.acquired;
                    const isWorldRecentlyRead = world.recentlyRead;
                    const isWorldDraft = world.draft;

                    return (
                      <LibraryCard
                        interactive
                        padding="none"
                        contentClassName="gap-3"
                        key={world.id}
                        className="h-full"
                        onClick={() => {
                          onOpenWorld(world.id);
                        }}
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
                  })}
                </div>
              )}
            </div>
      </div>
    </motion.div>
  );
}
