import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  COLOR_CODES,
  COLOR_CODE_PALETTE_IDS,
  getColorCodeStyle,
  getColorCodeSurfaceStyle,
  getColorCodeValue,
  getSystemColorMeaning,
  getSystemColorStyle,
  resolveArtifactColorCode,
  resolveCharacterRelationshipColorCode,
  resolveCodexEntityColorCode,
  resolveFactionAlignmentColorCode,
  resolveFactionStatusColorCode,
  resolveFateFlagColorCode,
  resolveFateResultColorCode,
  resolveFateTypeColorCode,
  resolveLocationColorCode,
  resolveLocationSafetyColorCode,
  resolveKarmaMetricColorCode,
  resolveRelationshipAffinityColorCode,
  resolveSystemBadgeColorCode,
  resolveSystemOutcomeColorCode,
  type ColorCodeId,
} from './colorCodes';

const expectedSystemColorCodes: Record<string, ColorCodeId> = {
  neutral: 'unknown',
  other: 'unknown',
  codex_update: 'mainCharacter',
  progression: 'ally',
  breakthrough: 'mentor',
  reward: 'itemLegendary',
  warning: 'itemGreat',
  critical_danger: 'enemy',
  combat_artifact: 'enemy',
  combat_breakthrough: 'mentor',
  heavenly_tribulation: 'location',
  corruption: 'corruption',
  mystery: 'location',
  romance: 'bond',
  choice_consequence: 'itemGreat',
  system_error: 'enemy',
  friendly_scan: 'mainCharacter',
  quest_update: 'mainCharacter',
  ally_scan: 'mainCharacter',
  enemy_scan: 'enemy',
  danger: 'enemy',
  death_event: 'corruption',
  death_flag: 'corruption',
  fate_event: 'location',
  fate: 'location',
  prophecy: 'location',
  revelation: 'location',
  quest: 'location',
  appraisal: 'mentor',
  karmic_bond: 'bond',
  bond: 'bond',
  relationship: 'bond',
  level_up: 'mentor',
  levelup: 'mentor',
  skill_acquired: 'ally',
  technique_learned: 'ally',
  ability_gained: 'ally',
  achievement: 'itemLegendary',
  loot: 'itemLegendary',
  error: 'enemy',
  glitch: 'enemy',
  karma: 'itemGreat',
  consequence: 'itemGreat',
  tribulation: 'location',
};

function relativeLuminance(hex: string) {
  const channels = hex.slice(1).match(/.{2}/g)?.map(channel => Number.parseInt(channel, 16) / 255) ?? [];
  const [red = 0, green = 0, blue = 0] = channels.map(channel => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string) {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Color Codes', () => {
  it('keeps every generated and legacy System event on its intentional Color Code', () => {
    for (const [type, colorCode] of Object.entries(expectedSystemColorCodes)) {
      expect(getSystemColorMeaning(type).colorCode, type).toBe(colorCode);
    }

    // The original combined-event emphasis is presentation metadata, not a
    // competing color map, so it remains beside the canonical Color Code.
    expect(getSystemColorMeaning('combat_artifact').textColor).toContain('font-semibold');
    expect(getSystemColorMeaning('combat_breakthrough').textColor).toContain('font-bold');
    expect(getSystemColorMeaning('heavenly_tribulation').textColor).toContain('italic');
    expect(getSystemColorMeaning('system_error').borderColor).toContain('border-double');
  });

  it('resolves every Reader and Codex entity family through the same semantic tokens', () => {
    expect(resolveCharacterRelationshipColorCode({ relationshipToMC: 'ally' })).toBe('ally');
    expect(resolveCharacterRelationshipColorCode({ relationshipToMC: 'enemy' })).toBe('enemy');
    expect(resolveCharacterRelationshipColorCode({ relationshipToMC: 'enemy of MC' })).toBe('enemy');
    // Current hostility must win over historical affinity on cards, links, and the Karma graph.
    expect(resolveCharacterRelationshipColorCode({ relationshipToMC: 'former ally, now enemy' })).toBe('enemy');
    expect(resolveCharacterRelationshipColorCode({ relationshipToMC: 'fiancée' })).toBe('bond');
    expect(resolveCharacterRelationshipColorCode({ relationshipToMC: 'sect elder' })).toBe('mentor');
    expect(resolveCharacterRelationshipColorCode({ relationshipToMC: 'unknown traveller' })).toBe('unknown');
    expect(resolveCharacterRelationshipColorCode({ portraitKind: 'non-human' })).toBe('nonHuman');
    expect(resolveCharacterRelationshipColorCode({ name: 'Unresolved stranger' }, 'Rin')).toBe('unknown');

    expect(resolveArtifactColorCode({ tier: 'Primordial' })).toBe('itemLegendary');
    expect(resolveArtifactColorCode({ tier: 'Heaven' })).toBe('itemGreat');
    expect(resolveArtifactColorCode({ tier: 'Earth' })).toBe('itemGood');
    expect(resolveArtifactColorCode({ tier: 'Mortal' })).toBe('itemDecent');
    expect(resolveArtifactColorCode({ tier: 'Common' })).toBe('itemBasic');
    expect(resolveLocationColorCode({ description: 'A sacred hidden valley' })).toBe('specialLocation');
    expect(resolveLocationColorCode({ realm: 'Mortal Realm' })).toBe('location');
    expect(resolveLocationSafetyColorCode('Safe')).toBe('ally');
    expect(resolveLocationSafetyColorCode('Dangerous')).toBe('mentor');
    expect(resolveLocationSafetyColorCode('Lethal')).toBe('enemy');
    expect(resolveFactionAlignmentColorCode('Righteous')).toBe('ally');
    expect(resolveFactionAlignmentColorCode('Demonic')).toBe('enemy');
    expect(resolveFactionAlignmentColorCode('Mysterious')).toBe('mainCharacter');
    expect(resolveFactionStatusColorCode('Active')).toBe('ally');
    expect(resolveFactionStatusColorCode('Destroyed')).toBe('enemy');
    expect(resolveKarmaMetricColorCode('debt')).toBe('enemy');
    expect(resolveKarmaMetricColorCode('boon')).toBe('ally');
    expect(resolveKarmaMetricColorCode('destiny')).toBe('mentor');
    expect(resolveRelationshipAffinityColorCode(5)).toBe('ally');
    expect(resolveRelationshipAffinityColorCode(-5)).toBe('enemy');
    expect(resolveRelationshipAffinityColorCode(0)).toBe('unknown');
    expect(resolveSystemOutcomeColorCode('positive')).toBe('ally');
    expect(resolveSystemOutcomeColorCode('uncertain')).toBe('mentor');
    expect(resolveSystemOutcomeColorCode('warning')).toBe('itemGreat');
    expect(resolveSystemOutcomeColorCode('negative')).toBe('enemy');
    expect(resolveSystemBadgeColorCode('light')).toEqual({ colorCode: 'mentor' });
    expect(resolveSystemBadgeColorCode('moderate')).toEqual({ colorCode: 'itemGreat' });
    expect(resolveSystemBadgeColorCode('severe')).toEqual({ colorCode: 'enemy' });
    expect(resolveSystemBadgeColorCode('deadly')).toEqual({ colorCode: 'itemBasic', inverted: true });
    expect(resolveFateResultColorCode('FATE AVERTED')).toBe('mentor');
    expect(resolveFateResultColorCode('FATE SCARRED')).toBe('itemGreat');
    expect(resolveFateResultColorCode('DOOM MANIFESTED')).toBe('corruption');
    expect(resolveFateFlagColorCode('death')).toBe('corruption');
    expect(resolveFateFlagColorCode('ironFate')).toBe('mentor');
    expect(resolveFateTypeColorCode('Death Fate')).toBe('corruption');
    expect(resolveFateTypeColorCode('Love Fate')).toBe('bond');
    expect(resolveFateTypeColorCode('Kingdom Fate')).toBe('mentor');
    expect(resolveFateTypeColorCode('Villain Fate')).toBe('location');
    expect(resolveFateTypeColorCode('Betrayal Fate')).toBe('itemGreat');
    expect(resolveFateTypeColorCode('Poverty Fate')).toBe('mentor');
    expect(resolveFateTypeColorCode('War Fate')).toBe('enemy');
    expect(resolveFateTypeColorCode('Regression Fate')).toBe('mainCharacter');
    expect(resolveFateTypeColorCode('Reputation Fate')).toBe('unknown');
    expect(resolveFateTypeColorCode('World Fate')).toBe('itemGood');
    expect(resolveCodexEntityColorCode('character')).toBe('unknown');
    expect(resolveCodexEntityColorCode('unsupported', { name: 'Unresolved record' })).toBe('unknown');
  });

  it('gives cards and links the same context-sensitive relationship token', () => {
    const entry = { name: 'Aster', relationshipToMC: 'ally' };
    expect(resolveCodexEntityColorCode('character', entry, 'Rin')).toBe('ally');

    entry.relationshipToMC = 'enemy';
    expect(resolveCodexEntityColorCode('character', entry, 'Rin')).toBe('enemy');

    entry.relationshipToMC = 'ally';
    expect(resolveCodexEntityColorCode('character', entry, 'Rin')).toBe('ally');
  });

  it('uses CSS variables for every surface so all accessibility palettes remain authoritative', () => {
    const css = readFileSync(fileURLToPath(new URL('./color-codes.css', import.meta.url)), 'utf8');
    const readerCss = readFileSync(fileURLToPath(new URL('./reader-chamber.css', import.meta.url)), 'utf8');
    const appEntry = readFileSync(fileURLToPath(new URL('../../../App.tsx', import.meta.url)), 'utf8');
    expect(COLOR_CODE_PALETTE_IDS).toEqual([
      'default',
      'protanopia',
      'deuteranopia',
      'tritanopia',
      'high_contrast_dark',
    ]);

    for (const code of Object.values(COLOR_CODES)) {
      const expectedValue = `var(${code.cssVar})`;
      expect(css).toContain(`${code.cssVar}:`);
      expect(getColorCodeValue(code.id)).toBe(expectedValue);
      expect(getColorCodeStyle(code.id)).toEqual({ color: expectedValue });
      expect(getColorCodeSurfaceStyle(code.id).color).toBe(expectedValue);
    }

    for (const paletteId of COLOR_CODE_PALETTE_IDS.filter(id => id !== 'default')) {
      expect(css).toContain(`:root[data-palette="${paletteId}"]`);
    }

    expect(readerCss).toContain("@import './color-codes.css';");
    expect(appEntry).toContain("import './components/reader-chamber/shared/color-codes.css';");

    const breakthrough = getSystemColorMeaning('breakthrough');
    expect(getSystemColorStyle(breakthrough)).toMatchObject({
      color: getColorCodeValue('mentor'),
      '--system-color': getColorCodeValue('mentor'),
      '--system-color-border': getColorCodeValue('mentor'),
      '--system-color-surface': getColorCodeValue('mentor'),
    });

    // The added permanent-curse token remains at the documented 4.5:1 floor
    // against the Reader's #111111 background instead of reintroducing the
    // inaccessible dark rose it replaced.
    const corruptionColor = css.match(/--color-system-corruption:\s*(#[0-9a-fA-F]{6})/)?.[1];
    expect(corruptionColor).toBe('#fb7185');
    expect(contrastRatio(corruptionColor!, '#111111')).toBeGreaterThanOrEqual(4.5);
  });
});
