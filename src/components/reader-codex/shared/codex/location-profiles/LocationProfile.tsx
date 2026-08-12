import React from 'react';
import { Location, Story } from '../../types';
import { MapPin, Eye, Sparkles, RefreshCcw } from 'lucide-react';

interface LocationProfileProps {
  loc: Location;
  activeStory: Story;
  hasAppeared: boolean;
  canGenerate: boolean;
  isGenerating: boolean;
  isFreeUserOnHubStory: boolean;
  handleAwakenCardImage: (id: string, type: "location", obj: any) => void;
  setSelectedNodeChar: (c: any) => void;
}

export const LocationProfile: React.FC<LocationProfileProps> = ({
  loc,
  activeStory,
  hasAppeared,
  canGenerate,
  isGenerating,
  isFreeUserOnHubStory,
  handleAwakenCardImage,
  setSelectedNodeChar
}) => {
  const hasImage = Boolean(loc.imageAssetId || loc.imageUrl);

  return (
    <div key={loc.id} className="bg-neutral-950 border border-neutral-900 hover:border-neutral-800 rounded-lg p-3 flex flex-col justify-between group transition-all duration-300">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h5 className="font-sc font-medium text-signal text-sm flex items-center gap-1.5">
            <MapPin size={12} className="text-portal" /> {loc.name}
          </h5>
          <span className="text-[9px] text-neutral-500 font-mono">Ch. {loc.firstAppeared || 1}</span>
        </div>
        <p className="text-[10px] text-neutral-400 leading-normal mt-1 line-clamp-2">
          {loc.description}
        </p>
      </div>
      <div className="pt-2 flex justify-between items-end border-t border-neutral-900 mt-2">
        <div className="text-[9px] text-neutral-500">
          Realm: <span className="text-neutral-300">{loc.realm || 'Unknown'}</span>
        </div>
        <div className="flex space-x-1.5">
          <button
            tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setSelectedNodeChar(loc as any)}
            className="text-neutral-500 hover:text-portal transition-colors border border-transparent hover:border-portal/30 rounded p-1"
            title="View Context Matrix"
          >
            <Eye size={12} />
          </button>
          <button
            tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => canGenerate && handleAwakenCardImage(loc.id, 'location', loc)}
            className={`p-1 rounded flex items-center justify-center transition-all ${
              !hasAppeared
                ? 'text-neutral-700 bg-black/50 cursor-not-allowed'
                : isFreeUserOnHubStory
                ? 'text-neutral-600 bg-neutral-900 cursor-not-allowed border border-neutral-800'
                : isGenerating
                ? 'text-portal bg-portal/10 border border-portal/30 cursor-wait'
                : canGenerate
                  ? loc.evolutionReady && hasImage
                    ? 'text-gold-accent bg-gold-accent/10 border border-gold-accent/30 hover:bg-gold-accent/20 animate-pulse'
                    : 'text-portal bg-portal/10 hover:bg-portal/20 border border-portal/30 hover:border-portal'
                  : 'text-neutral-600 bg-neutral-900 border border-neutral-800'
            }`}
            disabled={!canGenerate || isGenerating}
            title={
              !hasAppeared ? "Must encounter in story first" :
              isFreeUserOnHubStory ? "Visual manifestation locked for mortal users in demo hub. Register or use own keys to manifest visuals." :
              loc.evolutionReady && hasImage ? "Evolution milestone reached! Regenerate to reveal new visual stage." :
              canGenerate && hasImage ? "Regenerate visual representation." :
              canGenerate ? "Manifest Visual Aura" :
              "Not enough context yet to visualize"
            }
          >
            {hasImage && !loc.evolutionReady ? <RefreshCcw size={12} /> : <Sparkles size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
};
