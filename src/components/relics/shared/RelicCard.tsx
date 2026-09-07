import React from 'react';
import { Award, Sparkles, HelpCircle, Shield, Zap, RefreshCw, Save, Sliders, Compass, Globe, Key } from 'lucide-react';
import { CosmicArtifact } from './types';

interface RelicCardProps {
  artifact: CosmicArtifact;
  onClick: (artifact: CosmicArtifact) => void;
}

export const renderArtifactIcon = (name: string, rarity: string, size: number = 20) => {
  const lower = name.toLowerCase();
  let className = "";
  
  if (rarity === 'Transcendent') className = "text-cyan-400 animate-pulse drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]";
  else if (rarity === 'Mythic') className = "text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]";
  else if (rarity === 'Legendary') className = "text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]";
  else if (rarity === 'Epic') className = "text-purple-400";
  else if (rarity === 'Rare') className = "text-emerald-400";
  else className = "text-neutral-500";

  if (lower.includes('medallion') || lower.includes('badge')) return <Award size={size} className={className} />;
  if (lower.includes('seal') || lower.includes('signet')) return <Shield size={size} className={className} />;
  if (lower.includes('gourd') || lower.includes('nectar') || lower.includes('cauldron') || lower.includes('potion')) return <Zap size={size} className={className} />;
  if (lower.includes('spindle') || lower.includes('thread') || lower.includes('matrix')) return <RefreshCw size={size} className={className} />;
  if (lower.includes('pen') || lower.includes('brush') || lower.includes('scribe')) return <Save size={size} className={className} />;
  if (lower.includes('crown') || lower.includes('circlet') || lower.includes('tiara')) return <Sliders size={size} className={className} />;
  if (lower.includes('compass')) return <Compass size={size} className={className} />;
  if (lower.includes('mirror')) return <Globe size={size} className={className} />;
  if (lower.includes('key')) return <Key size={size} className={className} />;
  return <Sparkles size={size} className={className} />;
};

export function RelicCard({ artifact: art, onClick }: RelicCardProps) {
  const isTranscendent = art.rarity === 'Transcendent';
  const isMythic = art.rarity === 'Mythic';
  const isLegendary = art.rarity === 'Legendary';
  const isEpic = art.rarity === 'Epic';
  const isRare = art.rarity === 'Rare';

  let borderClass = 'border-neutral-900 hover:border-neutral-800';
  let bgGlowClass = 'bg-[#030303]';
  let rarityTextClass = 'text-neutral-400';

  if (isTranscendent) {
    borderClass = 'border-cyan-500/30 hover:border-cyan-400/50';
    bgGlowClass = 'bg-cyan-950/5 shadow-[0_0_20px_rgba(6,182,212,0.15)]';
    rarityTextClass = 'bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-rose-400 to-yellow-400 font-extrabold animate-pulse';
  } else if (isMythic) {
    borderClass = 'border-red-950/60 hover:border-red-500/30';
    bgGlowClass = 'bg-red-950/5 shadow-[0_0_15px_rgba(220,38,38,0.1)]';
    rarityTextClass = 'text-red-400 font-extrabold animate-pulse';
  } else if (isLegendary) {
    borderClass = 'border-amber-950/80 hover:border-amber-500/30';
    bgGlowClass = 'bg-amber-950/5 shadow-[0_0_12px_rgba(245,158,11,0.08)]';
    rarityTextClass = 'text-amber-400 font-bold';
  } else if (isEpic) {
    borderClass = 'border-purple-950/80 hover:border-purple-500/20';
    bgGlowClass = 'bg-purple-950/5 shadow-[0_0_10px_rgba(139,92,246,0.05)]';
    rarityTextClass = 'text-purple-400';
  } else if (isRare) {
    borderClass = 'border-emerald-950/80 hover:border-emerald-500/20';
    bgGlowClass = 'bg-emerald-950/5';
    rarityTextClass = 'text-emerald-400';
  }

  return (
    <button
      type="button"
      className={`text-left w-full border rounded-xl p-4 flex flex-col justify-between transition-all duration-300 relative group cursor-pointer ${borderClass} ${bgGlowClass}`}
      onClick={() => onClick(art)}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-black/40 border border-neutral-900 flex items-center justify-center relative overflow-hidden group-hover:border-neutral-850 transition-all shrink-0">
            {renderArtifactIcon(art.name, art.rarity)}
          </div>
          <div className="min-w-0">
            <h4 className="text-[13px] font-sans font-medium text-signal truncate group-hover:text-portal transition-colors flex items-center gap-1.5">
              {art.name}
            </h4>
            <span className={`text-[9px] uppercase tracking-widest font-mono font-medium block ${rarityTextClass}`}>
              {art.rarity}
            </span>
          </div>
        </div>

        <p className="text-[11px] font-serif text-neutral-400 line-clamp-2 leading-relaxed italic">
          "{art.description}"
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-neutral-900/40 flex items-center justify-between text-[9px] text-neutral-500 font-mono">
        <div className="flex items-center gap-1 text-portal/90">
          <Zap size={10} />
          <span>+{art.rewardValueQi || 0} Qi</span>
          <Award size={10} className="ml-1" />
          <span>+{art.rewardValueSectMerit || 0} Merit</span>
        </div>
        <span className="text-neutral-600 truncate max-w-[100px] text-right">
          {art.milestoneName}
        </span>
      </div>
    </button>
  );
}
