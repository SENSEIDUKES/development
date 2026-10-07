import { auth } from './firebase';
import { useAppStore } from '../store/useAppStore';
import { CosmicArtifact } from '../types';
import { getUserProfile, saveUserProfile } from './persistence';

export const COSMIC_ARTIFACT_TEMPLATES = {
  wandering_disciple: {
    name: "Azure Medallion of the Wandering Disciple",
    description: "A cool jade medallion given to those who have begun their true ascent. Its gentle hum helps focus spiritual thoughts.",
    rarity: "Common" as const,
    attributeBoost: "+5% Qi Flow Speed"
  },
  outer_sect_scribe: {
    name: "Seal of the Sect Scribe",
    description: "A bronze seal engraved with runes of truth. It allows its owner to write and seal records with absolute authority.",
    rarity: "Common" as const,
    attributeBoost: "+10% Memory Stability"
  },
  inner_sect_scholar: {
    name: "Gourd of Nine Heavenly Nectars",
    description: "A miniature gourd carved from ancient spiritual wood. It slowly condenses droplets of divine morning dew that nourish the reader's spirit.",
    rarity: "Rare" as const,
    attributeBoost: "+10% Vitality Recovery"
  },
  dao_adept: {
    name: "Spindle of the Nine-Fold Fate",
    description: "A miniature wooden spindle holding thread spun from starlight. It allows subtle adjustments to the red threads of connection.",
    rarity: "Epic" as const,
    attributeBoost: "+15% Relationship Affinity"
  },
  spirit_author: {
    name: "Cosmic Pen of the Spirit Author",
    description: "A writing brush tipped with a phoenix feather. Its strokes are infused with natural Dao, allowing thoughts to manifest into physical reality.",
    rarity: "Legendary" as const,
    attributeBoost: "+20% Generation Quality"
  },
  heavenly_chronicler: {
    name: "Cauldron of Primordial Chaos",
    description: "A heavy tripod cauldron that burns with an eternal colorless flame. Supposedly forged in the void before the cosmos split.",
    rarity: "Legendary" as const,
    attributeBoost: "+25% Power Progression Speed"
  },
  sage_branching: {
    name: "Crown of the Branching Sage",
    description: "A delicate circlet made of silver pine roots stretching across parallel realities. It holds memory of parallel timelines.",
    rarity: "Mythic" as const,
    attributeBoost: "+30% Paradox Tolerance"
  },
  dao_master: {
    name: "Heart of the Transcendental Matrix",
    description: "A shifting crystal lattice that glows with neon spectrums. Confers supreme comprehension of all nested story realities.",
    rarity: "Transcendent" as const,
    attributeBoost: "+50% Transcendental Insight"
  },
  chapter_5: {
    name: "Compass of Pathless Destinies",
    description: "A brass compass whose needle remains still, while the outer dial rotates to point toward unseen choices and hidden routes.",
    rarity: "Epic" as const,
    attributeBoost: "+15% Fate Resistance"
  },
  chapter_seal: {
    name: "Mirror of Karmic Reflections",
    description: "A polished bronze mirror that reveals the color of one's karmic alignment rather than their physical face.",
    rarity: "Rare" as const,
    attributeBoost: "+5% Karma Resolution"
  },
  challenge_complete: {
    name: "Key of the Spatial Anomaly",
    description: "A shimmering silver key that hums with spatial vibrations. Can open tiny cracks in reality to bypass barriers.",
    rarity: "Epic" as const,
    attributeBoost: "+15% Hazard Evasion"
  },
  legendary_sword: {
    name: "Crystalline Sword of Celestial Dawn",
    description: "A legendary sword forged in the core of an active star, radiating cosmic heat. It hums with celestial energy that guides the hand of its wielder.",
    rarity: "Legendary" as const,
    attributeBoost: "+20% Combat Will"
  },
  boss_fight: {
    name: "Shattered Crest of the Void Beast",
    description: "The boss fight begins, and the beast's echoes ring. A pulsing chunk of absolute darkness recovered from the heart of a primordial nemesis. Its heavy presence dampens spatial stress.",
    rarity: "Epic" as const,
    attributeBoost: "+15% Tribulation Armor"
  },
  bond_token: {
    name: "Jade Token of Blood Allegiance",
    description: "An unbreakable blood bond is sworn. A flawless warm-jade disk engraved with the secret character of absolute loyalty. Glows when companions are near.",
    rarity: "Epic" as const,
    attributeBoost: "+20% Companion Affinity"
  },
  faction_banner: {
    name: "War Banner of the Sovereign Sect",
    description: "The sect war ends in ultimate victory. A heavy gold-thread silk banner bearing the star-gilding of your sect. Waves constantly as if swept by a spiritual wind.",
    rarity: "Rare" as const,
    attributeBoost: "+15% Sect Influence"
  },
  dragon_card: {
    name: "Summoner's Scroll of the Ascendant Dragon",
    description: "An ancient dragon manifests before you. A pristine scroll made of dragon-scale vellum. When unrolled, a spectral projection of a crimson dragon spirals around the reader.",
    rarity: "Mythic" as const,
    attributeBoost: "+25% Dragon Meridian Flow"
  },
  fatebreaker_title: {
    name: "Cosmic Seal of the Fatebreaker",
    description: "You have survived death, shattering your predetermined fate. A transcendent seal that represents your status as one who defies the heavens and breaks predetermined boundaries.",
    rarity: "Transcendent" as const,
    attributeBoost: "+30% Fate Resistance"
  },
  secret_codex: {
    name: "Cursed Tome",
    description: "A dark tome radiating ominous energy. Reading its text curses the soul but offers a path to forbidden knowledge.",
    rarity: "Epic" as const,
    attributeBoost: "+20% Truth Comprehension",
    statusEffectDef: {
      name: 'Curse of the Cursed Tome',
      type: 'Curse',
      description: '-15% Qi gathering efficiency for the duration.',
      durationMs: 24 * 60 * 60 * 1000,
      scope: 'Account-wide',
      visual: 'Dark smoke around display name',
      counterplay: 'Gather 500 Qi while cursed',
      rewardHook: 'Permanently unlock the Cursed Scholar title',
      qiMultiplier: 0.85,
      targetProgress: 500
    }
  },
  broken_jade_seal: {
    name: "Broken Jade Seal",
    description: "A fractured token of a lost empire.",
    rarity: "Rare" as const,
    attributeBoost: "+5% Sect Influence",
    statusEffectDef: {
      name: 'Broken Jade Seal',
      type: 'Affliction',
      description: 'Store prices increased by 10%.',
      durationMs: 12 * 60 * 60 * 1000,
      scope: 'Story-specific',
      rewardHook: 'Completing an arc during this time drops Jade Fragments'
    }
  },
  demonic_heart_pearl: {
    name: "Demonic Heart Pearl",
    description: "A pulsing pearl of absolute demonic intent.",
    rarity: "Legendary" as const,
    attributeBoost: "+15% Demonic Affinity",
    statusEffectDef: {
      name: 'Demonic Corruption',
      type: 'Mutation',
      description: 'Pure Qi gain -20%, Demonic (Sect) Qi gain +50%',
      durationMs: 48 * 60 * 60 * 1000,
      scope: 'Account-wide',
      rewardHook: 'Unlocks demonic cosmetics',
      qiMultiplier: 0.8,
      sectQiMultiplier: 1.5
    }
  },
  ashen_fate_thread: {
    name: "Ashen Fate Thread",
    description: "A burnt thread of destiny that smells of scorched karma.",
    rarity: "Epic" as const,
    attributeBoost: "+10% Fate Manipulation",
    statusEffectDef: {
      name: 'Ashen Destiny',
      type: 'Affliction',
      description: 'Next Fate Challenge has higher difficulty',
      durationMs: 72 * 60 * 60 * 1000,
      scope: 'Story-specific',
      rewardHook: 'Reward rarity increases by one tier'
    }
  },
  nameless_bone_flute: {
    name: "Nameless Bone Flute",
    description: "A flute carved from an unknown beast's bone. Playing it silences the world.",
    rarity: "Rare" as const,
    attributeBoost: "+5% Tribulation Evasion",
    statusEffectDef: {
      name: 'Ghostly Silence',
      type: 'Curse',
      description: 'Hides your profile aura for the duration.',
      durationMs: 24 * 60 * 60 * 1000,
      scope: 'Account-wide',
      rewardHook: 'Unlocks ghostly music/profile effect after expiry'
    }
  },
  trophy_card: {
    name: "Sovereign Trophy of Ultimate Victory",
    description: "The villain is defeated at last. A grand, shining trophy crafted from divine metals. It emits a pleasant, victorious chime when touched, celebrating your dominance.",
    rarity: "Legendary" as const,
    attributeBoost: "+25% Dao Luck"
  }
};

export function getCurrentOfferingWeekId(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

function getArtifactRewards(rarity: CosmicArtifact["rarity"]) {
  switch (rarity) {
    case "Transcendent": return { qi: 5000, sectMerit: 100 };
    case "Mythic": return { qi: 2000, sectMerit: 50 };
    case "Legendary": return { qi: 250, sectMerit: 25 };
    case "Epic": return { qi: 100, sectMerit: 10 };
    case "Rare": return { qi: 50, sectMerit: 5 };
    case "Common": default: return { qi: 10, sectMerit: 1 };
  }
}

function normalizeArtifactRarity(value: unknown): CosmicArtifact["rarity"] | null {
  const rarity = String(value ?? '').trim().toLowerCase();
  const rarities: Record<string, CosmicArtifact["rarity"]> = {
    common: 'Common',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
    mythic: 'Mythic',
    transcendent: 'Transcendent',
  };
  return rarities[rarity] ?? null;
}

export async function unlockCosmicArtifact(
  keyOrArtifact: string | Omit<CosmicArtifact, 'id' | 'unlockedAt'>,
  sourceId?: string,
  sourceTitle?: string
): Promise<CosmicArtifact | null> {
  const user = auth.currentUser;
  const now = new Date().toISOString();
  
  let baseArtifact: Omit<CosmicArtifact, 'id' | 'unlockedAt'>;
  let milestoneType: CosmicArtifact['milestoneType'];
  let milestoneName: string;
  let artifactKey = '';
  
  if (typeof keyOrArtifact === 'string') {
    artifactKey = keyOrArtifact;
    const template = COSMIC_ARTIFACT_TEMPLATES[keyOrArtifact as keyof typeof COSMIC_ARTIFACT_TEMPLATES];
    if (!template) return null;
    
    milestoneType = keyOrArtifact === 'chapter_seal' ? 'chapter_seal' :
                    keyOrArtifact === 'challenge_complete' ? 'challenge_complete' :
                    keyOrArtifact === 'chapter_5' ? 'first_breakthrough' :
                    [
                      'legendary_sword',
                      'boss_fight',
                      'bond_token',
                      'faction_banner',
                      'dragon_card',
                      'fatebreaker_title',
                      'secret_codex',
                      'trophy_card'
                    ].includes(keyOrArtifact) ? 'chapter_seal' : 'rank_up';
                    
    milestoneName = keyOrArtifact === 'chapter_seal' ? 'Sealed a Story Chapter' :
                    keyOrArtifact === 'challenge_complete' ? 'Fate Survival Complete' :
                    keyOrArtifact === 'chapter_5' ? 'Ascended to Chapter 5' :
                    keyOrArtifact === 'legendary_sword' ? 'Acquired Legendary Sword' :
                    keyOrArtifact === 'boss_fight' ? 'Confronted Primordial Nemesis' :
                    keyOrArtifact === 'bond_token' ? 'Earned Sworn Allegiance' :
                    keyOrArtifact === 'faction_banner' ? 'Triumph in Sect War' :
                    keyOrArtifact === 'dragon_card' ? 'Manifested Cosmic Dragon' :
                    keyOrArtifact === 'fatebreaker_title' ? 'Shattered predetermined Fate' :
                    keyOrArtifact === 'secret_codex' ? 'Discovered Secret Codex' :
                    keyOrArtifact === 'trophy_card' ? 'Slain the Tyrant Lord' :
                    'Attained Dao Rank';
                    
    baseArtifact = {
      name: template.name,
      description: template.description,
      milestoneType,
      milestoneName,
      rarity: template.rarity,
      attributeBoost: template.attributeBoost,
      sourceStoryId: sourceId,
      sourceStoryTitle: sourceTitle
    };
  } else {
    baseArtifact = keyOrArtifact;
  }
  
  const id = `art-${artifactKey || 'custom'}-${Date.now()}`;
  const rewards = getArtifactRewards(baseArtifact.rarity);
  
  // Construct eventKey for robust deduplication across reloads / replays
  const eventKey = baseArtifact.eventKey || (artifactKey
    ? `${baseArtifact.sourceStoryId || sourceId || 'global'}_template_${artifactKey}`
    : `${baseArtifact.sourceStoryId || sourceId || 'global'}${baseArtifact.sourceChapterNumber === undefined ? '' : `_ch${baseArtifact.sourceChapterNumber}`}_${baseArtifact.name}`);
  
  const newArtifact: CosmicArtifact = {
    ...baseArtifact,
    id,
    eventKey,
    unlockedAt: now,
    offeringWeekId: getCurrentOfferingWeekId(),
    gatheredAt: now,
    status: "unsubmitted",
    rewardValueQi: baseArtifact.rewardValueQi ?? rewards.qi,
    rewardValueSectMerit: baseArtifact.rewardValueSectMerit ?? rewards.sectMerit
  };

  // Provide a clean default specialUnlock if not explicitly defined
  if (!newArtifact.specialUnlock) {
    if (newArtifact.rarity === 'Transcendent' || newArtifact.rarity === 'Mythic') {
      newArtifact.specialUnlock = {
        type: 'cosmetic',
        label: `${newArtifact.name} Aura & Theme`,
        description: `Unlocks unique ${newArtifact.rarity} cosmic visual aura and profile theme.`
      };
    } else if (newArtifact.rarity === 'Legendary') {
      newArtifact.specialUnlock = {
        type: 'badge',
        label: `Badge: ${newArtifact.name}`,
        description: 'Exclusive cultivation achievement badge for your profile.'
      };
    } else if (newArtifact.rarity === 'Epic') {
      newArtifact.specialUnlock = {
        type: 'customization',
        label: `Reader Customization: ${newArtifact.name}`,
        description: 'Unlocks custom reader theme accents and codex styling.'
      };
    } else {
      newArtifact.specialUnlock = {
        type: 'profile_item',
        label: `Cave Item: ${newArtifact.name}`,
        description: 'Unlocks a decorative item for your cultivator cave.'
      };
    }
  }
  
  // Check duplicates to avoid multi-award across reloads, replays, or duplicate triggers
  const checkDuplicate = (list: CosmicArtifact[]) => {
    return list.some((artifact) => {
      if (artifact.eventKey) return artifact.eventKey === newArtifact.eventKey;

      // Legacy artifacts may not have an event key. Compare their full available source identity.
      return artifact.name === newArtifact.name
        && artifact.sourceStoryId === newArtifact.sourceStoryId
        && (newArtifact.sourceChapterNumber === undefined
          || artifact.sourceChapterNumber === newArtifact.sourceChapterNumber);
    });
  };
  
  if (user) {
    try {
      const data = await getUserProfile();
      if (data) {
        const currentInventory: CosmicArtifact[] = data.cosmicInventory || [];
        
        if (checkDuplicate(currentInventory)) {
          return null; // Already unlocked
        }
        
        const updatedInventory = [...currentInventory, newArtifact];
        await saveUserProfile({ uid: user.uid, cosmicInventory: updatedInventory });
        
        // Dispatch window event for live-unlock celebration UI
        window.dispatchEvent(new CustomEvent('seihouse-artifact-unlocked', { detail: { artifact: newArtifact } }));
        return newArtifact;
      }
    } catch (e) {
      console.error('Failed to save artifact to Cloud:', e);
    }
  }
  
  // Local fallback (Offline or Guest Mode)
  try {
    const localInvStr = localStorage.getItem('seihouse-local-cosmic-inventory');
    const currentInventory: CosmicArtifact[] = localInvStr ? JSON.parse(localInvStr) : [];
    
    if (checkDuplicate(currentInventory)) {
      return null; // Already unlocked
    }
    
    const updatedInventory = [...currentInventory, newArtifact];
    try {
      localStorage.setItem('seihouse-local-cosmic-inventory', JSON.stringify(updatedInventory));
    } catch (e) {
      console.warn('LocalStorage Quota exceeded for artifacts:', e);
    }
    
    // Also update local store userProfile if we are offline/guest
    const localProfile = useAppStore.getState().userProfile;
    if (localProfile) {
      useAppStore.setState({
        userProfile: {
          ...localProfile,
          cosmicInventory: updatedInventory
        }
      });
    } else {
      // Initialize offline dummy profile
      useAppStore.setState({
        userProfile: {
          uid: 'anonymous',
          username: 'Mortal Reader',
          displayName: 'Mortal Reader',
          avatarUrl: '',
          preferredLanguage: 'English',
          defaultTranslationLanguage: 'English',
          savedStoryCount: 0,
          activeStories: [],
          inactiveStories: [],
          joinedDate: now,
          updatedAt: now,
          cosmicInventory: updatedInventory
        }
      });
    }
    
    window.dispatchEvent(new CustomEvent('seihouse-artifact-unlocked', { detail: { artifact: newArtifact } }));
    return newArtifact;
  } catch (e) {
    console.error('Failed to save artifact locally:', e);
  }
  
  return null;
}

export async function getUnlockedArtifacts(): Promise<CosmicArtifact[]> {
  const user = auth.currentUser;
  if (user) {
    try {
      const data = await getUserProfile();
      if (data) return data.cosmicInventory || [];
    } catch (e) {
      console.error('Failed to fetch artifacts from Cloud:', e);
    }
  }
  const localInvStr = localStorage.getItem('seihouse-local-cosmic-inventory');
  return localInvStr ? JSON.parse(localInvStr) : [];
}

export async function submitCurrentWeekOfferings(): Promise<{qi: number, sectMerit: number}> {
  const currentWeek = getCurrentOfferingWeekId();
  const artifacts = await getUnlockedArtifacts();
  let gainedQi = 0;
  let gainedSectMerit = 0;
  let changed = false;

  const updatedArtifacts = artifacts.map(a => {
    if (a.status !== 'submitted' && a.status !== 'auto_submitted' && a.offeringWeekId === currentWeek) {
      changed = true;
      gainedQi += a.rewardValueQi || 0;
      gainedSectMerit += a.rewardValueSectMerit || 0;
      return { ...a, status: 'submitted' as const };
    }
    return a;
  });

  if (changed) {
    const user = auth.currentUser;
    if (user) {
      const data = await getUserProfile();
      await saveUserProfile({
        uid: user.uid,
        cosmicInventory: updatedArtifacts,
        qi: (data?.qi || 0) + gainedQi,
        sect_qi: (data?.sect_qi || 0) + gainedSectMerit,
      });
    } else {
      localStorage.setItem('seihouse-local-cosmic-inventory', JSON.stringify(updatedArtifacts));
    }
    
    // Update local store
    const localProfile = useAppStore.getState().userProfile;
    if (localProfile) {
      useAppStore.setState({
        userProfile: {
          ...localProfile,
          cosmicInventory: updatedArtifacts,
          qi: (localProfile.qi || 0) + gainedQi,
          sect_qi: (localProfile.sect_qi || 0) + gainedSectMerit
        }
      });
    }
  }
  return { qi: gainedQi, sectMerit: gainedSectMerit };
}

export async function autoSubmitPreviousWeeksOfferings(): Promise<void> {
  const currentWeek = getCurrentOfferingWeekId();
  const artifacts = await getUnlockedArtifacts();
  let gainedQi = 0;
  let gainedSectMerit = 0;
  let changed = false;

  const updatedArtifacts = artifacts.map(a => {
    // If it has an offeringWeekId, and it's not the current week, and it's not submitted yet
    if (a.status !== 'submitted' && a.status !== 'auto_submitted' && a.offeringWeekId && a.offeringWeekId !== currentWeek) {
      changed = true;
      gainedQi += a.rewardValueQi || 0;
      gainedSectMerit += a.rewardValueSectMerit || 0;
      return { ...a, status: 'auto_submitted' as const };
    }
    // Also upgrade old artifacts that didn't have offeringWeekId
    if (!a.offeringWeekId) {
      changed = true;
      return { ...a, offeringWeekId: currentWeek, status: 'unsubmitted' as const, rewardValueQi: getArtifactRewards(a.rarity).qi, rewardValueSectMerit: getArtifactRewards(a.rarity).sectMerit };
    }
    return a;
  });

  if (changed) {
    const user = auth.currentUser;
    if (user) {
      const data = await getUserProfile();
      await saveUserProfile({
        uid: user.uid,
        cosmicInventory: updatedArtifacts,
        qi: (data?.qi || 0) + gainedQi,
        sect_qi: (data?.sect_qi || 0) + gainedSectMerit,
      });
    } else {
      localStorage.setItem('seihouse-local-cosmic-inventory', JSON.stringify(updatedArtifacts));
    }
    
    // Update local store
    const localProfile = useAppStore.getState().userProfile;
    if (localProfile) {
      useAppStore.setState({
        userProfile: {
          ...localProfile,
          cosmicInventory: updatedArtifacts,
          qi: (localProfile.qi || 0) + gainedQi,
          sect_qi: (localProfile.sect_qi || 0) + gainedSectMerit
        }
      });
    }
  }
}

/**
 * Checks and awards milestone artifacts based on current state.
 */
export function checkAndAwardRankArtifacts(rank: string): void {
  const rankKeyMap: Record<string, string> = {
    'Wandering Disciple': 'wandering_disciple',
    'Outer Sect Scribe': 'outer_sect_scribe',
    'Inner Sect Scholar': 'inner_sect_scholar',
    'Dao Adept': 'dao_adept',
    'Spirit Author': 'spirit_author',
    'Heavenly Chronicler': 'heavenly_chronicler',
    'Sage of Branching Paths': 'sage_branching',
    'Dao Master': 'dao_master'
  };
  
  const key = rankKeyMap[rank];
  if (key) {
    unlockCosmicArtifact(key).catch(err => {
      console.error(`Failed to automatically award rank artifact for ${rank}:`, err);
    });
  }
}

export async function scanChapterForArtifacts(
  storyId: string,
  storyTitle: string,
  chapterNumber: number,
  text: string,
  metadata?: any
): Promise<void> {
  const blocks = metadata?.blocks || [];

  // 1. Arc Climax Reward (Arc Relic) - Awarded strictly at major arc climaxes (e.g. chapter 6, 12, 18, etc.)
  if (chapterNumber > 0 && chapterNumber % 6 === 0) {
    let relicName = "Fragment of the Arc Core";
    const climaxEntity = blocks.flatMap((b: any) => b.metadata?.entities || []).find((e: any) => e.type === 'artifact' || e.type === 'beast');
    if (climaxEntity && climaxEntity.name) {
      relicName = climaxEntity.name;
    }
    await unlockCosmicArtifact({
      name: `Arc Relic: ${relicName}`,
      description: `The grand reward for completing this story arc and triumphing over its core trials.`,
      rarity: 'Epic',
      attributeBoost: '+15% Arc Resonance',
      sourceStoryId: storyId,
      sourceStoryTitle: storyTitle,
      sourceChapterNumber: chapterNumber,
      eventKey: `${storyId}_arc_climax_ch${chapterNumber}`,
      milestoneType: 'challenge_complete',
      milestoneName: 'Arc Climax Completion',
      specialUnlock: {
        type: 'badge',
        label: `Arc ${Math.ceil(chapterNumber / 6)} Master Badge`,
        description: 'Badge awarded for conquering a complete story arc.'
      }
    }, storyId, storyTitle);
  }

  // 2. Major Boss Defeat (Requires explicit major boss defeat metadata)
  const isMajorBossDefeat = blocks.some((b: any) => 
    b.metadata?.sceneType === 'major-boss-defeat' || 
    b.metadata?.bossDefeated === true ||
    (b.metadata?.sceneType === 'boss-fight' && b.metadata?.danger >= 9)
  );

  if (isMajorBossDefeat) {
    await unlockCosmicArtifact({
      name: "Trophy of Primordial Conquest",
      description: "A colossal relic forged from the fallen core of a major story nemesis.",
      rarity: 'Legendary',
      attributeBoost: '+25% Sovereign Dominance',
      sourceStoryId: storyId,
      sourceStoryTitle: storyTitle,
      sourceChapterNumber: chapterNumber,
      eventKey: `${storyId}_boss_defeat_ch${chapterNumber}`,
      milestoneType: 'challenge_complete',
      milestoneName: 'Major Boss Victory',
      specialUnlock: {
        type: 'cosmetic',
        label: 'Vanquisher Aura',
        description: 'Unlocks a glowing vanquisher aura around your cultivator avatar.'
      }
    }, storyId, storyTitle);
  }

  // 3. World-Changing Secret / Fate Objective (Requires explicit fate avert or major secret flag)
  const hasFateObjectiveAverted = blocks.some((b: any) => 
    b.system?.fateResult?.outcome === 'FATE AVERTED' ||
    b.metadata?.majorSecretDiscovered === true
  );

  if (hasFateObjectiveAverted) {
    await unlockCosmicArtifact({
      name: "Fatebreaker's Cosmic Seal",
      description: "An ancient seal awarded for averting predetermined doom and uncovering a world-altering secret.",
      rarity: 'Legendary',
      attributeBoost: '+30% Fate Resistance',
      sourceStoryId: storyId,
      sourceStoryTitle: storyTitle,
      sourceChapterNumber: chapterNumber,
      eventKey: `${storyId}_fate_averted_ch${chapterNumber}`,
      milestoneType: 'challenge_complete',
      milestoneName: 'Fate Objective Accomplished',
      specialUnlock: {
        type: 'sen_workshop',
        label: 'SEN Workshop Access: Fate Editing',
        description: 'Unlocks advanced steering options in the SEN Workshop.'
      }
    }, storyId, storyTitle);
  }

  // 4. Mythic / Profile-defining Relic (1 every 24 chapters)
  if (chapterNumber > 0 && chapterNumber % 24 === 0) {
    await unlockCosmicArtifact({
      name: "Heaven-Defying Saga Seal",
      description: "A mythic relic defining your profile, awarded for surviving multiple arduous arcs and defying fate itself.",
      rarity: 'Mythic',
      attributeBoost: '+40% Fate Resistance',
      sourceStoryId: storyId,
      sourceStoryTitle: storyTitle,
      sourceChapterNumber: chapterNumber,
      eventKey: `${storyId}_saga_milestone_ch${chapterNumber}`,
      milestoneType: 'rank_up',
      milestoneName: 'Saga Milestone',
      specialUnlock: {
        type: 'theme',
        label: 'Profile Theme: Heavenly Cosmos',
        description: 'Unlocks the premium Heavenly Cosmos profile background and border.'
      }
    }, storyId, storyTitle);
  }

  // 5. Legendary Completion Title (1 every 60 chapters)
  if (chapterNumber > 0 && chapterNumber % 60 === 0) {
    await unlockCosmicArtifact({
      name: "Grand Saga Witness Seal",
      description: "A transcendent completion relic. You have witnessed the rise and fall of sects, empires, and gods across a major saga.",
      rarity: 'Transcendent',
      attributeBoost: '+50% Dao Comprehension',
      sourceStoryId: storyId,
      sourceStoryTitle: storyTitle,
      sourceChapterNumber: chapterNumber,
      eventKey: `${storyId}_grand_saga_ch${chapterNumber}`,
      milestoneType: 'rank_up',
      milestoneName: 'Grand Saga Completion',
      specialUnlock: {
        type: 'customization',
        label: 'Transcendent Codex & Reader Customization',
        description: 'Unlocks transcendent golden typography and codex styling.'
      }
    }, storyId, storyTitle);
  }

  // 6. Scan for newly-awakened artifacts in worldCard blocks (any valid rarity)
  for (const block of blocks) {
    const rarity = normalizeArtifactRarity(block.worldCard?.rarity);
    if (
      block.worldCard?.entityType === 'artifact' && 
      block.worldCard.entityName &&
      rarity
    ) {
      await unlockCosmicArtifact({
        name: block.worldCard.entityName,
        description: block.worldCard.quote || `A ${rarity.toLowerCase()} relic awakened in your story.`,
        rarity,
        attributeBoost: `+20% ${block.worldCard.entityName} Resonance`,
        sourceStoryId: storyId,
        sourceStoryTitle: storyTitle,
        sourceChapterNumber: chapterNumber,
        eventKey: `${storyId}_awakened_relic_${block.worldCard.entityName.toLowerCase().replace(/\s+/g, '_')}_ch${chapterNumber}`,
        milestoneType: 'codex_linked',
        milestoneName: `${rarity} Artifact Awakening`,
        specialUnlock: {
          type: 'profile_item',
          label: `Cave Item: ${block.worldCard.entityName}`,
          description: `Display ${block.worldCard.entityName} in your cultivator cave.`
        }
      }, storyId, storyTitle);
    }
  }

  // Call Drop Engine to process remaining selective block-based drops
  try {
    const { processChapterDrops } = await import('./relicDropEngine');
    await processChapterDrops({ ...metadata, number: chapterNumber, blocks }, { id: storyId, title: storyTitle });
  } catch (err) {
    console.error("Failed to run Drop Engine during scanChapterForArtifacts:", err);
  }
}
