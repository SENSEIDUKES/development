import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Play, Loader2, Volume2, VolumeX, User, Ghost, Swords, MapPin, Zap } from 'lucide-react';
import { WorldCardEvent } from '../types';
import { resolveCardSound } from '../lib/audio/cardSoundCatalog';
import { playCardSound, stopCardSound } from '../lib/audio/cardSoundPlayer';
import { effectiveChannelVolume, isChannelAudible } from '../lib/audio/audioMixSettings';

interface WorldEntityCardProps {
  card: WorldCardEvent;
}

export const WorldEntityCard: React.FC<WorldEntityCardProps> = React.memo(({ card }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);

  const isSfxCard = card.audioType !== 'tts_line';

  // Curated catalog only: the card either maps to an approved asset or shows
  // a clear unavailable state. Nothing is generated or fetched as a
  // replacement, and chapter logic never picks the filename.
  const soundAsset = useMemo(
    () => (isSfxCard ? resolveCardSound(card) : null),
    [card, isSfxCard],
  );
  const soundUnavailable = isSfxCard && (!soundAsset || playbackFailed);

  // Unmount cleanup: a card that leaves the DOM mid-playback (chapter change,
  // navigation) must not leave its sound or quote running with no way to stop
  // it. Refs keep the cleanup effect mount-once so play/stop transitions never
  // re-run it, and the speechSynthesis cancel only fires while this card's own
  // quote is the active speech — never against story narration.
  const playbackStateRef = useRef({ isPlaying, isSfxCard, soundAsset });
  useEffect(() => {
    playbackStateRef.current = { isPlaying, isSfxCard, soundAsset };
  }, [isPlaying, isSfxCard, soundAsset]);

  useEffect(() => {
    return () => {
      const { isPlaying: playing, isSfxCard: sfx, soundAsset: asset } = playbackStateRef.current;
      if (!playing) return;
      if (sfx && asset) {
        stopCardSound(asset.id);
      } else if (!sfx && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const addToast = (message: string, type?: string) => {
    const event = new CustomEvent('seihouse-toast', { detail: { message, type } });
    window.dispatchEvent(event);
  };

  // Intentional entity sound: plays the curated asset directly on the user's
  // tap. Deliberately touches neither speechSynthesis (so narration is never
  // interrupted) nor the cinematic governor / narrative-cue bus (so a tap can
  // never spend the chapter's automatic cue budget).
  const handlePlaySfx = async () => {
    if (!soundAsset) return;

    if (isPlaying) {
      stopCardSound(soundAsset.id);
      setIsPlaying(false);
      return;
    }

    // Entity sounds are Audio Cues: both the master switch and the Audio
    // Cues switch (and their volumes) apply.
    if (!isChannelAudible('cues')) {
      addToast('Audio is muted — unmute in immersion settings to hear this echo.', 'info');
      return;
    }

    setIsLoading(true);
    try {
      // Repeated taps replay the same cached element for this asset id.
      const element = await playCardSound(soundAsset, { volume: effectiveChannelVolume('cues') });
      setIsLoading(false);
      setIsPlaying(true);
      element.onended = () => setIsPlaying(false);
      element.onerror = () => {
        setIsPlaying(false);
        setPlaybackFailed(true);
      };
    } catch (error) {
      console.warn('World Card sound playback failed:', error);
      setIsLoading(false);
      setIsPlaying(false);
      setPlaybackFailed(true);
      addToast('This echo is unavailable right now.', 'error');
    }
  };

  const handlePlayTts = async () => {
    if (isPlaying) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      return;
    }

    if (!card.audioText) return;

    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const synth = window.speechSynthesis;
        synth.cancel(); // Cancel any ongoing speech

        const utterance = new SpeechSynthesisUtterance(card.audioText);

        // Try to find a good voice if we can
        const voices = synth.getVoices();
        if (voices.length > 0) {
          // Very simple mapping heuristic based on entityType/name if voicePreset is missing
          const isFemale = card.entityName.toLowerCase().match(/(mei|lian|xue|yin|girl|woman|sister|mother|empress|queen)/i);
          const preferredVoice = voices.find(v =>
            v.lang.includes('en') &&
            (isFemale ? v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira')
                      : v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('guy'))
          ) || voices.find(v => v.lang.includes('en')) || voices[0];

          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }
        }

        utterance.rate = 0.9;
        utterance.pitch = card.entityType === 'creature' ? 0.5 : (card.entityName.match(/(mei|lian|xue|yin|girl|woman|sister|mother|empress|queen)/i) ? 1.2 : 0.9);

        utterance.onstart = () => {
          setIsLoading(false);
          setIsPlaying(true);
        };

        utterance.onend = () => {
          setIsPlaying(false);
        };

        utterance.onerror = () => {
          setIsLoading(false);
          setIsPlaying(false);
          addToast("Voice manifestation failed.", "error");
        };

        synth.speak(utterance);
      } else {
        setIsLoading(false);
        addToast("Your artifact does not support spiritual resonance (TTS).", "error");
      }
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      setIsPlaying(false);
      addToast("The spiritual resonance was disrupted.", "error");
    }
  };

  const handlePlay = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (isSfxCard) {
      void handlePlaySfx();
    } else {
      void handlePlayTts();
    }
  };

  const getIcon = () => {
    switch (card.entityType) {
      case 'character': return <User size={16} className="text-portal" />;
      case 'creature': return <Ghost size={16} className="text-[#8B0000]" />;
      case 'artifact': return <Swords size={16} className="text-[#d4af37]" />;
      case 'location': return <MapPin size={16} className="text-[#8b5a2b]" />;
      case 'system': return <Zap size={16} className="text-[#04ACFF]" />;
      default: return <Volume2 size={16} className="text-neutral-400" />;
    }
  };

  const showSoundButton = isSfxCard || !!card.audioText;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="my-6 sm:my-8 mx-auto w-full max-w-[calc(100vw-2rem)] sm:max-w-md bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden shadow-2xl relative group"
    >
      {/* Subtle Glow Background based on type */}
      <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-neutral-800 to-transparent pointer-events-none" />

      {card.imageUrl && (
        <div className="w-full aspect-[21/9] bg-neutral-900 border-b border-neutral-800 relative overflow-hidden">
           <img src={card.imageUrl} alt={card.entityName} className="w-full h-full object-cover opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700" />
           <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        </div>
      )}

      <div className="p-5 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getIcon()}
            <span className="font-sc text-xs tracking-[0.2em] text-neutral-400 uppercase">
              {card.entityType}
            </span>
          </div>
        </div>

        <h3 className="font-sans font-medium text-lg text-signal mb-1 tracking-tight">
          {card.displayTitle || card.entityName}
        </h3>

        {card.quote && (
          <blockquote className="font-serif italic text-neutral-400 text-sm mb-4 border-l-2 border-neutral-800 pl-3">
            "{card.quote}"
          </blockquote>
        )}

        {showSoundButton && (soundUnavailable ? (
          <div
            role="status"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 min-h-[48px] rounded-lg bg-neutral-950 border border-dashed border-neutral-800 text-sm font-sans font-medium text-neutral-500 cursor-not-allowed select-none"
          >
            <VolumeX size={16} className="text-neutral-600" />
            Echo Unavailable
          </div>
        ) : (
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handlePlay}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 min-h-[48px] rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition-all text-sm font-sans font-medium text-signal touch-manipulation active:scale-[0.98]"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin text-portal" />
            ) : isPlaying ? (
              <Volume2 size={16} className="text-portal animate-pulse" />
            ) : (
              <Play size={16} className="text-neutral-400 group-hover:text-signal" />
            )}
            {isPlaying ? 'Resonating...' : isLoading ? 'Channeling...' : 'Tap to Listen'}
          </button>
        ))}
      </div>
    </motion.div>
  );
});
