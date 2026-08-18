import type {
  StorySeedFateVisibility,
  StorySeedInput,
  StorySeedSurvivalPressure,
} from '../shared/storySeedSchema';
import {
  patchFateSurvival,
  setIntendedForMatureAudiences,
  type SeedUpdate,
} from './seedState';
import { handleRadioGroupKeyDown, radioGroupTabIndex } from './radioGroupKeyboard';

interface StorySeedSettingsProps {
  seed: StorySeedInput;
  updateSeed: (update: SeedUpdate) => void;
}

/** The complete seed subset rendered by the shared Settings body. */
export const haveSameStorySeedSettings = (
  previous: StorySeedInput,
  next: StorySeedInput,
): boolean => {
  const previousOptional = previous.story.optional;
  const nextOptional = next.story.optional;
  return previousOptional.intendedForMatureAudiences === nextOptional.intendedForMatureAudiences
    && previousOptional.fateSurvival.enabled === nextOptional.fateSurvival.enabled
    && previousOptional.fateSurvival.visibility === nextOptional.fateSurvival.visibility
    && previousOptional.fateSurvival.pressure === nextOptional.fateSurvival.pressure;
};

const FATE_VISIBILITY_OPTIONS: Array<{
  value: StorySeedFateVisibility;
  label: string;
  description: string;
}> = [
  {
    value: 'full',
    label: 'Full Fate',
    description: 'Show threats, clues, countdowns, targets, and likely consequences.',
  },
  {
    value: 'partial',
    label: 'Partial Fate',
    description: 'Reveal some signs, but leave parts for you to interpret.',
  },
  {
    value: 'none',
    label: 'No Fate',
    description: 'Hide most guidance. You’ll mainly see warnings, scars, clues, and consequences.',
  },
];

const SURVIVAL_PRESSURE_OPTIONS: Array<{
  value: StorySeedSurvivalPressure;
  label: string;
  description: string;
}> = [
  {
    value: 'heaven',
    label: 'Heaven',
    description: 'Strong pressure. Major threats can challenge the Destined Ending.',
  },
  {
    value: 'immortal',
    label: 'Immortal',
    description: 'Balanced pressure. Fate matters without taking over the whole story.',
  },
  {
    value: 'mortal',
    label: 'Mortal',
    description: 'Light pressure. The original story path has more room to continue.',
  },
];

interface FateSurvivalSettingProps {
  settings: StorySeedInput['story']['optional']['fateSurvival'];
  onChange: (patch: Partial<StorySeedInput['story']['optional']['fateSurvival']>) => void;
}

const FateSurvivalSetting = ({ settings, onChange }: FateSurvivalSettingProps) => {
  const optionGroup = <T extends StorySeedFateVisibility | StorySeedSurvivalPressure>(
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
    <section className="space-y-4 rounded-xl border border-neutral-800/80 bg-[#080b17]/80 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <span className="min-w-0">
          <span className="block font-sc text-xs font-semibold tracking-wide text-signal">Fate Survival</span>
          <span className="mt-1 block font-sans text-[11px] leading-relaxed text-neutral-400">
            Turn the story into a living timeline where the world pushes back.
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          aria-label="Fate Survival"
          onClick={() => onChange({ enabled: !settings.enabled })}
          className={`story-seed-touch-target flex w-full shrink-0 items-center justify-between gap-2 rounded-full border px-3 py-2 transition-colors motion-reduce:transition-none sm:w-auto sm:px-2.5 sm:py-1.5 ${settings.enabled
            ? 'border-portal/60 bg-portal/10 text-portal'
            : 'border-neutral-700 bg-black/30 text-neutral-400 hover:border-neutral-600 hover:text-signal'
          }`}
        >
          <span className="font-sc text-[10px] font-bold uppercase tracking-[0.12em]">Fate Survival</span>
          <span aria-hidden="true" className={`relative h-4 w-7 rounded-full transition-colors motion-reduce:transition-none ${settings.enabled ? 'bg-portal/70' : 'bg-neutral-700'}`}>
            <span className={`absolute top-0.5 size-3 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${settings.enabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
          </span>
        </button>
      </div>

      {settings.enabled && (
        <div className="space-y-4 border-t border-neutral-800/70 pt-4">
          {optionGroup('Fate Visibility', 'Controls how much the Library reveals.', settings.visibility, FATE_VISIBILITY_OPTIONS, visibility => onChange({ visibility }))}
          {optionGroup('Survival Pressure', 'Controls how hard the story pushes back.', settings.pressure, SURVIVAL_PRESSURE_OPTIONS, pressure => onChange({ pressure }))}
        </div>
      )}
    </section>
  );
};

interface MatureAudienceSettingProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const MatureAudienceSetting = ({ checked, onChange }: MatureAudienceSettingProps) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800/80 bg-[#080b17]/80 p-3">
    <span className="min-w-0">
      <span className="block font-sc text-xs font-semibold tracking-wide text-signal">
        Intended for mature audiences
      </span>
      <span className="mt-1 block font-sans text-[11px] leading-relaxed text-neutral-400">
        Story metadata for mature themes. This does not request explicit content.
      </span>
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Rated 18+"
      onClick={() => onChange(!checked)}
      className={`story-seed-touch-target flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 transition-colors motion-reduce:transition-none ${checked
        ? 'border-gold-accent/60 bg-gold-accent/10 text-gold-accent'
        : 'border-neutral-700 bg-black/30 text-neutral-400 hover:border-neutral-600 hover:text-signal'
      }`}
    >
      <span className="font-sc text-[10px] font-bold uppercase tracking-[0.12em]">Rated 18+</span>
      <span
        aria-hidden="true"
        className={`relative h-4 w-7 rounded-full transition-colors motion-reduce:transition-none ${checked ? 'bg-gold-accent/70' : 'bg-neutral-700'}`}
      >
        <span
          className={`absolute top-0.5 size-3 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${checked ? 'translate-x-3.5' : 'translate-x-0.5'}`}
        />
      </span>
    </button>
  </div>
);

/** One shared Settings body for the desktop popover and mobile sheet. */
export const StorySeedSettings = ({ seed, updateSeed }: StorySeedSettingsProps) => (
  <>
    <MatureAudienceSetting
      checked={seed.story.optional.intendedForMatureAudiences}
      onChange={checked => updateSeed(setIntendedForMatureAudiences(checked))}
    />
    <FateSurvivalSetting
      settings={seed.story.optional.fateSurvival}
      onChange={patch => updateSeed(patchFateSurvival(patch))}
    />
  </>
);
