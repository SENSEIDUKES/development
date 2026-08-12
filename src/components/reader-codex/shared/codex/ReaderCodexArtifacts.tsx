import React, { useState } from 'react';
import { Plus, Sword, RefreshCcw, Sparkles, Download, Lock, Compass, Settings2 } from 'lucide-react';
import { Artifact, StoryWorld } from '../types';
import { useCodex } from './CodexContext';
import { useAppStore } from '../codexCompatibility';
import { isHubStoryLockedForUser } from '../codexCompatibility';
import { ReaderCodexImageGallery } from './ReaderCodexImageGallery';
import { resolveEntityImageHistory } from './entityImageHistory';
import { handleDownload } from '../codexCompatibility';


interface ReaderCodexArtifactsProps {
  artifactsToRender: Artifact[];
  setDeletePrompt: (prompt: any) => void;
}

export function ReaderCodexArtifacts({
  artifactsToRender,
  setDeletePrompt
}: ReaderCodexArtifactsProps) {
  const {
    memory,
    activeStory,
    onUpdateMemory,
    generatingId,
    previews,
    handleAwakenCardImage,
    openEntryContextEditor,
  } = useCodex();

  const userProfile = useAppStore(state => state.userProfile);
  const isFreeUserOnHubStory = isHubStoryLockedForUser(activeStory, userProfile);

  const [showAddArtifactForm, setShowAddArtifactForm] = useState(false);
  const [newArtifact, setNewArtifact] = useState({
    name: '',
    description: '',
    tier: 'Mortal',
    currentOwner: ''
  });

  const handleAddArtifact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArtifact.name.trim()) return;

    const currentArtifacts = memory.artifacts || [];
    const artifactObj: Artifact = {
      id: `art-${Date.now()}`,
      name: newArtifact.name.trim(),
      description: newArtifact.description.trim(),
      tier: newArtifact.tier,
      currentOwner: newArtifact.currentOwner.trim() || 'Unknown'
    };

    onUpdateMemory({
      ...memory,
      artifacts: [...currentArtifacts, artifactObj]
    });

    setNewArtifact({ name: '', description: '', tier: 'Mortal', currentOwner: '' });
    setShowAddArtifactForm(false);
  };
  return (
    <div className="space-y-6 animate-fadeIn" id="codex-divine-artifacts">
      <div className="border-b border-neutral-900 pb-3 flex justify-between items-end">
        <div>
          <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Artifacts</h3>
          <p className="text-[10px] text-neutral-500 font-sans">Behold artifacts, weapons, secret arrays, or sacred medicinal pills currently existing in memory.</p>
        </div>
        <button
           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowAddArtifactForm(!showAddArtifactForm)}
          className="px-2 py-1 bg-void hover:bg-neutral-900 font-sc font-bold border border-neutral-850 hover:border-neutral-700 text-neutral-400 hover:text-signal rounded text-[9px] uppercase tracking-wider flex items-center space-x-1"
        >
          <Plus size={10} />
          <span>Forge Artifact</span>
        </button>
      </div>

      {/* Input form to add custom artifact */}
      {showAddArtifactForm && (
        <form onSubmit={handleAddArtifact} className="p-4 bg-neutral-950 border border-neutral-900 rounded-lg space-y-3 animate-fadeIn text-xs max-w-lg">
          <h4 className="font-sc font-extrabold text-xs text-human tracking-wider uppercase">Forge relic description</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-62wj4yu">Artifact Name</label>
              <input
                type="text"
                value={newArtifact.name}
                onChange={(e) => setNewArtifact({ ...newArtifact, name: e.target.value })}
                placeholder="e.g. Heavenly Cauldron"
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                required id="a11y-control-62wj4yu"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-6veduqp">Spiritual Tier Rank</label>
              <select
                value={newArtifact.tier}
                onChange={(e) => setNewArtifact({ ...newArtifact, tier: e.target.value })}
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs" id="a11y-control-6veduqp"
              >
                <option value="Mortal">Mortal (Ordinary)</option>
                <option value="Earth">Earth Rank (Spiritual)</option>
                <option value="Heaven">Heaven Rank (Sacred)</option>
                <option value="Primordial">Primordial Rank (Cosmic)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-neutral-400 block mb-1 font-sc" htmlFor="a11y-control-0ifcjx1">Current Bearer / Owner</label>
            <input
              type="text"
              value={newArtifact.currentOwner}
              onChange={(e) => setNewArtifact({ ...newArtifact, currentOwner: e.target.value })}
              placeholder="e.g. Han Feng or Elder Qin"
              className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs" id="a11y-control-0ifcjx1"
            />
          </div>

          <div>
            <label className="text-[10px] text-neutral-400 block mb-1 font-sc" htmlFor="a11y-control-kl27cti">Description / Unique Capacity</label>
            <textarea
              value={newArtifact.description}
              onChange={(e) => setNewArtifact({ ...newArtifact, description: e.target.value })}
              placeholder="What cosmic impact does this weapon hold? e.g. Speeds alchemical processes by tenfold..."
              rows={2}
              className="bg-neutral-950 border border-neutral-800 text-signal p-2 rounded w-full text-xs resize-none" id="a11y-control-kl27cti"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-1">
            <button type="button"  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowAddArtifactForm(false)} className="text-neutral-500">Abort</button>
            <button type="submit" className="bg-human text-signal px-4 py-1 rounded font-bold font-sc uppercase">Forge Relic</button>
          </div>
        </form>
      )}

      {/* List Artifacts Grid Gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
        {!artifactsToRender || artifactsToRender.length === 0 ? (
          <div className="col-span-2 text-center py-12 border border-dashed border-neutral-900 rounded bg-neutral-950/20 text-xs text-neutral-500 italic">
            No legendary relics found. Gather rare ores or let chapters uncover divine relics!
          </div>
        ) : (
          artifactsToRender.map((art) => {
            const isGenerating = generatingId === art.id;
            const hasImage = Boolean(art.imageAssetId || art.imageUrl);
            const currentChapter = activeStory.currentChapterNumber || 1;
            const hasAppeared = art.firstAppeared === undefined || art.firstAppeared <= currentChapter;
            const activePreview = previews[art.id];
            const canGenerate = hasAppeared && (!hasImage || art.evolutionReady) && !isFreeUserOnHubStory;
            const displayedImage = activePreview ? activePreview.urls[activePreview.selectedIndex] : art.imageUrl;
            const isMythicOrTranscendent = art.tier === 'Primordial' || art.tier === 'Heaven';
            const tierColor =
              art.tier === 'Primordial' ? 'text-yellow-400 border-yellow-500/50 shadow-[0_0_15px_rgba(250,204,21,0.2)] bg-gradient-to-br from-yellow-950/40 to-neutral-950/90' :
              art.tier === 'Heaven' ? 'text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)] animate-pulse bg-gradient-to-br from-cyan-950/40 to-neutral-950/90' :
              art.tier === 'Earth' ? 'text-emerald-400 border-emerald-900 bg-emerald-950/20' :
              'text-neutral-500 border-neutral-900 bg-neutral-950';

            return (
              <div key={art.id} className={`collectible-card p-4 border flex flex-col justify-between transition-all overflow-hidden relative group/card ${tierColor} ${art.evolutionReady && !activePreview ? 'ring-2 ring-portal/50' : ''}`}>
                {/* Holographic foil effect for higher tiers */}
                {isMythicOrTranscendent && (
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIi8+CjxwYXRoIGQ9Ik0wIDRMMCAwTDQgNEwwIDQiIGZpbGw9IiMzMzMiLz4KPC9zdmc+')] opacity-20 mix-blend-color-dodge pointer-events-none"></div>
                )}

                <div className="relative z-10">
                  <div className="relative group overflow-hidden rounded mb-3">
                    {/* Render relational artifact card portrait if available */}
                    <ReaderCodexImageGallery
                      entityId={art.id}
                      type="artifact"
                      imageHistory={resolveEntityImageHistory(art)}
                    />
                    {displayedImage ? (
                      <div className="h-32 w-full border border-neutral-900 relative">
                        <img src={displayedImage} alt={art.name} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                        <button
                           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(displayedImage, `${art.name.toLowerCase().replace(/\s+/g, '_')}_relic.png`);
                          }}
                          className="absolute bottom-2 right-2 z-20 bg-black/85 hover:bg-portal hover:text-void border border-neutral-900 hover:border-portal text-neutral-300 p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center gap-1 font-mono text-[8px] uppercase tracking-wider backdrop-blur cursor-pointer shadow-md"
                          title="Download Relic Aura"
                        >
                          <Download size={10} />
                          <span>Get</span>
                        </button>
                        {activePreview && (
                          <div className="absolute inset-x-0 bottom-0 bg-neutral-950/90 text-[9px] font-mono font-bold uppercase py-1 text-center text-gold-accent border-t border-gold-accent/30 tracking-widest z-10 animate-pulse">
                            Evolution Preview
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-32 w-full border border-dashed border-neutral-800 flex flex-col items-center justify-center bg-black/40 text-neutral-600 rounded">
                        <Sword size={24} className="mb-2 opacity-50" />
                        <span className="text-[8px] tracking-widest font-mono uppercase">Unmanifested</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-sc font-bold text-signal text-sm tracking-wide max-w-[60%]">{art.name}</h4>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[9px] border px-2 py-0.5 rounded font-mono uppercase tracking-widest ${tierColor}`}>
                        {art.tier}
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
                  </div>
                  <p className="text-xs text-neutral-400 leading-normal font-sans font-light italic mt-1 bg-void/50 p-2 border border-neutral-950 rounded">
                    "{art.description || 'Mystical values remain currently secret from mortal cultivators.'}"
                  </p>
                </div>

                <div className="border-t border-neutral-900 mt-4 pt-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-neutral-500 font-sans">
                      Bearer: <strong className="text-neutral-300 font-mono">{art.currentOwner || 'Unknown'}</strong>
                    </span>
                  </div>

                  {art.evolutionReady && !activePreview && (
                    <div className="text-[9px] font-mono text-portal animate-pulse flex items-center gap-1.5 mb-1">
                      <Sparkles size={8} />
                      <span>Evolution Available: {art.evolutionReason || "Ownership Change"}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-1 gap-2 border-t border-neutral-900/50 pt-2">
                        {openEntryContextEditor && (
                          <button
                            type="button"
                            onClick={() => openEntryContextEditor({ collection: 'artifacts', id: art.id })}
                            className="text-neutral-600 hover:text-portal"
                            title="Edit generation context"
                            aria-label={`Edit generation context for ${art.name}`}
                          >
                            <Settings2 size={12} />
                          </button>
                        )}
                        <button
                           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setDeletePrompt({ id: art.id, type: 'artifact', name: art.name })}
                          className="text-[9px] text-neutral-600 hover:text-human uppercase font-mono flex-shrink-0"
                        >
                          Shatter
                        </button>
                        <button
                          onClick={() => handleAwakenCardImage(art.id, 'artifact', art)}
                          disabled={isGenerating || !canGenerate}
                          className={`px-2 flex-grow py-1 rounded text-[8.5px] border uppercase font-mono tracking-wider flex items-center justify-center space-x-1 font-bold ${
                            isGenerating
                              ? 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-wait'
                              : !canGenerate
                              ? 'bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed opacity-75'
                              : art.evolutionReady
                              ? 'bg-portal border-portal text-void shadow-[0_0_10px_rgba(4,172,255,0.4)]'
                              : 'bg-void border-portal/15 text-portal hover:border-portal hover:bg-portal/5 hover:shadow-[0_0_8px_rgba(4,172,255,0.2)]'
                          }`}
                          title={!hasAppeared ? "Unlock manifestation by encountering it in the story." : isFreeUserOnHubStory ? "Please Ascend to the Inner Sect to customize this original relic portrait." : !canGenerate ? "Progression required to awaken Relic." : ""}
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCcw size={8} className="animate-spin" />
                              <span>Forging...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={8} className={art.evolutionReady ? 'text-void' : 'text-gold-accent'} />
                              <span>
                                {!hasAppeared
                                  ? 'Undiscovered'
                                  : isFreeUserOnHubStory
                                  ? (hasImage ? 'Relic Active' : 'Relic Locked (Free)')
                                  : art.evolutionReady
                                  ? 'Awaken Evolution'
                                  : hasImage
                                  ? 'Requires Progression'
                                  : 'Generate Aura'}
                              </span>
                            </>
                          )}
                        </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
