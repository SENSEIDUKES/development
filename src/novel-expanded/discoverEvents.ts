import type { DiscoverEvent } from '@seihouse/library/discover';

/** Sample announcements, displayed under Discover Rankings until events are connected. */
export const DISCOVER_EVENTS: readonly DiscoverEvent[] = [
  { id: 'mystery-week', title: 'Mystery Week', when: 'Coming soon', imageUrl: '/manifest-backdrops/immortal-land-3.jpg',
    description: 'Seven days of locked rooms, lies and lost heirs, for creators and readers.' },
  { id: 'dark-fantasy-week', title: 'Dark Fantasy Week', when: 'Coming soon', imageUrl: '/manifest-backdrops/immortal-land-4.jpg',
    description: 'Worlds where the light costs something.' },
];
