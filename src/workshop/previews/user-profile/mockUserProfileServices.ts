/**
 * The Workshop's local mock adapter for the User Profile services port.
 *
 * This file is the entire production boundary for the replica. Every service
 * the real page depends on is re-implemented here against in-memory state and
 * timers, and none of it lives inside the portable components:
 *
 * | Production dependency                                   | Mocked as |
 * | ------------------------------------------------------- | --------- |
 * | Firebase Auth (Google, Apple, or email)                  | `authenticate` flips the scenario's mock account on |
 * | `lib/persistence` (`getUserProfile` / `saveUserProfile`) | a local snapshot resolved on a timer |
 * | `lib/persistence` admin routes                           | the fixed registries in `previewData` |
 * | `services/profilePicture` (Gemini image generation)      | a stepped timer that resolves a locally drawn SVG |
 * | `services/profilePicturePersistence` (R2 upload/commit)  | an 800 ms delay, then a local `avatarUrl` write |
 * | `lib/artifacts.submitCurrentWeekOfferings`               | marks this week's pouch submitted and pays its rewards into the local profile |
 * | `lib/storySeedStorage` / `lib/storySeedFormat`           | the fixed seed list; export is logged, never downloaded |
 * | `lib/storage.performSync` / `lib/firebase` local-only    | logged as an excluded action |
 * | `useAppStore` (settings, shortcuts, import/export)       | logged as an excluded action |
 *
 * No network request is ever made, no secret or environment variable is read,
 * and nothing is written outside React state. The `error` scenario makes every
 * asynchronous service reject so the page's failure paths stay reachable.
 *
 * Everything else — the streak maths, the language-confirmation countdown, the
 * attunement and status-effect rules, the optimistic writing-style save and its
 * rollback — is reproduced from `SENSEIDUKES/Light-Novels`
 * `src/hooks/useUserProfile.ts` so the replica behaves like the real page.
 */

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DaoRankData,
  DaoClaimResult,
  UserProfileController,
  UserProfileControllerProps,
  UserProfileServices,
} from '../../../components/user-profile/shared/userProfileServices';
import type {
  AccountRole,
  ActiveStatusEffect,
  AdminStoryRow,
  AppUser,
  ChapterWritingStyle,
  PremiumTier,
  StorySeed,
  UserProfile,
} from '../../../components/user-profile/shared/types';
import { getDaoRankData } from '../../../components/user-profile/development/qi';
import { getCurrentOfferingWeekId } from '../../../components/user-profile/shared/offeringWeek';
import {
  MOCK_ACCOUNT,
  MOCK_ADMIN_STORIES,
  MOCK_ADMIN_USERS,
  PREVIEW_PORTRAIT_URL,
  getPreviewScenario,
} from './previewData';
import type { UserProfilePreviewState } from './previewStates';

/** How long the mocked profile snapshot takes to resolve. */
const PROFILE_LOAD_MS = 450;
/** Production's Divine Mirror step cadence, copied so the message rotation reads true. */
const PORTRAIT_STEP_MS = 2500;
/** Long enough to watch several generation steps, short enough to inspect repeatedly. */
const PORTRAIT_GENERATE_MS = 9000;
const PORTRAIT_APPLY_MS = 800;
const PROFILE_SAVE_MS = 600;
const ADMIN_FETCH_MS = 700;

const delay = (ms: number) => new Promise<void>(resolve => { setTimeout(resolve, ms); });

/** Local stand-in for `lib/id.generateId`. */
const generateId = (length: number): string =>
  Math.random().toString(36).slice(2, 2 + length).padEnd(length, '0');

export type ExcludedActionLogger = (action: string) => void;

export interface MockUserProfileServicesOptions {
  state: UserProfilePreviewState;
  claimMode?: 'success' | 'failed' | 'unresolved';
  profileOverride?: Partial<UserProfile>;
  unlockedSpecialQi?: readonly ('sect' | 'demonic')[];
  /** Records a production action the Workshop deliberately does not perform. */
  logExcludedAction: ExcludedActionLogger;
  /**
   * Links the mock account. The workspace owns `currentUser` (production owns it
   * in `App.tsx`), so "Link Spirit Realm" reports upward instead of touching
   * Firebase Auth.
   */
  onSignIn: (account: AppUser) => void;
}

export function createMockUserProfileServices({
  state,
  claimMode = state === 'claim-failed' ? 'failed' : state === 'claim-unresolved' ? 'unresolved' : 'success',
  profileOverride,
  unlockedSpecialQi,
  logExcludedAction,
  onSignIn,
}: MockUserProfileServicesOptions): UserProfileServices {
  const scenario = getPreviewScenario(state);

  /**
   * The scenario's seed index. It stands in for the account's PostgreSQL seed
   * rows and is thrown away when the scenario changes, because the workspace
   * remounts the pane on every state switch.
   */
  const seeds: StorySeed[] = scenario.seeds.map(seed => ({ ...seed }));

  const failIfScenarioFails = async (message: string) => {
    if (scenario.servicesFail) throw new Error(message);
  };

  /**
   * Production's `submitCurrentWeekOfferings` writes the account inventory and
   * the app store listener refreshes the page. The mock has no store, so the
   * controller registers a local handler here and the service calls it: the
   * pouch relics are marked submitted and their rewards land on the profile.
   */
  let submitOfferingsLocally: (() => { qi: number; sectMerit: number }) | null = null;

  const useController = (props: UserProfileControllerProps): UserProfileController => {
    const { currentUser, stories, onLogout, onNavigateHome } = props;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const profileRef = useRef<UserProfile | null>(null);
    const claimLock = useRef(false);
    const accountEpoch = useRef(0);
    const [claimPending, setClaimPending] = useState(false);
    const [claimResult, setClaimResult] = useState<DaoClaimResult>();
    const resultRef = useRef<DaoClaimResult | undefined>(undefined);
    const mounted = useRef(true);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    const [formData, setFormData] = useState<Partial<UserProfile>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(Boolean(currentUser));
    const [error, setError] = useState('');
    const colorInputRef = useRef<HTMLInputElement>(null);

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isQiMenuOpen, setIsQiMenuOpen] = useState(false);
    const [activeQiTooltip, setActiveQiTooltip] = useState<string | null>(null);

    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const [adminTab, setAdminTab] = useState<'users' | 'stories'>('users');
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [allStories, setAllStories] = useState<AdminStoryRow[]>([]);
    const [isFetchingAdminData, setIsFetchingAdminData] = useState(false);
    const [adminSearchQuery, setAdminSearchQuery] = useState('');
    const [adminError, setAdminError] = useState('');

    const [pendingLanguageChange, setPendingLanguageChange] = useState<
      UserProfileController['pendingLanguageChange']
    >(null);
    const [countdown, setCountdown] = useState(30);
    const [isSavingChapterWritingStyle, setIsSavingChapterWritingStyle] = useState(false);

    const [showPortraitModal, setShowPortraitModal] = useState(false);
    const [portraitUploadFile, setPortraitUploadFile] = useState<File | null>(null);
    const [portraitUploadBase64, setPortraitUploadBase64] = useState('');
    const [portraitDesc, setPortraitDesc] = useState('');
    const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
    const [isSavingPortrait, setIsSavingPortrait] = useState(false);
    const [generatedPortraitUrl, setGeneratedPortraitUrl] = useState('');
    const [portraitError, setPortraitError] = useState('');
    const [generationStep, setGenerationStep] = useState(0);

    // ---- Profile snapshot -------------------------------------------------
    // Production calls `getUserProfile(uid)` here. The mock resolves the
    // scenario's snapshot on a timer, hangs forever in the `loading` scenario,
    // and rejects in the `error` scenario.
    useEffect(() => {
      accountEpoch.current += 1;
      profileRef.current = null;
      claimLock.current = false;
      resultRef.current = undefined;
      setClaimPending(false);
      setClaimResult(undefined);
      if (!currentUser) {
        profileRef.current = null;
        setProfile(null);
        setFormData({});
        setIsLoading(false);
        return;
      }
      let cancelled = false;
      setIsLoading(true);
      if (scenario.profileNeverResolves) return () => { cancelled = true; };

      const timer = setTimeout(() => {
        if (cancelled) return;
        if (scenario.servicesFail) {
          setIsLoading(false);
          setError('Your celestial record could not be retrieved. The Akashic link is unstable.');
          return;
        }
        profileRef.current = scenario.profile ? { ...scenario.profile, ...profileOverride } : null;
        setProfile(profileRef.current);
        setFormData(profileRef.current ?? {});
        setIsLoading(false);
      }, PROFILE_LOAD_MS);

      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [currentUser]);

    // ---- Language safeguard countdown (production behaviour, verbatim) ----
    useEffect(() => {
      if (!pendingLanguageChange) return;
      if (countdown <= 0) {
        setFormData(previous => ({
          ...previous,
          preferredLanguage: pendingLanguageChange.prevPreferred,
          defaultTranslationLanguage: pendingLanguageChange.prevTranslation,
        }));
        setPendingLanguageChange(null);
        return;
      }
      const timer = setTimeout(() => setCountdown(value => value - 1), 1000);
      return () => clearTimeout(timer);
    }, [countdown, pendingLanguageChange]);

    const commitProfile = useCallback((next: UserProfile) => {
      profileRef.current = next;
      setProfile(next);
      setFormData(previous => ({ ...previous, ...next }));
    }, []);

    // ---- Derived cultivation values (production behaviour, verbatim) ------
    const userStories = stories.filter(story => story.userId === currentUser?.uid || !story.userId);
    const inactiveFlowIds = profile?.inactiveStories || [];
    const activeFlows = userStories.filter(story => !inactiveFlowIds.includes(story.id));
    const activeStoriesCount = activeFlows.length;

    const currentStreak = profile?.daoPillarStreak ?? profile?.writingStreak ?? 0;
    const isCracked = profile?.daoPillarCracked || false;
    const daysTo3 = currentStreak === 0 ? 3 : (currentStreak % 3 === 0 ? 3 : 3 - (currentStreak % 3));
    const daysTo10 = currentStreak === 0 ? 10 : (currentStreak % 10 === 0 ? 10 : 10 - (currentStreak % 10));

    const daoData = getDaoRankData(profile?.dao_xp ?? profile?.qi ?? 0) as DaoRankData;
    const equippedArtifact = profile?.cosmicInventory?.find(
      artifact => artifact.id === profile?.equippedArtifactId,
    );
    // Production reads this off the active story's narrative memory. No story
    // graph exists in the Workshop, so the portrait modal gets a fixed stage.
    const currentPowerStage = profile ? 'Ninth Ash Refinement' : '';

    // ---- Editing ----------------------------------------------------------
    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(previous => ({ ...previous, [event.target.name]: event.target.value }));
      },
      [],
    );

    const performSave = useCallback(
      async (preferredLanguage: string, defaultTranslationLanguage: string) => {
        if (!profile) return;
        const epoch = accountEpoch.current;
        // Apply only edits made in this form. An in-flight daily claim may
        // update cultivation and lastReadDate before this save finishes.
        const changes = Object.fromEntries(Object.entries(formData).filter(
          ([key, value]) => value !== profile[key as keyof UserProfile],
        ));
        setError('');
        try {
          await failIfScenarioFails('Your changes could not be etched into the matrix. Please retry.');
          await delay(PROFILE_SAVE_MS);
          if (!mounted.current || epoch !== accountEpoch.current || !profileRef.current) return;
          commitProfile({
            ...profileRef.current,
            ...changes,
            preferredLanguage,
            defaultTranslationLanguage,
            updatedAt: new Date().toISOString(),
          } as UserProfile);
          setIsEditing(false);
        } catch (saveError) {
          setError(saveError instanceof Error ? saveError.message : 'Failed to save profile.');
        }
      },
      [commitProfile, formData, profile],
    );

    const handleSave = useCallback(async () => {
      if (!currentUser || !profile) return;
      const isLangChanged =
        formData.preferredLanguage !== profile.preferredLanguage
        || formData.defaultTranslationLanguage !== profile.defaultTranslationLanguage;

      if (isLangChanged && !pendingLanguageChange) {
        setPendingLanguageChange({
          preferred: formData.preferredLanguage || 'English',
          translation: formData.defaultTranslationLanguage || 'English',
          prevPreferred: profile.preferredLanguage || 'English',
          prevTranslation: profile.defaultTranslationLanguage || 'English',
        });
        setCountdown(30);
        return;
      }
      await performSave(
        formData.preferredLanguage || 'English',
        formData.defaultTranslationLanguage || 'English',
      );
    }, [currentUser, formData, pendingLanguageChange, performSave, profile]);

    const handleLanguageChangeDirect = useCallback(
      (name: 'preferredLanguage' | 'defaultTranslationLanguage', value: string) => {
        if (!profile) return;
        const nextPreferred =
          name === 'preferredLanguage'
            ? value
            : formData.preferredLanguage || profile.preferredLanguage || 'English';
        const nextTranslation =
          name === 'defaultTranslationLanguage'
            ? value
            : formData.defaultTranslationLanguage || profile.defaultTranslationLanguage || 'English';

        setFormData(previous => ({ ...previous, [name]: value }));

        if (!pendingLanguageChange) {
          setPendingLanguageChange({
            preferred: nextPreferred,
            translation: nextTranslation,
            prevPreferred: profile.preferredLanguage || 'English',
            prevTranslation: profile.defaultTranslationLanguage || 'English',
          });
          setCountdown(30);
        }
      },
      [formData, pendingLanguageChange, profile],
    );

    const confirmLanguageChange = useCallback(() => {
      if (!pendingLanguageChange) return;
      const pending = pendingLanguageChange;
      setPendingLanguageChange(null);
      void performSave(pending.preferred, pending.translation);
    }, [pendingLanguageChange, performSave]);

    const revertLanguageChange = useCallback(() => {
      if (!pendingLanguageChange) return;
      setFormData(previous => ({
        ...previous,
        preferredLanguage: pendingLanguageChange.prevPreferred,
        defaultTranslationLanguage: pendingLanguageChange.prevTranslation,
      }));
      setPendingLanguageChange(null);
    }, [pendingLanguageChange]);

    const handleDefaultChapterWritingStyleChange = useCallback(
      async (value: ChapterWritingStyle) => {
        if (!profile || isSavingChapterWritingStyle) return;
        const previousStyle = profile.defaultChapterWritingStyle || 'Standard';
        if (value === previousStyle) return;

        const optimistic: UserProfile = {
          ...profile,
          defaultChapterWritingStyle: value,
          updatedAt: new Date().toISOString(),
        };
        commitProfile(optimistic);
        setIsSavingChapterWritingStyle(true);
        setError('');
        try {
          await failIfScenarioFails('Failed to save the default chapter writing style.');
          await delay(PROFILE_SAVE_MS);
        } catch (saveError) {
          commitProfile({ ...optimistic, defaultChapterWritingStyle: previousStyle });
          setError(
            saveError instanceof Error
              ? saveError.message
              : 'Failed to save the default chapter writing style.',
          );
        } finally {
          setIsSavingChapterWritingStyle(false);
        }
      },
      [commitProfile, isSavingChapterWritingStyle, profile],
    );

    // ---- Divine Mirror portrait ------------------------------------------
    const handleFileChange = useCallback((file: File) => {
      // Production does exactly this before uploading. The read stays local:
      // the base64 never leaves the browser in the Workshop.
      if (!file.type.startsWith('image/')) {
        setPortraitError('The Divine Mirror only accepts visual images.');
        return;
      }
      setPortraitError('');
      setPortraitUploadFile(file);
      const reader = new FileReader();
      reader.onload = () => setPortraitUploadBase64(reader.result as string);
      reader.onerror = () => setPortraitError('Failed to read mortal image stream.');
      reader.readAsDataURL(file);
    }, []);

    const handleDrag = useCallback((event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
    }, []);

    const handleDrop = useCallback(
      (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer.files && event.dataTransfer.files[0]) {
          handleFileChange(event.dataTransfer.files[0]);
        }
      },
      [handleFileChange],
    );

    const handleGeneratePortrait = useCallback(async () => {
      setIsGeneratingPortrait(true);
      setPortraitError('');
      setGeneratedPortraitUrl('');
      setGenerationStep(0);

      // Production advances the same six messages on this cadence while the
      // image model runs. Here the cadence is real and the image is local.
      const stepTimer = setInterval(() => {
        setGenerationStep(previous => (previous < 5 ? previous + 1 : previous));
      }, PORTRAIT_STEP_MS);

      try {
        await failIfScenarioFails('Celestial connection timed out. Please retry.');
        await delay(PORTRAIT_GENERATE_MS);
        setGeneratedPortraitUrl(portraitUploadBase64 || PREVIEW_PORTRAIT_URL);
      } catch (generateError) {
        setPortraitError(
          generateError instanceof Error
            ? generateError.message
            : 'Celestial connection timed out. Please retry.',
        );
      } finally {
        clearInterval(stepTimer);
        setIsGeneratingPortrait(false);
      }
    }, [portraitUploadBase64]);

    const handleApplyPortrait = useCallback(async () => {
      if (!generatedPortraitUrl || isSavingPortrait || !profile) return;
      const epoch = accountEpoch.current;
      setIsSavingPortrait(true);
      setPortraitError('');
      try {
        // Production uploads to R2 and commits the asset descriptor here.
        await failIfScenarioFails('The portrait could not be sealed to your record.');
        await delay(PORTRAIT_APPLY_MS);
        if (!mounted.current || epoch !== accountEpoch.current || !profileRef.current) return;
        commitProfile({
          ...profileRef.current,
          avatarUrl: generatedPortraitUrl,
          activePortraitId: `portrait_${generateId(8)}`,
          updatedAt: new Date().toISOString(),
        });
        setShowPortraitModal(false);
        setGeneratedPortraitUrl('');
        setPortraitUploadFile(null);
        setPortraitUploadBase64('');
      } catch (applyError) {
        setPortraitError(
          applyError instanceof Error ? applyError.message : 'Failed to seal the portrait.',
        );
      } finally {
        setIsSavingPortrait(false);
      }
    }, [commitProfile, generatedPortraitUrl, isSavingPortrait, profile]);

    // ---- Akashic Switchboard ---------------------------------------------
    const fetchAdminData = useCallback(async () => {
      setIsFetchingAdminData(true);
      setAdminError('');
      try {
        await failIfScenarioFails(
          'Failed to fetch admin data. Check security rules or authentication.',
        );
        await delay(ADMIN_FETCH_MS);
        setAllUsers(MOCK_ADMIN_USERS.map(user => ({ ...user })));
        setAllStories(MOCK_ADMIN_STORIES.filter(story => !story.deleted).map(story => ({ ...story })));
      } catch (adminFetchError) {
        setAdminError(
          adminFetchError instanceof Error ? adminFetchError.message : 'Failed to fetch admin data.',
        );
      } finally {
        setIsFetchingAdminData(false);
      }
    }, []);

    useEffect(() => {
      if (isAdminPanelOpen) void fetchAdminData();
    }, [fetchAdminData, isAdminPanelOpen]);

    const handleUpdateUserRole = useCallback((uid: string, role: AccountRole) => {
      setAllUsers(previous => previous.map(user => (user.uid === uid ? { ...user, role } : user)));
    }, []);

    const handleUpdateUserTier = useCallback((uid: string, premiumTier: PremiumTier) => {
      setAllUsers(previous =>
        previous.map(user => (user.uid === uid ? { ...user, premiumTier } : user)),
      );
    }, []);

    const handleDeleteStoryAdmin = useCallback((storyId: string) => {
      // Production confirms, then deletes the story and its chapters from the
      // cloud. The Workshop keeps the confirmation and drops the row locally.
      if (
        !window.confirm(
          'Remove this story and its chapter content from the cloud? A deletion marker will remain so offline devices cannot restore it.',
        )
      ) {
        return;
      }
      logExcludedAction(`Admin story deletion (${storyId}) — local list only`);
      setAllStories(previous => previous.filter(story => story.id !== storyId));
    }, []);

    // ---- Dao Pillar (existing rules, explicit local claim outcomes) -----------------------
    const handleRepairPillar = useCallback(() => {
      const profile = profileRef.current;
      if (!profile || !profile.daoPillarCracked || claimLock.current || resultRef.current?.outcome === 'unresolved') return;
      const repairCost = 50;
      const currentQiVal = profile.heavenly_qi !== undefined ? profile.heavenly_qi : (profile.qi || 0);
      if (currentQiVal >= repairCost) {
        commitProfile({
          ...profile,
          qi: Math.max(0, (profile.qi || 0) - repairCost),
          dao_xp: Math.max(0, (profile.dao_xp ?? profile.qi ?? 0) - repairCost),
          heavenly_qi: Math.max(0, currentQiVal - repairCost),
          daoPillarCracked: false,
          daoPillarStreak: currentStreak > 0 ? currentStreak : 1,
        });
        setError('');
      } else {
        setError('Insufficient Heavenly Qi to repair Dao Pillar (Requires 50).');
      }
    }, [commitProfile, currentStreak, profile]);

    const claim = useCallback(async (): Promise<DaoClaimResult> => {
      if (claimLock.current) return { outcome: 'blocked', message: 'Collection is already pending.' };
      if (resultRef.current?.outcome === 'unresolved') return resultRef.current;
      const finish = (outcome: DaoClaimResult['outcome'], message: string) => {
        const result = { outcome, message };
        resultRef.current = result;
        if (mounted.current) setClaimResult(result);
        return result;
      };
      const epoch = accountEpoch.current;
      const accountId = profileRef.current?.uid;
      if (!accountId) return finish('blocked', 'Profile unavailable.');
      claimLock.current = true;
      setClaimPending(true);
      try {
        await delay(PROFILE_SAVE_MS);
        const profile = profileRef.current;
        if (!mounted.current || epoch !== accountEpoch.current || !profile || profile.uid !== accountId) return { outcome: 'blocked', message: 'Profile changed.' };
        if (claimMode === 'failed') return finish('failed', 'Collection failed. Please try again.');
        if (claimMode === 'unresolved') return finish('unresolved', 'Collection could not be confirmed. Awaiting claim status.');
        const todayStr = new Date().toISOString().split('T')[0];
        const lastReadStr = profile.lastReadDate;

        let newStreak = profile.daoPillarStreak || 0;
        let cracked = profile.daoPillarCracked || false;

        if (cracked) {
          return finish('blocked', 'Your Dao Pillar is cracked. Repair it first.');
        }
        if (lastReadStr === todayStr) {
          return finish('already-collected', 'Collected Today');
        }

        if (lastReadStr) {
          const lastReadDate = new Date(`${lastReadStr}T00:00:00`);
          const todayDate = new Date(`${todayStr}T00:00:00`);
          const diffDays = Math.round(
            (todayDate.getTime() - lastReadDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (diffDays === 1) {
            newStreak += 1;
          } else {
            if (newStreak >= 7) cracked = true;
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }

        let qiBonus = 5;
        if (newStreak % 10 === 0) qiBonus += 100;
        else if (newStreak % 3 === 0) qiBonus += 20;

        const currentQiVal = profile.heavenly_qi !== undefined ? profile.heavenly_qi : (profile.qi || 0);
        commitProfile({
          ...profile,
          lastReadDate: todayStr,
          daoPillarStreak: newStreak,
          daoPillarCracked: cracked,
          qi: (profile.qi || 0) + qiBonus,
          dao_xp: (profile.dao_xp ?? profile.qi ?? 0) + qiBonus,
          heavenly_qi: currentQiVal + qiBonus,
          updatedAt: new Date().toISOString(),
        });
        setError('');
        return finish('claimed', `Cultivation collected: +${qiBonus} Qi.`);
      } catch {
        return finish('unresolved', 'Collection could not be confirmed. Awaiting claim status.');
      } finally {
        if (epoch === accountEpoch.current) {
          claimLock.current = false;
          if (mounted.current) setClaimPending(false);
        }
      }
    }, [commitProfile]);
    const reconcile = useCallback(async (): Promise<DaoClaimResult> => {
      if (claimLock.current) return { outcome: 'blocked', message: 'Collection is already pending.' };
      // This local adapter knows unresolved simulation never committed. A real
      // host must read authoritative claim state here, never issue another award.
      const today = new Date().toISOString().split('T')[0];
      const result: DaoClaimResult = profileRef.current?.lastReadDate === today
        ? { outcome: 'already-collected', message: 'Collected Today' }
        : { outcome: 'failed', message: 'No collection was recorded. You can try again.' };
      resultRef.current = result;
      setClaimResult(result);
      return result;
    }, []);
    const handleCheckIn = useCallback(async () => { await claim(); }, [claim]);

    // ---- Attunement (production behaviour, verbatim) -----------------------
    const handleAttuneArtifact = useCallback(
      async (artifactId: string) => {
        if (!profile) return;
        const isAttuned = profile.equippedArtifactId === artifactId;
        const nextAttunementId = isAttuned ? '' : artifactId;
        let updatedActiveEffects: ActiveStatusEffect[] = [...(profile.activeStatusEffects || [])];

        if (isAttuned) {
          updatedActiveEffects = updatedActiveEffects.filter(
            effect => effect.sourceArtifactId !== artifactId,
          );
        } else {
          if (profile.equippedArtifactId) {
            updatedActiveEffects = updatedActiveEffects.filter(
              effect => effect.sourceArtifactId !== profile.equippedArtifactId,
            );
          }
          const artifactToEquip = profile.cosmicInventory?.find(
            artifact => artifact.id === artifactId,
          );
          if (artifactToEquip?.statusEffectDef) {
            const newType = artifactToEquip.statusEffectDef.type;
            updatedActiveEffects = updatedActiveEffects.filter(
              effect => effect.effectDef.type !== newType,
            );
            updatedActiveEffects.push({
              id: `effect_${Date.now()}_${generateId(7)}`,
              appliedAt: new Date().toISOString(),
              expiresAt: new Date(
                Date.now() + (artifactToEquip.statusEffectDef.durationMs || 0),
              ).toISOString(),
              effectDef: artifactToEquip.statusEffectDef,
              sourceArtifactId: artifactId,
            });
          }
        }

        commitProfile({
          ...profile,
          equippedArtifactId: nextAttunementId,
          activeStatusEffects: updatedActiveEffects,
          updatedAt: new Date().toISOString(),
        });
      },
      [commitProfile, profile],
    );

    // ---- Weekly offerings (local stand-in for `lib/artifacts`) -------------
    useEffect(() => {
      submitOfferingsLocally = () => {
        if (!profile) return { qi: 0, sectMerit: 0 };
        const currentWeek = getCurrentOfferingWeekId();
        const now = new Date().toISOString();
        let qi = 0;
        let sectMerit = 0;
        const cosmicInventory = (profile.cosmicInventory || []).map(artifact => {
          const inPouch =
            artifact.status === 'unsubmitted'
            || (!artifact.status && artifact.offeringWeekId === currentWeek);
          if (!inPouch) return artifact;
          qi += artifact.rewardValueQi || 0;
          sectMerit += artifact.rewardValueSectMerit || 0;
          return { ...artifact, status: 'submitted' as const, gatheredAt: now };
        });
        const currentQiVal = profile.heavenly_qi !== undefined ? profile.heavenly_qi : (profile.qi || 0);
        commitProfile({
          ...profile,
          cosmicInventory,
          qi: (profile.qi || 0) + qi,
          dao_xp: (profile.dao_xp || 0) + qi,
          heavenly_qi: currentQiVal + qi,
          sect_qi: (profile.sect_qi || 0) + sectMerit,
          updatedAt: now,
        });
        return { qi, sectMerit };
      };
      return () => {
        submitOfferingsLocally = null;
      };
    }, [commitProfile, profile]);

    // ---- Auth and app-shell actions the Workshop excludes -----------------
    const handleLogin = useCallback(() => {
      logExcludedAction('Google sign-in — mock account linked locally instead');
      onSignIn(MOCK_ACCOUNT);
    }, []);

    return {
      syncStatus: scenario.servicesFail ? 'error' : 'idle',
      lastSavedTime: profile ? new Date(profile.updatedAt) : null,
      setIsSettingsOpen: open => {
        if (open) logExcludedAction('Aether Router settings modal (production app shell)');
      },
      setIsShortcutsOpen: open => {
        if (open) logExcludedAction('Shortcuts manual modal (production app shell)');
      },
      handleExportLibrary: () => logExcludedAction('Library backup export (production app shell)'),
      handleImportLibrary: () => logExcludedAction('Library scroll import (production app shell)'),

      profile,
      formData,
      setFormData,
      isEditing,
      setIsEditing,
      isLoading,
      error,
      colorInputRef,
      handleChange,
      handleSave,

      showAdvanced,
      setShowAdvanced,
      isQiMenuOpen,
      setIsQiMenuOpen,
      activeQiTooltip,
      setActiveQiTooltip,

      isAdminPanelOpen,
      setIsAdminPanelOpen,
      adminTab,
      setAdminTab,
      allUsers,
      allStories,
      isFetchingAdminData,
      adminSearchQuery,
      setAdminSearchQuery,
      adminError,
      fetchAdminData: () => void fetchAdminData(),
      handleUpdateUserRole,
      handleUpdateUserTier,
      handleDeleteStoryAdmin,

      pendingLanguageChange,
      countdown,
      confirmLanguageChange,
      revertLanguageChange,
      handleLanguageChangeDirect,

      handleDefaultChapterWritingStyleChange,
      isSavingChapterWritingStyle,

      showPortraitModal,
      setShowPortraitModal,
      portraitUploadFile,
      setPortraitUploadFile,
      portraitUploadBase64,
      setPortraitUploadBase64,
      portraitDesc,
      setPortraitDesc,
      isGeneratingPortrait,
      isSavingPortrait,
      generatedPortraitUrl,
      portraitError,
      generationStep,
      handleFileChange,
      handleDrag,
      handleDrop,
      handleGeneratePortrait,
      handleApplyPortrait,

      handleLogin,

      daoData,
      equippedArtifact,
      currentPowerStage,
      activeStoriesCount,
      currentStreak,
      isCracked,
      daysTo3,
      daysTo10,
      handleRepairPillar,
      handleCheckIn,
      dailyClaim: { pending: claimPending, result: claimResult, claim, reconcile },
      unlockedSpecialQi: unlockedSpecialQi ?? scenario.unlockedSpecialQi,
      handleAttuneArtifact,

      storageType: 'workshop-memory',
      activeStoryId: stories[0]?.id ?? null,
      routingConfig: null,
    };
  };

  return {
    authenticate: attempt => {
      logExcludedAction(`${attempt.provider} sign-in — mock account linked locally instead`);
      onSignIn(MOCK_ACCOUNT);
    },
    useController,

    localOnlyMode: scenario.localOnlyMode,
    setLocalOnlyMode: next =>
      logExcludedAction(`Firebase local-only mode → ${String(next)} (production build flag)`),
    requestLibrarySync: () => logExcludedAction('Deep library sync (production storage layer)'),

    submitCurrentWeekOfferings: async () => {
      await failIfScenarioFails('This week’s offerings could not be submitted.');
      await delay(900);
      return submitOfferingsLocally?.() ?? { qi: 0, sectMerit: 0 };
    },

    listStorySeeds: async () => {
      await failIfScenarioFails('Story seeds are temporarily unavailable.');
      await delay(500);
      return seeds.map(seed => ({ ...seed }));
    },

    downloadStorySeed: async seed => {
      await failIfScenarioFails('That seed could not be exported.');
      logExcludedAction(`Story seed JSON download (${seed.title})`);
    },

    downloadStorySeedCollection: async list => {
      await failIfScenarioFails('Your story seeds could not be exported.');
      logExcludedAction(`Story seed collection download (${list.length} seeds)`);
    },
  };
}
