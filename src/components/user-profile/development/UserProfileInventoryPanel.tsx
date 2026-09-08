import React, { useState } from 'react';
import { UserProfile as UserProfileType, CosmicArtifact } from '../shared/types';
import { Award, Sparkles, HelpCircle, Shield, Zap, RefreshCw, Save, Sliders, Compass, Globe, Key, Library, Archive } from 'lucide-react';
import { getCurrentOfferingWeekId } from '../shared/offeringWeek';
import { useUserProfileServices } from '../shared/userProfileServices';

interface UserProfileInventoryPanelProps {
  profile: UserProfileType | null;
  handleAttuneArtifact: (artifactId: string) => Promise<void>;
}

// Performance Optimization: Cache Intl.DateTimeFormat at module level to avoid costly recreation during render loops
const dateFormatter = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
const safeFormatDate = (dateVal: any) => {
  if (!dateVal) return 'Unknown';
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? 'Unknown' : dateFormatter.format(d);
};

export function UserProfileInventoryPanel({ profile, handleAttuneArtifact }: UserProfileInventoryPanelProps) {
  const [inspectArtifact, setInspectArtifact] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewHistory, setViewHistory] = useState(false);
  // Production imports `submitCurrentWeekOfferings` from `lib/artifacts`, which
  // writes the account's inventory. It arrives through the services port here.
  const { submitCurrentWeekOfferings } = useUserProfileServices();

  const artifacts = profile?.cosmicInventory || [];
  const currentWeek = getCurrentOfferingWeekId();

  const unsubmitted = artifacts.filter(art => art.status === 'unsubmitted' || (!art.status && art.offeringWeekId === currentWeek));
  const submittedHistory = artifacts.filter(art => art.status === 'submitted' || art.status === 'auto_submitted').sort((a, b) => new Date(b.gatheredAt || b.unlockedAt).getTime() - new Date(a.gatheredAt || a.unlockedAt).getTime());

  const totalRewardQi = unsubmitted.reduce((acc, art) => acc + (art.rewardValueQi || 0), 0);
  const totalRewardSectMerit = unsubmitted.reduce((acc, art) => acc + (art.rewardValueSectMerit || 0), 0);

  const handleSubmitOfferings = async () => {
    setIsSubmitting(true);
    try {
      await submitCurrentWeekOfferings();
      // AppStore listener handles the state update if it was done locally or via cloud sync
    } catch(err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderArtifactIcon = (name: string, rarity: string) => {
    const lower = name.toLowerCase();
    const size = 20;
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

  const renderGrid = (items: CosmicArtifact[]) => {
    return items.map((art) => {
      const isTranscendent = art.rarity === 'Transcendent';
      const isMythic = art.rarity === 'Mythic';
      const isLegendary = art.rarity === 'Legendary';
      const isEpic = art.rarity === 'Epic';
      const isRare = art.rarity === 'Rare';

      let borderClass = 'border-neutral-900 hover:border-neutral-800';
      let bgGlowClass = 'bg-[#030303]';
      let rarityTextClass = 'text-neutral-500';

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
          key={art.id}
          className={`text-left w-full border rounded-xl p-4 flex flex-col justify-between transition-all duration-300 relative group cursor-pointer ${borderClass} ${bgGlowClass}`}
          onClick={() => setInspectArtifact(art)}
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
            <div className="flex items-center gap-1 text-portal/70">
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
    });
  };

  return (
    <>
      <div className="pt-10 border-t border-neutral-900/50 mt-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-[11px] uppercase font-bold tracking-widest text-neutral-500 font-sc flex items-center gap-2">
            <Library size={14} className="text-portal animate-pulse" />
            Celestial Library Offering Hall
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setViewHistory(!viewHistory)}
              className="text-[10px] text-neutral-400 font-mono bg-neutral-900/40 border border-neutral-850 px-3 py-1.5 rounded-full hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
            >
              {viewHistory ? <Sparkles size={11} className="text-portal" /> : <Archive size={11} className="text-neutral-400" />}
              <span>{viewHistory ? 'View Pouch' : 'View Submitted History'}</span>
            </button>
          </div>
        </div>

        {!viewHistory ? (
          <>
            <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-display text-signal">Weekly Offering Pouch</h4>
                <p className="text-[11px] text-neutral-400 font-mono mt-1 max-w-2xl">
                  The Celestial Library accepts all records of fate, battle, wisdom, and karma.
                  Offer your gathered relics to deepen your cultivation.
                </p>
                {unsubmitted.length > 0 && (
                  <div className="flex items-center gap-3 mt-3 text-[11px] font-mono text-portal">
                    <span className="flex items-center gap-1"><Zap size={12}/> +{totalRewardQi} Qi</span>
                    <span className="flex items-center gap-1"><Award size={12}/> +{totalRewardSectMerit} Sect Merit</span>
                  </div>
                )}
              </div>
              <button
                onClick={handleSubmitOfferings}
                disabled={unsubmitted.length === 0 || isSubmitting}
                className="px-5 py-2.5 bg-portal/10 border border-portal/30 text-portal rounded-lg font-sc uppercase tracking-widest text-xs font-bold hover:bg-portal hover:text-void transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Offerings'}
              </button>
            </div>

            {unsubmitted.length === 0 ? (
              <div className="border border-dashed border-neutral-900 rounded-xl p-8 text-center bg-black/10">
                <Library size={32} className="text-neutral-700 mx-auto mb-2.5" />
                <p className="text-xs font-serif text-neutral-500">
                  Your pouch is empty. Seal chapters, breakthrough bottlenecks, or survive challenges to gather relics.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {renderGrid(unsubmitted)}
              </div>
            )}
          </>
        ) : (
          <>
            {submittedHistory.length === 0 ? (
              <div className="border border-dashed border-neutral-900 rounded-xl p-8 text-center bg-black/10">
                <Archive size={32} className="text-neutral-700 mx-auto mb-2.5" />
                <p className="text-xs font-serif text-neutral-500">
                  You have not submitted any offerings to the Celestial Library yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {renderGrid(submittedHistory)}
              </div>
            )}
          </>
        )}
      </div>

      {inspectArtifact && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" 
          role="button"
          tabIndex={0}
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectArtifact(null);
          }}
          onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') setInspectArtifact(null); }}
        >
          <div 
            className="w-full max-w-md bg-void border border-neutral-900 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(4,172,255,0.1)] relative"
            role="dialog"
            aria-modal="true"
          >
            <div className={`absolute top-0 inset-x-0 h-[2px] ${
              inspectArtifact.rarity === 'Transcendent' 
                ? 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent' 
                : inspectArtifact.rarity === 'Mythic' 
                ? 'bg-gradient-to-r from-transparent via-red-500 to-transparent' 
                : inspectArtifact.rarity === 'Legendary' 
                ? 'bg-gradient-to-r from-transparent via-amber-500 to-transparent'
                : inspectArtifact.rarity === 'Epic'
                ? 'bg-gradient-to-r from-transparent via-purple-500 to-transparent'
                : inspectArtifact.rarity === 'Rare'
                ? 'bg-gradient-to-r from-transparent via-emerald-500 to-transparent'
                : 'bg-gradient-to-r from-transparent via-neutral-500 to-transparent'
            }`}></div>
            
            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-black/60 border border-neutral-900 flex items-center justify-center relative shadow-inner overflow-hidden">
                  {(() => {
                    const lower = inspectArtifact.name.toLowerCase();
                    const size = 28;
                    let className = "";
                    const rarity = inspectArtifact.rarity;
                    
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
                  })()}
                  <div className="absolute inset-0 bg-gradient-to-t from-portal/5 via-transparent to-transparent"></div>
                </div>
                
                <div className="space-y-1">
                  <span className={`text-[10px] uppercase font-bold tracking-widest font-mono block px-3 py-1 rounded-full bg-neutral-900/50 border border-neutral-850 max-w-fit mx-auto ${
                    inspectArtifact.rarity === 'Transcendent' 
                      ? 'text-cyan-400 border-cyan-950 bg-cyan-950/20' 
                      : inspectArtifact.rarity === 'Mythic' 
                      ? 'text-red-400 border-red-950 bg-red-950/20' 
                      : inspectArtifact.rarity === 'Legendary' 
                      ? 'text-amber-400 border-amber-950 bg-amber-950/20'
                      : inspectArtifact.rarity === 'Epic'
                      ? 'text-purple-400 border-purple-950 bg-purple-950/20'
                      : inspectArtifact.rarity === 'Rare'
                      ? 'text-emerald-400 border-emerald-950 bg-emerald-950/20'
                      : 'text-neutral-400'
                  }`}>
                    {inspectArtifact.rarity} Relic
                  </span>
                  <h3 className="font-display text-xl text-signal">{inspectArtifact.name}</h3>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    Acquired on {safeFormatDate(inspectArtifact.unlockedAt)}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    Status: {inspectArtifact.status === 'submitted' || inspectArtifact.status === 'auto_submitted' ? 'Submitted to Library' : 'In Pouch'}
                  </p>
                </div>
              </div>

              <div className="bg-[#030303] border border-neutral-900 p-4 rounded-xl space-y-2 shadow-inner">
                <h4 className="text-[9px] uppercase font-bold tracking-widest text-neutral-500 font-sc">Sacred Relic Lore</h4>
                <p className="text-xs font-serif text-neutral-300 leading-relaxed italic">
                  "{inspectArtifact.description}"
                </p>
              </div>

              <div className="bg-[#030303] border border-neutral-900 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-[9px] uppercase font-bold tracking-widest text-neutral-500 font-sc">Offering Rewards</h4>
                  <p className="text-[10px] text-neutral-500 font-sans mt-0.5">Granted by the Celestial Library upon submission</p>
                </div>
                <div className="px-3 py-1.5 bg-portal/10 border border-portal/30 rounded-lg text-xs font-bold font-mono text-portal animate-pulse flex flex-col items-end gap-0.5 shadow-[0_0_10px_rgba(4,172,255,0.1)]">
                  <div className="flex items-center gap-1.5"><Zap size={12} /><span>+{inspectArtifact.rewardValueQi || 0} Qi</span></div>
                  <div className="flex items-center gap-1.5"><Award size={12} /><span>+{inspectArtifact.rewardValueSectMerit || 0} Sect Merit</span></div>
                </div>
              </div>

              <div className="text-[10px] text-neutral-500 font-mono flex justify-between items-center px-1">
                <span>Unlock Catalyst:</span>
                <span className="text-neutral-300 font-sans font-medium">{inspectArtifact.milestoneName}</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setInspectArtifact(null)}
                  className="w-full px-6 py-2.5 border border-neutral-800 text-neutral-400 hover:text-signal hover:border-neutral-700 rounded-full font-sc uppercase tracking-widest text-[11px] font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
