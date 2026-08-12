import React from 'react';
import { Character, Story } from '../../types';
import { Users, Eye, Sparkles, RefreshCcw } from 'lucide-react';

interface CharacterProfileProps {
  char: Character;
  activeStory: Story;
  hasAppeared: boolean;
  canGenerate: boolean;
  isGenerating: boolean;
  isFreeUserOnHubStory: boolean;
  handleAwakenCardImage: (id: string, type: "character" | "beast", obj: any) => void;
  setSelectedNodeChar: (c: Character) => void;
}

export const CharacterProfile: React.FC<CharacterProfileProps> = ({
  char,
  activeStory,
  hasAppeared,
  canGenerate,
  isGenerating,
  isFreeUserOnHubStory,
  handleAwakenCardImage,
  setSelectedNodeChar
}) => {
  const hasImage = Boolean(char.imageAssetId || char.imageUrl);

  return (
    <div key={char.id} className="bg-neutral-950 border border-neutral-900 hover:border-neutral-800 rounded-lg p-3 flex flex-col justify-between group transition-all duration-300">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h5 className="font-sc font-medium text-signal text-sm flex items-center gap-1.5">
            <Users size={12} className={char.isBeast ? "text-amber-500" : "text-portal"} /> {char.name}
          </h5>
          <span className="text-[9px] text-neutral-500 font-mono">Ch. {char.firstAppeared || 1}</span>
        </div>
        <p className="text-[10px] text-neutral-400 leading-normal mt-1 line-clamp-2">
          {char.description}
        </p>
      </div>
      <div className="pt-2 flex justify-between items-end border-t border-neutral-900 mt-2">
        <div className="text-[9px] text-neutral-500">
          Role: <span className="text-neutral-300">{char.role.split(',')[0]}</span>
        </div>
        <div className="flex space-x-1.5">
          <button
            tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setSelectedNodeChar(char)}
            className="text-neutral-500 hover:text-portal transition-colors border border-transparent hover:border-portal/30 rounded p-1"
            title="View Context Matrix"
            aria-label="View Context Matrix"
          >
            <Eye size={12} />
          </button>
          <button
            tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => canGenerate && handleAwakenCardImage(char.id, char.isBeast ? 'beast' : 'character', char)}
            className={`p-1 rounded flex items-center justify-center transition-all ${
              !hasAppeared
                ? 'text-neutral-700 bg-black/50 cursor-not-allowed'
                : isFreeUserOnHubStory
                ? 'text-neutral-600 bg-neutral-900 cursor-not-allowed border border-neutral-800'
                : isGenerating
                ? 'text-portal bg-portal/10 border border-portal/30 cursor-wait'
                : canGenerate
                  ? char.evolutionReady && hasImage
                    ? 'text-gold-accent bg-gold-accent/10 border border-gold-accent/30 hover:bg-gold-accent/20 animate-pulse'
                    : 'text-portal bg-portal/10 hover:bg-portal/20 border border-portal/30 hover:border-portal'
                  : 'text-neutral-600 bg-neutral-900 border border-neutral-800'
            }`}
            disabled={!canGenerate || isGenerating}
            title={
              !hasAppeared ? "Must encounter in story first" :
              isFreeUserOnHubStory ? "Visual manifestation locked for mortal users in demo hub. Register or use own keys to manifest visuals." :
              char.evolutionReady && hasImage ? "Evolution milestone reached! Regenerate to reveal new visual stage." :
              canGenerate && hasImage ? "Regenerate visual representation." :
              canGenerate ? "Manifest Visual Aura" :
              "Not enough context yet to visualize"
            }
            aria-label={
              !hasAppeared ? "Must encounter in story first" :
              isFreeUserOnHubStory ? "Visual manifestation locked for mortal users in demo hub. Register or use own keys to manifest visuals." :
              char.evolutionReady && hasImage ? "Evolution milestone reached! Regenerate to reveal new visual stage." :
              canGenerate && hasImage ? "Regenerate visual representation." :
              canGenerate ? "Manifest Visual Aura" :
              "Not enough context yet to visualize"
            }
          >
            {hasImage && !char.evolutionReady ? <RefreshCcw size={12} /> : <Sparkles size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
};
