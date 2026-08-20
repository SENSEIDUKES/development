import React, { useCallback, useRef, useState } from 'react';
import { Character, Location } from '../types';
import { useCodex } from './CodexContext';
import { useAppStore } from '../codexCompatibility';
import { isHubStoryLockedForUser } from '../codexCompatibility';
import { useCodexVoiceQuote, type CodexVoiceResolution } from '../hooks/useCodexVoiceQuote';
import { useCodexLocations } from '../hooks/useCodexLocations';
import { useCodexCharacterEditing } from '../hooks/useCodexCharacterEditing';
import { CharacterCard } from './character-cards/CharacterCard';
import { CharacterEditCard } from './character-cards/CharacterEditCard';
import { LocationCard } from './location-cards/LocationCard';
import { CharacterProfile } from './character-profiles/CharacterProfile';
import { LocationProfile } from './location-profiles/LocationProfile';

interface ReaderCodexCharactersProps {
  charsToRender: Character[];
  locationsToRender: Location[];
  setDeletePrompt: (prompt: any) => void;
  selectedNodeChar: Character | null;
  setSelectedNodeChar: (c: Character | null) => void;
  /** Development uses the canonical Portrait classification without changing the locked Reference layout. */
  separatePortraitKinds?: boolean;
}

export function ReaderCodexCharacters({
  charsToRender,
  locationsToRender,
  setDeletePrompt,
  selectedNodeChar,
  setSelectedNodeChar,
  separatePortraitKinds = false,
}: ReaderCodexCharactersProps) {
  const {
    memory,
    activeStory,
    onUpdateMemory,
    generatingId,
    previews,
    handleAwakenCardImage,
    getPowerRankScore,
    openEntryContextEditor,
  } = useCodex();

  const userProfile = useAppStore(state => state.userProfile);
  const isFreeUserOnHubStory = isHubStoryLockedForUser(activeStory, userProfile);

  const [charViewStyle, setCharViewStyle] = useState<'cards' | 'profiles'>('cards');
  // Synthesis resolves seconds after the tap, so the write must start from the
  // newest memory rather than the snapshot captured when the tap began.
  const memoryRef = useRef(memory);
  memoryRef.current = memory;

  /** The server-resolved voice identity becomes part of the Codex Character. */
  const persistResolvedVoice = useCallback((resolution: CodexVoiceResolution) => {
    const current = memoryRef.current;
    onUpdateMemory({
      ...current,
      characters: (current.characters || []).map(character => (
        character.id === resolution.characterId
          ? {
              ...character,
              voiceKey: resolution.voiceKey,
              voiceClip: resolution.artifact,
            }
          : character
      )),
    });
  }, [onUpdateMemory]);

  const { handleQuoteTap, voiceStatus } = useCodexVoiceQuote({
    onVoiceResolved: persistResolvedVoice,
  });

  const {
    showAddLocationForm,
    setShowAddLocationForm,
    newLocation,
    setNewLocation,
    handleAddLocation,
  } = useCodexLocations({ memory, onUpdateMemory });

  const {
    editingCharId,
    setEditingCharId,
    editingCharData,
    setEditingCharData,
    aliasCollisions,
    handleSaveCharEdit,
    beginCharEdit,
    addAbility,
    updateAbility,
    removeAbility,
  } = useCodexCharacterEditing({ memory, onUpdateMemory });

  const isNonHumanPortrait = (character: Character) => (
    character.portraitKind === 'non-human' || character.isBeast === true
  );

  const portraitGroups = [
    {
      id: 'human',
      heading: 'Human Portraits',
      characters: charsToRender.filter(char => !isNonHumanPortrait(char)),
    },
    {
      id: 'non-human',
      heading: 'Non-Human Portraits',
      characters: charsToRender.filter(isNonHumanPortrait),
    },
  ];

  const renderCharacterCard = (char: Character) => {
    const isGenerating = generatingId === char.id;
    const hasImage = Boolean(char.imageAssetId || char.imageUrl);
    const currentChapter = activeStory.currentChapterNumber || 1;
    const hasAppeared = char.firstAppeared === undefined || char.firstAppeared <= currentChapter;
    const activePreview = previews[char.id];
    const cScore = getPowerRankScore(char.id);
    const canGenerate = hasAppeared && (!hasImage || Boolean(char.evolutionReady));

    if (editingCharId === char.id) {
      return (
        <CharacterEditCard
          key={char.id}
          char={char}
          editingCharData={editingCharData}
          setEditingCharData={setEditingCharData}
          setEditingCharId={setEditingCharId}
          handleSaveCharEdit={handleSaveCharEdit}
          addAbility={addAbility}
          removeAbility={removeAbility}
          updateAbility={updateAbility}
          aliasCollisions={aliasCollisions}
        />
      );
    }

    return (
      <CharacterCard
        key={char.id}
        char={char}
        activePreview={activePreview}
        activeStory={activeStory}
        cScore={cScore}
        hasAppeared={hasAppeared}
        voiceStatus={voiceStatus(char)}
        isGenerating={isGenerating}
        canGenerate={canGenerate}
        isFreeUserOnHubStory={isFreeUserOnHubStory}
        onQuoteTap={handleQuoteTap}
        beginCharEdit={beginCharEdit}
        handleAwakenCardImage={handleAwakenCardImage}
      />
    );
  };

  const renderCharacterProfile = (char: Character) => {
    const isGenerating = generatingId === char.id;
    const currentChapter = activeStory.currentChapterNumber || 1;
    const hasAppeared = char.firstAppeared === undefined || char.firstAppeared <= currentChapter;
    const hasImage = Boolean(char.imageAssetId || char.imageUrl);
    const canGenerate = hasAppeared && (!hasImage || Boolean(char.evolutionReady));

    return (
      <CharacterProfile
        key={char.id}
        char={char}
        activeStory={activeStory}
        hasAppeared={hasAppeared}
        canGenerate={canGenerate}
        isGenerating={isGenerating}
        isFreeUserOnHubStory={isFreeUserOnHubStory}
        handleAwakenCardImage={handleAwakenCardImage}
        setSelectedNodeChar={setSelectedNodeChar}
      />
    );
  };

  return (
    <>
      <div className="space-y-6 animate-fadeIn" id="codex-characters-and-locations">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-3">
          <div>
            <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Portraits</h3>
            <p className="text-[10px] text-neutral-500 font-sans">Toggle profiles and locations, awaken visual aura portraits directly from the Void.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setCharViewStyle('cards')}
              className={`px-3 py-1 text-[10px] font-mono rounded border capitalize transition-all ${
                charViewStyle === 'cards' ? 'bg-portal/10 text-portal border-portal-300' : 'text-neutral-500 border-neutral-900 hover:text-neutral-300'
              }`}
            >
              Illustrated Cards
            </button>
            <button
              onClick={() => setCharViewStyle('profiles')}
              className={`px-3 py-1 text-[10px] font-mono rounded border capitalize transition-all ${
                charViewStyle === 'profiles' ? 'bg-portal/10 text-portal border-portal-300' : 'text-neutral-500 border-neutral-900 hover:text-neutral-300'
              }`}
            >
              Detailed Lists
            </button>
          </div>
        </div>

        {charViewStyle === 'cards' ? (
          <div className="space-y-6">
            {separatePortraitKinds ? portraitGroups.map(group => (
              <div key={group.id}>
                <h4 className="text-[11px] text-human tracking-widest font-sc font-bold uppercase mb-3">{group.heading}</h4>
                {group.characters.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {group.characters.map(renderCharacterCard)}
                  </div>
                ) : (
                  <p className="rounded border border-dashed border-neutral-900 bg-neutral-950/20 px-3 py-4 text-[10px] text-neutral-600">
                    No {group.heading.toLocaleLowerCase()} have been recorded.
                  </p>
                )}
              </div>
            )) : (
              <div>
                <h4 className="text-[11px] text-human tracking-widest font-sc font-bold uppercase mb-3">Divine Character Cards</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {charsToRender.map(renderCharacterCard)}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3 border-t border-neutral-900 pt-5">
                <h4 className="text-[11px] text-human tracking-widest font-sc font-bold uppercase">World Geolocation Vistas</h4>
              </div>

              {showAddLocationForm && (
                <form onSubmit={handleAddLocation} className="mb-6 p-4 bg-neutral-950 border border-neutral-900 rounded-lg space-y-3 animate-fadeIn text-xs max-w-lg">
                  <h4 className="font-sc font-extrabold text-xs text-human tracking-wider uppercase">Chart Unexplored domain node</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-fx4uxyo">Domain Name</label>
                      <input
                        type="text"
                        value={newLocation.name}
                        onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                        placeholder="e.g. Primordial Fog Valley"
                        className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                        required id="a11y-control-fx4uxyo"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-1sbu7vi">Broader Realm</label>
                      <input
                        type="text"
                        value={newLocation.realm}
                        onChange={(e) => setNewLocation({ ...newLocation, realm: e.target.value })}
                        placeholder="e.g. Heavenly Realm"
                        className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs" id="a11y-control-1sbu7vi"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-b5lg9hw">Safety Index</label>
                      <select
                        value={newLocation.safetyLevel}
                        onChange={(e) => setNewLocation({ ...newLocation, safetyLevel: e.target.value })}
                        className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs" id="a11y-control-b5lg9hw"
                      >
                        <option value="Safe">Safe Haven (Protected)</option>
                        <option value="Dangerous">Dangerous (Demons)</option>
                        <option value="Lethal">Lethal (Forbidden Zone)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1 font-sc" htmlFor="a11y-control-s3gbkn3">Description Atmosphere</label>
                      <input
                        type="text"
                        value={newLocation.description}
                        onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                        placeholder="e.g. Floating islands dripping celestial water..."
                        className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs" id="a11y-control-s3gbkn3"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 pt-1">
                    <button type="button"  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowAddLocationForm(false)} className="text-neutral-500">Cancel</button>
                    <button type="submit" className="bg-portal text-void font-bold px-3 py-1 rounded font-sc uppercase text-[10px] tracking-wider">Formulate</button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {!locationsToRender || locationsToRender.length === 0 ? (
                  <div className="col-span-3 text-center py-10 border border-dashed border-neutral-900 rounded bg-neutral-950/20 text-xs text-neutral-500 italic">
                    No geographic realms known. Continue reading or formulate a custom domain above!
                  </div>
                ) : (
                  locationsToRender.map((loc) => {
                    const isGenerating = generatingId === loc.id;
                    const hasImage = Boolean(loc.imageAssetId || loc.imageUrl);
                    const currentChapter = activeStory.currentChapterNumber || 1;
                    const hasAppeared = loc.firstAppeared === undefined || loc.firstAppeared <= currentChapter;
                    const activePreview = previews[loc.id];
                    const canGenerate = hasAppeared && (!hasImage || Boolean(loc.evolutionReady)) && !isFreeUserOnHubStory;

                    return (
                      <LocationCard
                        key={loc.id}
                        loc={loc}
                        activePreview={activePreview}
                        activeStory={activeStory}
                        hasAppeared={hasAppeared}
                        canGenerate={canGenerate}
                        isGenerating={isGenerating}
                        isFreeUserOnHubStory={isFreeUserOnHubStory}
                        handleAwakenCardImage={handleAwakenCardImage}
                        setSelectedNodeChar={setSelectedNodeChar}
                        openEntryContextEditor={() => openEntryContextEditor({ collection: 'locations', id: loc.id })}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {separatePortraitKinds ? portraitGroups.map(group => (
              <div key={group.id}>
                <h4 className="text-[11px] text-human tracking-widest font-sc font-bold uppercase mb-3">{group.heading}</h4>
                {group.characters.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.characters.map(renderCharacterProfile)}
                  </div>
                ) : (
                  <p className="rounded border border-dashed border-neutral-900 bg-neutral-950/20 px-3 py-4 text-[10px] text-neutral-600">
                    No {group.heading.toLocaleLowerCase()} have been recorded.
                  </p>
                )}
              </div>
            )) : charsToRender.length > 0 && (
              <div>
                <h4 className="text-[11px] text-human tracking-widest font-sc font-bold uppercase mb-3">Entity Profiles</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {charsToRender.map(renderCharacterProfile)}
                </div>
              </div>
            )}

            {locationsToRender && locationsToRender.length > 0 && (
              <div className="border-t border-neutral-900 pt-5">
                <h4 className="text-[11px] text-human tracking-widest font-sc font-bold uppercase mb-3">Location Profiles</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {locationsToRender.map((loc) => {
                    const isGenerating = generatingId === loc.id;
                    const currentChapter = activeStory.currentChapterNumber || 1;
                    const hasAppeared = loc.firstAppeared === undefined || loc.firstAppeared <= currentChapter;
                    const hasImage = Boolean(loc.imageAssetId || loc.imageUrl);
                    const canGenerate = hasAppeared && (!hasImage || Boolean(loc.evolutionReady));

                    return (
                      <LocationProfile
                        key={loc.id}
                        loc={loc}
                        activeStory={activeStory}
                        hasAppeared={hasAppeared}
                        canGenerate={canGenerate}
                        isGenerating={isGenerating}
                        isFreeUserOnHubStory={isFreeUserOnHubStory}
                        handleAwakenCardImage={handleAwakenCardImage}
                        setSelectedNodeChar={setSelectedNodeChar}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
