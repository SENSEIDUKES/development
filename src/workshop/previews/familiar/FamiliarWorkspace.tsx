import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { FamiliarPreview } from './FamiliarPreview';

const entry = workshopEntries.find(candidate => candidate.id === 'familiar')!;

/** The reusable Development companion. */
export function FamiliarWorkspace() {
  return <FeatureWorkspace entry={entry} renderDevelopment={() => <FamiliarPreview />} />;
}
