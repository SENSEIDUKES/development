import type { Story, StorySeed, UserProfile } from '../shared/types';

/** Development presentation input; publication must be authorized by the host.
 * Missing publication metadata is private. This never reads the account seed index.
 */
export interface CreatorWorld extends Story {
  visibility?: 'public' | 'private';
  status?: 'published' | 'draft';
  highlighted?: boolean;
  seed?: StorySeed;
  seedSharing?: 'private' | 'view' | 'reuse';
}

export interface PublicCreator {
  profile: UserProfile;
  worlds: readonly CreatorWorld[];
}

export function publicCreatorWorlds(creatorId: string, worlds: readonly CreatorWorld[]) {
  return worlds.filter(world => world.userId === creatorId && !world.deleted
    && world.visibility === 'public' && world.status === 'published')
    .map(world => ({
      id: world.id,
      title: world.title,
      highlighted: world.highlighted === true,
      // Both provenance and the creator's explicit seed permission are required.
      seed: world.seed?.id === world.sourceSeedId && world.seed?.userId === creatorId
        && (world.seedSharing === 'view' || world.seedSharing === 'reuse') ? world.seed : undefined,
      canReuseSeed: world.seedSharing === 'reuse',
    }));
}
