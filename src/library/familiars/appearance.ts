import type { FamiliarElement } from './contracts';

/** The equipped Familiar's element; independent from the cultivator's mastered name effect. */
export const FAMILIAR_ELEMENT_AFFINITY: Readonly<Record<string, FamiliarElement>> = {
  phoenix: 'fire',
  'nine-tailed-fox': 'fire',
  'lady-bug': 'fire',
  'little-monkey-king': 'lightning',
  quill: 'lightning',
  'celestial-moon-moth': 'frost',
  'frostforged-golem': 'frost',
  'celestial-guardian': 'celestial',
  'lucky-bake-danuki': 'celestial',
  'galaxy-octopus': 'void',
  'judgmental-jiangshi': 'void',
  'living-grimoire': 'void',
};

export const familiarElement = (familiarId: string): FamiliarElement => FAMILIAR_ELEMENT_AFFINITY[familiarId] ?? 'celestial';

/** First-party elemental colors, shared by Familiar forms and generation presentation. */
const ELEMENT_COLORS: Readonly<Partial<Record<FamiliarElement, { accent: string; soft: string }>>> = {
  fire: { accent: '#ff6a13', soft: '#ffd2aa' },
  lightning: { accent: '#2589ff', soft: '#b9e4ff' },
  frost: { accent: '#6bd6f0', soft: '#d3f5ff' },
  celestial: { accent: '#d5b668', soft: '#fff0bf' },
  void: { accent: '#994bfa', soft: '#e1c6ff' },
};

export const familiarElementColors = (element: FamiliarElement) => ELEMENT_COLORS[element] ?? ELEMENT_COLORS.celestial!;
