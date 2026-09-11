import type { PublicCreator } from '../../../components/user-profile/development/creatorWorlds';
import type { UserProfile } from '../../../components/user-profile/shared/types';

/** Explicit local publication fixtures. Never inferred from the private library. */
export function previewPublicCreators(profile: UserProfile | null): PublicCreator[] {
  if (!profile) return [];
  const creator = { ...profile, uid: 'creator-moon-scribe', displayName: 'Moon Scribe', username: 'moon-scribe' };
  return [profile, creator].map(owner => ({
    profile: owner,
    worlds: [
      {
        id: `${owner.uid}-lantern-world`, userId: owner.uid, title: 'The Lantern Sea',
        visibility: 'public', status: 'published', highlighted: true,
        sourceSeedId: `${owner.uid}-lantern-seed`, seedSharing: 'reuse',
        seed: { id: `${owner.uid}-lantern-seed`, userId: owner.uid, title: 'Lanterns over the quiet sea',
          createdAt: '2026-09-10T00:00:00Z', updatedAt: '2026-09-10T00:00:00Z' },
      },
      {
        id: `${owner.uid}-mountain-world`, userId: owner.uid, title: 'A Mountain of Small Gods',
        visibility: 'public', status: 'published',
      },
      { id: `${owner.uid}-private`, userId: owner.uid, title: 'Private world fixture', visibility: 'private', status: 'published', highlighted: true },
      { id: `${owner.uid}-draft`, userId: owner.uid, title: 'Draft world fixture', visibility: 'public', status: 'draft', highlighted: true },
    ],
  }));
}
