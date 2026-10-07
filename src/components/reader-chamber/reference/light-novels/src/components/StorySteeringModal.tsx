import { generateId } from '../lib/id';
import { slimMemoryForRequest } from '../lib/slimMemoryForRequest';
import { ACTIVE_CONTEXT_ENGINE } from '../lib/contextBlocks';
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, ShieldAlert, ArrowRight, Zap, 
  Heart, Skull, Flame, HelpCircle, GraduationCap, PlaneTakeoff,
  RefreshCw, AlertCircle, Compass
} from 'lucide-react';
import { motion } from 'motion/react';
import { getAuraTextStyle } from '../lib/qi';
import { useDialect } from '../lib/dialect';
import { secureStorage } from '../lib/encryption';
import { retrieveRelevantContext } from '../lib/rag';
import { useAppStore } from '../store/useAppStore';

interface StorySteeringModalProps {
  onSteerArc: (direction: string, customPrompt: string) => Promise<void>;
  isSteering: boolean;
  currentArcIndex: number;
  activeStory: any;
  routingConfig: any;
}

interface DirectionCard {
  id: string;
  title: string;
  directionType: string;
  description: string;
}

const TYPE_THEMES: Record<string, { name: string; icon: React.ReactNode; border: string; bg: string; text: string }> = {
  darker: {
    name: 'Demonic Path',
    icon: <Skull size={16} className="text-red-500" />,
    border: 'border-red-900/60 hover:border-red-500 focus:border-red-500 shadow-red-950/10',
    bg: 'bg-red-950/10',
    text: 'text-red-400'
  },
  romance: {
    name: 'Jade Companions',
    icon: <Heart size={16} className="text-pink-500" />,
    border: 'border-pink-900/60 hover:border-pink-500 focus:border-pink-500 shadow-pink-950/10',
    bg: 'bg-pink-950/10',
    text: 'text-pink-400'
  },
  action: {
    name: 'Sect Warfare',
    icon: <Flame size={16} className="text-orange-500" />,
    border: 'border-orange-900/60 hover:border-orange-500 focus:border-orange-500 shadow-orange-950/10',
    bg: 'bg-orange-950/10',
    text: 'text-orange-400'
  },
  twist: {
    name: 'Cosmic Shift',
    icon: <HelpCircle size={16} className="text-purple-500" />,
    border: 'border-purple-900/60 hover:border-purple-500 focus:border-purple-500 shadow-purple-950/10',
    bg: 'bg-purple-950/10',
    text: 'text-purple-400'
  },
  'new location': {
    name: 'Realm Ascension',
    icon: <PlaneTakeoff size={16} className="text-cyan-500" />,
    border: 'border-cyan-900/60 hover:border-cyan-500 focus:border-cyan-500 shadow-cyan-950/10',
    bg: 'bg-cyan-950/10',
    text: 'text-cyan-400'
  },
  continue: {
    name: 'Alchemy Hermitage',
    icon: <GraduationCap size={16} className="text-green-500" />,
    border: 'border-green-900/60 hover:border-green-500 focus:border-green-500 shadow-green-950/10',
    bg: 'bg-green-950/10',
    text: 'text-green-400'
  }
};

const getThemeData = (type: string) => {
  const norm = String(type).trim().toLowerCase();
  return TYPE_THEMES[norm] || TYPE_THEMES['continue'];
};

export default function StorySteeringModal({ 
  onSteerArc, 
  isSteering, 
  currentArcIndex, 
  activeStory, 
  routingConfig 
}: StorySteeringModalProps) {
  const t = useDialect();
  const activeAgentId = useAppStore(state => state.activeAgentId);
  const [selectedPreset, setSelectedPreset] = useState('continue');
  const [customDirections, setCustomDirections] = useState('');
  const [directions, setDirections] = useState<DirectionCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const fetchDirections = React.useCallback(async () => {
    if (!activeStory) return;
    setIsLoading(true);
    setError(null);
    setSelectedCardId(null);

    const totalPreviousChapters = activeStory.arcs.reduce((acc: number, arc: any) => acc + arc.chapters.length, 0);

    try {
      const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const gemini = await secureStorage.getItem('@seihouse/api-key-gemini');
      const openrouter = await secureStorage.getItem('@seihouse/api-key-openrouter');
      const ollama = await secureStorage.getItem('@seihouse/api-key-ollama-host');
      if (gemini) apiHeaders['x-gemini-key'] = gemini;
      if (openrouter) apiHeaders['x-openrouter-key'] = openrouter;
      if (ollama) apiHeaders['x-ollama-host'] = ollama;

      // Extract context dynamically using RAG
      const nextChapterNumber = totalPreviousChapters + 1;
      const pastSummaries = await retrieveRelevantContext(
        `Focus: Brainstorm directions for the next 10 chapters. Outline overarching macro events based on unresolved plot threads.`,
        nextChapterNumber,
        activeStory,
        apiHeaders,
        8, // Evaluate top 8 historical narrative beats
        undefined,
        3,
        ACTIVE_CONTEXT_ENGINE,
      );

      const response = await fetch('/api/generate-next-directions', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          mcName: activeStory.mcName,
          genre: activeStory.genre,
          customPremise: activeStory.customPremise,
          memory: slimMemoryForRequest(activeStory.memory),
          pastSummaries,
          contextEngine: ACTIVE_CONTEXT_ENGINE,
          currentArcCount: activeStory.arcs.length,
          estimatedArcs: activeStory.blueprint?.estimatedArcs,
          destinedEnding: activeStory.blueprint?.destinedEnding,
          routingConfig: routingConfig?.storyMaker
        })
      });

      if (!response.ok) {
        throw new Error(`Ascension feedback received. Code: ${response.status}`);
      }

      const data = await response.json();
      if (data.directions && Array.isArray(data.directions)) {
        const mapped = data.directions.map((d: any, index: number) => ({
          id: `dir-${index}-${generateId(5)}`,
          title: d.title || 'Untitled Stream',
          directionType: d.directionType || 'continue',
          description: d.description || 'Proceed toward steady spiritual advancement.'
        }));
        setDirections(mapped);
      } else {
        throw new Error("Invalid format returned by the celestial consultants.");
      }
    } catch (err: any) {
      console.warn("Failed fetching live directions, using fallback:", err);
      setError(err.message || "Failed to establish consciousness stream.");
    } finally {
      setIsLoading(false);
    }
  }, [activeStory, routingConfig]);

  useEffect(() => {
    fetchDirections();
  }, [fetchDirections]);

  const handleSelectCard = (card: DirectionCard) => {
    setSelectedCardId(card.id);
    setSelectedPreset(card.directionType);
    setCustomDirections(`Current Chosen Path: [${card.title}]\n\n${card.description}`);
  };

  const handleSteerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSteerArc(selectedPreset, customDirections.trim());
  };

  return (
    <div className="max-w-4xl mx-auto bg-void border border-neutral-900 rounded-lg p-6 sm:p-10 relative overflow-hidden" id="steer-portal-root">
      {/* Portal Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-portal/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-human/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="text-center mb-8 border-b border-neutral-950 pb-6">
        <span className="font-sc text-portal font-semibold tracking-[0.2em] text-xs block mb-1 uppercase">Shatter Boundary</span>
        <h2 className="font-display font-medium text-signal text-3xl sm:text-4xl tracking-tight mb-2">
          {t('steer_chamber')}
        </h2>
        <p className="text-neutral-400 font-sans text-xs max-w-xl mx-auto leading-relaxed">
          The currents of destiny pause at this breakpoint. Assert your cosmic will as the sovereign architect to dictate where this story should ascend for the next 10 chapters.
        </p>
      </div>

      <form onSubmit={handleSteerSubmit} className="space-y-6">
        
        {/* Dynamic Direction Suggestions Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="block text-xs uppercase tracking-widest font-sc text-neutral-300 font-semibold flex items-center space-x-2">
                <Compass size={14} className="text-portal animate-spin-slow" />
                <span>{t('suggested_paths')}</span>
              </span>
              <p className="text-[9px] text-neutral-500 font-sans normal-case mt-1 leading-snug">AI-suggested story directions for the next 10 chapters. Pick one to load it into the prompt below.</p>
            </div>
            {!isLoading && (
              <button
                type="button"
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={fetchDirections}
                disabled={isSteering}
                className="text-[10px] font-sc uppercase tracking-wider text-portal hover:text-signal transition-colors flex items-center space-x-1 border border-portal/20 bg-portal/5 px-2.5 py-1 rounded hover:bg-portal/10"
              >
                <RefreshCw size={10} className={isLoading ? "animate-spin" : ""} />
                <span>Seek Alternate Fates</span>
              </button>
            )}
          </div>

          {isLoading ? (
            /* Immersive Loading State Skeletons */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="directions-loading-skeletons">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className="p-5 rounded border border-neutral-900 bg-neutral-950/40 relative overflow-hidden h-36 flex flex-col justify-between animate-pulse"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-neutral-800"></div>
                      <div className="w-1/4 h-3 bg-neutral-850 rounded"></div>
                    </div>
                    <div className="w-3/4 h-5 bg-neutral-800 rounded"></div>
                    <div className="w-full h-3 bg-neutral-850 rounded"></div>
                    <div className="w-5/6 h-3 bg-neutral-850 rounded"></div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-900/10 to-transparent animate-shimmer pointer-events-none"></div>
                </div>
              ))}
            </div>
          ) : directions.length > 0 ? (
            /* Dynamically Generated Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="steer-preset-grid">
              {directions.map((card) => {
                const isSelected = card.id === selectedCardId;
                const theme = getThemeData(card.directionType);
                
                return (
                  <button
                    key={card.id}
                    type="button"
                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleSelectCard(card)}
                    disabled={isSteering}
                    className={`text-left p-5 rounded border bg-neutral-950/80 hover:bg-neutral-950 transition-all duration-300 relative flex flex-col justify-between min-h-[144px] ${theme.border} ${
                      isSelected 
                        ? 'border-portal ring-1 ring-portal/30 text-signal bg-neutral-950 shadow-[0_0_20px_rgba(4,172,255,0.15)]' 
                        : 'text-neutral-400 font-light'
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Badge / Type */}
                      <div className="flex items-center space-x-2">
                        {theme.icon}
                        <span className={`text-[9px] font-sc tracking-widest uppercase font-bold ${theme.text}`}>
                          {theme.name}
                        </span>
                      </div>
                      
                      {/* Title */}
                      <h3 className="font-display font-medium text-sm text-signal leading-tight tracking-wide">
                        {card.title}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-[11px] leading-relaxed text-neutral-400 font-sans">
                        {card.description}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="absolute top-3 right-3 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-portal opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-portal"></span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Error or fallback state */
            <div className="p-6 border border-neutral-900 rounded bg-neutral-950/40 text-center space-y-3">
              <div className="flex justify-center text-neutral-600">
                <AlertCircle size={28} />
              </div>
              <p className="text-xs text-neutral-500 font-sans">
                The consciousness link flickered. Cosmic presets remain accessible.
              </p>
              <button
                type="button"
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={fetchDirections}
                className="font-sc uppercase tracking-wider text-[10px] text-portal hover:text-signal transition-colors underline"
              >
                Reconnect to Divine Stream
              </button>
            </div>
          )}
        </div>

        {/* Custom Steering Inputs / Prompt Box */}
        <div className="space-y-2 pt-2">
          <label htmlFor="custom-steer-input" className="block text-xs uppercase tracking-widest font-sc text-neutral-300 font-semibold flex items-center justify-between">
            <span>{t('prompt_box')}</span>
            {selectedCardId && (
              <span className="text-[9px] text-[#04ACFF] normal-case font-mono bg-portal/5 px-2 py-0.5 border border-portal/15 rounded animate-pulse">
                Destiny trace loaded - Edit freely below
              </span>
            )}
          </label>
          <p className="text-[9px] text-neutral-500 font-sans normal-case mt-0.5 mb-1 leading-snug">Your instruction prompt — write or edit what you want to happen next. This is sent to the AI.</p>
          <textarea
            id="custom-steer-input"
            rows={4}
            value={customDirections}
            onChange={(e) => setCustomDirections(e.target.value)}
            disabled={isSteering}
            placeholder="Select a destiny path option above to load a template, or write from scratch. You can fine-tune, modify, add subplots, introduce companions, or declare system mutations here before committing."
            className="w-full bg-neutral-950 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded p-4 text-xs leading-relaxed transition-all resize-none shadow-inner"
          />
          <p className="text-[10px] text-neutral-500 font-sans font-light">
            Merging selected path notes above with your custom text changes. These directives instruct the genesis engine to craft the next 10 chapters perfectly.
          </p>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-neutral-950 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] text-neutral-400 font-sans flex items-start space-x-2 max-w-sm">
            <ShieldAlert className="text-human flex-shrink-0 mt-0.5" size={14} />
            <span>
              Genesis results in exactly 10 new chapters starting in sequential order, continuing the MC's cultivation rank and living connections.
            </span>
          </div>

          <button
            type="submit"
            disabled={isSteering || !customDirections.trim()}
            className={`w-full sm:w-auto font-sc px-6 py-3 rounded text-xs uppercase tracking-widest font-bold flex items-center justify-center space-x-2 transition-all ${
              isSteering || !customDirections.trim()
                ? 'bg-neutral-900 border border-neutral-850 text-neutral-600 cursor-not-allowed'
                : 'bg-human text-signal border border-human hover:bg-void hover:text-human hover:border-human shadow-[0_0_15px_rgba(139,0,0,0.3)]'
            }`}
          >
            {isSteering ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full"
                />
                <span>{activeAgentId === 'versa' ? 'VERSA is steering...' : activeAgentId === 'scout' ? 'SCOUT is scanning...' : 'Ascending Realms...'}</span>
              </>
            ) : (
              <>
                <span>Unveil Next Chapters</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
