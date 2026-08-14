import React from 'react';
import { Character, Story } from '../../types';
import { Download, Compass, Lock, Award, Play, Square, Loader2, Volume2, Sparkles } from 'lucide-react';
import { ReaderCodexImageGallery } from '../ReaderCodexImageGallery';
import { resolveEntityImageHistory } from '../entityImageHistory';
import { handleDownload } from '../../codexCompatibility';
import { AGENTS } from '../../codexCompatibility';

interface CharacterCardProps {
  char: Character;
  activePreview: any;
  activeStory: Story;
  cScore: any;
  hasAppeared: boolean;
  playingVoiceId: string | null;
  generatingVoiceId: string | null;
  isGenerating: boolean;
  canGenerate: boolean;
  isFreeUserOnHubStory: boolean;
  handlePlayVoice: (url: string, id: string) => void;
  handleStopVoice: () => void;
  handleGenerateVoiceCard: (char: Character) => void;
  beginCharEdit: (char: Character) => void;
  handleAwakenCardImage: (id: string, type: "character" | "creature" | "beast", obj: any) => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  char,
  activePreview,
  activeStory,
  cScore,
  hasAppeared,
  playingVoiceId,
  generatingVoiceId,
  isGenerating,
  canGenerate,
  isFreeUserOnHubStory,
  handlePlayVoice,
  handleStopVoice,
  handleGenerateVoiceCard,
  beginCharEdit,
  handleAwakenCardImage
}) => {
  const displayedImage = activePreview ? activePreview.urls[activePreview.selectedIndex] : char.imageUrl;
  const portraitImageType = char.portraitKind === 'non-human'
    ? 'creature'
    : char.isBeast ? 'beast' : 'character';
  const hasImage = Boolean(char.imageAssetId || char.imageUrl);
  const visualAriaLabel = isGenerating
    ? `VERSA is working on visual for ${char.name}`
    : !hasAppeared
      ? `Undiscovered visual for ${char.name}`
      : isFreeUserOnHubStory
        ? hasImage
          ? `Portrait active for ${char.name}`
          : `Portrait locked for ${char.name} (Free)`
        : char.evolutionReady
          ? `Awaken evolution for ${char.name}`
          : hasImage
            ? `Progression required for ${char.name} visual`
            : `Awaken portrait for ${char.name}`;

  return (
    <div
      key={char.id}
      className={`bg-neutral-950 border ${char.evolutionReady && !activePreview ? 'border-portal/50 shadow-[0_0_15px_rgba(4,172,255,0.15)]' : 'border-neutral-900'} hover:border-neutral-800 rounded-lg overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-lg relative`}
    >
      {/* Visual Stage illustration header */}
      <div className="h-44 w-full bg-void relative flex items-center justify-center overflow-hidden border-b border-neutral-900 group">
        <ReaderCodexImageGallery
          entityId={char.id}
          type={portraitImageType}
          imageHistory={resolveEntityImageHistory(char)}
        />
        {displayedImage ? (
          <>
            <img
              src={displayedImage}
              alt={char.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain group-hover:scale-105 transition-all duration-500 brightness-95"
            />
            <button
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={(e) => {
                e.stopPropagation();
                handleDownload(displayedImage, `${char.name.toLowerCase().replace(/\s+/g, '_')}_portrait.png`);
              }}
              className="absolute bottom-2 right-2 z-20 bg-black/85 hover:bg-portal hover:text-void border border-neutral-900 hover:border-portal text-neutral-300 p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center gap-1 font-mono text-[8px] uppercase tracking-wider backdrop-blur cursor-pointer shadow-md"
              title="Download Portrait"
            >
              <Download size={10} />
              <span>Get</span>
            </button>
          </>
        ) : (
          /* Abstract CSS Alchemical grid vector placeholder */
          <div className="absolute inset-0 bg-gradient-to-b from-void via-human/10 to-void flex flex-col items-center justify-center p-4 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
            <div className="w-14 h-14 rounded-full border border-neutral-800/60 bg-black flex items-center justify-center text-portal shadow-[0_0_15px_rgba(4,172,255,0.1)] relative mb-2">
              <Compass size={22} className="text-neutral-600 animate-spin-slow" />
              <div className="absolute inset-2 border border-dashed border-portal/20 rounded-full"></div>
            </div>
            <span className="text-[8px] text-neutral-500 font-mono tracking-widest uppercase">AURA UNMANIFESTED</span>
          </div>
        )}

        {/* Status label floating top right */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          <div className="flex space-x-1">
            {char.relevanceState && char.relevanceState.toLowerCase() !== 'active' && (
              <span className="text-[7.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900/80 text-neutral-400">
                {char.relevanceState}
              </span>
            )}
            <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
              char.status === 'alive' ? 'bg-green-950/40 text-green-400 border-green-900' :
              char.status === 'deceased' ? 'bg-red-950/40 text-human border-red-900' :
              'bg-neutral-950 text-neutral-500 border-neutral-800'
            }`}>
              {char.status}
            </span>
          </div>
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

        {/* Combat power ranking level index label floating top left */}
        <div className="absolute top-2 left-2 flex items-center space-x-1 font-mono text-[8.5px] bg-black/80 px-1.5 py-0.5 rounded border border-neutral-850">
          <Award size={10} className="text-yellow-500" />
          <span className="text-neutral-300">Pwr:{cScore?.score || 0}</span>
        </div>

        {activePreview && (
          <div className="absolute inset-x-0 bottom-0 bg-neutral-950/90 text-[9px] font-mono font-bold uppercase py-1 text-center text-gold-accent border-t border-gold-accent/30 tracking-widest z-10 animate-pulse">
            Evolution Preview
          </div>
        )}
      </div>

      {/* Detail body */}
      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between">
            <h5 className="font-sc font-medium text-signal text-sm">{char.name}</h5>
            <span className="text-[9px] text-portal font-mono font-medium">{char.role.split(',')[0]}</span>
          </div>
          <p className="text-[10px] text-neutral-400 leading-normal font-sans italic mt-1 line-clamp-2">
            "{char.description || 'Stature secrets kept by standard cause matrices.'}"
          </p>
          <div className="pt-2 text-[9.5px]">
            <span className="text-neutral-500 block">Cultivation: <strong className="text-neutral-300 font-mono">{char.powerLevel || 'Ordinary'}</strong></span>
            {char.faction && (
              <span className="text-neutral-500 block">Affiliation: <strong className="text-neutral-300 font-mono">{char.faction}</strong></span>
            )}
          </div>
        </div>

        {/* Voice Card Section */}
        {char.signatureQuote && (
          <div className="pt-2 pb-2 text-[10px] text-neutral-400 italic flex flex-col gap-2 relative">
            <span>"{char.signatureQuote}"</span>
            {char.voiceClipUrl ? (
              <button
                onClick={() => playingVoiceId === char.id ? handleStopVoice() : handlePlayVoice(char.voiceClipUrl!, char.id)}
                aria-label={playingVoiceId === char.id ? `Stop voice for ${char.name}` : `Play voice for ${char.name}`}
                className="flex items-center gap-1.5 self-start text-[9px] text-portal uppercase tracking-wider font-mono hover:text-portal/80 transition-colors"
              >
                {playingVoiceId === char.id ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                <span>{playingVoiceId === char.id ? 'Stop Voice' : 'Play Voice'}</span>
              </button>
            ) : (
              <button
                onClick={() => handleGenerateVoiceCard(char)}
                disabled={generatingVoiceId === char.id}
                aria-label={`Generate voice for ${char.name}`}
                className="flex items-center gap-1.5 self-start text-[9px] text-human uppercase tracking-wider font-mono hover:text-human/80 transition-colors disabled:opacity-50"
              >
                {generatingVoiceId === char.id ? <Loader2 size={10} className="animate-spin" /> : <Volume2 size={10} />}
                <span>{generatingVoiceId === char.id ? 'Manifesting Voice...' : 'Generate Voice'}</span>
              </button>
            )}
          </div>
        )}

        {/* Action: Forge visual aura portrait */}
        <div className="pt-3 border-t border-neutral-950 flex flex-col gap-2">
          {char.evolutionReady && !activePreview && (
            <div className="text-[9px] font-mono text-portal animate-pulse flex items-center gap-1.5 mb-1 px-1">
              <Sparkles size={8} />
              <span>Evolution Available: {char.evolutionReason || "New Breakthrough"}</span>
            </div>
          )}
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleAwakenCardImage(char.id, portraitImageType, char)}
            disabled={isGenerating || !canGenerate}
            aria-label={visualAriaLabel}
            className={`w-full py-1.5 rounded text-[9px] uppercase font-mono tracking-widest flex items-center justify-center space-x-1 border font-bold transition-all ${
              isGenerating
                ? 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-wait'
                : !canGenerate
                ? 'bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed opacity-75'
                : char.evolutionReady
                ? 'bg-portal border-portal text-void shadow-[0_0_10px_rgba(4,172,255,0.4)]'
                : 'bg-void border-portal/15 text-portal hover:border-portal hover:bg-portal/5 hover:shadow-[0_0_8px_rgba(4,172,255,0.2)]'
            }`}
            title={!hasAppeared ? "Unlock manifestation by encountering them in the story." : isFreeUserOnHubStory ? "Please Ascend to the Inner Sect to customize this original codex portrait." : !canGenerate ? "Evolution requires further story progression." : ""}
          >
              {isGenerating ? (
                <>
                  <img src={AGENTS.VERSA.logoUrl} className="w-4 h-4 object-contain animate-pulse" alt="VERSA" />
                  <span>VERSA is working...</span>
                </>
              ) : (
                <>
                  <Sparkles size={10} className={char.evolutionReady ? 'text-void' : 'text-portal'} />
                  <span>
                    {!hasAppeared
                      ? 'Undiscovered'
                      : isFreeUserOnHubStory
                      ? (hasImage ? 'Portrait Active' : 'Portrait Locked (Free)')
                      : char.evolutionReady
                      ? 'Awaken Evolution'
                      : hasImage
                      ? 'Requires Progression'
                      : 'Awaken Portrait'}
                  </span>
                </>
              )}
            </button>
        </div>

        <div className="border-t border-neutral-900 mt-4 pt-3 flex justify-between items-center text-[10px]">
          <span className="text-neutral-500">Relation to MC: <strong className="text-neutral-300 font-medium">{char.relationshipToMC || 'Neutral'}</strong></span>
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => beginCharEdit(char)}
            className="text-neutral-500 hover:text-portal transition-colors font-sc uppercase"
          >
            Refine
          </button>
        </div>
      </div>
    </div>
  );
};
