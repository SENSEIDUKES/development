import { auth } from './firebase';
import { checkAndAwardRankArtifacts } from './artifacts';
import type { ActiveStatusEffect, UserProfile } from '../types';
import { useAppStore } from '../store/useAppStore';
import { getUserProfile, saveUserProfile } from './persistence';
import { cacheAccountProfile } from './userProfileCache';
import {
  MAX_IDLE_QI_REWARD,
  isIdleBaselineClaimed,
  markIdleBaselineClaimed,
} from './closedDoorCultivation';

interface PendingProfileSync {
  updates: Partial<UserProfile>;
  timeout: ReturnType<typeof setTimeout> | null;
}

const pendingProfileSyncs = new Map<string, PendingProfileSync>();
const profileSyncInFlight = new Map<string, Promise<void>>();
const cultivationAwardInFlight = new Map<string, Promise<unknown>>();

function queueCultivationAward<T>(uid: string, award: () => Promise<T>): Promise<T> {
  const previous = cultivationAwardInFlight.get(uid) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(award);
  cultivationAwardInFlight.set(uid, current);
  const cleanup = () => {
    if (cultivationAwardInFlight.get(uid) === current) {
      cultivationAwardInFlight.delete(uid);
    }
  };
  // then/catch-style cleanup so a rejecting award never floats an unhandled rejection.
  void current.then(cleanup, cleanup);
  return current;
}

function getStoreProfile() {
  if (typeof useAppStore.getState === 'function') {
    return useAppStore.getState()?.userProfile ?? null;
  }
  return (useAppStore as any)?.userProfile ?? null;
}

function updateStoreProfile(profileData: any) {
  if (typeof useAppStore.getState === 'function') {
    const store = useAppStore.getState();
    if (store && typeof store.setUserProfile === 'function') {
      store.setUserProfile(profileData);
      return;
    }
  }
  if (typeof (useAppStore as any).setState === 'function') {
    (useAppStore as any).setState({ userProfile: profileData });
  }
}

async function getAuthoritativeCultivationProfile(uid: string): Promise<UserProfile | null> {
  const storeProfile = getStoreProfile();
  if (
    storeProfile?.uid === uid
    && Array.isArray(storeProfile.activeStatusEffects)
  ) {
    return storeProfile;
  }

  const stored = await getUserProfile();
  if (auth.currentUser?.uid !== uid || stored?.uid !== uid) return null;
  updateStoreProfile(stored);
  cacheAccountProfile(stored);
  return stored;
}

function scheduleProfileSync(uid: string, delayMs = 2000) {
  const pending = pendingProfileSyncs.get(uid);
  if (!pending) return;
  if (pending.timeout) clearTimeout(pending.timeout);
  pending.timeout = setTimeout(() => {
    void flushPendingProfileSync(uid);
  }, delayMs);
}

async function flushProfileSyncForUid(uid: string, keepalive: boolean): Promise<void> {
  const previous = profileSyncInFlight.get(uid) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(async () => {
    const pending = pendingProfileSyncs.get(uid);
    if (!pending || auth.currentUser?.uid !== uid) return;

    pendingProfileSyncs.delete(uid);
    if (pending.timeout) clearTimeout(pending.timeout);

    try {
      await saveUserProfile(
        { uid, ...pending.updates },
        { keepalive },
      );
    } catch (err) {
      // Preserve the newest absolute cultivation snapshot for a later retry
      // instead of silently dropping progress on a transient failure.
      const newer = pendingProfileSyncs.get(uid);
      pendingProfileSyncs.set(uid, {
        updates: {
          ...pending.updates,
          ...newer?.updates,
        },
        timeout: newer?.timeout ?? null,
      });
      if (auth.currentUser?.uid === uid && !keepalive) {
        scheduleProfileSync(uid, 5000);
      }
      console.error('Failed to sync XP to cloud during flush', err);
    }
  });

  profileSyncInFlight.set(uid, current);
  void current.finally(() => {
    if (profileSyncInFlight.get(uid) === current) {
      profileSyncInFlight.delete(uid);
    }
  });
  return current;
}

export async function flushPendingProfileSync(
  uid?: string,
  options: { keepalive?: boolean } = {},
) {
  const uids = uid ? [uid] : Array.from(pendingProfileSyncs.keys());
  await Promise.all(uids.map(pendingUid => (
    flushProfileSyncForUid(pendingUid, options.keepalive === true)
  )));
}

function queueProfileSync(updates: Partial<UserProfile>, uid: string) {
  const pending = pendingProfileSyncs.get(uid);
  if (pending) {
    pending.updates = { ...pending.updates, ...updates };
  } else {
    pendingProfileSyncs.set(uid, {
      updates: { ...updates },
      timeout: null,
    });
  }

  scheduleProfileSync(uid);
}

if (typeof window !== 'undefined') {
  const flushActiveProfileOnTeardown = () => {
    const uid = auth.currentUser?.uid;
    if (uid) void flushPendingProfileSync(uid, { keepalive: true });
  };
  window.addEventListener('beforeunload', flushActiveProfileOnTeardown);
  window.addEventListener('pagehide', flushActiveProfileOnTeardown);
}

export const DAO_RANKS = [
  { threshold: 0, name: 'Mortal Reader' },
  { threshold: 100, name: 'Wandering Disciple' },
  { threshold: 300, name: 'Outer Sect Scribe' },
  { threshold: 750, name: 'Inner Sect Scholar' },
  { threshold: 1500, name: 'Dao Adept' },
  { threshold: 3000, name: 'Spirit Author' },
  { threshold: 6000, name: 'Heavenly Chronicler' },
  { threshold: 12000, name: 'Sage of Branching Paths' },
  { threshold: 25000, name: 'Dao Master' }
];

export function getDaoRankData(qi: number = 0) {
  let currentTitle = DAO_RANKS[0].name;
  let nextThreshold = DAO_RANKS[1].threshold;
  let nextTitle = DAO_RANKS[1].name;
  let previousThreshold = DAO_RANKS[0].threshold;

  for (let i = 0; i < DAO_RANKS.length; i++) {
    if (qi >= DAO_RANKS[i].threshold) {
      currentTitle = DAO_RANKS[i].name;
      previousThreshold = DAO_RANKS[i].threshold;
      if (i + 1 < DAO_RANKS.length) {
        nextThreshold = DAO_RANKS[i+1].threshold;
        nextTitle = DAO_RANKS[i+1].name;
      } else {
        nextThreshold = null as any;
        nextTitle = null as any;
      }
    }
  }

  const progress = nextThreshold ? ((qi - previousThreshold) / (nextThreshold - previousThreshold)) * 100 : 100;
  
  return {
     rank: currentTitle,
     nextRank: nextTitle,
     progress: Math.min(Math.max(progress, 0), 100),
     maxQi: nextThreshold,
     currentQi: qi
  };
}

export type QiEvent = 
  | 'chapter_read'
  | 'chapter_finished'
  | 'chapter_generated'
  | 'world_created'
  | 'chapter_sealed'
  | 'branch_created'
  | 'branch_published'
  | 'story_liked'
  | 'streak_reward_3'
  | 'streak_reward_10';

const QI_VALUES: Record<QiEvent, number> = {
  chapter_read: 2,
  chapter_finished: 5,
  chapter_generated: 10,
  world_created: 25,
  chapter_sealed: 15,
  branch_created: 30,
  branch_published: 50,
  story_liked: 5,
  streak_reward_3: 20,
  streak_reward_10: 100
};

const SECT_QI_VALUES: Record<QiEvent, number> = {
  chapter_read: 2,
  chapter_finished: 5,
  chapter_generated: 10,
  world_created: 25,
  chapter_sealed: 15,
  branch_created: 30,
  branch_published: 50,
  story_liked: 5,
  streak_reward_3: 20,
  streak_reward_10: 100
};

const DAILY_CAPS: Partial<Record<QiEvent, number>> = {
  chapter_read: 20, // max 20 times a day
  chapter_finished: 10,
  story_liked: 5,
  chapter_generated: 20,
};

export async function awardQi(event: QiEvent, sourceId?: string, sourceType?: string) {
  const user = auth.currentUser;
  if (!user) return; 
  
  const amount = QI_VALUES[event];
  if (!amount) return;

  return queueCultivationAward(user.uid, async () => {
   try {
    if (auth.currentUser?.uid !== user.uid) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDayStr = today.toISOString();

    const limit = DAILY_CAPS[event];
    if (limit) {
       const key = `dao_events_${event}_${startOfDayStr}`;
       const currentCount = parseInt(localStorage.getItem(key) || '0', 10);
       if (currentCount >= limit) {
         console.log(`[AntiSpam] Daily cap reached for ${event}. Qi not awarded.`);
         return; // limit reached
       }
       localStorage.setItem(key, (currentCount + 1).toString());
    }

    const data = await getAuthoritativeCultivationProfile(user.uid);
    if (!data || auth.currentUser?.uid !== user.uid) return;
    
    // Support migrating from `qi` to `dao_xp`
    let currentXp = data?.dao_xp;
    if (currentXp === undefined && data?.qi !== undefined) {
      currentXp = data.qi;
    } else if (currentXp === undefined) {
      currentXp = 0;
    }

    let currentHeavenlyQi = data?.heavenly_qi;
    if (currentHeavenlyQi === undefined) {
      currentHeavenlyQi = currentXp;
    }
    const currentSectQi = data?.sect_qi || 0;
    const currentDemonicQi = data?.demonic_qi || 0;

    let qiMultiplier = 1;
    let sectQiMultiplier = 1;
    if (data?.activeStatusEffects) {
      const now = new Date().toISOString();
      data.activeStatusEffects.forEach((effect: ActiveStatusEffect) => {
        if (effect.expiresAt > now) {
          if (effect.effectDef.qiMultiplier !== undefined) {
            qiMultiplier *= effect.effectDef.qiMultiplier;
          }
          if (effect.effectDef.sectQiMultiplier !== undefined) {
            sectQiMultiplier *= effect.effectDef.sectQiMultiplier;
          }
        }
      });
    }

    // Support streak tracking
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const lastInteractionDate = data?.lastInteractionDate || '';
    const currentStreak = data?.writingStreak || 0;
    
    let newStreak = currentStreak;
    let streakChanged = false;
    let bonusQi = 0;
    let streakEventName: 'streak_reward_3' | 'streak_reward_10' | null = null;
    
    if (lastInteractionDate !== todayStr) {
      if (lastInteractionDate) {
        const lastDate = new Date(lastInteractionDate + 'T00:00:00');
        const todayDate = new Date(todayStr + 'T00:00:00');
        const diffTime = todayDate.getTime() - lastDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          newStreak = currentStreak + 1;
        } else {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }
      streakChanged = true;
    } else if (currentStreak === 0) {
      newStreak = 1;
      streakChanged = true;
    }

    if (streakChanged) {
      if (newStreak % 10 === 0) {
        bonusQi = 100;
        streakEventName = 'streak_reward_10';
      } else if (newStreak % 3 === 0) {
        bonusQi = 20;
        streakEventName = 'streak_reward_3';
      }
    }

    const calculatedAmount = Math.round(amount * qiMultiplier);
    const calculatedBonus = Math.round(bonusQi * qiMultiplier);

    const newXp = currentXp + calculatedAmount + calculatedBonus;
    const newHeavenlyQi = currentHeavenlyQi + calculatedAmount + calculatedBonus;
    const sectAmount = SECT_QI_VALUES[event] || amount;
    const sectBonus = streakEventName ? (SECT_QI_VALUES[streakEventName] || bonusQi) : 0;
    
    const calculatedSectAmount = Math.round(sectAmount * sectQiMultiplier);
    const calculatedSectBonus = Math.round(sectBonus * sectQiMultiplier);
    const newSectQi = currentSectQi + calculatedSectAmount + calculatedSectBonus;

    const newRank = getDaoRankData(newXp).rank;
    
    // Automatically check and award persistent Cosmic Artifacts for this rank
    checkAndAwardRankArtifacts(newRank);

    // Award Demonic Qi if Demonic Corruption or any mutation/demonic status effect is active!
    let demonicQiGain = 0;
    if (data?.activeStatusEffects) {
      const now = new Date().toISOString();
      const hasDemonic = data.activeStatusEffects.some(
        (effect: any) => 
          (effect.effectDef.name === 'Demonic Corruption' || effect.effectDef.type === 'Mutation') && 
          effect.expiresAt > now
      );
      if (hasDemonic) {
        // Demonic Qi gain is proportional to the calculated amount
        demonicQiGain = Math.round(calculatedAmount * 0.5); 
      }
    }
    const newDemonicQi = currentDemonicQi + demonicQiGain;

    let updatedEffects = data?.activeStatusEffects ? [...data.activeStatusEffects] : [];
    if (updatedEffects.length > 0) {
      const now = new Date().toISOString();
      updatedEffects = updatedEffects.map((effect: ActiveStatusEffect) => {
        if (effect.expiresAt > now && !effect.completedAt) {
          if (effect.progress !== undefined && effect.targetProgress !== undefined) {
            const nextProgress = (effect.progress || 0) + calculatedAmount;
            const completedAt = nextProgress >= effect.targetProgress ? now : undefined;
            return {
              ...effect,
              progress: Math.min(effect.targetProgress, nextProgress),
              completedAt
            };
          }
        }
        return effect;
      });
    }

    const userUpdates: any = {
      dao_xp: newXp,
      qi: newXp, // keep backwards compatibility for now just in case
      heavenly_qi: newHeavenlyQi,
      sect_qi: newSectQi,
      demonic_qi: newDemonicQi,
      dao_rank: newRank,
      writingStreak: newStreak,
      lastInteractionDate: todayStr,
      activeStatusEffects: updatedEffects,
      updatedAt: new Date().toISOString()
    };
    
    // Update local immediately for instantaneous UI updates
    const updatedProfile = { ...data, ...userUpdates };
    updateStoreProfile(updatedProfile);
    cacheAccountProfile(updatedProfile);
    
    // Queue one owner-scoped PostgreSQL profile mutation for the burst.
    queueProfileSync(userUpdates, user.uid);

   } catch (error) {
    console.error('Failed to award Qi:', error);
   }
  });
}

export interface AuraTier {
  rank: string;
  name: string;
  colorHex: string;
  rewardFeeling: string;
  unlockedAt: number;
  textColor: string;
  shadowColor: string;
  bgGlow: string;
  effectType?: 'normal' | 'particles' | 'gradient' | 'animated';
}

export const AURA_TIERS: AuraTier[] = [
  {
    rank: 'Mortal Reader',
    name: 'Sect Entrance Aura',
    colorHex: '#E5E7EB',
    rewardFeeling: 'You entered the sect',
    unlockedAt: 0,
    textColor: 'text-gray-300',
    shadowColor: 'rgba(229,231,235,0.2)',
    bgGlow: 'bg-neutral-800/10'
  },
  {
    rank: 'Wandering Disciple',
    name: 'Active Disciple Azure',
    colorHex: '#3B82F6',
    rewardFeeling: 'You are active',
    unlockedAt: 100,
    textColor: 'text-blue-400',
    shadowColor: 'rgba(59,130,246,0.35)',
    bgGlow: 'bg-blue-950/20'
  },
  {
    rank: 'Outer Sect Scribe',
    name: 'Scribe Cyan Resonance',
    colorHex: '#06B6D4',
    rewardFeeling: 'You are recording worlds',
    unlockedAt: 300,
    textColor: 'text-cyan-400',
    shadowColor: 'rgba(6,182,212,0.4)',
    bgGlow: 'bg-cyan-950/20'
  },
  {
    rank: 'Inner Sect Scholar',
    name: 'Scholar Emerald Sight',
    colorHex: '#10B981',
    rewardFeeling: 'You understand systems',
    unlockedAt: 750,
    textColor: 'text-emerald-400',
    shadowColor: 'rgba(16,185,129,0.45)',
    bgGlow: 'bg-emerald-950/20'
  },
  {
    rank: 'Dao Adept',
    name: 'Fate-Shaper Violet Aura',
    colorHex: '#8B5CF6',
    rewardFeeling: 'You can shape fate',
    unlockedAt: 1500,
    textColor: 'text-purple-400',
    shadowColor: 'rgba(139,92,246,0.5)',
    bgGlow: 'bg-purple-950/20'
  },
  {
    rank: 'Spirit Author',
    name: 'Canon Creator Gold',
    colorHex: '#F59E0B',
    rewardFeeling: 'You are creating canon',
    unlockedAt: 3000,
    textColor: 'text-amber-400',
    shadowColor: 'rgba(245,158,11,0.55)',
    bgGlow: 'bg-amber-950/20'
  },
  {
    rank: 'Heavenly Chronicler',
    name: 'Cosmic Gold Particle',
    colorHex: '#FFD700',
    rewardFeeling: 'You preserve worlds',
    unlockedAt: 6000,
    textColor: 'text-yellow-400',
    shadowColor: 'rgba(255,215,0,0.65)',
    bgGlow: 'bg-yellow-950/20',
    effectType: 'particles'
  },
  {
    rank: 'Sage of Branching Paths',
    name: 'Prism Branching Gradient',
    colorHex: 'gradient-violet-gold',
    rewardFeeling: 'You master branches',
    unlockedAt: 12000,
    textColor: 'bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400',
    shadowColor: 'rgba(168,85,247,0.7)',
    bgGlow: 'bg-gradient-to-r from-purple-950/20 to-yellow-950/20',
    effectType: 'gradient'
  },
  {
    rank: 'Dao Master',
    name: 'Transcendental Master Matrix',
    colorHex: 'animated-custom',
    rewardFeeling: 'You transcend normal UI',
    unlockedAt: 25000,
    textColor: 'bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-rose-400 to-yellow-400',
    shadowColor: 'rgba(6,182,212,0.85)',
    bgGlow: 'bg-gradient-to-r from-cyan-950/20 via-rose-950/20 to-yellow-950/20',
    effectType: 'animated'
  }
];

export function getAuraColorForXp(
  explicitColor: string | undefined,
  xp: number | undefined,
): string {
  if (explicitColor) return explicitColor;
  const currentXp = Number.isFinite(xp) ? Math.max(0, xp ?? 0) : 0;
  let unlockedColor = AURA_TIERS[0].colorHex;
  for (const tier of AURA_TIERS) {
    if (currentXp < tier.unlockedAt) break;
    unlockedColor = tier.colorHex;
  }
  return unlockedColor;
}

export function getAuraTextStyle(
  colorHexOrAura?: string,
  activeStatusEffects?: ActiveStatusEffect[]
): { style?: React.CSSProperties; className?: string } {
  if (!colorHexOrAura) return {};
  
  const now = new Date().toISOString();
  const hasGhostlySilence = activeStatusEffects?.some(
    e => e.effectDef.name === "Ghostly Silence" && e.expiresAt > now
  );
  
  if (hasGhostlySilence) {
    return {
      className: 'text-neutral-500 font-normal opacity-60 line-through-none shadow-none filter grayscale'
    };
  }

  const hasCursedTome = activeStatusEffects?.some(
    e => e.effectDef.name === "Curse of the Cursed Tome" && e.expiresAt > now
  );

  let extraClass = '';
  if (hasCursedTome) {
    extraClass = ' animate-pulse text-red-400/90 shadow-[0_0_12px_rgba(139,0,0,0.8)]';
  }
  
  if (colorHexOrAura === 'gradient-violet-gold') {
    return {
      className: `aura-gradient-violet-gold font-bold drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]${extraClass}`
    };
  }
  if (colorHexOrAura === 'animated-custom') {
    return {
      className: `aura-animated-custom font-black drop-shadow-[0_0_12px_rgba(6,182,212,0.65)]${extraClass}`
    };
  }
  
  // Normal hex colors
  return {
    style: { color: hasCursedTome ? '#ff3333' : colorHexOrAura },
    className: `drop-shadow-[0_0_5px_rgba(255,255,255,0.15)] font-semibold${extraClass}`
  };
}

export function getAuraGlowStyle(
  colorHexOrAura?: string,
  activeStatusEffects?: ActiveStatusEffect[]
): string {
  if (!colorHexOrAura) return '';

  const now = new Date().toISOString();
  const hasGhostlySilence = activeStatusEffects?.some(
    e => e.effectDef.name === "Ghostly Silence" && e.expiresAt > now
  );
  
  if (hasGhostlySilence) {
    return 'border-neutral-900 shadow-none';
  }

  const hasCursedTome = activeStatusEffects?.some(
    e => e.effectDef.name === "Curse of the Cursed Tome" && e.expiresAt > now
  );

  if (hasCursedTome) {
    return 'shadow-[0_0_25px_rgba(139,0,0,0.7)] border-human/40 animate-pulse';
  }
  
  const match = AURA_TIERS.find(t => t.colorHex === colorHexOrAura);
  if (match) {
    if (colorHexOrAura === 'gradient-violet-gold') {
      return 'shadow-[0_0_30px_rgba(139,92,246,0.25)] border-purple-500/30';
    }
    if (colorHexOrAura === 'animated-custom') {
      return 'shadow-[0_0_40px_rgba(6,182,212,0.45)] border-cyan-500/40 animate-pulse';
    }
    return `shadow-[0_0_20px_${match.shadowColor}] border-neutral-800`;
  }
  return '';
}

export async function awardDirectQi(amount: number, reason: string) {
  const user = auth.currentUser;
  if (!user) return; 
  if (!amount || amount <= 0) return;

  return queueCultivationAward(user.uid, async () => {
   try {
    if (auth.currentUser?.uid !== user.uid) return;
    const data = await getAuthoritativeCultivationProfile(user.uid);
    if (!data || auth.currentUser?.uid !== user.uid) return;
    
    let currentXp = data?.dao_xp;
    if (currentXp === undefined && data?.qi !== undefined) {
      currentXp = data.qi;
    } else if (currentXp === undefined) {
      currentXp = 0;
    }

    let currentHeavenlyQi = data?.heavenly_qi;
    if (currentHeavenlyQi === undefined) {
      currentHeavenlyQi = currentXp;
    }
    const currentSectQi = data?.sect_qi || 0;
    const currentDemonicQi = data?.demonic_qi || 0;

    let qiMultiplier = 1;
    let sectQiMultiplier = 1;
    if (data?.activeStatusEffects) {
      const now = new Date().toISOString();
      data.activeStatusEffects.forEach((effect: ActiveStatusEffect) => {
        if (effect.expiresAt > now) {
          if (effect.effectDef.qiMultiplier !== undefined) {
            qiMultiplier *= effect.effectDef.qiMultiplier;
          }
          if (effect.effectDef.sectQiMultiplier !== undefined) {
            sectQiMultiplier *= effect.effectDef.sectQiMultiplier;
          }
        }
      });
    }

    const calculatedAmount = Math.round(amount * qiMultiplier);
    const calculatedSectAmount = Math.round(amount * sectQiMultiplier);

    const newXp = currentXp + calculatedAmount;
    const newHeavenlyQi = currentHeavenlyQi + calculatedAmount;
    const newSectQi = currentSectQi + calculatedSectAmount;

    // Award Demonic Qi if Demonic Corruption or any mutation/demonic status effect is active!
    let demonicQiGain = 0;
    if (data?.activeStatusEffects) {
      const now = new Date().toISOString();
      const hasDemonic = data.activeStatusEffects.some(
        (effect: any) => 
          (effect.effectDef.name === 'Demonic Corruption' || effect.effectDef.type === 'Mutation') && 
          effect.expiresAt > now
      );
      if (hasDemonic) {
        demonicQiGain = Math.round(calculatedAmount * 0.5); 
      }
    }
    const newDemonicQi = currentDemonicQi + demonicQiGain;

    const newRank = getDaoRankData(newXp).rank;
    
    // Automatically check and award persistent Cosmic Artifacts for this rank
    checkAndAwardRankArtifacts(newRank);

    let updatedEffects = data?.activeStatusEffects ? [...data.activeStatusEffects] : [];
    if (updatedEffects.length > 0) {
      const now = new Date().toISOString();
      updatedEffects = updatedEffects.map((effect: ActiveStatusEffect) => {
        if (effect.expiresAt > now && !effect.completedAt) {
          if (effect.progress !== undefined && effect.targetProgress !== undefined) {
            const nextProgress = (effect.progress || 0) + calculatedAmount;
            const completedAt = nextProgress >= effect.targetProgress ? now : undefined;
            return {
              ...effect,
              progress: Math.min(effect.targetProgress, nextProgress),
              completedAt
            };
          }
        }
        return effect;
      });
    }

    const userUpdates = {
      dao_xp: newXp,
      qi: newXp,
      heavenly_qi: newHeavenlyQi,
      sect_qi: newSectQi,
      demonic_qi: newDemonicQi,
      dao_rank: newRank,
      activeStatusEffects: updatedEffects,
      updatedAt: new Date().toISOString()
    };
    
    const updatedProfile = { ...data, ...userUpdates };
    updateStoreProfile(updatedProfile);
    cacheAccountProfile(updatedProfile);
    queueProfileSync(userUpdates, user.uid);

   } catch (error) {
    console.error('Failed to award direct Qi:', error);
   }
  });
}

/**
 * Closed-Door Cultivation: record that the signed-in user's session ended at
 * `iso`. The server-side `lastSessionEnd` is the cross-device time-away
 * baseline and, after a claim, the consumed-reward marker. Rides the existing
 * debounced profile sync (flushed with keepalive on page teardown).
 */
export function recordLibrarySessionEnd(iso: string, flushImmediately = false) {
  const user = auth.currentUser;
  if (!user) return;
  const storeProfile = getStoreProfile();
  if (!storeProfile || storeProfile.uid !== user.uid) return;
  updateStoreProfile({ ...storeProfile, lastSessionEnd: iso });
  // updatedAt deliberately untouched: a passive session-end must not make a
  // stale local profile look freshly updated to recency-based merge guards.
  queueProfileSync({ lastSessionEnd: iso }, user.uid);
  if (flushImmediately) {
    // Page teardown: qi.ts's own keepalive flush listener is registered at
    // module load and runs before late-registered listeners queue this write,
    // so the session-end must be flushed here or it is lost with the page.
    void flushPendingProfileSync(user.uid, { keepalive: true });
  }
}

export type IdleClaimResult = 'claimed' | 'already-claimed';

/**
 * Closed-Door Cultivation: claim the return reward measured from
 * `baselineIso`, depositing exactly `amount` Qi (hard-capped at
 * MAX_IDLE_QI_REWARD) so the displayed cloud always matches the real balance.
 *
 * Claim-safe by construction:
 *  - resolves 'already-claimed' without depositing when this baseline was
 *    consumed (local marker, or a server `lastSessionEnd` newer than the
 *    baseline — a successful claim always writes `lastSessionEnd = claim time`
 *    in the same confirmed profile write as the deposit);
 *  - the write is awaited before the caller may play the disappearance
 *    animation, carries a deterministic idempotency key per reward cycle
 *    (retries and simultaneous multi-device claims collapse into one
 *    server-side receipt), and conflicts are re-checked against the server
 *    before being reported as failures.
 *
 * Throws when the transaction could not be recorded; the caller must keep the
 * veil open and allow a retry.
 */
export async function claimIdleQiReward(amount: number, baselineIso: string): Promise<IdleClaimResult> {
  const user = auth.currentUser;
  if (!user) throw new Error('Cannot claim closed-door cultivation Qi without a signed-in user.');
  const deposit = Math.min(Math.floor(amount), MAX_IDLE_QI_REWARD);
  if (!Number.isFinite(deposit) || deposit <= 0) return 'already-claimed';

  return queueCultivationAward(user.uid, async (): Promise<IdleClaimResult> => {
    if (auth.currentUser?.uid !== user.uid) throw new Error('Account changed during idle Qi claim.');
    if (isIdleBaselineClaimed(user.uid, baselineIso)) return 'already-claimed';

    const data = await getAuthoritativeCultivationProfile(user.uid);
    if (!data || auth.currentUser?.uid !== user.uid) throw new Error('Profile unavailable for idle Qi claim.');

    // Another device/tab may already have consumed this baseline: a completed
    // claim always leaves lastSessionEnd newer than the baseline it consumed.
    if (data.lastSessionEnd && Date.parse(data.lastSessionEnd) > Date.parse(baselineIso)) {
      markIdleBaselineClaimed(user.uid, baselineIso);
      return 'already-claimed';
    }

    // Same field math as awardDirectQi, except the deposit is exactly the
    // displayed amount — status-effect multipliers must not make the real
    // balance diverge from the number the user tapped.
    let currentXp = data?.dao_xp;
    if (currentXp === undefined && data?.qi !== undefined) {
      currentXp = data.qi;
    } else if (currentXp === undefined) {
      currentXp = 0;
    }

    let currentHeavenlyQi = data?.heavenly_qi;
    if (currentHeavenlyQi === undefined) {
      currentHeavenlyQi = currentXp;
    }
    const currentSectQi = data?.sect_qi || 0;
    const currentDemonicQi = data?.demonic_qi || 0;

    const newXp = currentXp + deposit;
    const newHeavenlyQi = currentHeavenlyQi + deposit;
    const newSectQi = currentSectQi + deposit;

    // Demonic Qi keeps its proportional gain (a separate side balance).
    let demonicQiGain = 0;
    if (data?.activeStatusEffects) {
      const now = new Date().toISOString();
      const hasDemonic = data.activeStatusEffects.some(
        (effect: any) =>
          (effect.effectDef.name === 'Demonic Corruption' || effect.effectDef.type === 'Mutation') &&
          effect.expiresAt > now
      );
      if (hasDemonic) {
        demonicQiGain = Math.round(deposit * 0.5);
      }
    }
    const newDemonicQi = currentDemonicQi + demonicQiGain;

    const newRank = getDaoRankData(newXp).rank;

    // Automatically check and award persistent Cosmic Artifacts for this rank
    checkAndAwardRankArtifacts(newRank);

    let updatedEffects = data?.activeStatusEffects ? [...data.activeStatusEffects] : [];
    if (updatedEffects.length > 0) {
      const now = new Date().toISOString();
      updatedEffects = updatedEffects.map((effect: ActiveStatusEffect) => {
        if (effect.expiresAt > now && !effect.completedAt) {
          if (effect.progress !== undefined && effect.targetProgress !== undefined) {
            const nextProgress = (effect.progress || 0) + deposit;
            const completedAt = nextProgress >= effect.targetProgress ? now : undefined;
            return {
              ...effect,
              progress: Math.min(effect.targetProgress, nextProgress),
              completedAt
            };
          }
        }
        return effect;
      });
    }

    const claimTime = new Date().toISOString();
    const userUpdates: Partial<UserProfile> = {
      dao_xp: newXp,
      qi: newXp,
      heavenly_qi: newHeavenlyQi,
      sect_qi: newSectQi,
      demonic_qi: newDemonicQi,
      dao_rank: newRank,
      activeStatusEffects: updatedEffects,
      lastSessionEnd: claimTime,
      updatedAt: claimTime
    };

    // Fold any debounced profile sync into this confirmed write so a later
    // flush cannot re-write a pre-claim snapshot over the claim. The pending
    // updates are absolute values already reflected in `data`, so merging
    // them here loses nothing; they are restored if the claim write fails.
    const pending = pendingProfileSyncs.get(user.uid);
    if (pending?.timeout) clearTimeout(pending.timeout);
    pendingProfileSyncs.delete(user.uid);
    const payload: Partial<UserProfile> = { ...(pending?.updates ?? {}), ...userUpdates };

    // Chain onto the per-user sync lane so this write cannot race a flush.
    const previousSync = profileSyncInFlight.get(user.uid) ?? Promise.resolve();
    const claimSync = previousSync.catch(() => undefined).then(async () => {
      try {
        await saveUserProfile(
          { uid: user.uid, ...payload },
          { idempotencyKey: `idle-cultivation-claim-${user.uid}-${baselineIso}` },
        );
      } catch (error) {
        if (pending) queueProfileSync(pending.updates, user.uid);
        throw error;
      }
    });
    profileSyncInFlight.set(user.uid, claimSync);
    const cleanupSync = () => {
      if (profileSyncInFlight.get(user.uid) === claimSync) {
        profileSyncInFlight.delete(user.uid);
      }
    };
    void claimSync.then(cleanupSync, cleanupSync);

    try {
      await claimSync;
    } catch (error) {
      // A conflict usually means another tab/device consumed this baseline
      // first. Verify against the server before reporting failure so the veil
      // only stays open when the reward genuinely never landed.
      try {
        const fresh = await getUserProfile(user.uid);
        if (fresh?.lastSessionEnd && Date.parse(fresh.lastSessionEnd) > Date.parse(baselineIso)) {
          updateStoreProfile(fresh);
          cacheAccountProfile(fresh);
          markIdleBaselineClaimed(user.uid, baselineIso);
          return 'already-claimed';
        }
      } catch {
        /* the original claim error stands */
      }
      throw error;
    }

    const updatedProfile = { ...data, ...payload };
    updateStoreProfile(updatedProfile);
    cacheAccountProfile(updatedProfile);
    markIdleBaselineClaimed(user.uid, baselineIso);
    return 'claimed';
  });
}


