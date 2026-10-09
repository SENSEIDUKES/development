import { useState, type ReactNode } from 'react';
import { SEN_LANGUAGES } from '@seihouse/sen/contracts';
import type { StoryDetailDisplay } from '../../light-novels-home/shared/storyDetailContracts';
import type { WorldCardInfoProps } from '../shared/worldCardContracts';
import { languageName } from './WorldCardInformationPanel';

/**
 * World Info's Settings, opened below the cards: what the reader changes about
 * their own reading of this world. The language they read it in (translation;
 * a language no one has read it in yet makes them the first) when the host
 * offers it, then the host's own story settings (Reading Mode and the rest).
 */
export function WorldCardSettings({ world, readingLanguage, children }: {
  world: Pick<StoryDetailDisplay, 'originalLanguage' | 'readingLanguages'>;
  readingLanguage?: WorldCardInfoProps['readingLanguage'];
  children?: ReactNode;
}) {
  const original = world.originalLanguage;
  const available = new Set([original, ...(world.readingLanguages ?? [])].filter(Boolean) as string[]);
  const [chosen, setChosen] = useState(readingLanguage?.current ?? original ?? '');
  const firstReader = Boolean(chosen && original && !available.has(chosen));
  return <div className="world-card-info-settings" data-testid="world-info-settings">
    {readingLanguage && <section className="world-card-info-settings-reading" aria-labelledby="world-settings-reading-language-label">
      <label id="world-settings-reading-language-label" htmlFor="world-settings-reading-language">Read it in</label>
      <select id="world-settings-reading-language" value={chosen} onChange={event => {
        setChosen(event.target.value);
        readingLanguage.onChange(event.target.value);
      }}>
        {SEN_LANGUAGES.map(language => <option key={language.code} value={language.code}>
          {language.label}{language.code === original ? ' · original' : available.has(language.code) ? ' · ready' : ''}
        </option>)}
      </select>
      {firstReader && <p className="world-card-information-first" role="status" data-testid="world-settings-first-reader">
        No one has read this world in {languageName(chosen)} yet. You will be the first: its chapters are translated for you as you read.
      </p>}
    </section>}
    {children}
  </div>;
}
