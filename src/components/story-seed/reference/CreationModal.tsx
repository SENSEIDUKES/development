import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Cloud, ArrowRight } from 'lucide-react';
import type { IntakeData, StorySeed, StorySeedPayload, WorldBlueprint } from '../shared/referenceIntake';
import {
  AGENTS,
  LOCAL_ONLY_MODE,
  createStorySeed,
  importStorySeeds,
  listStorySeeds,
  mockLogin,
  selectIsGenerating,
  updateStorySeed,
  useAppStore,
} from '../shared/stubs';

// Feature components
import { FormSectionId } from './FormSection';
import { CoreSeedForm } from './CoreSeedForm';
import { WorldSettingForm } from './WorldSettingForm';
import { CharacterSetupForm } from './CharacterSetupForm';
import { CustomCharactersForm } from './CustomCharactersForm';
import { CustomFactionsForm } from './CustomFactionsForm';
import { PowerSystemForm } from './PowerSystemForm';
import { PlotControlForm } from './PlotControlForm';
import { MakeItWorkForm } from './MakeItWorkForm';
import { ImportPanel } from './ImportPanel';
import { BlueprintReview } from './BlueprintReview';
import { SeedLibraryPanel } from './SeedLibraryPanel';
import { downloadStorySeed, downloadStorySeedCollection } from '../shared/referenceIntake';

import { PREMISE_SUGGESTIONS } from './constants';

interface CreationModalProps {
  onStartStory: (intake: IntakeData, blueprint: WorldBlueprint, chapterCount: number, sourceSeedId?: string) => Promise<void>;
  onGenerateBlueprint: (intake: IntakeData) => Promise<WorldBlueprint>;
  isGenerating: boolean;
  error: string | null;
}

const getRandomName = () => {
  const names = ['Ye Chen', 'Xiao Yan', 'Lin Dong', 'Wang Lin', 'Meng Hao', 'Bai Xiaochun', 'Su Ming', 'Li Qiye', 'Chu Feng', 'Ji Ning'];
  return names[Math.floor(Math.random() * names.length)];
};

const createDefaultIntake = (): IntakeData => ({
  novelTitle: '',
  mcName: getRandomName(),
  genrePath: 'Fate Survival',
  corePremise: PREMISE_SUGGESTIONS[0],
  desiredPlotDirection: '',
  storyTags: [],
  worldType: '',
  startingLocation: '',
  societyStructure: '',
  dangerLevel: '',
  generalAtmosphere: '',
  startingIdentity: '',
  personality: '',
  mainFlaw: '',
  secretAdvantage: '',
  startingWeakness: '',
  moralAlignment: '',
  mcBio: '',
  customCharacters: [],
  customFactions: [],
  startingPowerConcept: '',
  powerFlavor: '',
  powerPace: '',
  knownRanks: '',
  uniquePath: '',
  longTermGoal: '',
  firstMajorConflict: '',
  mainAntagonistPressure: '',
  romanceLevel: '',
  faceSlappingLevel: '',
  comedyLevel: '',
  tournamentArcPreference: '',
  haremPreference: '',
  betrayalLevel: '',
  thingsToAvoid: '',
  mustIncludeElements: '',
  fatePressure: 'Balanced',
  makeItWorkInstruction: '',
});

export default function CreationModal({ onStartStory, onGenerateBlueprint, isGenerating: isGeneratingProp, error }: CreationModalProps) {
  const storeIsGenerating = useAppStore(selectIsGenerating);
    const activeAgentId = useAppStore(state => state.activeAgentId);
    const currentUser = useAppStore(state => state.currentUser);
  const seedReferenceSignature = useAppStore(state => state.stories
    .map(story => `${story.id}:${story.sourceSeedId || ''}`)
    .join('|'));
  const isGenerating = isGeneratingProp || storeIsGenerating;
  const [stage, setStage] = useState<'intake' | 'blueprint'>('intake');
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [blueprint, setBlueprint] = useState<WorldBlueprint | null>(null);
  const [currentSeed, setCurrentSeed] = useState<StorySeed | null>(null);
  const [savedSeeds, setSavedSeeds] = useState<StorySeed[]>([]);
  const [isLoadingSeeds, setIsLoadingSeeds] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [chapterCount] = useState(10);
  const [activeSection, setActiveSection] = useState<FormSectionId>('core');

  const [intake, setIntake] = useState<IntakeData>(createDefaultIntake);

  useEffect(() => {
    if (LOCAL_ONLY_MODE || !currentUser) {
      setSavedSeeds([]);
      setCurrentSeed(null);
      return;
    }
    const expectedUid = currentUser.uid;
    let cancelled = false;
    setIsLoadingSeeds(true);
    setSeedError(null);
    listStorySeeds()
      .then(seeds => {
        if (!cancelled && useAppStore.getState().currentUser?.uid === expectedUid) setSavedSeeds(seeds);
      })
      .catch(error => {
        if (!cancelled && useAppStore.getState().currentUser?.uid === expectedUid) {
          console.error('Failed to load account story seeds:', error);
          setSeedError('Your saved story seeds could not be loaded.');
        }
      })
      .finally(() => {
        if (!cancelled && useAppStore.getState().currentUser?.uid === expectedUid) setIsLoadingSeeds(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser, seedReferenceSignature]);

  const updateIntake = (field: keyof IntakeData, value: any) => {
    setIntake(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = async () => {
    try {
      await mockLogin();
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const rememberSeed = (seed: StorySeed) => {
    setCurrentSeed(seed);
    setSavedSeeds(previous => [seed, ...previous.filter(item => item.id !== seed.id)]);
  };

  const persistSeed = async (payload: StorySeedPayload): Promise<StorySeed | null> => {
    if (LOCAL_ONLY_MODE) return null;
    if (!currentUser) throw new Error('Sign in to save this story seed to your account.');
    const saved = currentSeed
      ? await updateStorySeed(currentSeed, payload)
      : await createStorySeed(payload);
    rememberSeed(saved);
    return saved;
  };

  const handleImport = async (payloads: StorySeedPayload[]) => {
    if (payloads.length === 0) return;
    const imported = LOCAL_ONLY_MODE ? [] : await importStorySeeds(payloads);
    if (imported.length > 0) {
      setSavedSeeds(previous => [
        ...imported,
        ...previous.filter(seed => !imported.some(item => item.id === seed.id)),
      ]);
      setCurrentSeed(imported[0]);
    } else {
      setCurrentSeed(null);
    }
    const selected = imported[0] || payloads[0];
    setIntake({ ...createDefaultIntake(), ...selected.intake });
    setBlueprint(selected.blueprint);
    setStage('blueprint');
    setShowImportPanel(false);
    setSeedError(null);
  };

  const handleUseSeed = (seed: StorySeed) => {
    setCurrentSeed(seed);
    setIntake({ ...createDefaultIntake(), ...seed.intake });
    setBlueprint(seed.blueprint);
    setStage('blueprint');
    setSeedError(null);
  };

  const handleGenerateBlueprintClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating || selectIsGenerating(useAppStore.getState())) return;
    if (!intake.corePremise?.trim() || !intake.genrePath) return;
    try {
      const bp = await onGenerateBlueprint(intake);
      setBlueprint(bp);
      setStage('blueprint');
      try {
        await persistSeed({ intake, blueprint: bp });
        setSeedError(null);
      } catch (seedSaveError) {
        console.error('Failed to save generated story seed:', seedSaveError);
        setSeedError('The blueprint was generated, but its account seed was not saved. Retry before starting the story.');
      }
    } catch (err) {
      // Error handled in parent
    }
  };

  const handleStartStoryClick = async () => {
    if (isGenerating || selectIsGenerating(useAppStore.getState())) return;
    if (!blueprint) return;
    const cleanBlueprint = {
      ...blueprint,
      majorFactions: (blueprint.majorFactions || []).map(f => f.trim()).filter(Boolean),
      initialCharacters: (blueprint.initialCharacters || []).map(f => f.trim()).filter(Boolean),
      majorMysteries: (blueprint.majorMysteries || []).map(f => f.trim()).filter(Boolean),
      unresolvedPlotThreads: (blueprint.unresolvedPlotThreads || []).map(f => f.trim()).filter(Boolean),
    };
    try {
      const savedSeed = await persistSeed({ intake, blueprint: cleanBlueprint });
      if (!LOCAL_ONLY_MODE && !savedSeed) return;
      setSeedError(null);
      await onStartStory(intake, cleanBlueprint, chapterCount, savedSeed?.id);
    } catch (seedSaveError) {
      console.error('Failed to persist source story seed:', seedSaveError);
      setSeedError('The story was not started because its source seed could not be saved to your account.');
    }
  };

  const handleExportCurrentSeed = () => {
    if (!blueprint) return;
    const payload = { intake, blueprint };
    // Start sharing immediately so iOS Safari retains the user gesture needed
    // to present Save to Files. Persistence can finish independently.
    setSeedError(null);
    void downloadStorySeed(payload).catch(downloadError => {
      console.error('Failed to export story seed:', downloadError);
      setSeedError('The seed could not be exported. Please try again.');
    });
    void persistSeed(payload).catch(seedSaveError => {
      console.error('Failed to save seed while exporting:', seedSaveError);
      setSeedError('The seed was exported, but its account copy could not be saved.');
    });
  };

  const handleExportSavedSeed = (seed: StorySeed) => {
    void downloadStorySeed(seed).catch(downloadError => {
      console.error('Failed to export saved story seed:', downloadError);
      setSeedError('The seed could not be exported. Please try again.');
    });
  };

  const handleExportAllSeeds = () => {
    void downloadStorySeedCollection(savedSeeds).catch(downloadError => {
      console.error('Failed to export account story seeds:', downloadError);
      setSeedError('Your seeds could not be exported. Please try again.');
    });
  };

  if (!currentUser && !LOCAL_ONLY_MODE) {
    return (
      <div className="max-w-xl mx-auto pb-20 pt-20 text-center" id="creation-portal-root">
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-signal tracking-tight mb-4">
          Authentication Required
        </h1>
        <p className="font-sans font-light text-neutral-400 text-sm mx-auto leading-relaxed mb-8">
          You must link your spirit to the matrix before forging a new destiny. Anonymous creation is sealed to prevent celestial authorization breaches.
        </p>
        <button
           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleLogin}
          className="font-sc px-8 py-3 rounded text-sm uppercase tracking-widest font-bold inline-flex items-center space-x-2 bg-human text-signal border border-human hover:bg-void hover:text-human hover:border-human shadow-[0_0_15px_rgba(139,0,0,0.3)] transition-all"
        >
          <Cloud size={18} />
          <span>Sync Spirit (Sign In)</span>
        </button>
      </div>
    );
  }

  if (stage === 'blueprint' && blueprint) {
    return (
      <>
        {seedError && (
          <div className="mx-auto mb-5 max-w-4xl rounded border border-red-900 bg-red-950/30 p-3 text-center font-sans text-xs text-red-200" role="alert">
            {seedError}
          </div>
        )}
        <BlueprintReview
          blueprint={blueprint}
          setBlueprint={setBlueprint}
          onBack={() => setStage('intake')}
          onStartStory={handleStartStoryClick}
          onExportSeed={handleExportCurrentSeed}
          isGenerating={isGenerating}
        />
      </>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20" id="creation-portal-root">
      {/* Header section */}
      <div className="text-center mb-10">
        <span className="font-sc text-human tracking-[0.2em] text-sm uppercase block mb-2">SEIHouse Archive Matrix</span>
        <h1 className="font-display font-bold text-4xl sm:text-5xl text-signal tracking-tight mb-4">
          Story Seed Intake
        </h1>
        <p className="font-sans font-light text-neutral-400 text-sm max-w-xl mx-auto leading-relaxed mb-6">
          Provide as much or as little detail as you want. Empty fields will be intelligently extrapolated using Chinese light-novel logic. We will first generate a World Blueprint for your review.
        </p>

        {/* Import Trigger Button */}
        <div className="flex justify-center">
          <button
            type="button"
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowImportPanel(!showImportPanel)}
            className="font-sc px-5 py-2.5 rounded text-xs uppercase tracking-widest font-bold flex items-center space-x-2 bg-neutral-950 text-portal border border-neutral-900 hover:border-portal hover:bg-portal/5 transition-all shadow-[0_0_12px_rgba(4,172,255,0.05)] cursor-pointer"
          >
            <Copy size={14} />
            <span>Import World Seed / Blueprint</span>
          </button>
        </div>
      </div>

      <ImportPanel
        show={showImportPanel}
        onClose={() => setShowImportPanel(false)}
        onImport={handleImport}
      />

      {!LOCAL_ONLY_MODE && currentUser && (
        <SeedLibraryPanel
          seeds={savedSeeds}
          isLoading={isLoadingSeeds}
          onUse={handleUseSeed}
          onExport={handleExportSavedSeed}
          onExportAll={handleExportAllSeeds}
        />
      )}

      {seedError && (
        <div className="mb-6 rounded border border-red-900 bg-red-950/30 p-3 text-center font-sans text-xs text-red-200" role="alert">
          {seedError}
        </div>
      )}

      <form onSubmit={handleGenerateBlueprintClick} className="space-y-4">
        <CoreSeedForm intake={intake} updateIntake={updateIntake} activeSection={activeSection} setActiveSection={setActiveSection} />
        <WorldSettingForm intake={intake} updateIntake={updateIntake} activeSection={activeSection} setActiveSection={setActiveSection} />
        <CharacterSetupForm intake={intake} updateIntake={updateIntake} activeSection={activeSection} setActiveSection={setActiveSection} />
        <CustomCharactersForm intake={intake} updateIntake={updateIntake} activeSection={activeSection} setActiveSection={setActiveSection} />
        <CustomFactionsForm intake={intake} updateIntake={updateIntake} activeSection={activeSection} setActiveSection={setActiveSection} />
        <PowerSystemForm intake={intake} updateIntake={updateIntake} activeSection={activeSection} setActiveSection={setActiveSection} />
        <PlotControlForm intake={intake} updateIntake={updateIntake} activeSection={activeSection} setActiveSection={setActiveSection} />
        <MakeItWorkForm intake={intake} updateIntake={updateIntake} activeSection={activeSection} setActiveSection={setActiveSection} />

        {error && (
          <div className="bg-red-900/20 border border-red-900 text-red-200 p-4 rounded text-sm text-center">
            {error}
          </div>
        )}

        <div className="flex justify-end pt-8">
          <button
            type="submit"
            disabled={isGenerating || !intake.corePremise?.trim()}
            className="font-sc px-8 py-4 rounded text-sm uppercase tracking-widest font-bold inline-flex items-center space-x-2 bg-human text-signal border border-human hover:bg-void hover:text-human hover:border-human shadow-[0_0_15px_rgba(139,0,0,0.3)] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isGenerating ? (
              <>
                {activeAgentId === 'versa' ? (
                  <img src={AGENTS.VERSA.logoUrl} className="w-5 h-5 object-contain animate-pulse" alt="VERSA" />
                ) : (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full" />
                )}
                <span>{activeAgentId === 'versa' ? 'VERSA is drafting...' : 'Generating Blueprint...'}</span>
              </>
            ) : (
              <>
                <span>Forge World Blueprint</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
