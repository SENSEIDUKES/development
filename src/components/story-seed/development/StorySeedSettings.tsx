import { type StorySeedInput } from '@seihouse/sen/story-seed';
import {
  setIntendedForMatureAudiences,
  type SeedUpdate,
} from './seedState';

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
  return previousOptional.intendedForMatureAudiences === nextOptional.intendedForMatureAudiences;
};

interface MatureAudienceSettingProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const MatureAudienceSetting = ({ checked, onChange }: MatureAudienceSettingProps) => (
  <div className="flex flex-col gap-3 rounded-xl border border-neutral-800/80 bg-[#080b17]/80 p-3 sm:flex-row sm:items-center sm:justify-between">
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
      className={`story-seed-touch-target flex shrink-0 items-center gap-2 self-start rounded-full border px-3 py-2 transition-colors motion-reduce:transition-none sm:self-center sm:px-2.5 sm:py-1.5 ${checked
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
          className={`absolute left-0.5 top-0.5 size-3 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${checked ? 'translate-x-3' : 'translate-x-0'}`}
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
  </>
);
