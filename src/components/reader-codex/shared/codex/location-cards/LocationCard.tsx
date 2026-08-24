import React from 'react';
import { Location, Story } from '../../types';
import { Download, Compass, Lock, MapPin, Eye, RefreshCcw, Loader2, Sparkles, Settings2 } from 'lucide-react';
import { ReaderCodexImageGallery } from '../ReaderCodexImageGallery';
import { resolveEntityImageHistory } from '../entityImageHistory';
import { handleDownload } from '../../codexCompatibility';
import {
  getColorCodeSurfaceStyle,
  resolveLocationSafetyColorCode,
} from '../../../../reader-chamber/shared/colorCodes';

interface LocationCardProps {
  loc: Location;
  activePreview: any;
  activeStory: Story;
  hasAppeared: boolean;
  canGenerate: boolean;
  isGenerating: boolean;
  isFreeUserOnHubStory: boolean;
  handleAwakenCardImage: (id: string, type: "location", obj: any) => void;
  setSelectedNodeChar: (c: any) => void;
  openEntryContextEditor?: () => void;
}

export const LocationCard: React.FC<LocationCardProps> = ({
  loc,
  activePreview,
  activeStory,
  hasAppeared,
  canGenerate,
  isGenerating,
  isFreeUserOnHubStory,
  handleAwakenCardImage,
  setSelectedNodeChar,
  openEntryContextEditor,
}) => {
  const displayedImage = activePreview ? activePreview.urls[activePreview.selectedIndex] : loc.imageUrl;
  const hasImage = Boolean(loc.imageAssetId || loc.imageUrl);
  const safetyColorCode = resolveLocationSafetyColorCode(loc.safetyLevel);

  return (
    <div key={loc.id} className={`bg-neutral-950 border ${loc.evolutionReady && !activePreview ? 'border-portal/50 shadow-[0_0_15px_rgba(4,172,255,0.15)]' : 'border-neutral-900'} hover:border-neutral-800 rounded-lg overflow-hidden flex flex-col justify-between group transition-all duration-300`}>
      {/* Location Scenery Header */}
      <div className="h-36 w-full bg-void relative flex items-center justify-center overflow-hidden border-b border-neutral-900 group">
        <ReaderCodexImageGallery
          entityId={loc.id}
          type="location"
          imageHistory={resolveEntityImageHistory(loc)}
        />
        {displayedImage ? (
         <>
            <img
              src={displayedImage}
              alt={loc.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain group-hover:scale-105 transition-all duration-500 brightness-90"
            />
            <button
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={(e) => {
                e.stopPropagation();
                handleDownload(displayedImage, `${loc.name.toLowerCase().replace(/\s+/g, '_')}_landscape.png`);
              }}
              className="absolute bottom-2 right-2 z-20 bg-black/85 hover:bg-portal hover:text-void border border-neutral-900 hover:border-portal text-neutral-300 p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center gap-1 font-mono text-[8px] uppercase tracking-wider backdrop-blur cursor-pointer shadow-md"
              title="Download Scenery Vista"
            >
              <Download size={10} />
              <span>Get</span>
            </button>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-void via-portal/5 to-void flex flex-col items-center justify-center p-3 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:12px_12px] opacity-40"></div>
            <Compass size={18} className="text-neutral-800 mb-1" />
            <span className="text-[7.5px] text-neutral-600 font-mono tracking-wider">LANDSCAPE GEOLOCK EMPTY</span>
          </div>
        )}

        {/* Safety index rating badge */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          <span
            data-color-code={safetyColorCode}
            style={getColorCodeSurfaceStyle(safetyColorCode, {
              borderOpacity: 0.35,
              backgroundOpacity: 0.12,
              glowOpacity: loc.safetyLevel !== 'Safe' && loc.safetyLevel !== 'Dangerous' ? 0.2 : undefined,
            })}
            className={`text-[7.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
              loc.safetyLevel !== 'Safe' && loc.safetyLevel !== 'Dangerous' ? 'animate-pulse' : ''
            }`}
          >
            {loc.safetyLevel}
          </span>
          {hasAppeared ? (
            <span className="text-[7.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border bg-portal/10 text-portal border-portal/30 shadow-[0_0_8px_rgba(4,172,255,0.2)] backdrop-blur-sm flex items-center gap-1" title="Discovered in the story">
              <Compass size={8} /> Unlocked
            </span>
          ) : (
            <span className="text-[7.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border bg-black/80 text-neutral-500 border-neutral-800 backdrop-blur-sm flex items-center gap-1" title="Requires further reading to manifest">
              <Lock size={8} /> Locked
            </span>
          )}
        </div>

        {/* Realm indicator top left */}
        {loc.realm && (
          <span className="absolute top-2 left-2 text-[7.5px] font-mono bg-black/80 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-850">
            {loc.realm}
          </span>
        )}

        {activePreview && (
          <div className="absolute inset-x-0 bottom-0 bg-neutral-950/90 text-[9px] font-mono font-bold uppercase py-1 text-center text-gold-accent border-t border-gold-accent/30 tracking-widest z-10 animate-pulse">
            Evolution Preview
          </div>
        )}
      </div>

      <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
        <div>
          <h5 className="font-sc font-medium text-signal text-sm flex items-center gap-1.5">
            <MapPin size={12} className="text-portal" /> {loc.name}
          </h5>
          <p className="text-[10px] text-neutral-400 leading-normal mt-1 line-clamp-3">
            "{loc.description}"
          </p>
        </div>
        <div className="pt-2 flex justify-between items-end border-t border-neutral-900 mt-2">
          <div className="text-[9px] text-neutral-500">
            {loc.firstAppeared !== undefined ? `Known since Ch.${loc.firstAppeared}` : 'Lore only'}
          </div>
          <div className="flex space-x-1.5">
            {openEntryContextEditor && (
              <button
                type="button"
                onClick={openEntryContextEditor}
                className="rounded border border-transparent p-1 text-neutral-500 transition-colors hover:border-portal/30 hover:text-portal"
                title="Edit generation context"
                aria-label={`Edit generation context for ${loc.name}`}
              >
                <Settings2 size={12} />
              </button>
            )}
            <button
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setSelectedNodeChar(loc as any)}
              className="text-neutral-500 hover:text-portal transition-colors border border-transparent hover:border-portal/30 rounded p-1"
              title="View Context Matrix"
            >
              <Eye size={12} />
            </button>
            {hasAppeared ? (
               <button
                tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => canGenerate && handleAwakenCardImage(loc.id, 'location', loc)}
                disabled={!canGenerate || isGenerating}
                className={`p-1 rounded flex items-center justify-center transition-all ${
                  isFreeUserOnHubStory
                    ? 'text-neutral-600 bg-neutral-900 cursor-not-allowed border border-neutral-800'
                    : isGenerating
                    ? 'text-portal bg-portal/10 border border-portal/30'
                    : canGenerate
                      ? loc.evolutionReady && hasImage
                        ? 'text-gold-accent bg-gold-accent/10 border border-gold-accent/30 hover:bg-gold-accent/20 animate-pulse'
                        : 'text-portal bg-portal/10 hover:bg-portal/20 border border-portal/30 hover:border-portal'
                      : 'text-neutral-600 bg-neutral-900 border border-neutral-800'
                }`}
                title={
                  isFreeUserOnHubStory ? "Visual manifestation locked for mortal users in demo hub. Register or use own keys to manifest visuals." :
                  !hasAppeared ? "Entity must manifest in the story to visually capture." :
                  loc.evolutionReady && hasImage ? "Evolution milestone reached! Regenerate to reveal new visual stage." :
                  canGenerate && hasImage ? "Regenerate visual representation." :
                  canGenerate ? "Manifest Visual Aura" :
                  "Not enough context yet to visualize"
                }
              >
                {isGenerating ? <Loader2 size={12} className="animate-spin" /> :
                 loc.evolutionReady && hasImage && !isFreeUserOnHubStory ? <Sparkles size={12} /> :
                 hasImage ? <RefreshCcw size={12} /> : <Sparkles size={12} />}
              </button>
            ) : (
              <div
                className="p-1 rounded flex items-center justify-center text-neutral-700 bg-black/50 border border-neutral-800 cursor-not-allowed"
                title="Must read further into the matrix before entity's visual aura can be captured"
              >
                <Lock size={12} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
