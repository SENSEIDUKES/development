/**
 * Production's User Profile services port, kept for the locked reference
 * replica (`src/components/user-profile/reference/*`) only.
 *
 * Light-Novels' `useUserProfile()` still returns the retired economy's
 * members: the legacy daily check-in and cracked pillar, the special-QI
 * reserves, Relic attunement with the equipped artifact, and weekly
 * offerings. The development Cave's port (`../development/userProfileServices.ts`,
 * published as `@seihouse/library/profile`) removed them. This Workshop-owned
 * adapter rebuilds production's port as that contract plus the retired
 * members, behind its own provider, so the locked reference renders exactly as
 * production does. It ships in no package.
 */
import React, { createContext, createElement, useContext } from 'react';
import type { QiAccountState } from '@seihouse/library/cultivation';
import type {
  DaoRankData as DevelopmentDaoRankData,
  UserProfileController as DevelopmentUserProfileController,
  UserProfileControllerProps,
  UserProfileServices as DevelopmentUserProfileServices,
} from '@seihouse/library/profile';
import type { ActiveStatusEffect, AppUser, CosmicArtifact, Story, StorySeed, UserProfile } from './types';

/** Production's rank data: DAO XP, plus the QI-named projections the reference still reads. */
export interface DaoRankData extends DevelopmentDaoRankData {
  /** Production names this QI; it holds DAO XP. */
  maxQi: number | null;
  /** Production names this QI; it holds DAO XP. */
  currentQi: number;
}

export type SpecialQiId = 'sect' | 'demonic';
export type DaoClaimOutcome = 'claimed' | 'already-collected' | 'blocked' | 'failed' | 'unresolved';
export interface DaoClaimResult { outcome: DaoClaimOutcome; message: string }
/** Host confirms the result; resolving the legacy void callback is not confirmation. */
export interface DaoClaimState {
  pending: boolean;
  result?: DaoClaimResult;
  claim: () => Promise<DaoClaimResult>;
  /** Refresh authoritative claim state without awarding again. */
  reconcile: () => Promise<DaoClaimResult>;
}

export type { UserProfileControllerProps };

export interface UserProfileController extends Omit<DevelopmentUserProfileController, 'profile' | 'formData' | 'setFormData' | 'allUsers' | 'daoData'> {
  profile: UserProfile | null;
  formData: Partial<UserProfile>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<UserProfile>>>;
  allUsers: UserProfile[];
  daoData: DaoRankData;
  unlockedSpecialQi?: readonly SpecialQiId[];
  /** The legacy daily refinement claim. */
  dailyClaim?: DaoClaimState;
  cultivation?: QiAccountState;
  isQiMenuOpen: boolean;
  setIsQiMenuOpen: (open: boolean) => void;
  activeQiTooltip: string | null;
  setActiveQiTooltip: (tooltip: string | null) => void;
  equippedArtifact: CosmicArtifact | undefined;
  currentPowerStage: string;
  currentStreak: number;
  isCracked: boolean;
  daysTo3: number;
  daysTo10: number;
  handleRepairPillar: () => Promise<void> | void;
  handleCheckIn: () => Promise<void> | void;
  handleAttuneArtifact: (artifactId: string) => Promise<void>;
}

export interface UserProfileServices extends Omit<DevelopmentUserProfileServices, 'useController'> {
  /** Production: `useUserProfile(props)` from `src/hooks/useUserProfile.ts`. */
  useController: (props: UserProfileControllerProps) => UserProfileController;
  /** Production: `submitCurrentWeekOfferings()` from `src/lib/artifacts.ts`. */
  submitCurrentWeekOfferings: () => Promise<{ qi: number; sectMerit: number }>;
}

const ReferenceUserProfileServicesContext = createContext<UserProfileServices | null>(null);

/** Mounts production's services for the locked reference pane. */
export function UserProfileServicesProvider({ services, children }: { services: UserProfileServices; children: React.ReactNode }) {
  return createElement(ReferenceUserProfileServicesContext.Provider, { value: services }, children);
}

export function useUserProfileServices(): UserProfileServices {
  const services = useContext(ReferenceUserProfileServicesContext);
  if (!services) {
    throw new Error('The locked reference profile requires the reference <UserProfileServicesProvider services={…}>.');
  }
  return services;
}

export type { ActiveStatusEffect, AppUser, Story, StorySeed, UserProfile };
