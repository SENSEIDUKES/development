/**
 * The User Profile services port.
 *
 * Production's `UserProfile` page calls `useUserProfile()` directly, and that
 * hook reaches straight into Firebase Auth, the Zustand app store, PostgreSQL
 * persistence, the profile-picture generation service, R2 uploads, and the
 * admin overview routes. None of that may enter the Workshop, so the copied
 * presentation components read one injected object instead.
 *
 * Nothing in this file implements behavior. It is the contract only:
 *
 * - `UserProfileController` is the exact value production's `useUserProfile`
 *   returns (same names, same call signatures), so the transfer back to
 *   Light-Novels is a provider swap rather than a rewrite.
 * - The remaining members cover the production dependencies the panels
 *   import on their own: provider-aware authentication, `lib/firebase`
 *   (local-only mode), `lib/storage`
 *   (library sync), `lib/artifacts` (weekly offerings), and
 *   `lib/storySeedStorage` + `lib/storySeedFormat` (seed listing and export).
 *
 * The Workshop supplies `mockUserProfileServices`; Light-Novels supplies a real
 * adapter built from its existing modules. See the feature README for the
 * exact transfer wiring.
 */

import React, { createContext, createElement, useContext } from 'react';
import type {
  AccountRole,
  ActiveStatusEffect,
  AdminStoryRow,
  AppUser,
  ChapterWritingStyle,
  CosmicArtifact,
  PremiumTier,
  Story,
  StorySeed,
  UserProfile,
} from './types';

/** Shape of `getDaoRankData(...)`. `nextRank` / `maxQi` are null at max rank. */
export interface DaoRankData {
  rank: string;
  nextRank: string | null;
  progress: number;
  maxQi: number | null;
  currentQi: number;
}

export interface UserProfileControllerProps {
  currentUser: AppUser | null;
  stories: Story[];
  onLogout: () => void;
  onNavigateHome: () => void;
}

/**
 * Everything the profile page and its panels consume. Mirrors the return value
 * of `src/hooks/useUserProfile.ts` in Light-Novels, minus the members the page
 * does not read.
 */
export interface UserProfileController {
  // Library / app-shell state (production: `useAppStore`)
  syncStatus: string;
  lastSavedTime: Date | null;
  setIsSettingsOpen: (open: boolean) => void;
  setIsShortcutsOpen: (open: boolean) => void;
  handleExportLibrary: () => void;
  handleImportLibrary: (event: React.ChangeEvent<HTMLInputElement>) => void;

  // Profile record and edit form
  profile: UserProfile | null;
  formData: Partial<UserProfile>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<UserProfile>>>;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  isLoading: boolean;
  error: string;
  colorInputRef: React.RefObject<HTMLInputElement | null>;
  handleChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  handleSave: () => Promise<void> | void;

  // Disclosure state
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;
  isQiMenuOpen: boolean;
  setIsQiMenuOpen: (open: boolean) => void;
  activeQiTooltip: string | null;
  setActiveQiTooltip: (tooltip: string | null) => void;

  // Akashic Switchboard (admin)
  isAdminPanelOpen: boolean;
  setIsAdminPanelOpen: (open: boolean) => void;
  adminTab: 'users' | 'stories';
  setAdminTab: (tab: 'users' | 'stories') => void;
  allUsers: UserProfile[];
  allStories: AdminStoryRow[];
  isFetchingAdminData: boolean;
  adminSearchQuery: string;
  setAdminSearchQuery: (query: string) => void;
  adminError: string;
  fetchAdminData: () => void;
  handleUpdateUserRole: (uid: string, role: AccountRole) => void;
  handleUpdateUserTier: (uid: string, tier: PremiumTier) => void;
  handleDeleteStoryAdmin: (storyId: string) => void;

  // Language safeguard
  pendingLanguageChange: {
    preferred: string;
    translation: string;
    prevPreferred: string;
    prevTranslation: string;
  } | null;
  countdown: number;
  confirmLanguageChange: () => void;
  revertLanguageChange: () => void;
  handleLanguageChangeDirect: (
    name: 'preferredLanguage' | 'defaultTranslationLanguage',
    value: string,
  ) => Promise<void> | void;

  // Chapter writing style default
  handleDefaultChapterWritingStyleChange: (
    value: ChapterWritingStyle,
  ) => Promise<void>;
  isSavingChapterWritingStyle: boolean;

  // Divine Mirror portrait flow
  showPortraitModal: boolean;
  setShowPortraitModal: (show: boolean) => void;
  portraitUploadFile: File | null;
  setPortraitUploadFile: (file: File | null) => void;
  portraitUploadBase64: string;
  setPortraitUploadBase64: (base64: string) => void;
  portraitDesc: string;
  setPortraitDesc: (description: string) => void;
  isGeneratingPortrait: boolean;
  isSavingPortrait: boolean;
  generatedPortraitUrl: string;
  portraitError: string;
  generationStep: number;
  handleFileChange: (file: File) => void;
  handleDrag: (event: React.DragEvent) => void;
  handleDrop: (event: React.DragEvent) => void;
  handleGeneratePortrait: () => Promise<void> | void;
  handleApplyPortrait: () => Promise<void> | void;

  // Auth
  handleLogin: () => Promise<void> | void;

  // Cultivation progression
  daoData: DaoRankData;
  equippedArtifact: CosmicArtifact | undefined;
  currentPowerStage: string;
  activeStoriesCount: number;
  currentStreak: number;
  isCracked: boolean;
  daysTo3: number;
  daysTo10: number;
  handleRepairPillar: () => Promise<void> | void;
  handleCheckIn: () => Promise<void> | void;
  handleAttuneArtifact: (artifactId: string) => Promise<void>;

  // Passed through unchanged from props
  storageType: string;
  activeStoryId: string | null;
  routingConfig: unknown;
}

export interface UserProfileServices {
  /** Production: `useUserProfile(props)` from `src/hooks/useUserProfile.ts`. */
  useController: (props: UserProfileControllerProps) => UserProfileController;

  /** Host-owned Google, Apple, or email authentication for the Spirit Link gate. */
  authenticate: (attempt: {
    provider: 'google' | 'apple' | 'email';
    emailMode?: 'signin' | 'create';
    email?: string;
    password?: string;
  }) => Promise<unknown> | unknown;

  /** Production: `LOCAL_ONLY_MODE` / `setLocalOnlyMode` from `src/lib/firebase.ts`. */
  localOnlyMode: boolean;
  setLocalOnlyMode: (next: boolean) => void;

  /** Production: `storyStorage.performSync({ deep: true })` from `src/lib/storage.ts`. */
  requestLibrarySync: () => void;

  /** Production: `submitCurrentWeekOfferings()` from `src/lib/artifacts.ts`. */
  submitCurrentWeekOfferings: () => Promise<{ qi: number; sectMerit: number }>;

  /** Production: `listStorySeeds()` from `src/lib/storySeedStorage.ts`. */
  listStorySeeds: () => Promise<StorySeed[]>;

  /** Production: `downloadStorySeed` / `downloadStorySeedCollection` from `src/lib/storySeedFormat.ts`. */
  downloadStorySeed: (seed: StorySeed) => Promise<void>;
  downloadStorySeedCollection: (seeds: StorySeed[]) => Promise<void>;
}

const UserProfileServicesContext = createContext<UserProfileServices | null>(null);

export function UserProfileServicesProvider({
  services,
  children,
}: {
  services: UserProfileServices;
  children: React.ReactNode;
}) {
  return createElement(
    UserProfileServicesContext.Provider,
    { value: services },
    children,
  );
}

/**
 * Read the injected services. Throws rather than silently falling back, so a
 * host that forgets the provider fails loudly instead of rendering a profile
 * page wired to nothing.
 */
export function useUserProfileServices(): UserProfileServices {
  const services = useContext(UserProfileServicesContext);
  if (!services) {
    throw new Error(
      'UserProfile requires <UserProfileServicesProvider services={…}>. '
        + 'The Workshop supplies mockUserProfileServices; Light-Novels supplies the real adapter.',
    );
  }
  return services;
}

export type { ActiveStatusEffect, AppUser, Story, StorySeed, UserProfile };
