/**
 * Provenance as its own Systems page. Renders the same Provenance tab content
 * that used to sit inline at the bottom of the Systems section.
 */
import { ProvenanceTab } from '../../ProvenanceTab';
import { workshopEntries } from '../../manifest';

const entry = workshopEntries.find(candidate => candidate.id === 'provenance')!;

export function ProvenanceWorkspace() {
  return (
    <main className="workshop-home">
      <div className="workshop-shell">
        <header className="workshop-header">
          <h1 className="workshop-title">{entry.title}</h1>
          <p className="workshop-kicker">Systems</p>
          <p className="workshop-subtitle">{entry.description}</p>
        </header>
        <ProvenanceTab />
      </div>
    </main>
  );
}
