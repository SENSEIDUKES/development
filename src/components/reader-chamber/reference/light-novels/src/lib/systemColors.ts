export interface SystemColorMeaning {
  type: string;
  name: string;
  colorName: string;
  playerMeaning: string;
  textColor: string;
  borderColor: string;
  bgColor: string;
  cssVar?: string;
}

export const SYSTEM_COLORS_LEGEND: SystemColorMeaning[] = [
  {
    type: 'neutral',
    name: 'Basic System Info | Unknown (Gray)',
    colorName: 'Gray',
    playerMeaning: 'Basic system info, Unknown characters',
    textColor: 'text-gray-300',
    borderColor: 'border-gray-500/40',
    bgColor: 'bg-gray-500/10',
    cssVar: '--color-entity-unknown'
  },
  {
    type: 'other',
    name: 'Other System Context | Miscellaneous (Gray)',
    colorName: 'Gray',
    playerMeaning: 'Miscellaneous system information',
    textColor: 'text-gray-400',
    borderColor: 'border-gray-500/30',
    bgColor: 'bg-gray-500/5',
    cssVar: '--color-entity-unknown'
  },
  {
    type: 'codex_update',
    name: 'New Info | Main Character (Blue)',
    colorName: 'Blue',
    playerMeaning: 'New info, ally scan, codex record, Good items',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    bgColor: 'bg-blue-500/10',
    cssVar: '--color-entity-mc'
  },
  {
    type: 'progression',
    name: 'Stable Growth | Friend (Green)',
    colorName: 'Emerald',
    playerMeaning: 'Training progress, stable growth, Decent items',
    textColor: 'text-green-400',
    borderColor: 'border-green-500/40',
    bgColor: 'bg-green-500/10',
    cssVar: '--color-entity-friend'
  },
  {
    type: 'breakthrough',
    name: 'Awakening | Mentor & Special Location (Gold)',
    colorName: 'Gold',
    playerMeaning: 'Level-up, evolution, awakening, Special locations, Legendary items',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-400/50',
    bgColor: 'bg-amber-400/10',
    cssVar: '--color-entity-mentor'
  },
  {
    type: 'reward',
    name: 'Loot & Achievements | Legendary (Gold)',
    colorName: 'Gold',
    playerMeaning: 'Loot, Qi gain, achievement, Legendary items',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-400/50',
    bgColor: 'bg-amber-400/10',
    cssVar: '--color-item-legendary'
  },
  {
    type: 'warning',
    name: 'Risk & Pressure | Great Item (Orange)',
    colorName: 'Orange',
    playerMeaning: 'Risk, instability, choice pressure, Great items',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/40',
    bgColor: 'bg-orange-500/10',
    cssVar: '--color-item-great'
  },
  {
    type: 'critical_danger',
    name: 'Combat Threat | Enemy (Red)',
    colorName: 'Red',
    playerMeaning: 'Enemy, death risk, combat threat',
    textColor: 'text-red-500',
    borderColor: 'border-red-500/40',
    bgColor: 'bg-red-500/10',
    cssVar: '--color-entity-enemy'
  },
  {
    type: 'combat_artifact',
    name: 'Combat Artifact | Special Encounter (Red-Gold)',
    colorName: 'Red-Gold',
    playerMeaning: 'Powerful artifact found or used during combat',
    textColor: 'text-red-400 font-semibold',
    borderColor: 'border-amber-500/60',
    bgColor: 'bg-red-950/30',
    cssVar: '--color-item-legendary'
  },
  {
    type: 'combat_breakthrough',
    name: 'Combat Breakthrough | Mid-fight Evolution (Gold-Red)',
    colorName: 'Gold-Red',
    playerMeaning: 'Breakthrough achieved under combat pressure',
    textColor: 'text-amber-400 font-bold',
    borderColor: 'border-red-500/60',
    bgColor: 'bg-amber-950/30',
    cssVar: '--color-entity-mentor'
  },
  {
    type: 'heavenly_tribulation',
    name: 'Heavenly Tribulation | Divine Trial (Purple-Gold)',
    colorName: 'Purple-Gold',
    playerMeaning: 'A moment of supreme destiny or danger',
    textColor: 'text-purple-400 font-bold italic',
    borderColor: 'border-amber-400/70',
    bgColor: 'bg-purple-950/40',
    cssVar: '--color-location-regular'
  },
  {
    type: 'corruption',
    name: 'Permanent Curse | Tragedy (Dark Rose)',
    colorName: 'Dark Rose',
    playerMeaning: 'Permanent damage, curse, tragedy',
    textColor: 'text-rose-600',
    borderColor: 'border-rose-900/40',
    bgColor: 'bg-rose-950/20',
    cssVar: '--color-entity-enemy'
  },
  {
    type: 'mystery',
    name: 'Fate & Prophecy | Regular Location (Purple)',
    colorName: 'Violet',
    playerMeaning: 'Hidden truth, fate thread, prophecy, Regular locations',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    bgColor: 'bg-purple-500/10',
    cssVar: '--color-location-regular'
  },
  {
    type: 'romance',
    name: 'Karmic Affinity | Lover (Pink)',
    colorName: 'Pink',
    playerMeaning: 'Bonds, affection, emotional lock-in',
    textColor: 'text-pink-400',
    borderColor: 'border-pink-500/40',
    bgColor: 'bg-pink-500/10',
    cssVar: '--color-entity-lover'
  },
  {
    type: 'choice_consequence',
    name: 'Karmic Consequence | Great Item (Orange)',
    colorName: 'Orange',
    playerMeaning: 'The world remembers your decision, Great items',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/40',
    bgColor: 'bg-orange-500/10',
    cssVar: '--color-item-great'
  },
  {
    type: 'system_error',
    name: 'System Instability | System Error (Red Glitch)',
    colorName: 'Red glitch',
    playerMeaning: 'The “system” itself is unstable',
    textColor: 'text-red-400 font-bold',
    borderColor: 'border-red-600/60 border-double',
    bgColor: 'bg-red-950/20',
    cssVar: '--color-entity-enemy'
  }
];

// Backwards and alternative type aliases produced by older saves or model drift.
const SYSTEM_TYPE_ALIASES: Record<string, string> = {
  friendly_scan: 'codex_update',
  quest_update: 'codex_update',
  ally_scan: 'codex_update',
  enemy_scan: 'critical_danger',
  danger: 'critical_danger',
  death_event: 'corruption',
  death_flag: 'corruption',
  fate_event: 'mystery',
  fate: 'mystery',
  prophecy: 'mystery',
  revelation: 'mystery',
  karmic_bond: 'romance',
  bond: 'romance',
  relationship: 'romance',
  level_up: 'breakthrough',
  levelup: 'breakthrough',
  skill_acquired: 'progression',
  technique_learned: 'progression',
  ability_gained: 'progression',
  achievement: 'reward',
  loot: 'reward',
  error: 'system_error',
  glitch: 'system_error',
  karma: 'choice_consequence',
  consequence: 'choice_consequence',
  tribulation: 'heavenly_tribulation',
};

export function normalizeSystemType(type?: string): string | undefined {
  // Parsed from LLM-generated JSON: promptType may arrive as a non-string.
  if (typeof type !== 'string' || !type) return undefined;
  const key = type.trim().toLowerCase();
  return SYSTEM_TYPE_ALIASES[key] ?? key;
}

export function getSystemInferredType(context?: string): string {
  if (!context) return "other";

  const lowerContext = context.toLowerCase();

  // Check combinations/multi-matches first so specific combined meanings beat
  // broad single words such as "gain", "update", "record", "death", or "fate".
  if (lowerContext.includes("combat") && lowerContext.includes("artifact")) return "combat_artifact";
  if (lowerContext.includes("combat") && lowerContext.includes("breakthrough")) return "combat_breakthrough";
  if (["tribulation", "divine trial"].some(t => lowerContext.includes(t))) return "heavenly_tribulation";

  if (["system error", "unstable", "glitch", "malfunction", "iron fate warning"].some(t => lowerContext.includes(t))) {
    return "system_error";
  }
  if (["karma backlash", "choice_consequence", "remembers", "consequence", "decision"].some(t => lowerContext.includes(t))) {
    return "choice_consequence";
  }
  if (["danger", "critical", "death threat", "hostile", "enemy"].some(t => lowerContext.includes(t))) {
    return "critical_danger";
  }
  if (["death flag", "death", "corruption", "permanent", "curse", "tragedy"].some(t => lowerContext.includes(t))) {
    return "corruption";
  }
  if (["breakthrough", "evolution", "level up", "level-up", "ascension", "legendary", "awakening"].some(t => lowerContext.includes(t))) {
    return "breakthrough";
  }
  // Bonds/relationships before generic reward words so "soul bond gained" reads as romance.
  if (["romance", "bond", "affection", "karmic affinity", "relationship"].some(t => lowerContext.includes(t))) {
    return "romance";
  }
  if (["loot", "qi gain", "achievement", "reward", "artifact", "treasure", "gain"].some(t => lowerContext.includes(t))) {
    return "reward";
  }
  if (["warning", "risk", "instability", "pressure"].some(t => lowerContext.includes(t))) {
    return "warning";
  }
  if (["fate lock", "fate event", "mystery", "revelation", "fate", "unknown", "prophecy", "truth"].some(t => lowerContext.includes(t))) {
    return "mystery";
  }
  if (["friendly", "update", "quest", "info", "codex", "scan", "record", "discover"].some(t => lowerContext.includes(t))) {
    return "codex_update";
  }
  if (["progress", "stable", "growth", "training", "technique", "skill", "learned", "mastered", "comprehension", "insight"].some(t => lowerContext.includes(t))) {
    return "progression";
  }

  return "other";
}

export interface SystemContextSource {
  title?: string;
  rows?: Array<{ label?: string; value?: string }>;
}

// Flattens the searchable text of a structured system event (title, row
// labels/values, visible content) for semantic color inference.
export function buildSystemContext(system?: SystemContextSource, content?: string): string {
  // Parsed from LLM-generated JSON: rows may arrive as a non-array.
  const rawRows = system?.rows;
  const rows = Array.isArray(rawRows) ? rawRows : [];
  const rowText = rows
    .map(r => `${r?.label ?? ''} ${r?.value ?? ''}`.trim())
    .join(' ');
  return [system?.title, rowText, content].filter(Boolean).join(' ').trim();
}

export function getSystemColorMeaning(promptType?: string, context?: string): SystemColorMeaning {
  let type = normalizeSystemType(promptType) || getSystemInferredType(context);

  let match = SYSTEM_COLORS_LEGEND.find(m => m.type === type);
  if (!match && promptType && context) {
    // Unrecognized promptType: fall back to semantic inference from the
    // surrounding context instead of instantly collapsing to gray.
    type = getSystemInferredType(context);
    match = SYSTEM_COLORS_LEGEND.find(m => m.type === type);
  }
  return match || SYSTEM_COLORS_LEGEND[0]; // default to neutral (gray)
}

export function getSystemPromptColor(promptType?: string, context?: string): string {
  const meaning = getSystemColorMeaning(promptType, context);
  
  if (meaning.type === 'system_error') {
    return `${meaning.borderColor} ${meaning.textColor} ${meaning.bgColor} shadow-[0_0_15px_rgba(239,68,68,0.25)] animate-pulse`;
  }
  if (meaning.type === 'corruption') {
    return `${meaning.borderColor} ${meaning.textColor} ${meaning.bgColor} shadow-[0_0_15px_rgba(159,18,57,0.25)]`;
  }

  const colorShadow = meaning.borderColor.includes('blue') ? 'rgba(59,130,246,0.15)' :
                      meaning.borderColor.includes('green') ? 'rgba(34,197,94,0.15)' :
                      meaning.borderColor.includes('amber') ? 'rgba(251,191,36,0.15)' :
                      meaning.borderColor.includes('orange') ? 'rgba(249,115,22,0.15)' :
                      meaning.borderColor.includes('red') ? 'rgba(239,68,68,0.15)' :
                      meaning.borderColor.includes('rose') ? 'rgba(159,18,57,0.15)' :
                      meaning.borderColor.includes('purple') ? 'rgba(168,85,247,0.15)' :
                      meaning.borderColor.includes('pink') ? 'rgba(236,72,153,0.15)' :
                      'rgba(107,114,128,0.15)';
  return `${meaning.borderColor} ${meaning.textColor} ${meaning.bgColor} shadow-[0_0_15px_${colorShadow}]`;
}
