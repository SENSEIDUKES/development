/**
 * Workshop preview for Dao Insights (Story Sparks).
 *
 * Development renders the panel the app's Home uses, with a local stand-in for
 * the Story Spark server so every state is reachable without a model: nothing
 * leaves the preview, and Begin / Keep only report what the app would do.
 * Original Reference is the old comforting-quote oracle, unchanged.
 */
import { useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { MainLibraryAdapterContext, MainLibraryHomeInsights, type DaoSparkHost, type MainLibraryAdapter } from '@seihouse/library/shell';
import { storyStyleForGenre } from '@seihouse/sen/story-seed';
import { DaoInsights as ReferenceDaoInsights } from '../../../components/library-shell/reference/main-library/DaoInsights';

const entry = workshopEntries.find(candidate => candidate.id === 'dao-insights')!;

type SparkState = 'model' | 'no-model' | 'model-fails' | 'daily-limit';

const STATES: { id: SparkState; label: string; description: string }[] = [
  { id: 'model', label: 'Model connected', description: 'Sparks come from a local stand-in for the Story Spark server after a short wait.' },
  { id: 'no-model', label: 'No model', description: 'No model is configured: Random uses the Dao\'s hand-written sparks and Custom keeps the writer\'s words as written.' },
  { id: 'model-fails', label: 'Model fails', description: 'Every request fails: Random surfaces an older spark and says why; Custom shows the error.' },
  { id: 'daily-limit', label: 'Daily limit reached', description: 'The visitor has used their twenty free sparks today.' },
];

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const hostFor = (state: SparkState, report: (message: string) => void): DaoSparkHost => ({
  checkSparks: async () => state !== 'no-model',
  requestSpark: async request => {
    await wait(700);
    if (state === 'model-fails') throw new Error('The Dao was silent. Seek again.');
    if (state === 'daily-limit') throw new Error('The Dao has spoken its twenty sparks for today. Seek again tomorrow, or plant one you already have.');
    const genre = request.inventGenre ? 'Echo Cultivation' : request.genre;
    return {
      genre,
      inventedGenre: Boolean(request.inventGenre),
      title: `The ${genre} Graduate`,
      style: storyStyleForGenre(genre),
      survival: Boolean(request.fateSurvival),
      ...(request.inventGenre ? { genreNote: 'Every technique is a sound, and every sound must be answered.' } : {}),
      premise: request.idea
        ? `${request.idea.replace(/[.\s]+$/, '')}, until the ${genre} world decides that is the one thing it cannot allow.`
        : `A disciple discovers the ${genre} sect's oldest rule was written to keep one student from ever graduating: her.`,
      aside: 'The Workshop oracle mutters this spark from local fixtures. Nothing leaves the preview.',
      voice: 'Workshop Oracle of the Local Fixtures',
    };
  },
  keepSpark: async spark => report(`Kept in the Story Bank: ${spark.genre}. (Preview: the app saves a new Story Seed.)`),
  beginSpark: async spark => report(`Begun: ${spark.genre}. (Preview: the app opens the new Story Seed in Create.)`),
});

const copyText = async (text: string) => { await navigator.clipboard?.writeText(text); };

function Stage({ children, note }: { children: React.ReactNode; note: React.ReactNode }) {
  return <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-6 px-4 py-12">
    <div className="flex w-full justify-center">{children}</div>
    <p className="max-w-sm text-center text-xs text-white/45">{note}</p>
  </div>;
}

function DaoInsightsDevelopment({ state }: { state: SparkState }) {
  const [report, setReport] = useState<string | null>(null);
  const host = useMemo(() => hostFor(state, setReport), [state]);
  return <Stage note={<>Tap the Dao Insights trigger to open the panel.{report && <span role="status" className="mt-2 block text-cyan-200/80">{report}</span>}</>}>
    {/* `key` gives each state a fresh panel, so its model check runs again. */}
    <MainLibraryHomeInsights key={state} everyWidth adapter={{ copyText, daoSparks: host }} />
  </Stage>;
}

const REFERENCE_QUOTES = {
  inspirational: { quote: 'The highest, cloud-shrouded peaks are climbed not by the fastest feet, but by the quietest hearts that refuse to look back.', author: 'Hermit of the Whispering Pines' },
  comedic: { quote: 'If you cannot master the celestial flying sword, try walking with a really long, polished bamboo pole. The mortals will still think you are incredibly profound.', author: 'Fairy Chef of the Red Lotus Valley' },
  comforting: { quote: 'Close your dusty scrolls. Light a single stick of cedar incense. The Great Dao is not found in old papers, but in the warmth of the tea steam rising to meet your face.', author: 'Old Auntie of the Peach Blossom Orchard' },
};

/** The fields the old oracle reads; the rest of the Main Library adapter is inert here. */
const referenceAdapter: MainLibraryAdapter = {
  currentScreen: 'home', setCurrentScreen: () => {}, activeStoryId: null, setActiveStoryId: () => {},
  syncStatus: 'idle', lastSavedTime: null, currentUser: null, userProfile: null, stories: [],
  setIsSettingsOpen: () => {}, setIsCodexSheetOpen: () => {}, setIsShortcutsOpen: () => {},
  requestDao: (async (kind: string) => ({
    ok: true,
    json: async () => kind === 'status'
      ? { hasServerGemini: true }
      : { ...REFERENCE_QUOTES[kind as keyof typeof REFERENCE_QUOTES], category: kind },
  })) as MainLibraryAdapter['requestDao'],
};

function DaoInsightsReference() {
  return <Stage note="The old oracle: comedic, inspirational and comforting quotes, answered here from local fixtures.">
    <MainLibraryAdapterContext.Provider value={referenceAdapter}>
      <ReferenceDaoInsights />
    </MainLibraryAdapterContext.Provider>
  </Stage>;
}

export function DaoInsightsWorkspace() {
  const [state, setState] = useState<SparkState>('model');
  return (
    <FeatureWorkspace
      entry={entry}
      allowCompare={false}
      workshopControls={{
        description: 'A local stand-in answers for the Story Spark server. No model is called and nothing is saved.',
        defaultSection: 'states',
        sections: [{
          id: 'states',
          description: STATES.find(option => option.id === state)?.description,
          content: (
            <div className="flex flex-wrap gap-2">
              {STATES.map(option => (
                <button key={option.id} type="button" aria-pressed={state === option.id} onClick={() => setState(option.id)}
                  className={`workshop-touch-target rounded-lg border px-3 py-2 text-xs transition-colors ${state === option.id
                    ? 'border-cyan-400/35 bg-cyan-500/15 text-cyan-100'
                    : 'border-white/10 text-white/55 hover:border-white/20 hover:bg-white/5 hover:text-white/85'}`}>
                  {option.label}
                </button>
              ))}
            </div>
          ),
        }],
      }}
      renderReference={() => <MotionConfig reducedMotion="user"><DaoInsightsReference /></MotionConfig>}
      renderDevelopment={() => <DaoInsightsDevelopment state={state} />}
    />
  );
}
