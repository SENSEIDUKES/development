import { isSameAssetId } from '../contracts/assetIdentity';
import type { AppUser, UserProfile } from '../types';
import { normalizeChapterWritingStyle } from './chapterWritingStyle';
import { resolveMediaAssetForDisplay } from './media/privateMediaResolver';

const ACCOUNT_PROFILE_CACHE_PREFIX = 'seihouse-account-profile-cache-v1:';

type CachedAccountProfile = Pick<
  UserProfile,
  | 'uid'
  | 'username'
  | 'displayName'
  | 'avatarUrl'
  | 'preferredLanguage'
  | 'defaultTranslationLanguage'
  | 'defaultChapterWritingStyle'
  | 'joinedDate'
  | 'updatedAt'
> & Partial<Pick<
  UserProfile,
  | 'displayNameColor'
  | 'activePortraitId'
  | 'avatarMediaDescriptor'
  | 'dao_xp'
  | 'dao_rank'
  | 'qi'
  | 'heavenly_qi'
  | 'sect_qi'
>>;

const cacheKey = (uid: string) => `${ACCOUNT_PROFILE_CACHE_PREFIX}${encodeURIComponent(uid)}`;

const isCachedAccountProfile = (value: unknown, uid: string): value is CachedAccountProfile => {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Partial<CachedAccountProfile>;
  return profile.uid === uid
    && typeof profile.username === 'string'
    && typeof profile.displayName === 'string'
    && typeof profile.avatarUrl === 'string'
    && typeof profile.preferredLanguage === 'string'
    && typeof profile.defaultTranslationLanguage === 'string'
    && typeof profile.joinedDate === 'string'
    && typeof profile.updatedAt === 'string';
};

export const cacheAccountProfile = (profile: UserProfile): void => {
  const cachedProfile: CachedAccountProfile = {
    uid: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    // Private R2 delivery URLs expire and must be refreshed from PostgreSQL/R2.
    // Cache only non-portrait identity avatars; the asset ID remains canonical.
    avatarUrl: profile.activePortraitId ? '' : profile.avatarUrl,
    preferredLanguage: profile.preferredLanguage,
    defaultTranslationLanguage: profile.defaultTranslationLanguage,
    defaultChapterWritingStyle: profile.defaultChapterWritingStyle,
    joinedDate: profile.joinedDate,
    updatedAt: profile.updatedAt,
    displayNameColor: profile.displayNameColor,
    activePortraitId: profile.activePortraitId,
    avatarMediaDescriptor: profile.avatarMediaDescriptor
      ? { ...profile.avatarMediaDescriptor, deliveryUrl: '' }
      : undefined,
    dao_xp: profile.dao_xp,
    dao_rank: profile.dao_rank,
    qi: profile.qi,
    heavenly_qi: profile.heavenly_qi,
    sect_qi: profile.sect_qi,
  };

  try {
    localStorage.setItem(cacheKey(profile.uid), JSON.stringify(cachedProfile));
  } catch (error) {
    console.warn('Failed to cache account profile:', error);
  }
};

export const readCachedAccountProfile = (uid: string): CachedAccountProfile | null => {
  try {
    const serializedProfile = localStorage.getItem(cacheKey(uid));
    if (!serializedProfile) return null;
    const profile: unknown = JSON.parse(serializedProfile);
    return isCachedAccountProfile(profile, uid) ? profile : null;
  } catch (error) {
    console.warn('Failed to read cached account profile:', error);
    return null;
  }
};

export const createAccountProfileFallback = (user: AppUser): UserProfile => {
  const cachedProfile = readCachedAccountProfile(user.uid);
  const now = new Date().toISOString();

  return {
    uid: user.uid,
    username: cachedProfile?.username || user.email?.split('@')[0] || `user_${user.uid.substring(0, 5)}`,
    displayName: cachedProfile?.displayName || user.displayName || '',
    displayNameColor: cachedProfile?.displayNameColor,
    avatarUrl: cachedProfile?.activePortraitId
      ? ''
      : user.photoURL || cachedProfile?.avatarUrl || '',
    activePortraitId: cachedProfile?.activePortraitId,
    avatarMediaDescriptor: cachedProfile?.avatarMediaDescriptor,
    preferredLanguage: cachedProfile?.preferredLanguage || 'English',
    defaultTranslationLanguage: cachedProfile?.defaultTranslationLanguage || 'English',
    defaultChapterWritingStyle: normalizeChapterWritingStyle(
      cachedProfile?.defaultChapterWritingStyle,
    ),
    savedStoryCount: 0,
    activeStories: [],
    inactiveStories: [],
    joinedDate: cachedProfile?.joinedDate || now,
    updatedAt: cachedProfile?.updatedAt || now,
    // The offline placeholder never claims an elevated role: every admin
    // surface it would unlock is authorized against PostgreSQL, which assigns
    // the role from the verified ID-token email.
    role: 'user',
    premiumTier: 'mortal',
    dao_xp: cachedProfile?.dao_xp,
    dao_rank: cachedProfile?.dao_rank,
    qi: cachedProfile?.qi,
    heavenly_qi: cachedProfile?.heavenly_qi,
    sect_qi: cachedProfile?.sect_qi,
  };
};

/**
 * Restore the identity avatar a PostgreSQL profile cannot carry.
 *
 * Firebase Authentication stayed the identity authority after the migration,
 * and the `UserProfile` table deliberately has no identity-avatar column, so
 * the profile read always answers `avatarUrl: ''`. Applying that snapshot
 * verbatim replaced the Google account photo the sign-in had already rendered,
 * which is why it appeared for a second and then vanished. A committed
 * Celestial Portrait still wins: it is the asset the account selected.
 */
export const withIdentityAvatar = (
  profile: UserProfile,
  user: AppUser | null,
): UserProfile => {
  if (profile.activePortraitId) return profile;
  const identityAvatar = user?.photoURL
    || profile.avatarUrl
    || readCachedAccountProfile(profile.uid)?.avatarUrl
    || '';
  return identityAvatar !== profile.avatarUrl
    ? { ...profile, avatarUrl: identityAvatar }
    : profile;
};

export const hydrateCachedAccountPortrait = async (
  profile: UserProfile,
): Promise<UserProfile> => {
  const descriptor = profile.avatarMediaDescriptor;
  if (!descriptor || !isSameAssetId(descriptor.id, profile.activePortraitId)) return profile;
  try {
    const resolved = await resolveMediaAssetForDisplay(descriptor, profile.uid);
    return {
      ...profile,
      avatarUrl: resolved.url,
      avatarMediaDescriptor: { ...resolved.descriptor, deliveryUrl: '' },
    };
  } catch {
    return profile;
  }
};
