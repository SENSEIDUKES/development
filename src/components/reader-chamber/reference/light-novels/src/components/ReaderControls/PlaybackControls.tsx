import React from 'react';
import { Play, Pause } from 'lucide-react';
import { Chapter } from '../../types';
import { PlaybackState } from './types';

interface Props {
  selectedChapter: Chapter;
  playback: PlaybackState;
  isDesktop?: boolean;
}

const BASE_DISC_CLASSES = "absolute inset-0 rounded-full border border-neutral-850 bg-[#000000] transition-transform duration-[4000ms] ease-linear overflow-hidden";

export function PlaybackControls({ selectedChapter, playback, isDesktop = false }: Props) {
  const { isPlayingText, isPausedText, handleTogglePlayback, playerStyle } = playback;

  const hasContent = selectedChapter.generatedContent || (selectedChapter.blocks && selectedChapter.blocks.length > 0);
  const playbackLabel = !hasContent
    ? "Awaiting chapter content..."
    : isPlayingText && !isPausedText
      ? "Stop Audio Playback"
      : "Begin Rhythmic Recitation";

  const isPlaying = isPlayingText && !isPausedText;

  const desktopClasses = `${BASE_DISC_CLASSES} shadow-[0_0_20px_rgba(4,172,255,0.1)] ${
    isPlaying ? "animate-spin" : "group-hover/disc:rotate-12"
  }`;

  const mobileClasses = `${BASE_DISC_CLASSES} shadow-[0_0_20px_rgba(4,172,255,0.12)] ${
    isPlaying ? "animate-spin" : "group-hover/disc:rotate-12"
  }`;

  const currentStyle = playerStyle || 'vinyl';

  return (
    <div className={`relative group/disc flex items-center justify-center select-none shrink-0 animate-duration-[4000ms] ${isDesktop ? 'h-16 w-16' : 'h-14 w-14'}`}>

      {currentStyle === 'vinyl' && (
        <div className={isDesktop ? desktopClasses : mobileClasses}>
          {isDesktop ? (
            <>
              {/* Concentric sound record grooves */}
              <div className="absolute inset-1.5 rounded-full border border-dashed border-neutral-900/60" />
              <div className="absolute inset-3 rounded-full border border-double border-neutral-900/40" />
              <div className="absolute inset-4.5 rounded-full border border-neutral-900/20" />

              {/* Floating consciousness pulse tracks */}
              {isPlaying && (
                <>
                  <div className="absolute top-[4px] left-[26px] right-[26px] h-[1.5px] bg-[#04ACFF]/30 animate-pulse" />
                  <div className="absolute bottom-[4px] left-[26px] right-[26px] h-[1.5px] bg-[#8B0000]/30 animate-pulse [animation-delay:200ms]" />
                  <div className="absolute left-[4px] top-[26px] bottom-[26px] w-[1.5px] bg-[#04ACFF]/30 animate-pulse [animation-delay:400ms]" />
                  <div className="absolute right-[4px] top-[26px] bottom-[26px] w-[1.5px] bg-[#8B0000]/30 animate-pulse [animation-delay:600ms]" />
                </>
              )}
            </>
          ) : (
            <>
              {/* High-fidelity vinyl ridges */}
              <div className="absolute inset-[3px] rounded-full border border-dashed border-neutral-850/80" />
              <div className="absolute inset-[6px] rounded-full border border-double border-neutral-900/60" />
              <div className="absolute inset-[10px] rounded-full border border-neutral-900/40" />
              <div className="absolute inset-[15px] rounded-full border border-dashed border-neutral-900/20" />

              {/* Floating consciousness pulse tracks / laser sheen effect */}
              {isPlaying ? (
                <>
                  <div className="absolute top-0 bottom-0 left-[27px] w-[2px] bg-gradient-to-b from-transparent via-[#04ACFF]/50 to-transparent rotate-45 transform origin-center" />
                  <div className="absolute top-0 bottom-0 left-[27px] w-[2px] bg-gradient-to-b from-transparent via-[#8B0000]/50 to-transparent -rotate-45 transform origin-center" />
                  <div className="absolute inset-[12px] rounded-full border-2 border-portal/20 animate-pulse" />
                </>
              ) : (
                <div className="absolute top-0 bottom-0 left-[27px] w-[2px] bg-gradient-to-b from-transparent via-neutral-700/40 to-transparent rotate-30 transform origin-center" />
              )}
            </>
          )}
        </div>
      )}

      {currentStyle === 'minimal' && (
        <div className="absolute inset-0 rounded-full border border-neutral-850 bg-[#000000] transition-colors" />
      )}

      {currentStyle === 'ethereal' && (
        <div className={`absolute inset-0 rounded-full border border-portal/20 bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-portal/30 via-transparent to-portal/10 blur-[2px] transition-opacity duration-700 ${isPlaying ? 'opacity-100 animate-[spin_8s_linear_infinite]' : 'opacity-60'}`} />
      )}

      {/* Central audio touch Core key */}
      <button type="button" onClick={handleTogglePlayback}
        disabled={!hasContent}
        className={`absolute rounded-full flex items-center justify-center transition-all z-10 focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 focus-visible:ring-offset-[#000000] outline-none disabled:cursor-not-allowed ${isDesktop ? 'h-10 w-10' : 'h-8 w-8'} ${
          !hasContent
            ? "bg-neutral-900 text-neutral-600 border border-neutral-800 shadow-none"
            : isPlayingText && !isPausedText
              ? `bg-[#8B0000] text-[#FAFAFA] border border-[#fafafa]/25 shadow-[0_0_${isDesktop ? '15px' : '12px'}_rgba(139,0,0,0.${isDesktop ? '6' : '8'})] hover:scale-105`
              : `bg-[#04ACFF] text-[#000000] border border-[#fafafa]/15 shadow-[0_0_${isDesktop ? '15px' : '12px'}_rgba(4,172,255,0.${isDesktop ? '6' : '8'})] hover:scale-105`
        }`}
        title={playbackLabel}
        aria-label={playbackLabel}
      >
        {isPlayingText && !isPausedText ? (
          <Pause size={isDesktop ? 15 : 12} fill="currentColor" className="text-[#FAFAFA]" />
        ) : (
          <Play size={isDesktop ? 15 : 12} fill="currentColor" className="ml-0.5 text-[#000000]" />
        )}
      </button>
    </div>
  );
}
