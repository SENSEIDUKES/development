import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { PaletteMaterials } from '../../../components/palette-materials/development/PaletteMaterials';

const entry = workshopEntries.find(candidate => candidate.id === 'palette-materials')!;
export function PaletteMaterialsWorkspace() {
  return <div className="pm-workspace"><FeatureWorkspace entry={entry} allowCompare={false}
    renderReference={() => <p className="p-6 text-sm text-white/60">This workspace gathers the current app materials. Each original appears beside its experiment in Development; there is no historical reference.</p>}
    renderDevelopment={() => <PaletteMaterials />} /></div>;
}
