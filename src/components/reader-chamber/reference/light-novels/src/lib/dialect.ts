import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

export type Dialect = 'xianxia' | 'litrpg' | 'modern_romance' | 'dark_fantasy' | 'military' | 'plain';

export const DIALECT_DICTIONARY: Record<Dialect, Record<string, string>> = {
  plain: {
    relationship_map: "Relationship Map",
    relationship_bond: "Relationship Bond",
    daoist_node: "character node",
    cosmic_grid: "relationship network",
    steer_chamber: "Story Steering Chamber",
    suggested_paths: "Suggested Paths",
    prompt_box: "Prompt Box",
    alter_fate: "Story Steering",
    divine_command: "Command Prompt",
    face_slapping: "Comeback Level",
    fate_pressure: "Stakes",
  },
  xianxia: {
    relationship_map: "Karma Web",
    relationship_bond: "Karma Bond",
    daoist_node: "Daoist node",
    cosmic_grid: "cosmic grid",
    steer_chamber: "The Great Steering Chamber",
    suggested_paths: "Divine Paths of Ascension",
    prompt_box: "Editable Destiny Script",
    alter_fate: "Alter Fate",
    divine_command: "Divine Command",
    face_slapping: "Face-Slapping",
    fate_pressure: "Dao Pressure",
  },
  litrpg: {
    relationship_map: "Party Grid",
    relationship_bond: "Affinity Stat",
    daoist_node: "party member",
    cosmic_grid: "party UI",
    steer_chamber: "Quest Director Panel",
    suggested_paths: "System Quest Lines",
    prompt_box: "Custom Quest Override",
    alter_fate: "Quest Direction",
    divine_command: "Admin Command",
    face_slapping: "Ownage Level",
    fate_pressure: "Difficulty",
  },
  dark_fantasy: {
    relationship_map: "Blood Web",
    relationship_bond: "Blood Oath",
    daoist_node: "soul",
    cosmic_grid: "abyssal network",
    steer_chamber: "The Architect's Chamber",
    suggested_paths: "Grim Fates",
    prompt_box: "Dark Will",
    alter_fate: "Omen Path",
    divine_command: "Abyssal Command",
    face_slapping: "Brutality Level",
    fate_pressure: "Doom Pressure",
  },
  modern_romance: {
    relationship_map: "Emotional Ties",
    relationship_bond: "Deepen Connection",
    daoist_node: "character",
    cosmic_grid: "social network",
    steer_chamber: "Plot Director",
    suggested_paths: "Story Beats",
    prompt_box: "Scenario Override",
    alter_fate: "Plot Direction",
    divine_command: "Plot Direction",
    face_slapping: "Scandal",
    fate_pressure: "Relationship Drama",
  },
  military: {
    relationship_map: "Chain of Command",
    relationship_bond: "Alliance",
    daoist_node: "unit",
    cosmic_grid: "theater of operations",
    steer_chamber: "Command Center",
    suggested_paths: "Campaign Orders",
    prompt_box: "Tactical Directive",
    alter_fate: "Operation",
    divine_command: "High Command Directive",
    face_slapping: "Tactical Dominance",
    fate_pressure: "Theater Volatility",
  }
};

export function resolveDialect(genrePath?: string): Dialect {
  if (!genrePath) return 'xianxia'; // Default fallback
  const normalized = genrePath.toLowerCase();
  if (normalized.includes('litrpg') || normalized.includes('system')) return 'litrpg';
  if (normalized.includes('romance') || normalized.includes('drama') || normalized.includes('academy')) return 'modern_romance';
  if (normalized.includes('dark') || normalized.includes('grim') || normalized.includes('vampire')) return 'dark_fantasy';
  if (normalized.includes('military') || normalized.includes('war') || normalized.includes('kingdom')) return 'military';
  if (normalized.includes('xianxia') || normalized.includes('xuanhuan') || normalized.includes('cultivation')) return 'xianxia';
  return 'plain';
}

export function getDialectLabel(key: string, genrePath?: string): string {
  const dialect = resolveDialect(genrePath);
  return DIALECT_DICTIONARY[dialect]?.[key] || DIALECT_DICTIONARY['plain']?.[key] || key;
}

export function useDialect(overrideGenrePath?: string) {
  const activeStoryId = useAppStore(state => state.activeStoryId);
  const stories = useAppStore(state => state.stories || []);
  const story = stories.find(s => s.id === activeStoryId);
  
  const genrePath = overrideGenrePath || story?.genre || story?.intake?.genrePath;
  
  return useCallback((key: string) => getDialectLabel(key, genrePath), [genrePath]);
}
