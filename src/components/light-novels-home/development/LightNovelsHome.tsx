import { useLibraryAssets } from '../../../library/assets';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LibraryPanel, ManifestButton, ParticleEffect } from '@seihouse/library-ui';
import { SEIFilterChip, SEISelect, SEIEmptyState } from '@seihouse/ui';
import type { LightNovelsHomeProps } from '../shared/homeContracts';
import { WorldCard } from '../../world-card/development/WorldCard';
import { WorldCardFeature } from '../../world-card/development/WorldCardFeature';
import { WorldCardFeatureCarousel, type WorldCardFeatureSlide } from '../../world-card/development/WorldCardFeatureCarousel';
import { resolveWorldTitle, useWorldCardReaderLanguage } from '../../world-card/development/worldCardText';
import { HomeEvents } from './HomeEvents';
import { SpokenCode } from '@seihouse/sen/presentation';
import { LibraryDiscoveryIcon as SENDiscoveryIcon, LibraryManifestingIcon as SENManifestingIcon } from '@seihouse/library-ui';
import '../shared/home.css';
/** Existing LibraryScreen Home presentation. Data and navigation belong to the host. */
export function LightNovelsHome({ active = true, worlds, onCreateStory, onOpenWorld, onVisibleWorldsChange, emptyState, featuredWorlds = [], events = [], children }: LightNovelsHomeProps) {
  // Featured: the Carve New Destiny slide first, then each featured world's Feature card,
  // moving the way every Feature card moves (the shared World Card carousel).
  const [currentSlide, setCurrentSlide] = useState(0);
  const heroActive = active && currentSlide === 0;
  // Each world's segment is named with the title its Feature card shows the reader.
  const readerLanguage = useWorldCardReaderLanguage();

  const { homeVideos: HERO_VIDEOS = [], homeImages: CELESTIAL_FALLBACK_IMAGES = [] } = useLibraryAssets();
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  // Rotate backup celestial library images every 6 seconds
  useEffect(() => {
    if (!heroActive || CELESTIAL_FALLBACK_IMAGES.length < 2) return;
    const interval = setInterval(() => {
      setCurrentImageIdx((prev) => (prev + 1) % CELESTIAL_FALLBACK_IMAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroActive, CELESTIAL_FALLBACK_IMAGES.length]);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (video) {
      if (!heroActive) { video.pause(); return; }
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
  }, [currentVideoIdx, heroActive]);

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
  // The order shown is what spoken codes count: N1 is the first card.
  const visibleIds = filteredAndSortedWorlds.map(world => world.id).join('\n');
  useEffect(() => { onVisibleWorldsChange?.(visibleIds ? visibleIds.split('\n') : []); }, [visibleIds, onVisibleWorldsChange]);

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
      <HomeEvents events={events} />
      <WorldCardFeatureCarousel data-home-featured className="home-featured" active={active} onSlideChange={setCurrentSlide}
        slides={[{
          id: 'carve-new-destiny', label: 'Defying the Heavens',
          // Stays mounted while a world shows, so its video resumes where it was.
          keepMounted: true,
          render: () => <>
          <LibraryPanel data-home-panel
            padding="none"
            className="world-card-feature-frame relative flex overflow-hidden items-end"
          >
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
              {heroActive && <ParticleEffect accent="#cffafe" />}
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
            {!videoError && HERO_VIDEOS.length > 0 && (
              <div className="absolute inset-0 z-10 overflow-hidden bg-transparent">
                <video
                  ref={heroVideoRef}
                  id={`hero-banner-video-${currentVideoIdx}`}
                  src={HERO_VIDEOS[currentVideoIdx]}
                  autoPlay={active}
                  muted={true}
                  playsInline={true}
                  preload="metadata"
                  poster={CELESTIAL_FALLBACK_IMAGES[0]}
                  onPlay={() => {
                    setVideoPlaying(true);
                    setVideoError(false);
                  }}
                  onPlaying={() => {
                    setVideoPlaying(true);
                    setVideoError(false);
                  }}
                  onCanPlay={() => {
                    setVideoPlaying(true);
                    setVideoError(false);
                  }}
                  onError={() => {
                    setVideoError(true);
                    setVideoPlaying(false);
                  }}
                  onEnded={() => {
                    setCurrentVideoIdx((prev) => ((prev + 1) % HERO_VIDEOS.length));
                  }}
                  className={`w-full h-full object-cover transition-opacity duration-1000 ease-in-out select-none pointer-events-none ${
                    videoPlaying ? "opacity-50 sm:opacity-60" : "opacity-0"
                  }`}
                />
              </div>
            )}
            <div className="absolute inset-0 ink-gradient z-10 pointer-events-none"></div>

            <div className="relative z-10 px-5 pt-5 pb-12 sm:px-12 sm:pt-12 sm:pb-14 w-full flex justify-between items-end">
              <div className="max-w-2xl space-y-2 sm:space-y-3">
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
                    icon={SENManifestingIcon}
                    size="md"
                    onClick={() => onCreateStory()}
                  >
                    Carve New Destiny
                  </ManifestButton>
                </div>
              </div>
            </div>
          </LibraryPanel>
          </>,
        }, ...featuredWorlds.map((world): WorldCardFeatureSlide => ({
          id: world.id, label: resolveWorldTitle(world, readerLanguage).text,
          render: onScreen => <WorldCardFeature world={world} active={onScreen}
            displayStatus={world.publicationStatus ? { view: 'public', value: world.publicationStatus } : undefined}
            onOpen={() => onOpenWorld(world.id)} />,
        }))]} />

      {children}
      <div className="space-y-6 motion-safe:animate-fadeIn">
            <div id="published-worlds-list" className="contents">
              {/* Filtering and Sorting Panels */}
              <LibraryPanel data-home-panel
                padding="sm"
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Genre Filter */}
                <div className="flex flex-col gap-2">
                  <span className="home-filter-label text-[11px] font-sc font-bold uppercase tracking-[0.2em] text-[#04ACFF]">
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
                <LibraryPanel data-home-panel className="max-w-lg mx-auto">
                  <SEIEmptyState
                    icon={SENDiscoveryIcon}
                    titleAs="h4"
                    title={emptyState?.title ?? 'Awaiting Manifestations'}
                    description={emptyState?.description ?? 'Curated worlds will return after their chapters are published to the current library format.'}
                  />
                </LibraryPanel>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
                  {filteredAndSortedWorlds.map((world, index) => (
                    <div key={world.id} className="relative">
                      <WorldCard
                        world={world}
                        displayStatus={world.publicationStatus ? { view: 'public', value: world.publicationStatus } : undefined}
                        onOpen={() => onOpenWorld(world.id)}
                      />
                      <SpokenCode code={`N${index + 1}`} className="pointer-events-none absolute start-2 top-2 z-10" />
                    </div>
                  ))}
                </div>
              )}
            </div>
      </div>
    </motion.div>
  );
}
