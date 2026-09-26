import { useId } from 'react';
import { type StorySeedInput } from '@seihouse/sen/story-seed';
import {
  CHAPTER_WRITING_STYLE_DESCRIPTIONS,
  CHAPTER_WRITING_STYLE_OPTIONS,
  SEN_LANGUAGES,
  normalizeChapterWritingStyle,
  normalizeSenLanguageCode,
  type ChapterWritingStyle,
  type SenLanguageCode,
} from '@seihouse/sen/contracts';
import {
  setChapterWritingStyle,
  setIntendedForMatureAudiences,
  type SeedUpdate,
} from './seedState';

interface StorySeedSettingsProps {
  seed: StorySeedInput;
  updateSeed: (update: SeedUpdate) => void;
  /**
   * The seed's Story Language: its saved Original Language, owned by the
   * creation workspace beside the seed. Without it the control is not shown.
   */
  storyLanguage?: { value: SenLanguageCode; onChange: (language: SenLanguageCode) => void };
  /** Tells the workspace the author chose a Reading Mode, so an account default no longer replaces it. */
  onReadingModeChange?: (mode: ChapterWritingStyle) => void;
}

/** The complete seed subset rendered by the shared Settings body. */
export const haveSameStorySeedSettings = (
  previous: StorySeedInput,
  next: StorySeedInput,
): boolean => {
  const previousOptional = previous.story.optional;
  const nextOptional = next.story.optional;
  return previousOptional.intendedForMatureAudiences === nextOptional.intendedForMatureAudiences
    && normalizeChapterWritingStyle(previousOptional.chapterWritingStyle) === normalizeChapterWritingStyle(nextOptional.chapterWritingStyle);
};

const settingCard = 'flex flex-col gap-2 rounded-xl border border-neutral-800/80 bg-[#080b17]/80 p-3';
const settingTitle = 'block font-sc text-xs font-semibold tracking-wide text-signal';
const settingHelp = 'block font-sans text-[11px] leading-relaxed text-neutral-400';
const settingSelect = 'story-seed-touch-target h-11 w-full rounded border border-neutral-800 bg-black px-2 font-sans text-sm text-signal outline-none transition-colors hover:border-portal/50 focus:border-portal motion-reduce:transition-none';

const StoryLanguageSetting = ({ value, onChange }: NonNullable<StorySeedSettingsProps['storyLanguage']>) => (
  <div className={settingCard}>
    <label htmlFor="story-original-language" className={settingTitle}>Story Language</label>
    <select
      id="story-original-language"
      value={value}
      onChange={event => onChange(normalizeSenLanguageCode(event.target.value))}
      className={settingSelect}
    >
      {SEN_LANGUAGES.map(language => (
        <option key={language.code} value={language.code}>{language.label}</option>
      ))}
    </select>
    <span className={settingHelp}>Every chapter is written in this language. It can’t be changed once the story begins.</span>
  </div>
);

const ReadingModeSetting = ({ value, onChange }: { value: ChapterWritingStyle; onChange: (mode: ChapterWritingStyle) => void }) => {
  const id = useId();
  return (
    <div className={settingCard}>
      <label htmlFor={id} className={settingTitle}>Reading Mode</label>
      <select
        id={id}
        data-testid="story-reading-mode"
        value={value}
        onChange={event => onChange(normalizeChapterWritingStyle(event.target.value))}
        className={settingSelect}
      >
        {CHAPTER_WRITING_STYLE_OPTIONS.map(mode => <option key={mode} value={mode}>{mode}</option>)}
      </select>
      <span className={settingHelp}>{CHAPTER_WRITING_STYLE_DESCRIPTIONS[value]} You can change it later for chapters still to come.</span>
    </div>
  );
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

/**
 * One shared Settings body for the desktop popover and mobile sheet: the
 * story's reader-experience defaults. The author configures the story here;
 * how chapters are then written is decided from these settings.
 */
export const StorySeedSettings = ({ seed, updateSeed, storyLanguage, onReadingModeChange }: StorySeedSettingsProps) => (
  <>
    {storyLanguage && <StoryLanguageSetting {...storyLanguage} />}
    <ReadingModeSetting
      value={normalizeChapterWritingStyle(seed.story.optional.chapterWritingStyle)}
      onChange={mode => {
        updateSeed(setChapterWritingStyle(mode));
        onReadingModeChange?.(mode);
      }}
    />
    <MatureAudienceSetting
      checked={seed.story.optional.intendedForMatureAudiences}
      onChange={checked => updateSeed(setIntendedForMatureAudiences(checked))}
    />
  </>
);
