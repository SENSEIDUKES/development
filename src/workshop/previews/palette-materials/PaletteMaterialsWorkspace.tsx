import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { PaletteMaterials } from '../../../components/palette-materials/development/PaletteMaterials';
import { HomeMaterialPreview } from './HomeMaterialPreview';

const entry = workshopEntries.find(candidate => candidate.id === 'palette-materials')!;
export function PaletteMaterialsWorkspace() {
  return <div className="pm-workspace"><FeatureWorkspace entry={entry}
    renderDevelopment={() => <PaletteMaterials renderComposition={settings => <HomeMaterialPreview settings={settings} />} />} /></div>;
}
