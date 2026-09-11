import { useState } from 'react';
import { Download } from 'lucide-react';
import { SENDiscoveryIcon, SENStoreIcon } from '../../sen-icons';
import { LibraryButton, LibraryPanel } from '@seihouse/library-ui';
import { SEIEmptyState, SEIInlineAlert } from '@seihouse/ui';
import { useUserProfileServices } from '../shared/userProfileServices';
import { publicCreatorWorlds, type PublicCreator } from './creatorWorlds';

export function UserProfileCreatorPanel({ creator, kind }: {
  creator: PublicCreator;
  kind: 'worlds' | 'storefront';
}) {
  const { downloadStorySeed } = useUserProfileServices();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const name = creator.profile.displayName.trim() || 'This cultivator';
  const worlds = publicCreatorWorlds(creator.profile.uid, creator.worlds);

  if (kind === 'storefront') return (
    <LibraryPanel padding="md" className="cave-creator-empty" data-cave-storefront={creator.profile.uid}>
      <SEIEmptyState icon={SENStoreIcon} titleAs="h3" title={`${name}’s Store`}
        description="A place for this creator’s shared skills, tools, templates, music packs, and other reusable creations." />
      <p className="mt-4 text-sm text-neutral-300">The pavilion is being prepared. No items are available yet.</p>
    </LibraryPanel>
  );

  return <div data-cave-worlds={creator.profile.uid}>
    {error && <SEIInlineAlert tone="danger" role="alert" className="mb-4">{error}</SEIInlineAlert>}
    {worlds.length === 0 ? (
      <LibraryPanel padding="md" className="cave-creator-empty">
        <SEIEmptyState icon={SENDiscoveryIcon} titleAs="h3" title="No public worlds yet"
          description={`${name} has not shared any public worlds yet. Published worlds and their shared Story Seeds will appear here.`} />
      </LibraryPanel>
    ) : (
      <ul aria-label={`${name}’s public worlds`} className="space-y-4">
        {worlds.map(world => <li key={world.id} data-cave-world={world.id}>
          <LibraryPanel padding="md">
            {world.highlighted && <p className="mb-1 text-xs text-[#e2c46a]">Highlighted world</p>}
            <h3 className="font-serif text-lg text-[#7dd3ff]">{world.title}</h3>
            {world.seed ? <div className="mt-3 border-t border-white/10 pt-3" data-world-seed={world.seed.id}>
              <p className="text-sm text-neutral-200">Story Seed · {world.seed.title}</p>
              {world.canReuseSeed ? <LibraryButton variant="ghost" size="sm" icon={Download}
                className="mt-2" disabled={pending !== null}
                aria-label={`Export ${world.title} seed to reuse`}
                onClick={async () => {
                  setError(''); setPending(world.id);
                  try { await downloadStorySeed(world.seed!); }
                  catch { setError('This seed could not be exported. Please try again.'); }
                  finally { setPending(null); }
                }}>
                {pending === world.id ? 'Exporting…' : 'Export seed to reuse'}
              </LibraryButton> : <p className="mt-2 text-xs text-neutral-400">Shared for viewing. Reuse is not enabled by the creator.</p>}
              {world.canReuseSeed && <p className="mt-1 text-xs text-neutral-400">Import the exported seed through the Creation Portal to reuse it.</p>}
            </div> : <p className="mt-2 text-sm text-neutral-400">This world’s seed has not been shared.</p>}
          </LibraryPanel>
        </li>)}
      </ul>
    )}
  </div>;
}
