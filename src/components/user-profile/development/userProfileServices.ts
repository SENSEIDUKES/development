/**
 * The development Cultivator Cave's services port.
 *
 * Production's `UserProfile` page calls `useUserProfile()` directly, and that
 * hook reaches into Firebase Auth, the app store, PostgreSQL, portrait
 * generation, R2 uploads and the admin routes. None of that may enter the
 * Workshop, so the Cave reads one injected object instead. Nothing in this
 * file implements behavior; it is the contract only.
 *
 * It started as a copy of the production port (kept at
 * `../shared/userProfileServices.ts` for the locked reference). The reward
 * rework removed the members of the retired economy: the legacy daily
 * check-in and cracked pillar, the special-QI reserves, Relic attunement,
 * the equipped artifact and weekly offerings. Balances and rewards are read
 * from their own server-owned clients (QI, DAO XP, Energy, Dao Pillar,
 * achievements, Relics, Familiars), never from this controller.
 */

import React, { createContext, createElement, useContext } from 'react';
import { type SenLanguageCode } from '@seihouse/sen/contracts';
import type { DaoRankData } from '../../../library/cultivation/progression';
import type { FamiliarOption } from '../../familiar/shared/familiar';
import type { CelestialStoreAccountServices } from '../../celestial-store/shared/storeAccount';
import type {
  AccountRole,
  AdminStoryRow,
  AppUser,
  ChapterWritingStyle,
  PremiumTier,
  Story,
  StorySeed,
  UserProfile,
} from './types';

export type { DaoRankData };

export interface UserProfileControllerProps {
  currentUser: AppUser | null;
  stories: Story[];
  onLogout: () => void;
  onNavigateHome: () => void;
}

/**
 * Everything the Cave and its panels consume. Mirrors the return value of
 * `src/hooks/useUserProfile.ts` in Light-Novels, minus the members the Cave
 * does not read.
 */
export interface UserProfileController {
  /** Saves only the Familiar selection through the existing account owner. */
  handleFamiliarChange?: (id: string) => Promise<void> | void;
  isSavingFamiliar?: boolean;
  handleFamiliarSizeChange?: (size: number) => void;
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
    interfaceLanguage: SenLanguageCode;
    readingLanguage: SenLanguageCode;
    previousInterfaceLanguage: SenLanguageCode;
    previousReadingLanguage: SenLanguageCode;
  } | null;
  countdown: number;
  confirmLanguageChange: () => void;
  revertLanguageChange: () => void;
  handleLanguageChangeDirect: (
    name: 'interfaceLanguage' | 'defaultReadingLanguage',
    value: SenLanguageCode,
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

  /**
   * Rank from the profile record's DAO XP. The Cave replaces it with the DAO
   * XP ledger's balance for the signed-in cultivator.
   */
  daoData: DaoRankData;
  activeStoriesCount: number;

  // Passed through unchanged from props
  storageType: string;
  activeStoryId: string | null;
  routingConfig: unknown;
}

export interface UserProfileServices {
  /** The host's Familiar catalogue. Which ones the cultivator owns comes from the Store account. */
  familiars?: readonly FamiliarOption[];
  /**
   * Celestial Store account access: Familiar ownership and the purchase call,
   * both server-owned. Without it the Store shows purchases as not connected.
   */
  celestialStore?: CelestialStoreAccountServices;
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
 * host that forgets the provider fails loudly instead of rendering a Cave
 * wired to nothing.
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

export type { AppUser, Story, StorySeed, UserProfile };
