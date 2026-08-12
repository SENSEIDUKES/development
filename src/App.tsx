import { lazy, type ComponentType, type ReactNode } from 'react';
import { WorkshopHome } from './workshop/WorkshopHome';
import { DeferredWorkspace } from './workshop/DeferredWorkspace';
import { ArrowLeft } from 'lucide-react';
import './styles.css';

const CelestialBackdropWorkspace = lazy(() =>
  import('./workshop/previews/celestial-backdrop/CelestialBackdropWorkspace')
    .then(module => ({ default: module.CelestialBackdropWorkspace })),
);
const ChapterGenerationFlowWorkspace = lazy(() =>
  import('./workshop/previews/chapter-generation-flow/ChapterGenerationFlowWorkspace')
    .then(module => ({ default: module.ChapterGenerationFlowWorkspace })),
);
const ChapterManifestationWorkspace = lazy(() =>
  import('./workshop/previews/chapter-manifestation/ChapterManifestationWorkspace')
    .then(module => ({ default: module.ChapterManifestationWorkspace })),
);
const ClosedDoorCultivationWorkspace = lazy(() =>
  import('./workshop/previews/closed-door-cultivation/ClosedDoorCultivationWorkspace')
    .then(module => ({ default: module.ClosedDoorCultivationWorkspace })),
);
const ReaderCodexWorkspace = lazy(() =>
  import('./workshop/previews/reader-codex/ReaderCodexWorkspace')
    .then(module => ({ default: module.ReaderCodexWorkspace })),
);
const ReaderChamberWorkspace = lazy(() =>
  import('./workshop/previews/reader-chamber/ReaderChamberWorkspace')
    .then(module => ({ default: module.ReaderChamberWorkspace })),
);
const RelicsWorkspace = lazy(() =>
  import('./workshop/previews/relics/RelicsWorkspace')
    .then(module => ({ default: module.RelicsWorkspace })),
);
const StorySeedWorkspace = lazy(() =>
  import('./workshop/previews/story-seed/StorySeedWorkspace')
    .then(module => ({ default: module.StorySeedWorkspace })),
);

/**
 * One entry per manifest id. Adding a feature means adding one line here —
 * never a new `if` block per version. There is no separate registry entry
 * for a "V2"; a feature's Original Reference / Development split lives
 * inside its own workspace component (see FeatureWorkspace).
 */
const previewRegistry: Record<string, ComponentType> = {
  'celestial-backdrop': CelestialBackdropWorkspace,
  'chapter-generation-flow': ChapterGenerationFlowWorkspace,
  'chapter-generation-manifestation': ChapterManifestationWorkspace,
  'idle-cultivation': ClosedDoorCultivationWorkspace,
  'reader-codex': ReaderCodexWorkspace,
  'reader-chamber': ReaderChamberWorkspace,
  'relics-gallery': RelicsWorkspace,
  'story-seed': StorySeedWorkspace,
};

function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* In normal document flow (not fixed) so it scrolls away with the page
          instead of permanently floating over a preview's own sticky header
          (e.g. the Reader Chamber's in-chamber title bar) at the same corner. */}
      <div className="p-4">
        <a
          href="/"
          className="workshop-touch-target inline-flex items-center gap-2 px-4 py-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-full backdrop-blur transition-all duration-200 border border-neutral-700/50 shadow-lg"
          style={{ textDecoration: 'none', fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}
        >
          <ArrowLeft size={16} />
          Back to Workshop
        </a>
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
