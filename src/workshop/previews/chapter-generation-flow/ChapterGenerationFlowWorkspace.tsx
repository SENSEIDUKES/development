import { useMemo, useState } from 'react';
import ReferenceChapterGenerationInspector from '../../../components/chapter-generation/reference/ChapterGenerationInspector';
import DevelopmentChapterGenerationWorkspace from '../../../components/chapter-generation/development/ChapterGenerationWorkspace';
import { assembleChapterGeneration, type ScenarioId } from '../../../components/chapter-generation/shared/assembleGeneration';
import {
  assembleChapterGenerationDev,
  type CulturalProseOverride,
} from '../../../components/chapter-generation/shared/assembleGenerationDev';
import { SCENARIOS, RHYTHM_SCENARIOS } from '../../../components/chapter-generation/shared/fixtures/mockGenerationData';
import { CULTURAL_PROSE_STYLE_IDS, CULTURAL_PROSE_STYLES } from '../../../components/chapter-generation/shared/lib/culturalProse';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';

const SCENARIO_IDS: ScenarioId[] = ['opening', 'established'];
const PROSE_OVERRIDE_OPTIONS: { id: CulturalProseOverride; label: string }[] = [
  { id: 'story-default', label: 'Story Default' },
  { id: 'none', label: 'None (fallback)' },
  ...CULTURAL_PROSE_STYLE_IDS.map((id) => ({ id, label: CULTURAL_PROSE_STYLES[id].label })),
];

export function ChapterGenerationFlowWorkspace() {
  const entry = workshopEntries.find((e) => e.id === 'chapter-generation-flow')!;
  const [scenarioId, setScenarioId] = useState<ScenarioId>('established');
  const [rhythmScenarioId, setRhythmScenarioId] = useState<string>(RHYTHM_SCENARIOS[1].id);
  const [proseOverride, setProseOverride] = useState<CulturalProseOverride>('story-default');

  // Both panes exercise the same real four-stage orchestration with local,
  // deterministic provider adapters. The Development controls feed only the
  // packet/planner inputs they own; neither path performs live side effects.
  const { stages: referenceStages, finalOutput: referenceOutput } = useMemo(
    () => assembleChapterGeneration(scenarioId),
    [scenarioId],
  );
  const developmentRun = useMemo(
    () => assembleChapterGenerationDev(scenarioId, rhythmScenarioId, proseOverride),
    [scenarioId, rhythmScenarioId, proseOverride],
  );

  const controlButton = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs transition-all duration-200 border ${
      active
        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-100'
        : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'
    }`;

  const controls = (
    <div className="mx-auto max-w-7xl space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
      <div>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/70">
          Mock Story Scenario
        </h2>
        <div className="flex flex-wrap gap-2">
          {SCENARIO_IDS.map((id) => (
            <button key={id} type="button" onClick={() => setScenarioId(id)} className={controlButton(scenarioId === id)}>
              {SCENARIOS[id].label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/70">
          Scene Rhythm / Fate Pressure Scenario <span className="normal-case text-white/40">(Development only)</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {RHYTHM_SCENARIOS.map((rs) => (
            <button
              key={rs.id}
              type="button"
              onClick={() => setRhythmScenarioId(rs.id)}
              className={controlButton(rhythmScenarioId === rs.id)}
              title={`Fate Pressure: ${rs.fatePressure} · Recent: ${rs.recentSceneTypes.join(', ') || 'none'}`}
            >
              {rs.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/70">
          Cultural Prose Style override <span className="normal-case text-white/40">(Development only)</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {PROSE_OVERRIDE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setProseOverride(opt.id)}
              className={controlButton(proseOverride === opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-white/40">
        Safe mock data only — no story persistence, database writes, R2 uploads, credit
        deductions, queues, notifications, or live model calls happen anywhere in this preview.
        Reference and Development share the same Assemble, Plan, Manifest, and Process pipeline.
        Packet assembly uses the real ported context, budgeting, and prompt logic; deterministic
        local planner, writer, and processor adapters stand in for the three normal model calls.
        Development-only Cultural Prose and rhythm controls feed the packet and planner without
        creating extra stages or calls.
      </p>
    </div>
  );

  return (
    <FeatureWorkspace
      entry={entry}
      controls={controls}
      allowCompare
      renderReference={() => (
        <ReferenceChapterGenerationInspector
          key={`reference-${scenarioId}`}
          stages={referenceStages}
          finalOutput={referenceOutput}
        />
      )}
      renderDevelopment={() => (
        <DevelopmentChapterGenerationWorkspace
          key={`development-${scenarioId}-${rhythmScenarioId}-${proseOverride}`}
          run={developmentRun}
        />
      )}
    />
  );
}

export default ChapterGenerationFlowWorkspace;
