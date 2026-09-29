import { Eye, Info } from 'lucide-react';
import { SEIBadge, SEIDialog, SEIDialogContent, SEIDialogDescription, SEIDialogTitle, SEIDialogTrigger } from '@seihouse/ui';
import { LibraryStoryIcon } from '@seihouse/library-ui';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';
import { WORLD_ACTIVITY_DISPLAY } from './worldActivityDisplay';

/** A read-only preview of host-authorized story information opened from its format. */
export function WorldCardStoryPanel({ world }: { world: HomeWorld }) {
  const format = world.format?.trim();
  const activity = world.activityStatus ? WORLD_ACTIVITY_DISPLAY[world.activityStatus] : undefined;
  return <SEIDialog>
    <SEIDialogTrigger className="world-card-base-format" aria-label={`Story information for ${world.title}${format ? `, ${format}` : ''}`}>
      {format?.toLowerCase() === 'novel'
        ? <><LibraryStoryIcon size={17} aria-hidden /><span className="sr-only">Novel</span></>
        : format ? format.toUpperCase() : <Info size={17} aria-hidden="true" />}
    </SEIDialogTrigger>
    <SEIDialogContent variant="dark" aria-modal="true" className="world-card-story-panel"
      backdropClassName="world-card-story-backdrop" bodyClassName="world-card-story-panel-body">
      <div className="world-card-story-panel-header">
        <SEIDialogTitle className="world-card-story-panel-title">{world.title}</SEIDialogTitle>
        <SEIBadge size="sm" variant="neutral" className="world-card-story-panel-views"
          aria-label={`${world.reads.toLocaleString()} views`}>
          <Eye size={12} aria-hidden="true" />{world.reads.toLocaleString()}
        </SEIBadge>
      </div>
      <SEIDialogDescription className="sr-only">Story overview</SEIDialogDescription>
      <section aria-label="Synopsis">
        <h4>Synopsis</h4>
        <p>{world.synopsis?.trim() || 'Synopsis unavailable.'}</p>
      </section>
      {(activity || world.branchingEnabled !== undefined) && <dl className="world-card-story-panel-signals">
        {activity && <div><dt>Activity</dt><dd><span className={`world-card-activity-dot ${activity.color}`} aria-hidden="true" />{activity.label}</dd></div>}
        {world.branchingEnabled !== undefined && <div><dt>Branching</dt><dd>{world.branchingEnabled ? 'Enabled' : 'Disabled'}</dd></div>}
      </dl>}
      <section aria-label="Story tags">
        <h4>Story tags</h4>
        {world.tags?.length
          ? <ul className="world-card-story-panel-tags">{[...new Set(world.tags)].map(tag => <li key={tag}>#{tag}</li>)}</ul>
          : <p>No story tags supplied.</p>}
      </section>
    </SEIDialogContent>
  </SEIDialog>;
}
