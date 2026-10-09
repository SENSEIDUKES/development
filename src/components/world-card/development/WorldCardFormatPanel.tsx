import { BadgeCheck, ExternalLink, Eye, Info } from 'lucide-react';
import { SEIDialog, SEIDialogContent, SEIDialogDescription, SEIDialogTitle, SEIDialogTrigger } from '@seihouse/ui';
import type { StoryDetailDisplay } from '../../light-novels-home/shared/storyDetailContracts';
import { WorldCardFormatSymbol } from './WorldCardFormatSymbol';
import { WORLD_ACTIVITY_DISPLAY } from './worldActivityDisplay';

/** A date for the panel ("Sep 9, 2026"), or nothing when the host's value is not a date. */
function shortDate(value?: string) {
  const date = value ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : undefined;
}

/**
 * The format mark on World Info's cover: who made the world, how active and
 * read it is, when it began and last changed, how it is verified, a link to
 * its provenance records when the host has them, and the creator's notes.
 * (On Full and Compact cards the same mark opens the story panel instead.)
 */
export function WorldCardFormatPanel({ world, triggerClassName }: {
  world: Pick<StoryDetailDisplay, 'title' | 'format' | 'senVerified' | 'creatorName' | 'author' | 'createdAt' | 'updatedAt'
    | 'activityStatus' | 'reads' | 'provenanceUrl' | 'authorNotes'>;
  triggerClassName: string;
}) {
  const format = world.format?.trim();
  const creator = world.creatorName?.trim() || world.author?.trim();
  const began = shortDate(world.createdAt);
  const updated = shortDate(world.updatedAt);
  const activity = world.activityStatus ? WORLD_ACTIVITY_DISPLAY[world.activityStatus] : undefined;
  const notes = world.authorNotes?.trim();
  return <SEIDialog>
    <SEIDialogTrigger className={triggerClassName} aria-label={`Verification and provenance for ${world.title}${format ? `, ${format}` : ''}`}>
      {format ? <WorldCardFormatSymbol format={format} /> : <Info size={17} aria-hidden="true" />}
    </SEIDialogTrigger>
    <SEIDialogContent variant="dark" aria-modal="true" className="world-card-story-panel world-card-information-panel"
      backdropClassName="world-card-story-backdrop" bodyClassName="world-card-story-panel-body">
      <SEIDialogTitle className="world-card-information-title">Verification</SEIDialogTitle>
      <SEIDialogDescription className="sr-only">Who made {world.title}, how it is verified, where its records are and its creator's notes</SEIDialogDescription>
      <dl>
        {format && <div className="world-card-information-fact"><dt>Format</dt><dd>{format}</dd></div>}
        {creator && <div className="world-card-information-fact"><dt>Creator</dt><dd>{creator}</dd></div>}
        {activity && <div className="world-card-information-fact" data-testid="world-format-activity"><dt>Activity</dt>
          <dd className="world-card-information-inline"><span className={`world-card-activity-dot ${activity.color}`} aria-hidden="true" />{activity.label}</dd></div>}
        {world.reads !== undefined && <div className="world-card-information-fact" data-testid="world-format-views"><dt>Views</dt>
          <dd className="world-card-information-inline"><Eye aria-hidden="true" />{world.reads.toLocaleString()}</dd></div>}
        {(began || updated) && <div className="world-card-information-dates" data-testid="world-format-dates">
          {began && <div className="world-card-information-fact"><dt>Began</dt><dd>{began}</dd></div>}
          {updated && <div className="world-card-information-fact"><dt>Last updated</dt><dd>{updated}</dd></div>}
        </div>}
        {world.senVerified !== undefined && <div className="world-card-information-fact" data-testid="world-format-verification"><dt>SEN verification</dt>
          <dd>{world.senVerified
            ? <span className="world-card-information-verified"><BadgeCheck aria-hidden="true" />SEN Verified</span>
            : 'Not verified yet'}</dd></div>}
      </dl>
      {world.provenanceUrl
        ? <a className="world-card-information-link" href={world.provenanceUrl} target="_blank" rel="noreferrer" data-testid="world-format-provenance">
            Provenance records<ExternalLink aria-hidden="true" />
          </a>
        : <p className="world-card-information-note">Provenance records will be linked here once this world has them.</p>}
      <section className="world-card-information-notes" aria-labelledby="world-format-notes" data-testid="world-format-notes">
        <h4 id="world-format-notes">Author’s notes</h4>
        <p className={notes ? undefined : 'world-card-information-note'}>{notes || 'The creator has not written notes for this world yet.'}</p>
      </section>
    </SEIDialogContent>
  </SEIDialog>;
}
