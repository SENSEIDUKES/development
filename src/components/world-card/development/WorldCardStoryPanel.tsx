import { Info, X } from 'lucide-react';
import { SEIPopover, SEIPopoverClose, SEIPopoverContent, SEIPopoverTitle, SEIPopoverTrigger } from '@seihouse/ui';
import { LibraryStoryIcon } from '@seihouse/library-ui';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';
import { WORLD_ACTIVITY_DISPLAY } from './worldActivityDisplay';

/** A read-only preview of host-authorized story information, anchored to its format. */
export function WorldCardStoryPanel({ world }: { world: HomeWorld }) {
  const format = world.format?.trim();
  const activity = world.activityStatus ? WORLD_ACTIVITY_DISPLAY[world.activityStatus] : undefined;
  return <SEIPopover>
    <SEIPopoverTrigger className="world-card-base-format" aria-label={`Story information for ${world.title}${format ? `, ${format}` : ''}`}>
      {format?.toLowerCase() === 'novel'
        ? <><LibraryStoryIcon size={17} aria-hidden /><span className="sr-only">Novel</span></>
        : format ? format.toUpperCase() : <Info size={17} aria-hidden="true" />}
    </SEIPopoverTrigger>
    <SEIPopoverContent variant="dark" side="bottom" align="start" sideOffset={12} collisionPadding={12}
      className="world-card-story-panel">
      <header className="world-card-story-panel-header">
        <SEIPopoverTitle className="world-card-story-panel-title">{world.title}</SEIPopoverTitle>
        <SEIPopoverClose className="world-card-story-panel-close" aria-label="Close story information"><X size={18} aria-hidden="true" /></SEIPopoverClose>
      </header>
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
    </SEIPopoverContent>
  </SEIPopover>;
}
