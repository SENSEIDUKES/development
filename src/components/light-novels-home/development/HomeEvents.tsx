import { ChevronDown, Sparkles } from 'lucide-react';
import type { HomeEvent } from '../shared/homeContracts';
import './home-events.css';

/** Home's event notice; the host supplies event availability and content. */
export function HomeEvents({ events }: { events: readonly HomeEvent[] }) {
  if (!events.length) return null;
  return <details className="home-events" data-home-events>
    <summary>
      <Sparkles aria-hidden="true" size={16} />
      <span className="home-events-label">Events</span>
      <span className="home-events-preview">{events[0].title}</span>
      {events.length > 1 && <span className="home-events-more">+{events.length - 1}</span>}
      <ChevronDown aria-hidden="true" size={16} />
    </summary>
    <ul className="home-events-list" aria-label="Events">
      {events.map(event => <li key={event.id} className="home-event">
        {event.imageUrl && <img src={event.imageUrl} alt="" className="home-event-art" loading="lazy" referrerPolicy="no-referrer" />}
        <div className="home-event-body">
          <span className="home-event-when">{event.when}</span>
          <h2 className="home-event-title font-display">{event.title}</h2>
          <p className="home-event-description">{event.description}</p>
        </div>
      </li>)}
    </ul>
  </details>;
}
