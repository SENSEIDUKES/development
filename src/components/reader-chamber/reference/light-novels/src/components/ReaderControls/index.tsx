import React from 'react';
import { ListMusic } from 'lucide-react';
import { ReaderControlsProps } from './types';
import { ImmersionSettings } from './ImmersionSettings';
import { PlaybackControls } from './PlaybackControls';
import { ChapterNavigation } from './ChapterNavigation';

export function ReaderControls({
  selectedChapter,
  navigation,
  playback,
  audio,
  immersion,
  actions
}: ReaderControlsProps) {
  const { onSwitchTab } = navigation;
  const { isPlayingText, isPausedText, readerMode } = playback;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-900 z-40 px-4 py-2 sm:py-3 pb-6 sm:pb-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="max-w-4xl mx-auto">
        {/* Mobile View: Ultra-sleek compact player navigation row */}
        <div className="flex sm:hidden items-center justify-between w-full">
           {/* Left: Settings & Codex */}
           <div className="flex items-center gap-2">
              <ImmersionSettings
                audio={audio}
                immersion={immersion}
                actions={actions}
                isMobile
              />
              <button
                onClick={() => onSwitchTab && onSwitchTab("codex")}
                aria-label="Open Codex"
                className="p-2 border border-neutral-800 rounded-full bg-void text-neutral-400 hover:text-portal transition-colors focus:outline-none"
                title="Codex"
              >
                <ListMusic size={16} />
              </button>
           </div>

           {/* Center: Play/Pause Vinyl Disc */}
           <div className="flex items-center justify-center relative shrink-0">
              <PlaybackControls selectedChapter={selectedChapter} playback={playback} />
           </div>

           {/* Right: Alter Fate & Chapter Nav */}
           <ChapterNavigation navigation={navigation} actions={actions} />
        </div>

        {/* Desktop View (Hidden on Mobile) */}
        <div className="hidden sm:flex flex-row items-center justify-between gap-4">
          {/* TTS Audio Controls */}
          <div className="flex items-center space-x-4">
            {/* Desktop Cosmic Vinyl/Reciter Disk */}
            <PlaybackControls selectedChapter={selectedChapter} playback={playback} isDesktop />

            {/* Title & Info */}
            <div>
              <p className="font-sc font-bold text-signal text-[10px] tracking-widest uppercase flex items-center gap-1.5">
                <span>
                  {isPlayingText && !isPausedText
                    ? "Rhythmic Recitation Active"
                    : "Listen to Chapter"}
                </span>
                {readerMode === 'basic-tts' && isPlayingText && (
                  <span className="text-[7.5px] uppercase font-mono tracking-wider text-[#000000] bg-portal px-1 rounded font-bold">
                    Basic Narration
                  </span>
                )}
              </p>
              <p className="font-sans text-[10px] text-neutral-500">
                Chapter {navigation.selectedChapterNum}
              </p>
            </div>

            {/* Settings Toggle */}
            <div className="relative ml-2">
              <ImmersionSettings
                audio={audio}
                immersion={immersion}
                actions={actions}
              />
            </div>
          </div>

          <ChapterNavigation navigation={navigation} actions={actions} isDesktop />
        </div>
      </div>
    </div>
  );
}
