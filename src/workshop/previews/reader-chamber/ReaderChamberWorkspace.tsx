import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { HarnessSkillManifest, HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import { createLocalReaderPreferenceStorage } from '../../../host/reader/readerPreferenceStorage';
import { installOfficialCapaSkillsInMemory } from '../../../host/generation/capa/officialCapaSkills';
import { FeatureWorkspace, type WorkshopControlsConfig, type WorkspaceView } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { AppReader } from './AppReader';
import { READER_PAGES, readerScenes, type ReaderPage, type ReaderSceneId } from './readerScenes';
import { REPLAY_WRITING_MS, SAMPLE_STORY_TITLE, loadSampleStory, startSceneRun, storyExportToWorkspace } from './sampleStory';
import {
  DEFAULT_PRODUCTION_SCENE,
  PRODUCTION_SCENE_GROUPS,
  PRODUCTION_SCENES,
  runProductionSceneAction,
  type ProductionReaderScenario,
} from './productionScenarios';

/**
 * The Original Reference is production's own Reader screen, copied unchanged
 * from Light-Novels and checked under production's compiler settings
 * (tsconfig.reference.json). It loads through a glob so this strict program
 * never type-checks production code under this repository's rules.
 */
type ProductionReaderHostComponent = React.ComponentType<{ scenario: ProductionReaderScenario }>;
const productionReaderModules = import.meta.glob<{ default: ProductionReaderHostComponent }>(
  '../../../components/reader-chamber/reference/host/ProductionReaderHost.tsx',
);
const loadProductionReader = () => Object.values(productionReaderModules)[0]();
const ProductionReaderHost = React.lazy(loadProductionReader);

/** The story Development reads: SENSEI's Sundered Heavens test, or a story opened from an export. */
interface OpenStory {
  state: HarnessWorkspaceState;
  sample: boolean;
}

const loadingNote = (text: string) => (
  <div className="flex min-h-[50vh] items-center justify-center px-4 text-center text-sm text-white/40" role="status">{text}</div>
);

export function ReaderChamberWorkspace() {
  const entry = workshopEntries.find((e) => e.id === 'reader-chamber')!;
  const [view, setView] = useState<WorkspaceView>('development');
  const [productionSceneId, setProductionSceneId] = useState(DEFAULT_PRODUCTION_SCENE.id);
  const [productionMount, setProductionMount] = useState(0);
  const productionScene = PRODUCTION_SCENES.find((scene) => scene.id === productionSceneId) ?? DEFAULT_PRODUCTION_SCENE;

  // Development: the app's own Reader. The Workshop keeps its own reader preferences, apart from the app's.
  const [readerPreferences] = useState(() => createLocalReaderPreferenceStorage('workshop.reader.'));
  const [sample, setSample] = useState<HarnessWorkspaceState>();
  const [skills, setSkills] = useState<HarnessSkillManifest[]>();
  const [loadProblem, setLoadProblem] = useState<string>();
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [opened, setOpened] = useState<OpenStory>();
  const [openProblem, setOpenProblem] = useState<string>();
  const [sceneId, setSceneId] = useState<ReaderSceneId>('first-chapter');
  /** Bumped by every scene or story choice, so the Reader starts that scene afresh. */
  const [sceneRun, setSceneRun] = useState(0);
  const [pageRequest, setPageRequest] = useState<{ id: ReaderPage; request: number }>();

  useEffect(() => {
    let active = true;
    setLoadProblem(undefined);
    // The sample story and the official CAPA skills, as the app installs them.
    Promise.all([loadSampleStory(), installOfficialCapaSkillsInMemory()]).then(
      ([story, installed]) => {
        if (!active) return;
        setSample(story);
        setSkills(installed);
      },
      (error: unknown) => {
        if (active) setLoadProblem(error instanceof Error ? error.message : 'The sample story could not be opened.');
      },
    );
    return () => { active = false; };
  }, [loadAttempt]);

  const story = useMemo<OpenStory | undefined>(() => opened ?? (sample ? { state: sample, sample: true } : undefined), [opened, sample]);
  const chapterCount = story ? story.state.chapters.length : 0;
  const scenes = useMemo(() => readerScenes(chapterCount), [chapterCount]);
  const scene = scenes.find((candidate) => candidate.id === sceneId) ?? scenes[0];
  const storyTitle = story?.state.stories[0]?.title ?? SAMPLE_STORY_TITLE;
  // One run per scene choice, even the same scene again (`sceneRun`). It outlives
  // the Reader on screen, so switching views keeps what happened in the scene.
  const sceneRunState = useMemo(() => (story ? startSceneRun(story.state, scene) : undefined), [story, scene, sceneRun]);

  const chooseScene = useCallback((id: ReaderSceneId) => {
    setSceneId(id);
    setSceneRun((run) => run + 1);
    setPageRequest(undefined);
  }, []);
  const openPage = useCallback((id: ReaderPage) => {
    setPageRequest((current) => ({ id, request: (current?.request ?? 0) + 1 }));
  }, []);
  // Switching views mounts the Development pane again: it opens where the reader is, not on the last page asked for.
  const changeView = useCallback((next: WorkspaceView) => {
    setView(next);
    setPageRequest(undefined);
  }, []);
  const openExport = useCallback(async (file: File) => {
    try {
      const state = storyExportToWorkspace(JSON.parse(await file.text()));
      setOpened({ state, sample: false });
      setOpenProblem(undefined);
      chooseScene('first-chapter');
    } catch (error) {
      setOpenProblem(error instanceof SyntaxError
        ? 'This file is not a story saved with Export story.'
        : error instanceof Error ? error.message : 'This story could not be opened.');
    }
  }, [chooseScene]);
  const backToSample = useCallback(() => {
    setOpened(undefined);
    setOpenProblem(undefined);
    chooseScene('first-chapter');
  }, [chooseScene]);

  const applyProductionScene = useCallback((sceneId: string) => {
    setProductionSceneId(sceneId);
    setProductionMount((count) => count + 1);
  }, []);

  useEffect(() => {
    const action = productionScene.action;
    if (!action || view === 'development') return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (runProductionSceneAction(action) || attempts > 20) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [productionScene, productionMount, view]);

  // Shared button skin. `stateButton` wraps long labels onto multiple lines;
  // both keep a ~44px minimum touch target without bulking up the desktop panel.
  const buttonBase =
    'min-h-[2.75rem] rounded-lg border text-xs leading-snug transition-all duration-200';
  const buttonTone = (active: boolean) =>
    active
      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-100'
      : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10';
  const stateButton = (active: boolean) =>
    `${buttonBase} ${buttonTone(active)} w-full px-3 py-2 text-left break-words hyphens-auto`;

  const sectionHeading = (label: string) => (
    <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
      {label}
    </h3>
  );
  const statusLine = (text: string) => (
    <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">{text}</p>
  );

  const productionScenes = {
    id: 'scenes' as const,
    description: 'Production’s own Reader (Light-Novels main @ 647165a) with a sample story. Each scene reloads the story and opens its surface through production’s own control.',
    content: (
      <div className="space-y-5">
        {PRODUCTION_SCENE_GROUPS.map((group) => (
          <section key={group.id}>
            {sectionHeading(group.label)}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PRODUCTION_SCENES.filter((scene) => scene.group === group.id).map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => applyProductionScene(scene.id)}
                  className={stateButton(productionScene.id === scene.id)}
                >
                  {scene.label}
                </button>
              ))}
            </div>
          </section>
        ))}
        {statusLine(`Active scene · ${productionScene.label}`)}
      </div>
    ),
  };
  const developmentSections = [
    {
      id: 'states' as const,
      description: `Where the reader is in ${storyTitle}. Each scene starts from a fresh copy of the story. Writing replays the reply each chapter was written with (about ${Math.round(REPLAY_WRITING_MS / 1000)} seconds); no model is called.`,
      content: (
        <div className="space-y-5">
          <section>
            {sectionHeading('Where the reader is')}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {scenes.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  aria-pressed={scene.id === candidate.id}
                  onClick={() => chooseScene(candidate.id)}
                  className={stateButton(scene.id === candidate.id)}
                >
                  {candidate.label}
                </button>
              ))}
            </div>
          </section>
          <p className="text-xs leading-relaxed text-white/55">{scene.note}</p>
          {statusLine(`Active scene · ${scene.label}`)}
        </div>
      ),
    },
    {
      id: 'pages' as const,
      description: 'Open a Reader page by pressing the Reader’s own button. The story stays as it is.',
      content: (
        <div className="space-y-5">
          <section>
            {sectionHeading('Reader pages')}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {READER_PAGES.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => openPage(page.id)}
                  className={stateButton(pageRequest?.id === page.id)}
                >
                  {page.label}
                </button>
              ))}
            </div>
          </section>
          {statusLine(`Active scene · ${scene.label}`)}
        </div>
      ),
    },
    {
      id: 'advanced' as const,
      description: 'Read another story: open a file saved with Export story in the app. It stays in this browser tab.',
      content: (
        <div className="space-y-4">
          <section>
            {sectionHeading('Story')}
            <p className="mb-3 text-xs text-white/60">
              Reading <span className="text-white/85">{storyTitle}</span>{story?.sample ? ' (SENSEI’s test story)' : ' (opened from a file)'} · {chapterCount} {chapterCount === 1 ? 'chapter' : 'chapters'}
            </p>
            <div className="flex flex-wrap gap-2">
              <label className={`${buttonBase} ${buttonTone(false)} inline-flex cursor-pointer items-center px-3 py-2 focus-within:ring-2 focus-within:ring-cyan-300/60`}>
                Open an exported story…
                <input
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void openExport(file);
                  }}
                />
              </label>
              {opened && (
                <button type="button" onClick={backToSample} className={`${buttonBase} ${buttonTone(false)} px-3 py-2`}>
                  Back to {SAMPLE_STORY_TITLE}
                </button>
              )}
            </div>
            {openProblem && <p role="alert" className="mt-3 text-xs text-amber-200">{openProblem}</p>}
          </section>
        </div>
      ),
    },
  ];
  // The Original Reference has production's scenes; Development has the app Reader's scenes and pages.
  const workshopControls: WorkshopControlsConfig = view === 'reference'
    ? { defaultSection: 'scenes', description: 'Original Reference · production Reader with a sample story', sections: [productionScenes] }
    : {
      defaultSection: 'states',
      description: `Development · the app’s Reader, reading ${storyTitle}`,
      sections: view === 'compare' ? [...developmentSections, productionScenes] : developmentSections,
    };

  const renderDevelopment = () => {
    if (loadProblem) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
          <p role="alert" className="text-sm text-amber-200">{loadProblem}</p>
          <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            className="min-h-11 rounded-full border border-white/20 px-4 text-sm text-white/80 hover:border-white/40">
            Retry
          </button>
        </div>
      );
    }
    if (!sceneRunState || !skills) return loadingNote('Opening the Reader…');
    return (
      <AppReader
        key={`${sceneRun}-${scene.id}`}
        run={sceneRunState}
        skills={skills}
        readerPreferences={readerPreferences}
        page={pageRequest}
      />
    );
  };

  return (
    <FeatureWorkspace
      entry={entry}
      workshopControls={workshopControls}
      allowCompare
      onReferenceIntent={() => void loadProductionReader()}
      onViewChange={changeView}
      renderReference={() => (
        <Suspense fallback={loadingNote('Loading the production Reader…')}>
          <ProductionReaderHost key={`production-${productionScene.id}-${productionMount}`} scenario={productionScene.scenario} />
        </Suspense>
      )}
      renderDevelopment={renderDevelopment}
    />
  );
}

export default ReaderChamberWorkspace;
