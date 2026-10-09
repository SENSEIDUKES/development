import { useRef, type ReactNode } from 'react';
import { BadgeCheck, ExternalLink, Eye, Languages, ShieldAlert, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { SEIBadge, SEIDialog, SEIDialogContent, SEIDialogDescription, SEIDialogTitle, SEIDialogTrigger } from '@seihouse/ui';
import { getSenLanguageLabel, isSenLanguageCode } from '@seihouse/sen/contracts';
import type { StoryDetailDisplay, WorldPermissions } from '../../light-novels-home/shared/storyDetailContracts';
import { WORLD_ACTIVITY_DISPLAY } from './worldActivityDisplay';

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

/** A date for the panel ("Sep 9, 2026"), or nothing when the host's value is not a date. */
function shortDate(value?: string) {
  const date = value ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : undefined;
}

/** One line of the panel: a name and its value. */
function Fact({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return <div className="world-card-information-fact" data-testid={testId}><dt>{label}</dt><dd>{children}</dd></div>;
}

/** A short summary for the Information card: the world's format, language and rating. */
export function worldInformationSummary(world: Pick<StoryDetailDisplay, 'format' | 'originalLanguage' | 'matureContent'>) {
  return [
    world.format?.trim() || undefined,
    world.originalLanguage ? languageName(world.originalLanguage) : undefined,
    world.matureContent === true ? 'Rated 18+' : world.matureContent === false ? 'All ages' : undefined,
  ].filter(Boolean).join(' · ');
}

export type WorldInformation = Pick<StoryDetailDisplay, 'title' | 'format' | 'senVerified' | 'creatorName' | 'author'
  | 'createdAt' | 'updatedAt' | 'activityStatus' | 'reads' | 'provenanceUrl' | 'authorNotes'
  | 'originalLanguage' | 'readingLanguages' | 'matureContent' | 'permissions'>;

/**
 * World Info's Information: everything that describes the world. Who made it,
 * how active and read it is, when it began and last changed, how it is
 * verified, its language, rating and the creator's permissions, a link to its
 * provenance records when the host has them, and the creator's notes. Every
 * value comes from the host; a line shows only when the host supplies it.
 * (What a reader changes about their own reading is in Settings.)
 */
export function WorldCardInformationPanel({ world, trigger, triggerClassName }: {
  world: WorldInformation;
  trigger: ReactNode;
  triggerClassName: string;
}) {
  const format = world.format?.trim();
  const creator = world.creatorName?.trim() || world.author?.trim();
  const began = shortDate(world.createdAt);
  const updated = shortDate(world.updatedAt);
  const activity = world.activityStatus ? WORLD_ACTIVITY_DISPLAY[world.activityStatus] : undefined;
  const notes = world.authorNotes?.trim();
  const permissions = world.permissions;
  const hasPermissions = Boolean(permissions && (permissions.visibility || permissions.branching !== undefined || permissions.blueprint));
  // Opening starts at the title, so the panel never scrolls down to its first link.
  const titleRef = useRef<HTMLDivElement>(null);
  return <SEIDialog>
    <SEIDialogTrigger className={triggerClassName} aria-label={`Information about ${world.title}${format ? `, ${format}` : ''}`}>{trigger}</SEIDialogTrigger>
    <SEIDialogContent variant="dark" aria-modal="true" className="world-card-story-panel world-card-information-panel"
      backdropClassName="world-card-story-backdrop" bodyClassName="world-card-story-panel-body" initialFocus={titleRef}>
      <div ref={titleRef} tabIndex={-1} className="world-card-information-start">
        <SEIDialogTitle className="world-card-information-title">Information</SEIDialogTitle>
      </div>
      <SEIDialogDescription className="sr-only">About {world.title}: its creator, verification, language, rating, permissions and notes</SEIDialogDescription>
      <dl>
        {format && <Fact label="Format">{format}</Fact>}
        {creator && <Fact label="Creator">{creator}</Fact>}
        {activity && <Fact label="Activity" testId="world-information-activity">
          <span className="world-card-information-inline"><span className={`world-card-activity-dot ${activity.color}`} aria-hidden="true" />{activity.label}</span>
        </Fact>}
        {world.reads !== undefined && <Fact label="Views" testId="world-information-views">
          <span className="world-card-information-inline"><Eye aria-hidden="true" />{world.reads.toLocaleString()}</span>
        </Fact>}
        {(began || updated) && <div className="world-card-information-dates" data-testid="world-information-dates">
          {began && <Fact label="Began">{began}</Fact>}
          {updated && <Fact label="Last updated">{updated}</Fact>}
        </div>}
        {world.senVerified !== undefined && <Fact label="SEN verification" testId="world-information-verification">
          {world.senVerified
            ? <span className="world-card-information-verified"><BadgeCheck aria-hidden="true" />SEN Verified</span>
            : 'Not verified yet'}
        </Fact>}
      </dl>

      {world.originalLanguage && <section aria-labelledby="world-information-language">
        <h4 id="world-information-language"><Languages aria-hidden="true" />Language</h4>
        <dl>
          <Fact label="Written in">{languageName(world.originalLanguage)}</Fact>
          {(world.readingLanguages?.length ?? 0) > 0 && <Fact label="Also readable in">{world.readingLanguages!.map(languageName).join(', ')}</Fact>}
        </dl>
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

      {world.provenanceUrl
        ? <a className="world-card-information-link" href={world.provenanceUrl} target="_blank" rel="noreferrer" data-testid="world-information-provenance">
            Provenance records<ExternalLink aria-hidden="true" />
          </a>
        : <p className="world-card-information-note world-card-information-provenance-note">Provenance records will be linked here once this world has them.</p>}
      <section className="world-card-information-notes" aria-labelledby="world-information-notes" data-testid="world-information-notes">
        <h4 id="world-information-notes">Author’s notes</h4>
        <p className={notes ? undefined : 'world-card-information-note'}>{notes || 'The creator has not written notes for this world yet.'}</p>
      </section>
    </SEIDialogContent>
  </SEIDialog>;
}
