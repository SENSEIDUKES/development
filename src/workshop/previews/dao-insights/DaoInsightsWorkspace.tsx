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
import { DaoSparksButton, type DaoSparkHost } from '@seihouse/library/shell';
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

const hostFor = (state: SparkState, purpose: SparkPurpose, report: (message: string) => void): DaoSparkHost => ({
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
  // Inside a Story Seed there is no Keep: the spark fills the open seed.
  ...(purpose === 'new-seed' ? { keepSpark: async spark => report(`Kept in the Story Bank: ${spark.genre}. (Preview: the app saves a new Story Seed.)`) } : {}),
  beginSpark: async spark => report(purpose === 'fill-seed'
    ? `Used: ${spark.genre}. (Preview: the app fills the open Story Seed's Origin.)`
    : `Begun: ${spark.genre}. (Preview: the app opens the new Story Seed in Create.)`),
});

const copyText = async (text: string) => { await navigator.clipboard?.writeText(text); };

function Stage({ children, note }: { children: React.ReactNode; note: React.ReactNode }) {
  return <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-6 px-4 py-12">
    <div className="flex w-full justify-center">{children}</div>
    <p className="max-w-sm text-center text-xs text-white/45">{note}</p>
  </div>;
}

function DaoInsightsDevelopment({ state, purpose }: { state: SparkState; purpose: SparkPurpose }) {
  const [report, setReport] = useState<string | null>(null);
  const host = useMemo(() => hostFor(state, purpose, setReport), [state, purpose]);
  return <Stage note={<>Tap Sparks to open the panel. {purpose === 'fill-seed' ? 'As in Story Seed\'s Origin: a chosen spark fills the open seed.' : 'As in the Creator Space: a chosen spark begins a new Story Seed.'}{report && <span role="status" className="mt-2 block text-cyan-200/80">{report}</span>}</>}>
    {/* `key` gives each state a fresh panel, so its model check runs again. */}
    <DaoSparksButton key={`${state}-${purpose}`} purpose={purpose} copyText={copyText} host={host} />
  </Stage>;
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
