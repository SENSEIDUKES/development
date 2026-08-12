import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, MapPin, Swords, User, Loader2 } from 'lucide-react';
import { Character, Faction, Artifact, Location } from './types';
import { useAppStore } from './codexCompatibility';

interface CodexHovercardProps {
  term: string;
  type: 'character' | 'faction' | 'artifact' | 'location';
  entry: Character | Faction | Artifact | Location;
  children: React.ReactNode;
}

export const CodexHovercard: React.FC<CodexHovercardProps> = ({ type, entry, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const persistedImageUrl = 'imageUrl' in entry ? entry.imageUrl : undefined;
  const imageAssetId = entry.imageAssetId;
  const [localImageUrl, setLocalImageUrl] = useState<string>();
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const imageUrl = persistedImageUrl || localImageUrl;

  const handleManifest = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isGeneratingImage) return;
    setIsGeneratingImage(true);
    try {
      await Promise.resolve();
      const safeName = entry.name.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
      }[character] || character));
      const hue = [...entry.id].reduce((total, character) => total + character.charCodeAt(0), 0) % 360;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="384" viewBox="0 0 768 384"><defs><radialGradient id="a"><stop stop-color="hsl(${hue} 70% 32%)"/><stop offset="1" stop-color="#03050a"/></radialGradient></defs><rect width="768" height="384" fill="url(#a)"/><circle cx="384" cy="160" r="105" fill="none" stroke="hsla(${hue} 90% 75% / .4)"/><text x="384" y="315" text-anchor="middle" fill="#fafafa" font-family="serif" font-size="34" letter-spacing="3">${safeName}</text></svg>`;
      setLocalImageUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const activeStoryId = useAppStore((state) => state.activeStoryId);
  const activeStory = useAppStore((state) =>
    state.stories.find((s) => s.id === activeStoryId)
  );

  const getDynamicTheme = () => {
    const fallback = {
      text: 'text-portal',
      bg: 'bg-portal/10',
      border: 'border-portal/30',
      hoverBg: 'hover:bg-portal/20',
      icon: 'text-portal'
    };

    if (type === 'character') {
      const char = entry as Character;
      const rel = (char.relationshipToMC || '').toLowerCase();
      const role = (char.role || '').toLowerCase();
      const isMC = activeStory?.mcName === char.name || rel.includes('self') || role.includes('main character') || rel.includes('mc');

      if (isMC) {
        return fallback; // Blue
      } else if (rel.includes('lover') || rel.includes('wife') || rel.includes('husband') || rel.includes('fiance') || rel.includes('partner') || rel.includes('spouse') || rel.includes('concubine') || rel.includes('dao companion')) {
        return { text: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/30', hoverBg: 'hover:bg-pink-400/20', icon: 'text-pink-400' };
      } else if (rel.includes('mentor') || rel.includes('master') || rel.includes('teacher') || role.includes('mentor') || role.includes('elder')) {
        return { text: 'text-[#d4af37]', bg: 'bg-[#d4af37]/10', border: 'border-[#d4af37]/30', hoverBg: 'hover:bg-[#d4af37]/20', icon: 'text-[#d4af37]' };
      } else if (rel.includes('friend') || rel.includes('ally') || rel.includes('brother') || rel.includes('sister') || rel.includes('companion') || rel.includes('comrade')) {
        return { text: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30', hoverBg: 'hover:bg-green-400/20', icon: 'text-green-400' };
      } else if (rel.includes('enemy') || rel.includes('rival') || rel.includes('nemesis') || rel.includes('antagonist') || rel.includes('hostile') || rel.includes('villain')) {
        return { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', hoverBg: 'hover:bg-red-500/20', icon: 'text-red-500' };
      } else if (rel.includes('unknown') || rel.includes('stranger') || rel.includes('neutral') || rel.includes('mystery')) {
        return { text: 'text-neutral-400', bg: 'bg-neutral-400/10', border: 'border-neutral-400/30', hoverBg: 'hover:bg-neutral-400/20', icon: 'text-neutral-400' };
      }
      return fallback;
    }

    if (type === 'location') {
      const loc = entry as Location;
      const desc = (loc.description || '').toLowerCase();
      const safety = (loc.safetyLevel || '').toLowerCase();
      const realm = (loc.realm || '').toLowerCase();

      const isSpecial = desc.includes('special') || desc.includes('sacred') || desc.includes('divine') || desc.includes('secret') || desc.includes('hidden') || desc.includes('forbidden') || realm.includes('divine') || realm.includes('heaven') || safety.includes('lethal');

      if (isSpecial) {
        return { text: 'text-[#d4af37]', bg: 'bg-[#d4af37]/10', border: 'border-[#d4af37]/30', hoverBg: 'hover:bg-[#d4af37]/20', icon: 'text-[#d4af37]' };
      }
      return { text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30', hoverBg: 'hover:bg-purple-400/20', icon: 'text-purple-400' };
    }

    if (type === 'artifact') {
      const art = entry as Artifact;
      const tier = (art.tier || '').toLowerCase();
      const desc = (art.description || '').toLowerCase();

      if (tier.includes('legendary') || tier.includes('divine') || tier.includes('mythic') || tier.includes('primordial') || tier.includes('supreme')) {
        return { text: 'text-[#d4af37]', bg: 'bg-[#d4af37]/10', border: 'border-[#d4af37]/30', hoverBg: 'hover:bg-[#d4af37]/20', icon: 'text-[#d4af37]' };
      } else if (tier.includes('great') || tier.includes('epic') || tier.includes('heaven') || tier.includes('saint')) {
        return { text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', hoverBg: 'hover:bg-orange-400/20', icon: 'text-orange-400' };
      } else if (tier.includes('good') || tier.includes('rare') || tier.includes('earth') || tier.includes('spirit')) {
        return { text: 'text-[#04ACFF]', bg: 'bg-[#04ACFF]/10', border: 'border-[#04ACFF]/30', hoverBg: 'hover:bg-[#04ACFF]/20', icon: 'text-[#04ACFF]' };
      } else if (tier.includes('decent') || tier.includes('uncommon') || tier.includes('mortal') || tier.includes('profane')) {
        return { text: 'text-[#0f5132]', bg: 'bg-[#0f5132]/20', border: 'border-[#0f5132]/40', hoverBg: 'hover:bg-[#0f5132]/40', icon: 'text-[#0f5132]' };
      } else if (tier.includes('basic') || tier.includes('common') || tier.includes('trash') || tier === '') {
        // Since many default to empty tier, we'll check description for keywords just in case, but default to Basic White
        if (desc.includes('legendary') || desc.includes('divine')) {
          return { text: 'text-[#d4af37]', bg: 'bg-[#d4af37]/10', border: 'border-[#d4af37]/30', hoverBg: 'hover:bg-[#d4af37]/20', icon: 'text-[#d4af37]' };
        }
        return { text: 'text-white', bg: 'bg-white/10', border: 'border-white/30', hoverBg: 'hover:bg-white/20', icon: 'text-white' };
      }
      return { text: 'text-white', bg: 'bg-white/10', border: 'border-white/30', hoverBg: 'hover:bg-white/20', icon: 'text-white' };
    }

    if (type === 'faction') {
      return { text: 'text-[#b9d6c1]', bg: 'bg-[#0f5132]/20', border: 'border-[#0f5132]/30', hoverBg: 'hover:bg-[#0f5132]/40', icon: 'text-[#0f5132]' };
    }

    return fallback;
  };

  const theme = getDynamicTheme();

  const getIcon = () => {
    switch (type) {
      case 'character': return <User size={14} className={theme.icon} />;
      case 'faction': return <Shield size={14} className={theme.icon} />;
      case 'artifact': return <Swords size={14} className={theme.icon} />;
      case 'location': return <MapPin size={14} className={theme.icon} />;
      default: return null;
    }
  };

  const getBorderColor = () => theme.border;

  const getTextStyles = () => {
    const highlightStyle = activeStory?.readerPreferences?.highlightStyle || 'full';
    if (highlightStyle === 'underline') {
      return `${theme.text} font-medium px-0.5 cursor-pointer transition-colors border-b border-dashed ${theme.border} hover:bg-neutral-800/10`;
    } else if (highlightStyle === 'tint') {
      return `${theme.text} font-medium px-0.5 cursor-pointer transition-all duration-300 hover:bg-neutral-800/10 rounded-sm`;
    }
    return `${theme.text} ${theme.bg} font-medium px-1 rounded-sm cursor-pointer ${theme.hoverBg} transition-colors border-b ${theme.border}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <span className="relative inline-block" ref={containerRef}>
      <span
        className={getTextStyles()}
        onClick={handleToggle}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleToggle(e);
        }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (handleToggle)(e as any); } }}
      >
        {children}
      </span>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-[100] top-full mt-2 left-1/2 -translate-x-1/2 w-64 p-3 bg-void border rounded-xl shadow-2xl backdrop-blur-md ${getBorderColor()}`}
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ((e) => e.stopPropagation())(e as any); } }}
          >
            {imageUrl ? (
              <div className="w-full aspect-[2/1] mb-2.5 overflow-hidden rounded-lg bg-neutral-900 border border-neutral-800 flex-shrink-0">
                <img
                  src={imageUrl}
                  alt={entry.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              !imageAssetId && (
                <button
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleManifest}
                  disabled={isGeneratingImage}
                  aria-label={isGeneratingImage ? `Summoning portrait for ${entry.name}` : `Manifest portrait for ${entry.name}`}
                  className="relative w-full aspect-[2/1] mb-2.5 overflow-hidden rounded-lg bg-[#010b14] border border-portal/40 hover:border-portal flex flex-col items-center justify-center cursor-pointer transition-all duration-500 group/manifest shadow-[0_0_15px_rgba(4,172,255,0.15)] hover:shadow-[0_0_25px_rgba(4,172,255,0.35)]"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(4,172,255,0.18)_0%,transparent_70%)] animate-pulse pointer-events-none" />
                  <div className="absolute w-20 h-20 rounded-full border border-dashed border-portal/25 animate-[spin_12s_linear_infinite] group-hover/manifest:border-portal/50" />
                  <div className="absolute w-[88px] h-[88px] rounded-full border border-dotted border-portal/15 animate-[spin_20s_linear_infinite_reverse]" />

                  {isGeneratingImage ? (
                    <div className="flex flex-col items-center gap-1.5 z-10">
                      <Loader2 size={18} className="text-portal animate-spin" />
                      <span className="font-mono text-[10px] text-portal/90 uppercase tracking-widest animate-pulse font-medium">
                        Summoning...
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 z-10 transition-transform duration-300 group-hover/manifest:scale-105">
                      <span className="text-portal text-sm group-hover/manifest:animate-bounce">✦</span>
                      <span className="font-sc text-xs text-signal tracking-widest font-bold uppercase">
                        Manifest
                      </span>
                      <span className="font-mono text-[9px] text-neutral-500 tracking-wider">
                        Awaken Aetherial Portrait
                      </span>
                    </div>
                  )}
                </button>
              )
            )}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-neutral-800 flex-wrap">
              {getIcon()}
              <span className="font-display font-medium text-sm text-signal">
                {entry.name}
              </span>
            </div>

            <p className="text-xs text-neutral-400 font-sans leading-relaxed line-clamp-4">
              {entry.description}
            </p>

            {type === 'character' && (entry as Character).role && (
              <div className="mt-2 text-[10px] text-portal uppercase tracking-wider font-bold">
                {(entry as Character).role}
              </div>
            )}
            {type === 'artifact' && (entry as Artifact).tier && (
              <div className="mt-2 text-[10px] text-[#d4af37] uppercase tracking-wider font-bold">
                Tier: {(entry as Artifact).tier}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};
