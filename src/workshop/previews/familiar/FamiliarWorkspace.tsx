import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { FamiliarReference } from '../../../components/familiar/reference/FamiliarReference';
import { FamiliarPreview } from './FamiliarPreview';

const entry = workshopEntries.find(candidate => candidate.id === 'familiar')!;

export function FamiliarWorkspace() {
  return <FeatureWorkspace entry={entry} renderReference={() => <FamiliarReference />} renderDevelopment={() => <FamiliarPreview />} />;
}
