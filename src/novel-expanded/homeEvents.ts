import type { HomeEvent } from '@seihouse/library/home';

/** Sample announcements, displayed only on Home until events are connected. */
export const HOME_SAMPLE_EVENTS: readonly HomeEvent[] = [
  { id: 'mystery-week', title: 'Mystery Week', when: 'Coming soon', imageUrl: '/manifest-backdrops/immortal-land-3.jpg',
    description: 'Seven days of locked rooms, lies and lost heirs, for creators and readers.' },
  { id: 'dark-fantasy-week', title: 'Dark Fantasy Week', when: 'Coming soon', imageUrl: '/manifest-backdrops/immortal-land-4.jpg',
    description: 'Worlds where the light costs something.' },
];
