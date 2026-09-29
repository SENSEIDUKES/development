import { BadgeCheck, Eye, Info } from 'lucide-react';
import { SEIBadge, SEIDialog, SEIDialogContent, SEIDialogDescription, SEIDialogTitle, SEIDialogTrigger } from '@seihouse/ui';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';
import { WorldCardFormatSymbol } from './WorldCardFormatSymbol';
import { WORLD_ACTIVITY_DISPLAY } from './worldActivityDisplay';

/** A read-only preview of host-authorized story information opened from its format. */
export function WorldCardStoryPanel({ world }: { world: HomeWorld }) {
  const format = world.format?.trim();
  const activity = world.activityStatus ? WORLD_ACTIVITY_DISPLAY[world.activityStatus] : undefined;
  return <SEIDialog>
    <SEIDialogTrigger className="world-card-base-format" aria-label={`Story information for ${world.title}${format ? `, ${format}` : ''}`}>
      {format ? <WorldCardFormatSymbol format={format} /> : <Info size={17} aria-hidden="true" />}
    </SEIDialogTrigger>
    <SEIDialogContent variant="dark" aria-modal="true" className="world-card-story-panel"
      backdropClassName="world-card-story-backdrop" bodyClassName="world-card-story-panel-body">
      <SEIDialogTitle className="sr-only">Story information for {world.title}</SEIDialogTitle>
      <SEIDialogDescription className="sr-only">Story overview</SEIDialogDescription>
      <aside className="world-card-story-panel-standing" aria-label="World standing">
        <span className="world-card-story-panel-standing-label">World standing</span>
        {world.senVerified === true && <SEIBadge size="sm" variant="info"
          className="world-card-story-panel-verified" aria-label="SEN verified world">
          <BadgeCheck size={13} aria-hidden="true" />SEN Verified
        </SEIBadge>}
        <SEIBadge size="sm" variant="neutral" className="world-card-story-panel-views"
          aria-label={`${world.reads.toLocaleString()} views`}>
          <Eye size={12} aria-hidden="true" />{world.reads.toLocaleString()}
        </SEIBadge>
      </aside>
      <section aria-label="Synopsis">
        <h4>Synopsis</h4>
        <p>{world.synopsis?.trim() || 'Synopsis unavailable.'}</p>
      </section>
      {(activity || world.branchingEnabled !== undefined) && <dl className="world-card-story-panel-signals">
        {activity && <div><dt>Activity</dt><dd><span className={`world-card-activity-dot ${activity.color}`} aria-hidden="true" />{activity.label}</dd></div>}
        {world.branchingEnabled !== undefined && <div><dt>Branching</dt><dd>{world.branchingEnabled ? 'Enabled' : 'Disabled'}</dd></div>}
      </dl>}
      <section className="world-card-story-panel-tags-section" aria-label="Story tags">
        <h4>Story tags</h4>
        {world.tags?.length
          ? <ul className="world-card-story-panel-tags">{[...new Set(world.tags)].map(tag => <li key={tag}>#{tag}</li>)}</ul>
          : <p>No story tags supplied.</p>}
      </section>
    </SEIDialogContent>
  </SEIDialog>;
}
