import { ChevronDown, Sparkles } from 'lucide-react';
import type { DiscoverEvent } from '../shared/discoverContracts';
import './discover-events.css';

/** Discover's Rankings event notice; the host supplies event availability and content. */
export function DiscoverEvents({ events }: { events: readonly DiscoverEvent[] }) {
  if (!events.length) return null;
  return <details className="discover-events" data-discover-events>
    <summary>
      <Sparkles aria-hidden="true" size={16} />
      <span className="discover-events-label">Events</span>
      <span className="discover-events-preview">{events[0].title}</span>
      {events.length > 1 && <span className="discover-events-more">+{events.length - 1}</span>}
      <ChevronDown aria-hidden="true" size={16} />
    </summary>
    <ul className="discover-events-list" aria-label="Events">
      {events.map(event => <li key={event.id} className="discover-event">
        {event.imageUrl && <img src={event.imageUrl} alt="" className="discover-event-art" loading="lazy" referrerPolicy="no-referrer" />}
        <div className="discover-event-body">
          <span className="discover-event-when">{event.when}</span>
          <h2 className="discover-event-title font-display">{event.title}</h2>
          <p className="discover-event-description">{event.description}</p>
        </div>
      </li>)}
    </ul>
  </details>;
}
