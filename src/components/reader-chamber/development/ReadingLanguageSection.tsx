import React from 'react';
import {
  SEN_LANGUAGES,
  getSenLanguageLabel,
  normalizeSenLanguageCode,
  type SenLanguageCode,
} from '../../../lib/language';
import type { ReaderLanguageChoice, ReaderLanguageMode } from '../shared/readerLanguage';

export interface ReadingLanguageSectionProps {
  choice: ReaderLanguageChoice;
  onChange: (choice: ReaderLanguageChoice) => void;
  /** The story's permanent Original Language. */
  originalLanguage: SenLanguageCode;
  /** What Account Default currently resolves to. */
  accountLanguage: SenLanguageCode;
  /** The language actually on screen right now. */
  resolvedLanguage: SenLanguageCode;
  /** The language requested for the current reading view. */
  requestedLanguage: SenLanguageCode;
  /** Set when the requested language could not be shown. */
  notice?: string | null;
  isTranslating?: boolean;
}

const optionClass = (active: boolean) =>
  `min-h-11 rounded-lg border px-3 py-2 text-left text-xs leading-snug transition-colors ${
    active
      ? 'border-portal/60 bg-portal/15 text-signal'
      : 'border-neutral-800 bg-black/30 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
  }`;

/**
 * The Reader's reading-language control.
 *
 * Original and a specific override are the reader's own decisions and stay
 * put. Account Default is the only choice that follows the account, which is
 * stated in the control so changing the account default is not a surprise.
 */
export const ReadingLanguageSection: React.FC<ReadingLanguageSectionProps> = ({
  choice,
  onChange,
  originalLanguage,
  accountLanguage,
  resolvedLanguage,
  requestedLanguage,
  notice,
  isTranslating,
}) => {
  const specificLanguage = normalizeSenLanguageCode(choice.language, accountLanguage);
  const select = (mode: ReaderLanguageMode) => {
    if (mode === 'specific') onChange({ mode: 'specific', language: specificLanguage });
    else onChange({ mode });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          id="reader-language-original"
          aria-pressed={choice.mode === 'original'}
          onClick={() => select('original')}
          className={optionClass(choice.mode === 'original')}
        >
          <span className="block font-medium text-signal/90">Original</span>
          <span className="block text-[10px] text-neutral-500">{getSenLanguageLabel(originalLanguage)}</span>
        </button>
        <button
          type="button"
          id="reader-language-account"
          aria-pressed={choice.mode === 'account'}
          onClick={() => select('account')}
          className={optionClass(choice.mode === 'account')}
        >
          <span className="block font-medium text-signal/90">Account Default</span>
          <span className="block text-[10px] text-neutral-500">
            Currently {getSenLanguageLabel(accountLanguage)} · follows your profile
          </span>
        </button>
        <button
          type="button"
          id="reader-language-specific"
          aria-pressed={choice.mode === 'specific'}
          onClick={() => select('specific')}
          className={optionClass(choice.mode === 'specific')}
        >
          <span className="block font-medium text-signal/90">Specific Language</span>
          <span className="block text-[10px] text-neutral-500">This story only</span>
        </button>
      </div>

      {choice.mode === 'specific' && (
        <label className="flex flex-col gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
          Language for this story
          <select
            id="reader-language-specific-select"
            value={specificLanguage}
            onChange={event => onChange({
              mode: 'specific',
              language: normalizeSenLanguageCode(event.target.value, specificLanguage),
            })}
            className="min-h-11 w-full rounded-lg border border-neutral-800 bg-black/40 px-3 text-base font-normal normal-case tracking-normal text-signal outline-none focus:border-portal/60 sm:text-sm"
          >
            {SEN_LANGUAGES.map(language => (
              <option key={language.code} value={language.code}>{language.label}</option>
            ))}
          </select>
        </label>
      )}

      <p className="text-[11px] leading-relaxed text-neutral-500" data-reading-language={resolvedLanguage}>
        {isTranslating
          ? `Preparing ${getSenLanguageLabel(requestedLanguage)}…`
          : notice
            ? notice
            : resolvedLanguage === originalLanguage
              ? `Reading the original ${getSenLanguageLabel(originalLanguage)} chapter.`
              : `Reading a translation into ${getSenLanguageLabel(resolvedLanguage)}. The original chapter is unchanged.`}
      </p>
    </div>
  );
};
