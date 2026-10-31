/**
 * Workshop preview for Sparks (code: Dao Insights; Story Sparks).
 *
 * Development renders the Sparks button the app's Creator Space and Story
 * Seed's Origin use, with a local stand-in for the Story Spark server so every
 * state is reachable without a model: nothing leaves the preview, and Begin,
 * Keep and Use this spark only report what the app would do.
 */
import { useMemo, useState } from 'react';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { SparksButton, type SparkHost } from '@seihouse/sen/story-seed';
import { LibraryLook } from '@seihouse/library/presentation';
import { storyStyleForGenre } from '@seihouse/sen/story-seed';

const entry = workshopEntries.find(candidate => candidate.id === 'dao-insights')!;

type SparkState = 'model' | 'no-model' | 'model-fails' | 'daily-limit';

const STATES: { id: SparkState; label: string; description: string }[] = [
  { id: 'model', label: 'Model connected', description: 'Sparks come from a local stand-in for the Story Spark server after a short wait.' },
  { id: 'no-model', label: 'No model', description: 'No model is configured: Random uses the Dao\'s hand-written sparks and Custom keeps the writer\'s words as written.' },
  { id: 'model-fails', label: 'Model fails', description: 'Every request fails: Random surfaces an older spark and says why; Custom shows the error.' },
  { id: 'daily-limit', label: 'Daily limit reached', description: 'The visitor has used their twenty free sparks today.' },
];

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type SparkPurpose = 'new-seed' | 'fill-seed';

const hostFor = (state: SparkState, purpose: SparkPurpose, report: (message: string) => void): SparkHost => {
  let used = state === 'daily-limit' ? 20 : 0;
  const resetsAt = Date.now() + 24 * 60 * 60 * 1000;
  const usage = () => ({ unlimited: false as const, limit: 20, remaining: 20 - used, resetsAt: used ? resetsAt : null });
  return ({
  checkSparks: async () => ({ configured: state !== 'no-model', usage: usage() }),
  requestSpark: async (request, _signal, onUsage) => {
    const exhausted = used >= 20;
    if (!exhausted) used += 1;
    onUsage?.(usage());
    await wait(700);
    if (state === 'model-fails') throw new Error('The Dao was silent. Seek again.');
    if (exhausted) throw new Error('The Dao has spoken its twenty sparks for today. Seek again tomorrow, or plant one you already have.');
    const genre = request.inventGenre ? 'Fungal Kingdom Cultivation' : request.genre;
    const mushroom = request.protagonistGender === 'male' ? 'a mushroom spirit boy' : request.protagonistGender === 'female' ? 'a mushroom spirit girl' : 'a small mushroom';
    const gardener = request.protagonistGender === 'male' ? 'a young man' : request.protagonistGender === 'female' ? 'a young woman' : 'a young gardener';
    return {
      genre,
      inventedGenre: Boolean(request.inventGenre),
      title: request.idea ? '' : request.inventGenre ? 'Beneath the Mountain Shrine' : 'The Mountain Garden',
      style: storyStyleForGenre(genre),
      survival: Boolean(request.fateSurvival),
      ...(request.inventGenre ? { genreNote: 'Fungi gather spiritual energy, forming colonies that grow into kingdoms.' } : {}),
      premise: request.idea
        ? request.idea
        : request.inventGenre
          ? `Beneath an abandoned mountain shrine, ${mushroom} awakens to the faint thoughts of the colony around it.`
          : `In this ${genre} world, ${gardener} spends each morning tending the plants beside a quiet mountain shrine.`,
      aside: 'The Workshop oracle mutters this spark from local fixtures. Nothing leaves the preview.',
      voice: 'Workshop Oracle of the Local Fixtures',
    };
  },
  // Inside a Story Seed there is no Keep: the spark fills the open seed.
  ...(purpose === 'new-seed' ? { keepSpark: async spark => report(`Kept in the Story Bank: ${spark.genre}. (Preview: the app saves a new Story Seed.)`) } : {}),
  beginSpark: async spark => report(purpose === 'fill-seed'
    ? `Used: ${spark.genre}. (Preview: the app fills the open Story Seed's Origin.)`
    : `Begun: ${spark.genre}. (Preview: the app opens the new Story Seed in Create.)`),
  });
};

function Stage({ children, note }: { children: React.ReactNode; note: React.ReactNode }) {
  return <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-6 px-4 py-12">
    <div className="flex w-full justify-center">{children}</div>
    <p className="max-w-sm text-center text-xs text-white/45">{note}</p>
  </div>;
}

function DaoInsightsDevelopment({ state, purpose }: { state: SparkState; purpose: SparkPurpose }) {
  const [report, setReport] = useState<string | null>(null);
  const host = useMemo(() => hostFor(state, purpose, setReport), [state, purpose]);
  return <LibraryLook className="min-h-[60vh]"><Stage note={<>Tap Sparks to open the panel. {purpose === 'fill-seed' ? 'As in Story Seed\'s Origin: a chosen spark fills the open seed.' : 'As in the Creator Space: a chosen spark begins a new Story Seed.'}{report && <span role="status" className="mt-2 block text-cyan-200/80">{report}</span>}</>}>
    {/* `key` gives each state a fresh panel, so its model check runs again. */}
    <SparksButton key={`${state}-${purpose}`} purpose={purpose} host={host} />
  </Stage></LibraryLook>;
}

const PURPOSES: { id: SparkPurpose; label: string }[] = [
  { id: 'new-seed', label: 'Creator Space (new seed)' },
  { id: 'fill-seed', label: 'Story Seed (fill Origin)' },
];

export function DaoInsightsWorkspace() {
  const [state, setState] = useState<SparkState>('model');
  const [purpose, setPurpose] = useState<SparkPurpose>('new-seed');
  return (
    <FeatureWorkspace
      entry={entry}
      workshopControls={{
        description: 'A local stand-in answers for the Story Spark server. No model is called and nothing is saved.',
        defaultSection: 'states',
        sections: [{
          id: 'pages',
          description: 'Where the Sparks button sits, and what a chosen spark does there.',
          content: (
            <div className="flex flex-wrap gap-2">
              {PURPOSES.map(option => (
                <button key={option.id} type="button" aria-pressed={purpose === option.id} onClick={() => setPurpose(option.id)}
                  className={`workshop-touch-target rounded-lg border px-3 py-2 text-xs transition-colors ${purpose === option.id
                    ? 'border-cyan-400/35 bg-cyan-500/15 text-cyan-100'
                    : 'border-white/10 text-white/55 hover:border-white/20 hover:bg-white/5 hover:text-white/85'}`}>
                  {option.label}
                </button>
              ))}
            </div>
          ),
        }, {
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
      renderDevelopment={() => <DaoInsightsDevelopment state={state} purpose={purpose} />}
    />
  );
}
