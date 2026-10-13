import { type StorySeedInput, type StorySeedSurvivalPressure } from '@seihouse/sen/story-seed';
import { SeedNote, SeedSegmented } from '../SeedSectionFrame';

const SURVIVAL_PRESSURE_OPTIONS: Array<{
  value: StorySeedSurvivalPressure;
  label: string;
  description: string;
}> = [
  {
    value: 'heaven',
    label: 'Heaven',
    description: 'Strong pressure. Favors conflict and shorter quiet stretches.',
  },
  {
    value: 'immortal',
    label: 'Immortal',
    description: 'Balanced pressure. Balances progression, world-building, and conflict.',
  },
  {
    value: 'mortal',
    label: 'Mortal',
    description: 'Light pressure. Allows more room for world-building before conflict.',
  },
];

interface FateSurvivalSettingProps {
  settings: StorySeedInput['story']['optional']['fateSurvival'];
  onChange: (patch: Partial<StorySeedInput['story']['optional']['fateSurvival']>) => void;
}

const PRESSURE_EXPLANATION = 'Sets how strongly fate shapes the automatic rhythm of chapters: which kind of chapter comes next when you leave the path to fate.';

/**
 * Pressure and Survival share one compact panel: Pressure is a one-line
 * choice with only the selected description shown, and Survival is a single
 * switch row. Each full explanation stays one tap away behind its info toggle.
 */
export const OriginFateControls = ({ settings, onChange }: FateSurvivalSettingProps) => (
  <section aria-label="Pressure and Survival" className="glass-panel divide-y divide-neutral-800/70 p-0">
    <div className="p-4">
      <p className="font-sc text-[11px] font-bold uppercase tracking-[0.16em] text-signal">Pressure</p>
      <p className="mb-2 mt-1 font-sans text-[11px] leading-relaxed text-neutral-400">
        <SeedNote moreLabel="More about Pressure" more={PRESSURE_EXPLANATION}>How fate paces the chapters.</SeedNote>
      </p>
      <SeedSegmented label="Pressure" idPrefix="origin-pressure" value={settings.pressure}
        options={SURVIVAL_PRESSURE_OPTIONS} onSelect={pressure => onChange({ pressure })} />
    </div>
    <div className="flex items-start justify-between gap-3 p-4">
      <span className="min-w-0">
        <span className="block font-sc text-[11px] font-bold uppercase tracking-[0.16em] text-signal">Survival</span>
        <span className="mt-1 block font-sans text-[11px] leading-relaxed text-neutral-400">
          <SeedNote moreLabel="More about Survival" more={settings.enabled
            ? "Off, fate chooses each chapter's path unless you step in, and the Destined Ending stays the story's guaranteed direction."
            : 'On, you direct every chapter yourself, and the Destined Ending is not guaranteed: your choices can fail it, even by death.'}>
            {settings.enabled
              ? 'You direct every chapter yourself. The Destined Ending can fail, even by death.'
              : 'Fate guides each chapter. The Destined Ending is guaranteed.'}
            {' '}Fixed once the novel begins.
          </SeedNote>
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={settings.enabled}
        aria-label="Survival"
        onClick={() => onChange({ enabled: !settings.enabled })}
        className="story-seed-touch-target relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full"
      >
        <span aria-hidden="true" className={`absolute inset-0 rounded-full border transition-colors motion-reduce:transition-none ${settings.enabled ? 'border-portal/60 bg-portal/60' : 'border-neutral-700 bg-neutral-800'}`} />
        <span aria-hidden="true" className={`relative ml-0.5 size-6 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${settings.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  </section>
);
