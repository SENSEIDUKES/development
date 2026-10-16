import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COLOR_CODES, COLOR_CODE_PALETTE_IDS, getColorCodeStyle, getColorCodeSurfaceStyle, getColorCodeValue, getSystemColorMeaning, getSystemColorStyle, resolveCreatureThreatColorCode, resolvePlotThreadStatusColorCode, resolveCodexEntityBand, getCodexEntityBandColorCode, resolveArtifactColorCode, resolveCharacterRelationshipColorCode, resolveCodexEntityColorCode, resolveFactionAlignmentColorCode, resolveFactionStatusColorCode, resolveFateFlagColorCode, resolveFateResultColorCode, resolveFateTypeColorCode, resolveLocationColorCode, resolveLocationSafetyColorCode, resolveKarmaMetricColorCode, resolveRelationshipAffinityColorCode, resolveSystemBadgeColorCode, resolveSystemOutcomeColorCode, type ColorCodeId } from '@seihouse/sen/color-codes';

const expectedSystemColorCodes: Record<string, ColorCodeId> = {
  neutral: 'unknown',
  other: 'unknown',
  codex_update: 'mainCharacter',
  progression: 'ally',
  breakthrough: 'mentor',
  reward: 'itemLegendary',
  warning: 'warning',
  critical_danger: 'enemy',
  combat_artifact: 'enemy',
  combat_breakthrough: 'mentor',
  heavenly_tribulation: 'mystery',
  corruption: 'corruption',
  mystery: 'mystery',
  romance: 'bond',
  choice_consequence: 'warning',
  system_error: 'enemy',
  friendly_scan: 'mainCharacter',
  quest_update: 'mainCharacter',
  ally_scan: 'mainCharacter',
  enemy_scan: 'enemy',
  danger: 'enemy',
  death_event: 'corruption',
  death_flag: 'corruption',
  fate_event: 'mystery',
  fate: 'mystery',
  prophecy: 'mystery',
  revelation: 'mystery',
  quest: 'mystery',
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
  karma: 'warning',
  consequence: 'warning',
  tribulation: 'mystery',
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
  it.each([
    ['Safe', 'ally'], [' safe ', 'ally'], ['Unsafe', 'warning'],
    ['Dangerous', 'warning'], ['Lethal', 'enemy'], ['Deadly', 'enemy'],
    ['Neutral', 'unknown'], ['Guarded', 'unknown'], ['Not safe', 'unknown'],
    ['Safety unknown', 'unknown'], ['', 'unknown'], [undefined, 'unknown'],
  ] as const)('classifies safety %s without substring matches or invented danger', (input, expected) => {
    expect(resolveLocationSafetyColorCode(input)).toBe(expected);
  });

  it('keeps known location danger ahead of prestige and hidden significance', () => {
    for (const [entry, expected] of [
      [{ description: 'A sacred hidden valley', safetyLevel: 'Lethal' }, 'enemy'],
      [{ realm: 'Divine Realm', safetyLevel: 'Unsafe' }, 'warning'],
      [{ description: 'A hidden valley' }, 'mystery'],
      [{ description: 'A forbidden road' }, 'warning'],
      [{ description: 'A village', safetyLevel: 'Safe' }, 'location'],
    ] as const) {
      expect(resolveLocationColorCode(entry)).toBe(expected);
      expect(resolveCodexEntityColorCode('location', entry)).toBe(expected);
      expect(getCodexEntityBandColorCode(resolveCodexEntityBand('location', entry))).toBe(expected);
    }
  });

  it.each([
    ['Harmless', 'ally'], ['Low', 'unknown'], ['Moderate', 'warning'],
    ['Medium', 'warning'], ['High', 'enemy'], [' DEADLY ', 'enemy'],
    ['Unclassified', 'unknown'], ['', 'unknown'], [undefined, 'unknown'],
  ] as const)('resolves threat %s from its actual severity', (input, expected) => {
    expect(resolveCreatureThreatColorCode(input)).toBe(expected);
  });

  it('does not confuse incomplete or inactive records with harm or support', () => {
    expect(resolveFactionStatusColorCode('Inactive')).toBe('unknown');
    expect(resolveFactionStatusColorCode(' active ')).toBe('ally');
    expect(resolveFactionStatusColorCode('Fractured')).toBe('warning');
    expect(resolvePlotThreadStatusColorCode('unresolved')).toBe('mystery');
    expect(resolvePlotThreadStatusColorCode('resolved')).toBe('ally');
    expect(resolveFateResultColorCode()).toBe('unknown');
    expect(resolveFateResultColorCode('unrecognized')).toBe('unknown');
  });

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
    expect(resolveCharacterRelationshipColorCode({ portraitKind: 'non-human' })).toBe('unknown');
    expect(resolveCharacterRelationshipColorCode({ portraitKind: 'non-human', relationshipToMC: 'ally' })).toBe('ally');
    expect(resolveCharacterRelationshipColorCode({ portraitKind: 'non-human', relationshipToMC: 'enemy' })).toBe('enemy');
    expect(resolveCharacterRelationshipColorCode({ portraitKind: 'non-human', relationshipToMC: 'partner' })).toBe('bond');
    expect(resolveCharacterRelationshipColorCode({ portraitKind: 'non-human', relationshipToMC: 'mentor' })).toBe('mentor');
    expect(resolveCharacterRelationshipColorCode({ name: 'Unresolved stranger' }, 'Rin')).toBe('unknown');

    expect(resolveArtifactColorCode({ tier: 'Primordial' })).toBe('itemLegendary');
    expect(resolveArtifactColorCode({ tier: 'Heaven' })).toBe('itemGreat');
    expect(resolveArtifactColorCode({ tier: 'Earth' })).toBe('itemGood');
    expect(resolveArtifactColorCode({ tier: 'Mortal' })).toBe('itemDecent');
    expect(resolveArtifactColorCode({ tier: 'Common' })).toBe('itemBasic');
    expect(resolveLocationColorCode({ description: 'A sacred hidden valley' })).toBe('specialLocation');
    expect(resolveLocationColorCode({ realm: 'Mortal Realm' })).toBe('location');
    expect(resolveLocationSafetyColorCode('Safe')).toBe('ally');
    expect(resolveLocationSafetyColorCode('Dangerous')).toBe('warning');
    expect(resolveLocationSafetyColorCode('Lethal')).toBe('enemy');
    expect(resolveFactionAlignmentColorCode('Righteous')).toBe('ally');
    expect(resolveFactionAlignmentColorCode('Demonic')).toBe('enemy');
    expect(resolveFactionAlignmentColorCode('Mysterious')).toBe('mystery');
    expect(resolveFactionStatusColorCode('Active')).toBe('ally');
    expect(resolveFactionStatusColorCode('Destroyed')).toBe('enemy');
    expect(resolveKarmaMetricColorCode('debt')).toBe('enemy');
    expect(resolveKarmaMetricColorCode('boon')).toBe('ally');
    expect(resolveKarmaMetricColorCode('destiny')).toBe('mentor');
    expect(resolveRelationshipAffinityColorCode(5)).toBe('ally');
    expect(resolveRelationshipAffinityColorCode(-5)).toBe('enemy');
    expect(resolveRelationshipAffinityColorCode(0)).toBe('unknown');
    expect(resolveSystemOutcomeColorCode('positive')).toBe('ally');
    expect(resolveSystemOutcomeColorCode('uncertain')).toBe('unknown');
    expect(resolveSystemOutcomeColorCode('warning')).toBe('warning');
    expect(resolveSystemOutcomeColorCode('negative')).toBe('enemy');
    expect(resolveSystemBadgeColorCode('light')).toEqual({ colorCode: 'unknown' });
    expect(resolveSystemBadgeColorCode('moderate')).toEqual({ colorCode: 'warning' });
    expect(resolveSystemBadgeColorCode('severe')).toEqual({ colorCode: 'enemy' });
    expect(resolveSystemBadgeColorCode('deadly')).toEqual({ colorCode: 'itemBasic', inverted: true });
    expect(resolveFateResultColorCode('FATE AVERTED')).toBe('mentor');
    expect(resolveFateResultColorCode('FATE SCARRED')).toBe('corruption');
    expect(resolveFateResultColorCode('DOOM MANIFESTED')).toBe('corruption');
    expect(resolveFateFlagColorCode('death')).toBe('corruption');
    expect(resolveFateFlagColorCode('ironFate')).toBe('mentor');
    expect(resolveFateTypeColorCode('Death Fate')).toBe('corruption');
    expect(resolveFateTypeColorCode('Love Fate')).toBe('bond');
    expect(resolveFateTypeColorCode('Kingdom Fate')).toBe('mentor');
    expect(resolveFateTypeColorCode('Villain Fate')).toBe('mystery');
    expect(resolveFateTypeColorCode('Betrayal Fate')).toBe('warning');
    expect(resolveFateTypeColorCode('Poverty Fate')).toBe('warning');
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
    expect(appEntry).toContain("import '@seihouse/sen/styles.css';");

    const breakthrough = getSystemColorMeaning('breakthrough');
    expect(getSystemColorStyle(breakthrough)).toMatchObject({
      color: getColorCodeValue('mentor'),
      '--system-color': getColorCodeValue('mentor'),
      '--system-color-border': getColorCodeValue('mentor'),
      '--system-color-surface': getColorCodeValue('mentor'),
    });
  });

  it.each(COLOR_CODE_PALETTE_IDS)('keeps %s readable and separates conflicting signals', palette => {
    const css = readFileSync(fileURLToPath(new URL('./color-codes.css', import.meta.url)), 'utf8');
    const declarations = (body: string) => Object.fromEntries(
      [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, key, value]) => [key, value.trim()]),
    );
    const base = css.match(/:root\s*\{([^}]+)\}/)?.[1];
    expect(base).toBeTruthy();
    const override = palette === 'default' ? '' : css.match(
      new RegExp(`:root\\[data-palette="${palette}"\\]\\s*\\{([^}]+)\\}`),
    )?.[1];
    if (palette !== 'default') expect(override).toBeTruthy();
    const variables = { ...declarations(base!), ...declarations(override ?? '') };
    const resolve = (name: string, seen = new Set<string>()): string => {
      if (seen.has(name)) throw new Error(`Circular palette alias: ${name}`);
      seen.add(name);
      const value = variables[name];
      expect(value, name).toBeDefined();
      const alias = value.match(/^var\((--[\w-]+)\)$/)?.[1];
      if (alias) return resolve(alias, seen);
      expect(value).toMatch(/^#[\da-f]{6}$/i);
      return value;
    };
    const colors = Object.fromEntries(Object.values(COLOR_CODES).map(code => [code.id, resolve(code.cssVar)])) as Record<ColorCodeId, string>;
    const floor = palette === 'high_contrast_dark' ? 7 : 4.5;
    for (const [code, color] of Object.entries(colors)) {
      // getColorCodeSurfaceStyle and System prompts use a 10% sRGB token tint.
      const tint = (opacity: number, base: number) => '#' + color.slice(1).match(/../g)!.map(channel =>
        Math.round(Number.parseInt(channel, 16) * opacity + base * (1 - opacity)).toString(16).padStart(2, '0'),
      ).join('');
      // Fate cards also use an 18% tint over #171717 in their gradient.
      for (const background of ['#111111', tint(0.1, 17), tint(0.18, 23)]) {
        expect(contrastRatio(color, background), `${palette}: ${code} on ${background}`).toBeGreaterThanOrEqual(floor);
      }
    }
    // Intended family sharing (e.g. ally/uncommon) is fine. These collisions are not.
    const distinctPairs: Array<[ColorCodeId, ColorCodeId]> = [
      ['mainCharacter', 'enemy'], ['mainCharacter', 'bond'], ['ally', 'enemy'],
      ['ally', 'mentor'], ['bond', 'corruption'], ['enemy', 'corruption'],
      ['warning', 'mentor'], ['warning', 'itemGreat'], ['warning', 'enemy'],
      ['mystery', 'location'], ['itemGood', 'bond'],
    ];
    for (const [left, right] of distinctPairs) {
      expect(colors[left], `${palette}: ${left} / ${right}`).not.toBe(colors[right]);
    }
  });
});
