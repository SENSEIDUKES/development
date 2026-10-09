import { useState, type ReactNode } from 'react';
import { Languages, ShieldAlert, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { SEIBadge, SEIDialog, SEIDialogContent, SEIDialogDescription, SEIDialogTitle, SEIDialogTrigger } from '@seihouse/ui';
import { getSenLanguageLabel, isSenLanguageCode, SEN_LANGUAGES } from '@seihouse/sen/contracts';
import type { StoryDetailDisplay, WorldPermissions } from '../../light-novels-home/shared/storyDetailContracts';
import type { WorldCardInfoProps } from '../shared/worldCardContracts';

/** A language's plain name ("Japanese", not "Japanese (日本語)") for sentences; unknown codes stay as given. */
export const languageName = (code: string) => isSenLanguageCode(code) ? getSenLanguageLabel(code).replace(/\s*\(.*\)$/, '') : code;

const VISIBILITY_LABELS: Record<NonNullable<WorldPermissions['visibility']>, string> = {
  private: 'Private · only its creator reads it',
  shared: 'Shared · readers with the link',
  public: 'Public · anyone can find it',
};
const BLUEPRINT_LABELS: Record<NonNullable<WorldPermissions['blueprint']>, string> = {
  off: 'Not shared',
  view: 'Readers can view it',
  copy: 'Readers can view and copy it',
};

/** One line of the panel: a name and its value. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="world-card-information-fact"><dt>{label}</dt><dd>{children}</dd></div>;
}

/** A short summary for the Information row: the world's language and its rating. */
export function worldInformationSummary(world: Pick<StoryDetailDisplay, 'originalLanguage' | 'matureContent'>) {
  return [
    world.originalLanguage ? languageName(world.originalLanguage) : undefined,
    world.matureContent === true ? 'Rated 18+' : world.matureContent === false ? 'All ages' : undefined,
  ].filter(Boolean).join(' · ');
}

/**
 * World Info's Information panel: the world's language (and the reader's
 * own, with a way to switch to it), its content rating and the creator's
 * permissions. Every value comes from the host; a section shows only when
 * the host supplies it.
 */
export function WorldCardInformationPanel({ world, readingLanguage, trigger, triggerClassName }: {
  world: Pick<StoryDetailDisplay, 'title' | 'originalLanguage' | 'readingLanguages' | 'matureContent' | 'permissions'>;
  readingLanguage?: WorldCardInfoProps['readingLanguage'];
  trigger: ReactNode;
  triggerClassName: string;
}) {
  const original = world.originalLanguage;
  const available = new Set([original, ...(world.readingLanguages ?? [])].filter(Boolean) as string[]);
  const [chosen, setChosen] = useState(readingLanguage?.current ?? original ?? '');
  const firstReader = Boolean(chosen && original && !available.has(chosen));
  const permissions = world.permissions;
  const hasPermissions = Boolean(permissions && (permissions.visibility || permissions.branching !== undefined || permissions.blueprint));

  return <SEIDialog>
    <SEIDialogTrigger className={triggerClassName} aria-label={`World information for ${world.title}`}>{trigger}</SEIDialogTrigger>
    <SEIDialogContent variant="dark" aria-modal="true" className="world-card-story-panel world-card-information-panel"
      backdropClassName="world-card-story-backdrop" bodyClassName="world-card-story-panel-body">
      <SEIDialogTitle className="world-card-information-title">World information</SEIDialogTitle>
      <SEIDialogDescription className="sr-only">Language, rating and permissions for {world.title}</SEIDialogDescription>

      {original && <section aria-labelledby="world-information-language">
        <h4 id="world-information-language"><Languages aria-hidden="true" />Language</h4>
        <dl>
          <Fact label="Written in">{languageName(original)}</Fact>
          {(world.readingLanguages?.length ?? 0) > 0 && <Fact label="Also readable in">{world.readingLanguages!.map(languageName).join(', ')}</Fact>}
        </dl>
        {readingLanguage && <div className="world-card-information-reading">
          <label htmlFor="world-information-reading-language">Read it in</label>
          <select id="world-information-reading-language" value={chosen} onChange={event => {
            setChosen(event.target.value);
            readingLanguage.onChange(event.target.value);
          }}>
            {SEN_LANGUAGES.map(language => <option key={language.code} value={language.code}>
              {language.label}{language.code === original ? ' · original' : available.has(language.code) ? ' · ready' : ''}
            </option>)}
          </select>
          {firstReader && <p className="world-card-information-first" role="status" data-testid="world-information-first-reader">
            No one has read this world in {languageName(chosen)} yet. You will be the first: its chapters are translated for you as you read.
          </p>}
        </div>}
      </section>}

      {world.matureContent !== undefined && <section aria-labelledby="world-information-rating">
        <h4 id="world-information-rating">{world.matureContent ? <ShieldAlert aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}Rating</h4>
        <p>{world.matureContent
          ? <SEIBadge size="sm" variant="danger" className="world-card-information-rating" data-rating="mature">Rated 18+</SEIBadge>
          : <SEIBadge size="sm" variant="neutral" className="world-card-information-rating" data-rating="all-ages">All ages</SEIBadge>}
          <span className="world-card-information-note">{world.matureContent ? 'The creator marked this world for mature readers.' : 'The creator marked this world for all readers.'}</span>
        </p>
      </section>}

      {hasPermissions && <section aria-labelledby="world-information-permissions">
        <h4 id="world-information-permissions"><SlidersHorizontal aria-hidden="true" />Permissions</h4>
        <dl>
          {permissions!.visibility && <Fact label="Visibility">{VISIBILITY_LABELS[permissions!.visibility]}</Fact>}
          {permissions!.branching !== undefined && <Fact label="Branching">{permissions!.branching ? 'Readers may branch the story' : 'Not allowed'}</Fact>}
          {permissions!.blueprint && <Fact label="Blueprint">{BLUEPRINT_LABELS[permissions!.blueprint]}</Fact>}
        </dl>
      </section>}

      {!original && world.matureContent === undefined && !hasPermissions
        && <p className="world-card-information-note">No information has been shared for this world yet.</p>}
    </SEIDialogContent>
  </SEIDialog>;
}
