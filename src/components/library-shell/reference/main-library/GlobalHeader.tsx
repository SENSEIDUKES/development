import React, { useState, useEffect, useRef } from 'react';
import { Cloud, CloudOff, RefreshCw, User, LogOut, Plus, Sliders, ScrollText, Scroll, Link, Keyboard, Gem, BookOpen, Users, PenTool, Sword } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMainLibraryAdapter as useAppStore, vibrate } from '../../shared/MainLibraryAdapter';
import { DaoInsights } from './DaoInsights';

export const GlobalHeader: React.FC = () => {
  const currentScreen = useAppStore(state => state.currentScreen);
    const setCurrentScreen = useAppStore(state => state.setCurrentScreen);
    const setActiveStoryId = useAppStore(state => state.setActiveStoryId);
    const syncStatus = useAppStore(state => state.syncStatus);
    const currentUser = useAppStore(state => state.currentUser);
    const userProfile = useAppStore(state => state.userProfile);
    const lastSavedTime = useAppStore(state => state.lastSavedTime);
    const activeStoryId = useAppStore(state => state.activeStoryId);
    const stories = useAppStore(state => state.stories);
    const setIsSettingsOpen = useAppStore(state => state.setIsSettingsOpen);
    const setIsCodexSheetOpen = useAppStore(state => state.setIsCodexSheetOpen);
    const setIsShortcutsOpen = useAppStore(state => state.setIsShortcutsOpen);
  const [qiCharge, setQiCharge] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const hubRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (hubRef.current && !hubRef.current.contains(event.target as Node)) {
        setIsHubOpen(false);
      }
    };
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsHubOpen(false);
      }
    };
    if (isHubOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { capture: true });
      document.addEventListener('keydown', handleEscapeKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside, { capture: true });
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isHubOpen]);

  useEffect(() => {
    let intervalId: any;
    if (isHolding) {
      intervalId = setInterval(() => {
        setQiCharge((prev) => Math.min(prev + 3, 100));
      }, 20);
    } else {
      intervalId = setInterval(() => {
        setQiCharge((prev) => Math.max(prev - 6, 0));
      }, 20);
    }
    return () => clearInterval(intervalId);
  }, [isHolding]);


  const activeStory = stories.find(s => s.id === activeStoryId);

  if (currentScreen === 'reader' || currentScreen === 'codex') {
    return null;
  }

  return (
    <header className="relative border-b border-portal/10 bg-black/80 backdrop-blur-xl sticky top-0 z-40 py-2 sm:py-3 animate-fadeIn shadow-[0_4px_30px_rgba(4,172,255,0.08)] before:absolute before:inset-x-0 before:bottom-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-portal/40 before:to-transparent">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 flex items-center justify-between">
        <div
          className="flex items-center space-x-2 sm:space-x-3 cursor-pointer min-w-0 mr-2"
          onClick={() => { vibrate('softTap'); setCurrentScreen('home'); setActiveStoryId(null); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              vibrate('softTap');
              setCurrentScreen('home'); setActiveStoryId(null);
            }
          }}
          aria-label="Return to Home"
        >
          <img
            id="celestial-library-emblem"
            src="/library-shell/celestial-library.jpg"
            alt="Celestial Library Logo"
            className="h-7 sm:h-10 w-auto object-contain brightness-110 filter drop-shadow-[0_0_8px_rgba(4,172,255,0.3)] shrink-0 rounded-2xl"
            referrerPolicy="no-referrer"
          />
          <div className="hidden sm:block min-w-0">
            <h1 className="font-display font-bold text-base md:text-lg text-signal tracking-wide leading-tight truncate select-none">
              <span
                role="presentation"
                className="relative inline-block cursor-pointer transition-all duration-200"
                onMouseDown={() => setIsHolding(true)}
                onMouseUp={() => setIsHolding(false)}
                onMouseLeave={() => setIsHolding(false)}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setIsHolding(true);
                }}
                onTouchEnd={() => setIsHolding(false)}
                onTouchCancel={() => setIsHolding(false)}
                style={{
                  textShadow: `0 0 ${4 + (qiCharge / 100) * 20}px rgba(4, 172, 255, ${0.4 + (qiCharge / 100) * 0.6}),
                               0 0 ${1 + (qiCharge / 100) * 8}px rgba(250, 250, 250, ${0.3 + (qiCharge / 100) * 0.7})`,
                  color: `rgb(${250 - (qiCharge / 100) * 15}, ${250 - (qiCharge / 100) * 5}, 255)`,
                  transform: `scale(${1 + (qiCharge / 100) * 0.08})`,
                  transformOrigin: 'left center',
                  transition: 'text-shadow 0.1s ease-out, transform 0.1s ease-out, color 0.1s ease-out'
                }}
              >
                Celestial

                {/* Qi gathering particle ring effect */}
                <span
                  className="absolute -inset-2 rounded-lg pointer-events-none transition-all duration-100 mix-blend-screen opacity-70"
                  style={{
                    boxShadow: `inset 0 0 ${(qiCharge / 100) * 16}px rgba(4, 172, 255, ${(qiCharge / 100) * 0.8}),
                                0 0 ${(qiCharge / 100) * 20}px rgba(4, 172, 255, ${(qiCharge / 100) * 0.6})`,
                    border: `1px dashed rgba(4, 172, 255, ${(qiCharge / 100) * 0.5})`,
                    transform: `scale(${1.4 - (qiCharge / 100) * 0.4}) rotate(${qiCharge * 3.6}deg)`,
                  }}
                />
              </span>
              {' '}Library
            </h1>
          </div>
        </div>

        {/* Center Section: Insights from the Dao */}
        <DaoInsights />

        <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
          <div className="flex items-center shrink-0">
            {currentUser ? (
              <button
                onClick={() => { vibrate('softTap'); setCurrentScreen('profile'); }}
                className="group relative flex items-center justify-center p-1 sm:p-1.5 rounded-full transition-all duration-500 hover:scale-105"
                title={`Spirit Linked: ${currentUser.email}`}
                aria-label="Open User Profile"
              >
                {/* Qi Cyclone Aurora */}
                <div className={`absolute inset-[-4px] rounded-full border border-dashed animate-[spin_6s_linear_infinite] transition-colors duration-500 ${currentScreen === 'profile' ? 'border-portal/40' : 'border-human/40 group-hover:border-portal/40'}`} />
                <div className={`absolute inset-[-8px] rounded-full border border-dotted animate-[spin_10s_linear_infinite_reverse] transition-colors duration-500 ${currentScreen === 'profile' ? 'border-portal/30' : 'border-human/30 group-hover:border-portal/30'}`} />

                {/* Inner Glow */}
                <div className={`absolute inset-0 rounded-full blur-md animate-pulse transition-colors duration-500 ${currentScreen === 'profile' ? 'bg-portal/20 shadow-[0_0_20px_rgba(4,172,255,0.5)]' : 'bg-human/20 shadow-[0_0_20px_rgba(139,0,0,0.5)] group-hover:bg-portal/20 group-hover:shadow-[0_0_20px_rgba(4,172,255,0.5)]'}`} />

                <div className={`relative transition-colors duration-700 ${currentScreen === 'profile' ? 'text-portal' : 'text-human group-hover:text-portal'}`}>
                  <Cloud size={24} className={currentScreen === 'profile' ? 'drop-shadow-[0_0_8px_rgba(4,172,255,0.8)]' : 'drop-shadow-[0_0_8px_rgba(139,0,0,0.8)] group-hover:drop-shadow-[0_0_8px_rgba(4,172,255,0.8)]'} strokeWidth={1.5} />
                </div>
              </button>
            ) : (
              <button
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => { vibrate('softTap'); setCurrentScreen('profile'); }}
                className="group relative flex items-center justify-center p-1 sm:p-1.5 rounded-full transition-all duration-500 hover:scale-105"
                title="Open Celestial Tools"
                aria-label="Open Celestial Tools"
              >
                {/* Keep the Celestial Tools cloud alive before account linking. */}
                <div className={`absolute inset-[-4px] rounded-full border border-dashed animate-[spin_6s_linear_infinite] transition-colors duration-500 ${currentScreen === 'profile' ? 'border-portal/40' : 'border-human/40 group-hover:border-portal/40'}`} />
                <div className={`absolute inset-[-8px] rounded-full border border-dotted animate-[spin_10s_linear_infinite_reverse] transition-colors duration-500 ${currentScreen === 'profile' ? 'border-portal/30' : 'border-human/30 group-hover:border-portal/30'}`} />
                <div className={`absolute inset-0 rounded-full blur-md animate-pulse transition-colors duration-500 ${currentScreen === 'profile' ? 'bg-portal/20 shadow-[0_0_20px_rgba(4,172,255,0.5)]' : 'bg-human/20 shadow-[0_0_20px_rgba(139,0,0,0.5)] group-hover:bg-portal/20 group-hover:shadow-[0_0_20px_rgba(4,172,255,0.5)]'}`} />

                <div className={`relative transition-colors duration-700 ${currentScreen === 'profile' ? 'text-portal' : 'text-human group-hover:text-portal'}`}>
                  <Cloud size={24} className={currentScreen === 'profile' ? 'drop-shadow-[0_0_8px_rgba(4,172,255,0.8)]' : 'drop-shadow-[0_0_8px_rgba(139,0,0,0.8)] group-hover:drop-shadow-[0_0_8px_rgba(4,172,255,0.8)]'} strokeWidth={1.5} />
                </div>
              </button>
            )}
          </div>

          {activeStory && (
            <div className="hidden md:flex items-center space-x-2 bg-[#030303] px-3 py-1.5 rounded-lg border border-neutral-800">
              <User size={12} className="text-portal" />
              <span className="text-[11px] text-signal font-serif tracking-widest">{activeStory.mcName}</span>
              <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">({activeStory.genre})</span>
            </div>
          )}

          {/* Command Hub Navigation Menu */}
          <div className="relative" ref={hubRef}>
            <button
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => { vibrate('softTap'); setIsHubOpen(!isHubOpen); }}
              className="group relative flex items-center justify-center p-1 sm:p-1.5 rounded-full transition-all duration-300 hover:scale-105 ml-2 sm:ml-4"
              title="Command Hub"
              aria-label="Command Hub"
            >
              <div className={`absolute inset-0 rounded-full blur-sm transition-colors duration-500 ${isHubOpen ? 'bg-portal/30' : 'bg-human/10 group-hover:bg-portal/20'}`} />

              <div className="relative text-human group-hover:text-portal transition-colors duration-500">
                {currentScreen !== 'home' ? (
                  <ScrollText
                    size={24}
                    className={`transition-all duration-500 ${
                      isHubOpen
                        ? 'text-portal drop-shadow-[0_0_12px_rgba(4,172,255,0.85)] scale-110'
                        : 'drop-shadow-[0_0_4px_rgba(139,0,0,0.5)] group-hover:drop-shadow-[0_0_8px_rgba(4,172,255,0.6)]'
                    }`}
                    strokeWidth={1.5}
                  />
                ) : (
                  <Scroll
                    size={24}
                    className={`transition-all duration-500 ${
                      isHubOpen
                        ? 'text-portal drop-shadow-[0_0_12px_rgba(4,172,255,0.85)] scale-110'
                        : 'drop-shadow-[0_0_4px_rgba(139,0,0,0.5)] group-hover:drop-shadow-[0_0_8px_rgba(4,172,255,0.6)]'
                    }`}
                    strokeWidth={1.5}
                  />
                )}
              </div>
            </button>

            {/* Command Hub Dropdown Overlay */}
            <AnimatePresence>
              {isHubOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 mt-3 w-72 origin-top-right z-50 rounded-xl bg-black/95 border border-portal/30 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(4,172,255,0.15)] overflow-hidden text-[#dfd8cf]"
                >
                  {/* Brand Top Accent Bar */}
                  <div className="h-[2px] bg-gradient-to-r from-human via-portal to-human" />

                  {/* Dropdown Header */}
                  <div className="p-4 border-b border-portal/10 bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                      <span className="font-sc font-bold tracking-widest text-portal text-sm">Celestial Hub</span>
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-portal/10 text-portal uppercase tracking-wider">Online</span>
                    </div>
                    <p className="font-sans font-light text-[10px] text-neutral-400 mt-1">Direct system portal navigation</p>
                  </div>

                  {/* Navigation Links */}
                  <div className="p-2 space-y-1 max-h-[360px] overflow-y-auto">
                    <span className="block px-3 pt-2 pb-1 font-sc font-semibold text-[9px] tracking-widest text-human/70 uppercase">
                      {currentUser ? `${userProfile?.displayName || currentUser.displayName || 'Sensei'} - ${
                        userProfile?.premiumTier === 'immortal' ? 'Immortal' :
                        userProfile?.premiumTier === 'sect_master' ? 'Sect Master' :
                        userProfile?.premiumTier === 'inner_sect' ? 'Inner Sect' :
                        userProfile?.premiumTier === 'outer_sect' ? 'Outer Sect' :
                        'Mortal'
                      }` : 'Primary Sects'}
                    </span>

                    {/* Library Vault (Home) */}
                    <button
                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                        vibrate('softTap');
                        setCurrentScreen('home');
                        setActiveStoryId(null);
                        setIsHubOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all ${
                        currentScreen === 'home'
                          ? 'bg-portal/10 text-portal border border-portal/20'
                          : 'hover:bg-white/[0.04] text-neutral-300 hover:text-signal'
                      }`}
                    >
                      <BookOpen size={16} className={currentScreen === 'home' ? 'text-portal' : 'text-neutral-500'} />
                      <div className="min-w-0">
                        <div className="font-sans font-medium text-xs">Library</div>
                        <div className="font-sans text-[9px] text-neutral-500 truncate">Browse your accumulated scroll logs</div>
                      </div>
                    </button>

                    {/* Story Creator */}
                    <button
                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                        vibrate('mediumTap');
                        setCurrentScreen('creator');
                        setIsHubOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all ${
                        currentScreen === 'creator'
                          ? 'bg-portal/10 text-portal border border-portal/20'
                          : 'hover:bg-white/[0.04] text-neutral-300 hover:text-signal'
                      }`}
                    >
                      <Plus size={16} className={currentScreen === 'creator' ? 'text-portal' : 'text-neutral-500'} />
                      <div className="min-w-0">
                        <div className="font-sans font-medium text-xs">Story Seed</div>
                        <div className="font-sans text-[9px] text-neutral-500 truncate">Forge a new cosmic story seed</div>
                      </div>
                    </button>

                    {/* Sects */}
                    <button
                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                        vibrate('softTap');
                        setCurrentScreen('sects');
                        setIsHubOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all ${
                        currentScreen === 'sects'
                          ? 'bg-portal/10 text-portal border border-portal/20'
                          : 'hover:bg-white/[0.04] text-neutral-300 hover:text-signal'
                      }`}
                    >
                      <Users size={16} className={currentScreen === 'sects' ? 'text-portal' : 'text-neutral-500'} />
                      <div className="min-w-0">
                        <div className="font-sans font-medium text-xs">Sects</div>
                        <div className="font-sans text-[9px] text-neutral-500 truncate">Earn rewards & shape worlds together</div>
                      </div>
                    </button>

                    {/* Pricing */}
                    <button
                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                        vibrate('softTap');
                        setCurrentScreen('pricing');
                        setIsHubOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all ${
                        currentScreen === 'pricing'
                          ? 'bg-portal/10 text-portal border border-portal/20'
                          : 'hover:bg-white/[0.04] text-neutral-300 hover:text-signal'
                      }`}
                    >
                      <Gem size={16} className={currentScreen === 'pricing' ? 'text-portal' : 'text-neutral-500'} />
                      <div className="min-w-0">
                        <div className="font-sans font-medium text-xs">Tiers</div>
                        <div className="font-sans text-[9px] text-neutral-500 truncate">Replenish your creative Qi</div>
                      </div>
                    </button>

                    {/* Profile */}
                    <button
                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                        vibrate('softTap');
                        setCurrentScreen('profile');
                        setIsHubOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all ${
                        currentScreen === 'profile'
                          ? 'bg-portal/10 text-portal border border-portal/20'
                          : 'hover:bg-white/[0.04] text-neutral-300 hover:text-signal'
                      }`}
                    >
                      <User size={16} className={currentScreen === 'profile' ? 'text-portal' : 'text-neutral-500'} />
                      <div className="min-w-0">
                        <div className="font-sans font-medium text-xs">Celestial Profile</div>
                        <div className="font-sans text-[9px] text-neutral-500 truncate">Manage spirit link settings</div>
                      </div>
                    </button>

                    {/* Conditional Active Story Segment */}
                    {activeStory && (
                      <>
                        <div className="border-t border-portal/10 my-2 pt-2" />
                        <span className="block px-3 pb-1 font-sc font-semibold text-[9px] tracking-widest text-portal/70 uppercase">Active Tome Commands</span>

                        {/* Story Detail Screen */}
                        <button
                           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                            vibrate('softTap');
                            setCurrentScreen('detail');
                            setIsHubOpen(false);
                          }}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all ${
                            currentScreen === 'detail'
                              ? 'bg-portal/10 text-portal border border-portal/20'
                              : 'hover:bg-white/[0.04] text-neutral-300 hover:text-signal'
                          }`}
                        >
                          <ScrollText size={16} className={currentScreen === 'detail' ? 'text-portal' : 'text-neutral-500'} />
                          <div className="min-w-0">
                            <div className="font-sans font-medium text-xs">Tome Chambers</div>
                            <div className="font-sans text-[9px] text-neutral-500 truncate">Explore {activeStory.mcName}'s world logs</div>
                          </div>
                        </button>

                        {/* Story Reader Screen */}
                        <button
                           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                            vibrate('softTap');
                            setCurrentScreen('reader');
                            setIsHubOpen(false);
                          }}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all ${
                            (currentScreen as string) === 'reader'
                              ? 'bg-portal/10 text-portal border border-portal/20'
                              : 'hover:bg-white/[0.04] text-neutral-300 hover:text-signal'
                          }`}
                        >
                          <Scroll size={16} className={(currentScreen as string) === 'reader' ? 'text-portal' : 'text-neutral-500'} />
                          <div className="min-w-0">
                            <div className="font-sans font-medium text-xs">Chamber Reader</div>
                            <div className="font-sans text-[9px] text-neutral-500 truncate">Engage active chapter flow</div>
                          </div>
                        </button>

                        {/* Open Living Codex Sheet Overlay */}
                        <button
                           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                            vibrate('softTap');
                            setIsCodexSheetOpen(true);
                            setIsHubOpen(false);
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all hover:bg-white/[0.04] text-neutral-300 hover:text-signal"
                        >
                          <Sliders size={16} className="text-neutral-500" />
                          <div className="min-w-0">
                            <div className="font-sans font-medium text-xs">Living Codex</div>
                            <div className="font-sans text-[9px] text-neutral-500 truncate">Inspect memories & relationships</div>
                          </div>
                        </button>
                      </>
                    )}

                    {/* System Controls */}
                    <div className="hidden md:block border-t border-portal/10 my-2 pt-2" />
                    <span className="hidden md:block px-3 pb-1 font-sc font-semibold text-[9px] tracking-widest text-neutral-500 uppercase">System Matrix</span>

                    {/* Keyboard Shortcuts */}
                    <button
                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                        vibrate('softTap');
                        setIsShortcutsOpen(true);
                        setIsHubOpen(false);
                      }}
                      className="hidden md:flex w-full items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all hover:bg-white/[0.04] text-neutral-300 hover:text-signal"
                    >
                      <Keyboard size={16} className="text-neutral-500" />
                      <div className="min-w-0">
                        <div className="font-sans font-medium text-xs">Shortcut Spells</div>
                        <div className="font-sans text-[9px] text-neutral-500 truncate">View keyboard system keys</div>
                      </div>
                    </button>

                    {/* Companion Apps */}
                    <div className="border-t border-portal/10 my-2 pt-2" />
                    <span className="block px-3 pb-1 font-sc font-semibold text-[9px] tracking-widest text-neutral-500 uppercase">Companion Realms</span>

                    {/* Manga Studio Mock */}
                    <button
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all opacity-50 cursor-not-allowed"
                      title="Coming Soon"
                    >
                      <PenTool size={16} className="text-neutral-500" />
                      <div className="min-w-0 flex-1">
                        <div className="font-sans font-medium text-xs flex justify-between items-center">
                          Manga Studio
                          <span className="text-[8px] font-mono bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded ml-2">SOON</span>
                        </div>
                        <div className="font-sans text-[9px] text-neutral-500 truncate">Visualize your chapters</div>
                      </div>
                    </button>

                    {/* Qi Battles Mock */}
                    <button
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all opacity-50 cursor-not-allowed"
                      title="Coming Soon"
                    >
                      <Sword size={16} className="text-neutral-500" />
                      <div className="min-w-0 flex-1">
                        <div className="font-sans font-medium text-xs flex justify-between items-center">
                          Qi Battles
                          <span className="text-[8px] font-mono bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded ml-2">SOON</span>
                        </div>
                        <div className="font-sans text-[9px] text-neutral-500 truncate">Test your cultivation realm</div>
                      </div>
                    </button>
                  </div>

                  {/* Subtle Footer */}
                  <div className="p-2 bg-neutral-950 border-t border-portal/10 text-center">
                    <span className="font-sc font-medium text-[8px] text-neutral-600 tracking-wider">SEIHouse Core Infinitum</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};
