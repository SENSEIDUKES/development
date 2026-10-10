import { useState } from 'react';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { getPreviewScenario } from '../user-profile/previewData';
import { previewPublicCreators } from '../user-profile/publicCreatorData';

const creators = previewPublicCreators(getPreviewScenario('developed-cultivator').profile);

/** Inspect the existing Profile storefront in its own document and Cave shell. */
export function UserShopWorkspace() {
  const [creatorId, setCreatorId] = useState(creators[0].profile.uid);
  const creator = creators.find(candidate => candidate.profile.uid === creatorId)!;
  const cave = `/public/creators/${encodeURIComponent(creatorId)}/storefront`;
  const src = `/library-shell.html?variant=development&source=cultivator-cave&state=developed-cultivator&screen=profile&cave=${encodeURIComponent(cave)}`;

  return <FeatureWorkspace entry={workshopEntries.find(entry => entry.id === 'user-shop')!}
    allowCompare={false}
    renderReference={() => <p className="p-6 text-sm text-neutral-400">User Shop has no historical reference. Development uses the existing creator shop in User Profile.</p>}
    renderDevelopment={() => <div>
      <iframe key={src} title={`${creator.profile.displayName} User Shop`} src={src}
        className="block h-[100dvh] w-full border-0 bg-black" />
      <a className="inline-flex min-h-11 items-center px-4 text-cyan-200 underline"
        href={src} target="_blank" rel="noreferrer">Open User Shop in its own tab</a>
    </div>}
    workshopControls={{
      description: 'The same creator shop page as User Profile, using local preview accounts. The pavilion has no items yet. Return opens the selected creator’s public profile.',
      defaultSection: 'states',
      sections: [{ id: 'states', content: <label className="flex flex-col gap-1 text-xs">Creator
        <select className="min-h-11 rounded-lg border border-white/20 bg-black/30 p-2 text-base text-white sm:text-sm"
          value={creatorId} onChange={event => setCreatorId(event.target.value)}>
          {creators.map(candidate => <option key={candidate.profile.uid} value={candidate.profile.uid}>{candidate.profile.displayName}</option>)}
        </select>
      </label> }],
    }} />;
}
