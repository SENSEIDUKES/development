/**
 * Workshop mock data for the User Profile replica.
 *
 * Nothing here is production data. Every record is invented, deterministic, and
 * local. Production reads the same shapes from PostgreSQL through
 * `lib/persistence`; the Workshop never opens that connection.
 */

import { getCurrentOfferingWeekId } from '../../../components/user-profile/shared/offeringWeek';
import type {
  AdminStoryRow,
  AppUser,
  CosmicArtifact,
  Story,
  StorySeed,
  UserProfile,
} from '../../../components/user-profile/shared/types';
import type { UserProfilePreviewState } from './previewStates';

const CURRENT_WEEK = getCurrentOfferingWeekId();

const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const dayStamp = (days: number): string => daysAgo(days).split('T')[0];

/**
 * A locally drawn, static 2D cultivator portrait so the "developed" scenario
 * shows a real likeness without fetching an image: a robed bust with a
 * topknot and hairpin against a blue spirit halo. Production serves a signed
 * R2 delivery URL for the generated portrait.
 */
const portraitDataUri = (): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <defs>
      <radialGradient id="sky" cx="50%" cy="38%" r="70%">
        <stop offset="0%" stop-color="#1f4f86"/>
        <stop offset="55%" stop-color="#0a1a30"/>
        <stop offset="100%" stop-color="#02050b"/>
      </radialGradient>
      <radialGradient id="halo" cx="50%" cy="50%" r="50%">
        <stop offset="60%" stop-color="#04ACFF" stop-opacity="0"/>
        <stop offset="88%" stop-color="#04ACFF" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#04ACFF" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="robe" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e7edf7"/>
        <stop offset="100%" stop-color="#8ea3c4"/>
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#sky)"/>
    <circle cx="100" cy="92" r="78" fill="url(#halo)"/>
    <circle cx="100" cy="92" r="62" fill="none" stroke="#7dd3ff" stroke-opacity="0.35" stroke-width="1.5"/>
    <g fill="#ffffff" fill-opacity="0.7">
      <circle cx="38" cy="52" r="1.4"/><circle cx="160" cy="40" r="1.1"/><circle cx="172" cy="118" r="1.3"/>
      <circle cx="28" cy="132" r="1"/><circle cx="146" cy="160" r="1.2"/><circle cx="60" cy="24" r="0.9"/>
    </g>
    <path d="M40 200c2-34 26-56 60-56s58 22 60 56z" fill="url(#robe)"/>
    <path d="M78 148l22 34 22-34" fill="none" stroke="#1d3358" stroke-width="2"/>
    <path d="M100 152l-10 40h20z" fill="#2c4f86" fill-opacity="0.85"/>
    <path d="M92 118h16v22c0 6-16 6-16 0z" fill="#f0d9c2"/>
    <ellipse cx="100" cy="98" rx="27" ry="33" fill="#f6e2cc"/>
    <path d="M73 96c0-26 12-40 27-40s27 14 27 40c-6-10-14-18-27-18s-21 8-27 18z" fill="#151a2b"/>
    <path d="M88 44c4-14 20-14 24 0-8-6-16-6-24 0z" fill="#151a2b"/>
    <rect x="92" y="34" width="16" height="8" rx="3" fill="#1b2340"/>
    <path d="M74 42h52" stroke="#d4af37" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M89 100c4-3 8-3 12 0M99 100c4-3 8-3 12 0" stroke="#3a2c25" stroke-width="2" stroke-linecap="round" fill="none"/>
    <path d="M96 116c2 1.6 6 1.6 8 0" stroke="#b07a6c" stroke-width="1.6" stroke-linecap="round" fill="none"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
};

export const PREVIEW_PORTRAIT_URL = portraitDataUri();

export const MOCK_ACCOUNT: AppUser = {
  uid: 'workshop-cultivator',
  email: 'cultivator@workshop.local',
  displayName: 'Workshop Cultivator',
  photoURL: null,
};

export const MOCK_OWNER_ACCOUNT: AppUser = {
  uid: 'workshop-owner',
  email: 'owner@workshop.local',
  displayName: 'Workshop Owner',
  photoURL: null,
};

export const MOCK_STORIES: Story[] = [
  { id: 'story-ashes', title: 'Ashes of the Ninth Heaven', userId: MOCK_ACCOUNT.uid, sourceSeedId: 'seed-ashes' },
  { id: 'story-lantern', title: 'The Lantern That Refused to Die', userId: MOCK_ACCOUNT.uid, sourceSeedId: 'seed-lantern' },
  { id: 'story-saltwind', title: 'Saltwind Sovereign', userId: MOCK_ACCOUNT.uid },
  {
    id: 'story-quiet',
    title: 'A Quiet Sect at the Edge of a Loud Universe (archived draft)',
    userId: MOCK_ACCOUNT.uid,
  },
  { id: 'story-deleted', title: 'Abandoned Fragment', userId: MOCK_ACCOUNT.uid, deleted: true },
];

export const MOCK_SEEDS: StorySeed[] = [
  {
    id: 'seed-ashes',
    userId: MOCK_ACCOUNT.uid,
    title: 'Ashes of the Ninth Heaven',
    createdAt: daysAgo(64),
    updatedAt: daysAgo(3),
  },
  {
    id: 'seed-lantern',
    userId: MOCK_ACCOUNT.uid,
    title: 'The Lantern That Refused to Die',
    createdAt: daysAgo(31),
    updatedAt: daysAgo(31),
  },
  {
    id: 'seed-unused',
    userId: MOCK_ACCOUNT.uid,
    title: 'Untitled seed with a deliberately long name to test truncation behaviour in the seed index',
    createdAt: daysAgo(9),
    updatedAt: daysAgo(1),
  },
];

export const MOCK_ARTIFACTS: CosmicArtifact[] = [
  {
    id: 'relic-transcendent',
    name: 'Fragment of the First Sentence',
    description:
      'The opening line of a story that was never finished. It still hums with the intent of its author.',
    unlockedAt: daysAgo(2),
    gatheredAt: daysAgo(2),
    sourceStoryId: 'story-ashes',
    sourceStoryTitle: 'Ashes of the Ninth Heaven',
    sourceChapterNumber: 41,
    milestoneType: 'first_breakthrough',
    milestoneName: 'First Breakthrough',
    rarity: 'Transcendent',
    attributeBoost: '+15% Heavenly Qi from reading',
    offeringWeekId: CURRENT_WEEK,
    status: 'unsubmitted',
    rewardValueQi: 5000,
    rewardValueSectMerit: 100,
    statusEffectDef: {
      name: 'Blessing of the Unwritten',
      type: 'Blessing',
      description: 'Every chapter you seal this week returns a fraction of its Qi to you.',
      durationMs: 7 * 24 * 60 * 60 * 1000,
      scope: 'Account-wide',
      visual: 'A faint gold underline beneath your display name.',
      counterplay: 'Ends early if the Dao Pillar cracks.',
      rewardHook: 'Complete 500 Qi of reading to unlock a Transcendent aura preview.',
      qiMultiplier: 1.15,
      targetProgress: 500,
    },
  },
  {
    id: 'relic-mythic',
    name: 'Crown of the Ninth Refusal',
    description: 'Worn by a cultivator who declined ascension eight times and regretted none of them.',
    unlockedAt: daysAgo(4),
    gatheredAt: daysAgo(4),
    sourceStoryId: 'story-ashes',
    sourceStoryTitle: 'Ashes of the Ninth Heaven',
    sourceChapterNumber: 37,
    milestoneType: 'rank_up',
    milestoneName: 'Rank Ascension',
    rarity: 'Mythic',
    attributeBoost: '+8% Sect Qi',
    offeringWeekId: CURRENT_WEEK,
    status: 'unsubmitted',
    rewardValueQi: 2000,
    rewardValueSectMerit: 50,
  },
  {
    id: 'relic-legendary',
    name: 'Saltwind Compass',
    description: 'Points not north, but toward the thing you have been avoiding.',
    unlockedAt: daysAgo(5),
    gatheredAt: daysAgo(5),
    sourceStoryId: 'story-saltwind',
    sourceStoryTitle: 'Saltwind Sovereign',
    sourceChapterNumber: 12,
    milestoneType: 'codex_linked',
    milestoneName: 'Codex Linked',
    rarity: 'Legendary',
    offeringWeekId: CURRENT_WEEK,
    status: 'unsubmitted',
    rewardValueQi: 250,
    rewardValueSectMerit: 25,
    specialUnlock: { type: 'cosmetic', label: 'Saltwind name shimmer' },
  },
  {
    id: 'relic-epic',
    name: 'Ledger of Small Mercies',
    description: 'Records every kindness the protagonist thought too minor to mention.',
    unlockedAt: daysAgo(11),
    gatheredAt: daysAgo(11),
    sourceStoryTitle: 'The Lantern That Refused to Die',
    milestoneType: 'chapter_seal',
    milestoneName: 'Chapter Sealed',
    rarity: 'Epic',
    offeringWeekId: '2026-W01',
    status: 'submitted',
    rewardValueQi: 100,
    rewardValueSectMerit: 10,
  },
  {
    id: 'relic-rare',
    name: 'Ten-Day Ember',
    description: 'Proof of ten consecutive days of refinement. It is warm and slightly embarrassed about it.',
    unlockedAt: daysAgo(18),
    gatheredAt: daysAgo(18),
    milestoneType: 'streak_attained',
    milestoneName: 'Streak Attained',
    rarity: 'Rare',
    offeringWeekId: '2026-W01',
    status: 'auto_submitted',
    rewardValueQi: 50,
    rewardValueSectMerit: 5,
  },
  {
    id: 'relic-common',
    name: 'Chipped Reading Stone',
    description: 'Every cultivator gets one. Almost nobody keeps it. You did.',
    unlockedAt: daysAgo(40),
    gatheredAt: daysAgo(40),
    milestoneType: 'challenge_complete',
    milestoneName: 'Challenge Complete',
    rarity: 'Common',
    offeringWeekId: '2025-W52',
    status: 'submitted',
    rewardValueQi: 10,
    rewardValueSectMerit: 1,
  },
];

const BASE_PROFILE: UserProfile = {
  uid: MOCK_ACCOUNT.uid,
  username: 'Workshop Cultivator',
  displayName: 'Workshop Cultivator',
  avatarUrl: '',
  preferredLanguage: 'English',
  defaultTranslationLanguage: 'English',
  defaultChapterWritingStyle: 'Standard',
  savedStoryCount: 0,
  activeStories: [],
  inactiveStories: [],
  joinedDate: daysAgo(2),
  updatedAt: daysAgo(2),
  role: 'user',
  qi: 0,
  dao_xp: 0,
  dao_rank: 'Mortal Reader',
  heavenly_qi: 0,
  sect_qi: 0,
  demonic_qi: 0,
  premiumTier: 'mortal',
  cosmicInventory: [],
  activeStatusEffects: [],
};

const DEVELOPED_PROFILE: UserProfile = {
  ...BASE_PROFILE,
  username: 'Ninefold Ash',
  displayName: 'The One Who Kept Reading',
  displayNameColor: 'gradient-violet-gold',
  avatarUrl: PREVIEW_PORTRAIT_URL,
  activePortraitId: 'portrait-workshop-1',
  defaultChapterWritingStyle: 'Clear Reading',
  preferredLanguage: 'English',
  defaultTranslationLanguage: 'Japanese (日本語)',
  savedStoryCount: 4,
  activeStories: ['story-ashes', 'story-lantern', 'story-saltwind'],
  inactiveStories: ['story-quiet'],
  joinedDate: daysAgo(412),
  updatedAt: daysAgo(1),
  qi: 13480,
  dao_xp: 13480,
  dao_rank: 'Sage of Branching Paths',
  heavenly_qi: 13480,
  sect_qi: 620,
  demonic_qi: 145,
  premiumTier: 'inner_sect',
  writingStreak: 12,
  daoPillarStreak: 12,
  daoPillarCracked: false,
  lastReadDate: dayStamp(1),
  lastSessionEnd: daysAgo(1),
  lastInteractionDate: daysAgo(1),
  cosmicInventory: MOCK_ARTIFACTS,
  equippedArtifactId: 'relic-transcendent',
  activeStatusEffects: [
    {
      id: 'effect-blessing',
      appliedAt: daysAgo(2),
      expiresAt: daysAgo(-5),
      sourceArtifactId: 'relic-transcendent',
      progress: 310,
      targetProgress: 500,
      effectDef: MOCK_ARTIFACTS[0].statusEffectDef!,
    },
    {
      id: 'effect-curse',
      appliedAt: daysAgo(1),
      expiresAt: daysAgo(-1),
      progress: 40,
      targetProgress: 40,
      completedAt: daysAgo(0.2),
      effectDef: {
        name: 'Curse of the Half-Finished Arc',
        type: 'Curse',
        description:
          'Three stories are waiting on their next chapter. Until one moves, Sect Qi accrues at half rate.',
        durationMs: 36 * 60 * 60 * 1000,
        scope: 'Account-wide',
        visual: 'A dull red seam along the profile border.',
        counterplay: 'Seal any chapter in a stalled story to lift it early.',
        rewardHook: 'Lifting it early returns 40 Sect Qi.',
        sectQiMultiplier: 0.5,
        targetProgress: 40,
      },
    },
  ],
};

const OWNER_PROFILE: UserProfile = {
  ...DEVELOPED_PROFILE,
  uid: MOCK_OWNER_ACCOUNT.uid,
  username: 'Workshop Owner',
  displayName: 'Keeper of the Switchboard',
  displayNameColor: 'animated-custom',
  role: 'owner',
  premiumTier: 'immortal',
  qi: 26400,
  dao_xp: 26400,
  heavenly_qi: 26400,
  dao_rank: 'Dao Master',
  daoPillarStreak: 3,
  daoPillarCracked: true,
};

/** Registries the Akashic Switchboard lists. Production fetches these over the admin routes. */
export const MOCK_ADMIN_USERS: UserProfile[] = [
  OWNER_PROFILE,
  { ...DEVELOPED_PROFILE, role: 'admin', premiumTier: 'sect_master' },
  {
    ...BASE_PROFILE,
    uid: 'workshop-account-3',
    username: 'quiet_reader',
    displayName: 'Quiet Reader',
    joinedDate: daysAgo(96),
    qi: 820,
    dao_xp: 820,
    heavenly_qi: 820,
    premiumTier: 'outer_sect',
  },
  {
    ...BASE_PROFILE,
    uid: 'workshop-account-4',
    username: 'lantern_keeper',
    displayName: 'Lantern Keeper',
    joinedDate: daysAgo(12),
    qi: 55,
    dao_xp: 55,
    heavenly_qi: 55,
  },
];

export const MOCK_ADMIN_STORIES: AdminStoryRow[] = [
  {
    id: 'story-ashes',
    title: 'Ashes of the Ninth Heaven',
    genre: 'Xianxia',
    mcName: 'Ninefold Ash',
    userId: MOCK_ACCOUNT.uid,
    currentChapterNumber: 41,
    createdAt: daysAgo(64),
    updatedAt: daysAgo(1),
  },
  {
    id: 'story-lantern',
    title: 'The Lantern That Refused to Die',
    genre: 'Low Fantasy',
    mcName: 'Bo Xian',
    userId: MOCK_ACCOUNT.uid,
    currentChapterNumber: 18,
    createdAt: daysAgo(31),
    updatedAt: daysAgo(6),
  },
  {
    id: 'story-saltwind',
    title: 'Saltwind Sovereign',
    genre: 'Nautical Cultivation',
    mcName: 'Reya of the Shoal',
    userId: MOCK_ACCOUNT.uid,
    currentChapterNumber: 12,
    createdAt: daysAgo(22),
    updatedAt: daysAgo(20),
  },
  {
    id: 'story-owner-1',
    title: 'Switchboard Test Realm',
    genre: 'Diagnostic',
    mcName: 'Test Subject',
    userId: MOCK_OWNER_ACCOUNT.uid,
    currentChapterNumber: 1,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  },
];

export interface PreviewScenario {
  currentUser: AppUser | null;
  profile: UserProfile | null;
  stories: Story[];
  seeds: StorySeed[];
  /** Cloud mode is on unless a scenario deliberately models the legacy device-only build. */
  localOnlyMode: boolean;
  /** The profile snapshot never resolves. */
  profileNeverResolves: boolean;
  /** Every service call rejects, so the page's failure paths are reachable. */
  servicesFail: boolean;
}

export function getPreviewScenario(state: UserProfilePreviewState): PreviewScenario {
  const base: PreviewScenario = {
    currentUser: MOCK_ACCOUNT,
    profile: null,
    stories: MOCK_STORIES,
    seeds: MOCK_SEEDS,
    localOnlyMode: false,
    profileNeverResolves: false,
    servicesFail: false,
  };

  switch (state) {
    case 'signed-out':
      return { ...base, currentUser: null, profile: null, stories: [], seeds: [] };
    case 'new-cultivator':
      return { ...base, profile: { ...BASE_PROFILE }, stories: [], seeds: [] };
    case 'developed-cultivator':
      return { ...base, profile: { ...DEVELOPED_PROFILE } };
    case 'loading':
      return { ...base, profile: null, profileNeverResolves: true };
    case 'error':
      return { ...base, profile: { ...BASE_PROFILE }, servicesFail: true };
    case 'owner-admin':
      return {
        ...base,
        currentUser: MOCK_OWNER_ACCOUNT,
        profile: { ...OWNER_PROFILE },
      };
  }
}
