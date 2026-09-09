import { useState } from 'react';
import { Compass } from 'lucide-react';
import { LibraryButton } from '@seihouse/library-ui';
import { WorkspaceHeader } from '../../../components/library-shell/development/WorkspaceHeader';
import { WorkspaceShell } from '../../../components/library-shell/development/WorkspaceShell';

/** Focused header states inside the existing Library Shell preview. */
export function HeaderSlotPreview({ state }: { state: string }) {
  const [message, setMessage] = useState('Use Help, Search, or the contextual item.');
  const long = state === 'long-context';
  const label = long ? 'Insights from the keeper of the nine celestial libraries' : 'Page context';
  return <WorkspaceShell header={<WorkspaceHeader landmark="none"
    title={long ? 'The Library of the Nine Celestial Realms' : 'Celestial Library'}
    subtitle="Grow Your Universe" emblem={{ src: '/favicon.jpg', alt: 'Celestial Library' }}
    home={{ href: '/', label: 'Library home', onNavigate: () => setMessage('Home selected') }}
    contextualItem={state === 'context-absent' ? undefined : <LibraryButton variant="ghost" icon={Compass}
      aria-label={label} title={label} className="header-slot-example" onClick={() => setMessage('Context selected')}>
      <span>{label}</span>
    </LibraryButton>}
    searchItems={[
      { id: 'stories', label: 'Stories', description: 'Browse your accumulated scroll logs', onAction: () => setMessage('Stories selected') },
      { id: 'unavailable', label: 'Manga Studio', description: 'Visualize your chapters', disabled: true, onAction: () => {} },
    ]} /> }>
    <div className="p-6"><p role="status">{message}</p></div>
  </WorkspaceShell>;
}
