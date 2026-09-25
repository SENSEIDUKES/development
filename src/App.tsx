import { lazy, type ComponentType, type ReactNode } from 'react';
import { WorkshopHome } from './workshop/WorkshopHome';
import { ModelRouterGear } from './workshop/ModelRouterSettings';
import { DeferredWorkspace } from './workshop/DeferredWorkspace';
import { ArrowLeft } from 'lucide-react';
import './styles.css';
import '@seihouse/sen/styles.css';

const CelestialBackdropWorkspace = lazy(() =>
  import('./workshop/previews/celestial-backdrop/CelestialBackdropWorkspace')
    .then(module => ({ default: module.CelestialBackdropWorkspace })),
);
const HarnessGenerationWorkspace = lazy(() =>
  import('./workshop/previews/harness-generation/HarnessGenerationWorkspace')
    .then(module => ({ default: module.HarnessGenerationWorkspace })),
);
const ChapterManifestationWorkspace = lazy(() =>
  import('./workshop/previews/chapter-manifestation/ChapterManifestationWorkspace')
    .then(module => ({ default: module.ChapterManifestationWorkspace })),
);
const ClosedDoorCultivationWorkspace = lazy(() =>
  import('./workshop/previews/closed-door-cultivation/ClosedDoorCultivationWorkspace')
    .then(module => ({ default: module.ClosedDoorCultivationWorkspace })),
);
const CharacterVoiceWorkspace = lazy(() =>
  import('./workshop/previews/character-voice/CharacterVoiceWorkspace')
    .then(module => ({ default: module.CharacterVoiceWorkspace })),
);
const ReaderCodexWorkspace = lazy(() =>
  import('./workshop/previews/reader-codex/ReaderCodexWorkspace')
    .then(module => ({ default: module.ReaderCodexWorkspace })),
);
const ReaderChamberWorkspace = lazy(() =>
  import('./workshop/previews/reader-chamber/ReaderChamberWorkspace')
    .then(module => ({ default: module.ReaderChamberWorkspace })),
);
const CardWorkshopWorkspace = lazy(() =>
  import('./workshop/previews/card-workshop/CardWorkshopWorkspace')
    .then(module => ({ default: module.CardWorkshopWorkspace })),
);
const RelicsWorkspace = lazy(() =>
  import('./workshop/previews/relics/RelicsWorkspace')
    .then(module => ({ default: module.RelicsWorkspace })),
);
const StorySeedWorkspace = lazy(() =>
  import('./workshop/previews/story-seed/StorySeedWorkspace')
    .then(module => ({ default: module.StorySeedWorkspace })),
);
const LightNovelsHomeWorkspace = lazy(() => import('./workshop/previews/light-novels-home/LightNovelsHomeWorkspace').then(module => ({ default: module.LightNovelsHomeWorkspace })));
const MotionPictureWorkspace = lazy(() => import('./workshop/previews/motion-picture/MotionPictureWorkspace').then(module => ({ default: module.MotionPictureWorkspace })));
const LibraryShellWorkspace = lazy(() =>
  import('./workshop/previews/library-shell/LibraryShellWorkspace')
    .then(module => ({ default: module.LibraryShellWorkspace })),
);
const UserProfileWorkspace = lazy(() =>
  import('./workshop/previews/user-profile/UserProfileWorkspace')
    .then(module => ({ default: module.UserProfileWorkspace })),
);
const CelestialStoreWorkspace = lazy(() =>
  import('./workshop/previews/celestial-store/CelestialStoreWorkspace')
    .then(module => ({ default: module.CelestialStoreWorkspace })),
);
const DaoPillarWorkspace = lazy(() =>
  import('./workshop/previews/dao-pillar/DaoPillarWorkspace')
    .then(module => ({ default: module.DaoPillarWorkspace })),
);
const EnergyWorkspace = lazy(() =>
  import('./workshop/previews/energy/EnergyWorkspace')
    .then(module => ({ default: module.EnergyWorkspace })),
);
const ProvenanceWorkspace = lazy(() =>
  import('./workshop/previews/provenance/ProvenanceWorkspace')
    .then(module => ({ default: module.ProvenanceWorkspace })),
);
const ModelRouterWorkspace = lazy(() =>
  import('./workshop/previews/model-router/ModelRouterWorkspace')
    .then(module => ({ default: module.ModelRouterWorkspace })),
);
const FamiliarWorkspace = lazy(() => import('./workshop/previews/familiar/FamiliarWorkspace').then(module => ({ default: module.FamiliarWorkspace })));
const RewardLoopWorkspace = lazy(() => import('./workshop/previews/rewards/RewardLoopWorkspace').then(module => ({ default: module.RewardLoopWorkspace })));
const AchievementsWorkspace = lazy(() => import('./workshop/previews/achievements/AchievementsWorkspace').then(module => ({ default: module.AchievementsWorkspace })));
const FamiliarTrainingWorkspace = lazy(() => import('./workshop/previews/familiar-training/FamiliarTrainingWorkspace').then(module => ({ default: module.FamiliarTrainingWorkspace })));
const AudioPlayerSmokeWorkspace = lazy(() =>
  import('./workshop/previews/audio-player-smoke/AudioPlayerSmokeWorkspace')
    .then(module => ({ default: module.AudioPlayerSmokeWorkspace })),
);

/**
 * One entry per manifest id. Adding a feature means adding one line here —
 * never a new `if` block per version. There is no separate registry entry
 * for a "V2"; a feature's Original Reference / Development split lives
 * inside its own workspace component (see FeatureWorkspace).
 */
const previewRegistry: Record<string, ComponentType> = {
  'achievements': AchievementsWorkspace,
  'audio-player-smoke': AudioPlayerSmokeWorkspace,
  'card-workshop': CardWorkshopWorkspace,
  'celestial-backdrop': CelestialBackdropWorkspace,
  'celestial-store': CelestialStoreWorkspace,
  'character-voice': CharacterVoiceWorkspace,
  'chapter-generation-manifestation': ChapterManifestationWorkspace,
  'dao-pillar': DaoPillarWorkspace,
  'energy': EnergyWorkspace,
  'model-router': ModelRouterWorkspace,
  'provenance': ProvenanceWorkspace,
  'familiar': FamiliarWorkspace,
  'familiar-training': FamiliarTrainingWorkspace,
  'harness-generation': HarnessGenerationWorkspace,
  'idle-cultivation': ClosedDoorCultivationWorkspace,
  'reader-codex': ReaderCodexWorkspace,
  'reader-chamber': ReaderChamberWorkspace,
  'relics-gallery': RelicsWorkspace,
  'reward-loop': RewardLoopWorkspace,
  'story-seed': StorySeedWorkspace,
  'light-novels-home': LightNovelsHomeWorkspace,
  'motion-picture': MotionPictureWorkspace,
  'library-shell': LibraryShellWorkspace,
  'user-profile': UserProfileWorkspace,
};

function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* In normal document flow (not fixed) so it scrolls away with the page
          instead of permanently floating over a preview's own sticky header
          (e.g. the Reader Chamber's in-chamber title bar) at the same corner. */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-1 sm:px-6 sm:pt-4 sm:pb-2">
        <a
          href="/"
          className="workshop-touch-target inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-full backdrop-blur transition-all duration-200 border border-neutral-700/50 shadow-lg text-xs sm:text-sm"
          style={{ textDecoration: 'none', fontFamily: 'var(--font-sans)' }}
        >
          <ArrowLeft size={14} className="shrink-0" />
          Back to Workshop
        </a>
        <ModelRouterGear />
      </div>
      {children}
    </>
  );
}

export default function App() {
  const preview = new URLSearchParams(window.location.search).get('preview');
  const Workspace = preview ? previewRegistry[preview] : undefined;

  if (Workspace) {
    return (
      <PreviewLayout>
        <DeferredWorkspace
          loadingLabel="Loading Workshop preview"
          className="min-h-[calc(100vh-5rem)]"
        >
          <Workspace />
        </DeferredWorkspace>
      </PreviewLayout>
    );
  }

  return <WorkshopHome />;
}
