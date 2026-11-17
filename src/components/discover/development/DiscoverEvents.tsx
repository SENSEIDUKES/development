import { SEIEmptyState } from '@seihouse/ui';
import type { DiscoverEvent } from '../shared/discoverContracts';
import './discover-events.css';

/** The existing event announcements, now reached from Discover's Events tab. */
export function DiscoverEvents({ events }: { events: readonly DiscoverEvent[] }) {
  return <section data-discover-events aria-label="Events" className="discover-shelf">
    <div>
      <h2 className="discover-shelf-title font-display">Events</h2>
      <p className="discover-shelf-subtitle">Themed weeks for creators and readers.</p>
    </div>
    {events.length === 0 ? <SEIEmptyState titleAs="h3" title="No events announced yet" description="Check back for upcoming events for creators and readers." /> : (
    <ul className="discover-events-list" aria-label="Events">
      {events.map(event => <li key={event.id} className="discover-event">
        {event.imageUrl && <img src={event.imageUrl} alt="" className="discover-event-art" loading="lazy" referrerPolicy="no-referrer" />}
        <div className="discover-event-body">
          {event.when && <span className="discover-event-when">{event.when}</span>}
          <h3 className="discover-event-title font-display">{event.title}</h3>
          <p className="discover-event-description">{event.description}</p>
        </div>
      </li>)}
    </ul>
    )}
  </section>;
}
