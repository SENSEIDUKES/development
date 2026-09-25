import { type StorySeedInput, type StorySeedSurvivalPressure } from '@seihouse/sen/story-seed';
import { handleRadioGroupKeyDown, radioGroupTabIndex } from '../../radioGroupKeyboard';

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

export const OriginFateControls = ({ settings, onChange }: FateSurvivalSettingProps) => {
  const optionGroup = <T extends StorySeedSurvivalPressure>(
    title: string,
    subtitle: string,
    value: T,
    options: Array<{ value: T; label: string; description: string }>,
    onSelect: (value: T) => void,
  ) => (
    <div className="space-y-2">
      <div>
        <p className="font-sc text-[11px] font-bold uppercase tracking-[0.16em] text-signal">{title}</p>
        <p className="mt-1 font-sans text-[11px] leading-relaxed text-neutral-400">{subtitle}</p>
      </div>
      <div className="grid gap-2" role="radiogroup" aria-label={title}>
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={radioGroupTabIndex(selected, options.some(candidate => candidate.value === value), index)}
              onClick={() => onSelect(option.value)}
              onKeyDown={handleRadioGroupKeyDown}
              className={`rounded-xl border p-3 text-left transition-colors ${selected
                ? 'border-portal/60 bg-portal/10 text-signal shadow-[0_0_24px_rgba(34,211,238,0.08)]'
                : 'border-neutral-800/80 bg-black/20 text-neutral-400 hover:border-neutral-700 hover:text-signal'
              }`}
            >
              <span className="block font-sc text-[11px] font-bold uppercase tracking-[0.12em]">{option.label}</span>
              <span className="mt-1 block font-sans text-[11px] leading-relaxed text-neutral-400">{option.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <section aria-label="Pressure" className="rounded-xl border border-neutral-800/80 bg-[#080b17]/80 p-3">
        {optionGroup('Pressure', 'Sets how strongly fate shapes the automatic rhythm of chapters: which kind of chapter comes next when you leave the path to fate.', settings.pressure, SURVIVAL_PRESSURE_OPTIONS, pressure => onChange({ pressure }))}
      </section>
      <section aria-label="Survival" className="space-y-4 rounded-xl border border-neutral-800/80 bg-[#080b17]/80 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <span className="min-w-0">
            <span className="block font-sc text-xs font-semibold tracking-wide text-signal">Survival</span>
            <span className="mt-1 block font-sans text-[11px] leading-relaxed text-neutral-400">
              You direct every chapter yourself, and the Destined Ending is not guaranteed: your choices can fail it, even by death. Off, fate chooses each chapter's path unless you step in, and the Destined Ending stays the story's guaranteed direction. This is fixed once the novel begins.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.enabled}
            aria-label="Survival"
            onClick={() => onChange({ enabled: !settings.enabled })}
            className={`story-seed-touch-target flex shrink-0 items-center gap-2 self-start rounded-full border px-3 py-2 transition-colors motion-reduce:transition-none sm:px-2.5 sm:py-1.5 ${settings.enabled
              ? 'border-portal/60 bg-portal/10 text-portal'
              : 'border-neutral-700 bg-black/30 text-neutral-400 hover:border-neutral-600 hover:text-signal'
            }`}
          >
            <span className="font-sc text-[10px] font-bold uppercase tracking-[0.12em]">Survival</span>
            <span aria-hidden="true" className={`relative h-4 w-7 rounded-full transition-colors motion-reduce:transition-none ${settings.enabled ? 'bg-portal/70' : 'bg-neutral-700'}`}>
              <span className={`absolute left-0.5 top-0.5 size-3 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${settings.enabled ? 'translate-x-3' : 'translate-x-0'}`} />
            </span>
          </button>
        </div>

      </section>
    </>
  );
};
