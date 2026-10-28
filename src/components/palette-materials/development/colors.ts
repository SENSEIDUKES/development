import { LIBRARY_MATERIALS } from '@seihouse/library/presentation';
import { colorParts, type MaterialId, type MeasuredMaterial } from './model';

export interface ColorSwatch { name: string; value: string; usage: string }
export interface ColorGroup { name: string; colors: ColorSwatch[] }
export const THEME_COLORS = [
  { name: 'Portal', token: '--color-sen-portal', usage: 'Default highlights and actions' },
  { name: 'Gold', token: '--color-sen-gold-accent', usage: 'Default ornaments and labels' },
  { name: 'Signal', token: '--color-sen-signal', usage: 'Default headings' },
  { name: 'Human red', token: '--color-sen-human', usage: 'Required and warning accents' },
] as const;

/** Inventory the actual rendered layers, including alpha. No substitute paint values. */
export function materialColors(measured: Partial<Record<MaterialId, MeasuredMaterial>>, tokens: Record<string, string>): ColorGroup[] {
  const surfaces: ColorGroup = { name: 'Foundation surfaces', colors: [] };
  const text: ColorGroup = { name: 'Text', colors: [] };
  const borders: ColorGroup = { name: 'Borders, light and shadow', colors: [] };
  const spectrum: ColorGroup = { name: 'Rainbow and glow', colors: [] };
  const theme: ColorGroup = { name: 'Theme accents (defaults)', colors: [] };
  const archived: ColorGroup = { name: 'Archived color inventory', colors: [] };
  const gradients: ColorGroup = { name: 'Surface gradient layers', colors: [] };
  const add = (group: ColorGroup, name: string, value: string | undefined, usage: string) => {
    if (!value || value === 'transparent' || colorParts(value).alpha === 0) return;
    const previous = group.colors.find(color => color.value.toLowerCase() === value.toLowerCase());
    if (previous) {
      if (!previous.usage.includes(usage)) previous.usage += `; ${usage}`;
    } else group.colors.push({ name, value, usage });
  };
  for (const material of LIBRARY_MATERIALS) {
    const layer = measured[material.id];
    if (!layer) continue;
    add(surfaces, material.name, layer.backgroundColor, material.usage);
    if (material.id === 'reader') {
      add(surfaces, 'Reader blue', layer.gradientColors?.[0], 'Reader panel · upper gradient');
      add(surfaces, 'Reader deep blue', layer.gradientColors?.at(-1), 'Reader panel · lower gradient');
    } else layer.gradientColors?.forEach((color, i) => add(gradients, `${material.name} · gradient ${i + 1}`, color, `${material.name} gradient`));
    add(text, material.id === 'rainbow-action' ? 'Action ivory' : 'Material white', layer.color, `${material.name} text`);
    add(text, 'Supporting white', layer.mutedColor, 'Supporting material text');
    add(borders, 'Shared edge', layer.borderColor, `${material.name} border`);
    layer.rimColors?.forEach((color, i) => add(borders, `Reader rim · stop ${i + 1}`, color, 'Shared Reader rim'));
    layer.shadowColors?.forEach((color, i) => add(borders, `${material.name} · light/shadow ${i + 1}`, color, `${material.name} light and shadow`));
    layer.spectrumColors?.forEach((color, i) => add(spectrum, `Spectrum · stop ${i + 1}`, color, 'Action rainbow ring and halo'));
    add(spectrum, 'Hover violet', layer.hoverGlow, `${material.name} hover glow`);
  }
  for (const color of THEME_COLORS) add(color.token === '--color-sen-signal' ? text : theme, color.name, tokens[color.token], color.usage);
  for (const [id, layer] of Object.entries(measured)) {
    if (!layer || LIBRARY_MATERIALS.some(material => material.id === id)) continue;
    add(archived, `${id} · fill`, layer.backgroundColor, `${id} original fill`);
    layer.gradientColors?.forEach((color, i) => add(archived, `${id} · gradient ${i + 1}`, color, `${id} original gradient`));
    add(archived, `${id} · text`, layer.color, `${id} original text`);
    add(archived, `${id} · edge`, layer.borderColor, `${id} original border`);
  }
  return [surfaces, text, borders, spectrum, theme, gradients, archived];
}
