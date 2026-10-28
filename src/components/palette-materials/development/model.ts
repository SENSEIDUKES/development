import { LIBRARY_MATERIALS } from '@seihouse/library/presentation';
import type { CSSProperties } from 'react';

export const MATERIAL_IDS = [...LIBRARY_MATERIALS.map(material => material.id), 'home', 'create', 'signin', 'navigation', 'familiar', 'button', 'secondary'] as const;
export type MaterialId = typeof MATERIAL_IDS[number];
export type Backdrop = 'black' | 'gray' | 'artwork';
export interface MaterialEdit {
  tint?: string;
  opacity?: number;
  blur?: number;
  borderGlow?: 'original' | 'reader';
  borderColor?: string;
  borderOpacity?: number;
  shadow?: number;
  glowColor?: string;
  glow?: number;
}
export interface PaletteSettings {
  background: Backdrop;
  selected: MaterialId;
  edits: Partial<Record<MaterialId, MaterialEdit>>;
  roles: Record<'navigation' | 'panel' | 'card' | 'button', MaterialId>;
  colors: { text: string; accent: string };
}
export interface SavedLook { id: string; name: string; settings: PaletteSettings }
export const STORAGE_KEY = 'workshop.palette-materials.looks.v1';
export const freshSettings = (): PaletteSettings => ({
  background: 'artwork', selected: 'blue-glass', edits: {},
  roles: { navigation: 'violet-shell', panel: 'blue-glass', card: 'smoked-glass', button: 'rainbow-action' },
  colors: { text: '#f2efe8', accent: '#04acff' },
});

export interface MeasuredMaterial {
  backgroundColor: string; backgroundImage: string; borderColor: string;
  borderWidth: string; boxShadow: string; backdropFilter: string; color: string;
  hoverGlow?: string;
  mutedColor?: string;
  gradientColors?: string[];
  rimColors?: string[];
  shadowColors?: string[];
  spectrumColors?: string[];
  gradientStart?: string;
  gradientEnd?: string;
}
export const cssColors = (value: string): string[] => [...new Set(value.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]+\)/gi) ?? [])];

export function measureMaterial(element: Element): MeasuredMaterial {
  const s = getComputedStyle(element);
  const stops = cssColors(s.backgroundImage);
  const spectrum = element.getAttribute('data-library-material') === 'rainbow-action'
    ? cssColors(getComputedStyle(element, '::before').backgroundImage + ', ' + getComputedStyle(element, '::after').backgroundImage) : [];
  return { backgroundColor: s.backgroundColor, backgroundImage: s.backgroundImage,
    borderColor: s.borderTopColor, borderWidth: s.borderTopWidth,
    boxShadow: s.boxShadow, backdropFilter: s.backdropFilter, color: s.color,
    hoverGlow: cssColors(s.getPropertyValue('--glass-glow-hover'))[0],
    mutedColor: s.getPropertyValue('--library-material-muted').trim() || undefined,
    gradientColors: stops, rimColors: cssColors(s.getPropertyValue('--reader-seam-colors')),
    shadowColors: cssColors(s.boxShadow), spectrumColors: spectrum,
    gradientStart: stops?.[0], gradientEnd: stops?.[stops.length - 1] };
}

export function colorParts(value: string): { hex: string; alpha: number } {
  const hex = value.match(/^#([\da-f]{6})([\da-f]{2})?$/i);
  if (hex) return { hex: '#' + hex[1].toLowerCase(), alpha: hex[2] ? parseInt(hex[2], 16) / 255 : 1 };
  const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
  return { hex: parts.length >= 3 ? '#' + parts.slice(0, 3).map(n => Math.round(n).toString(16).padStart(2, '0')).join('') : '#000000', alpha: parts[3] ?? 1 };
}
function rgba(hex: string, alpha: number) {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${rgb.join(', ')}, ${Math.max(0, Math.min(1, alpha))})`;
}
export function baseOpacity(base: MeasuredMaterial) {
  const alpha = colorParts(base.backgroundColor).alpha;
  if (alpha > 0) return alpha;
  const colors = base.backgroundImage.match(/rgba?\([^)]+\)/g) ?? [];
  return Math.max(0, ...colors.map(color => colorParts(color).alpha));
}
export function baseTint(base: MeasuredMaterial) {
  return colorParts(colorParts(base.backgroundColor).alpha > 0 ? base.backgroundColor : base.backgroundImage.match(/rgba?\([^)]+\)/)?.[0] ?? 'rgb(0, 0, 0)').hex;
}
export const baseBlur = (base: MeasuredMaterial) => Number(base.backdropFilter.match(/blur\(([\d.]+)px\)/)?.[1] ?? 0);

/** Split shadow lists without splitting the commas inside rgb(). */
export const shadowLayers = (shadow: string) => shadow === 'none' ? [] : shadow.split(/,(?![^()]*\))/).map(s => s.trim());
export function isColoredShadow(shadow: string) {
  const rgb = shadow.match(/rgba?\(([^)]+)\)/)?.[1].split(',').slice(0, 3).map(Number);
  return !!rgb && Math.max(...rgb) - Math.min(...rgb) > 15;
}

/** Override only what the owner touched; untouched samples keep their canonical CSS. */
export function materialStyle(base: MeasuredMaterial | undefined, edit: MaterialEdit = {}, reader?: MeasuredMaterial): CSSProperties {
  if (!base) return {};
  const style: CSSProperties = {};
  if (edit.tint !== undefined || edit.opacity !== undefined) {
    const opacity = edit.opacity === undefined ? undefined : edit.opacity / 100;
    const originalAlpha = baseOpacity(base);
    const recolor = (color: string) => {
      const p = colorParts(color);
      return rgba(edit.tint ?? p.hex, opacity === undefined ? p.alpha : originalAlpha > 0 ? p.alpha * opacity / originalAlpha : opacity);
    };
    style.backgroundColor = recolor(base.backgroundColor);
    style.backgroundImage = base.backgroundImage.replace(/rgba?\([^)]+\)/g, recolor);
  }
  if (edit.blur !== undefined) {
    const rest = base.backdropFilter.replace(/blur\([^)]+\)/g, '').replace('none', '').trim();
    style.backdropFilter = `blur(${edit.blur}px) ${rest}`.trim();
    style.WebkitBackdropFilter = style.backdropFilter;
  }
  if (edit.borderColor !== undefined || edit.borderOpacity !== undefined) {
    const p = colorParts(base.borderColor);
    style.borderColor = rgba(edit.borderColor ?? p.hex, (edit.borderOpacity ?? p.alpha * 100) / 100);
    style.borderStyle = 'solid';
    if (parseFloat(base.borderWidth) === 0) style.borderWidth = '1px';
  }
  if (edit.shadow !== undefined || edit.glow !== undefined || edit.glowColor !== undefined) {
    const layers = shadowLayers(base.boxShadow).map(layer => {
      const colored = isColoredShadow(layer);
      const factor = (colored ? edit.glow ?? 100 : edit.shadow ?? 100) / 100;
      return layer.replace(/rgba?\([^)]+\)/g, color => {
        const p = colorParts(color);
        return rgba(colored ? edit.glowColor ?? p.hex : p.hex, p.alpha * factor);
      });
    });
    // A surface without an existing colored halo can still try one.
    if (!shadowLayers(base.boxShadow).some(isColoredShadow) && (edit.glow ?? 0) > 0) {
      layers.push(`0 0 32px ${rgba(edit.glowColor ?? '#04acff', (edit.glow ?? 0) / 400)}`);
    }
    style.boxShadow = layers.join(', ') || 'none';
  }
  if (edit.borderGlow === 'reader' && reader) {
    style.borderColor = reader.borderColor;
    style.borderStyle = 'solid';
    style.borderWidth = reader.borderWidth;
    const shadows = shadowLayers(style.boxShadow as string ?? base.boxShadow).filter(layer => !layer.includes('inset'));
    const light = shadowLayers(reader.boxShadow).filter(layer => layer.includes('inset'));
    style.boxShadow = [...light, ...shadows].join(', ') || 'none';
  }
  return style;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isMaterial = (v: unknown): v is MaterialId => MATERIAL_IDS.includes(v as MaterialId);
const isColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const ranges: Record<string, number> = { opacity: 100, blur: 40, borderOpacity: 100, shadow: 200, glow: 200 };
function validSettings(value: unknown): value is PaletteSettings {
  if (!isRecord(value) || !['black', 'gray', 'artwork'].includes(value.background as string) || !isMaterial(value.selected)
    || !isRecord(value.roles) || !['navigation', 'panel', 'card', 'button'].every(key => isMaterial((value.roles as Record<string, unknown>)[key]))
    || !isRecord(value.colors) || !isColor(value.colors.text) || !isColor(value.colors.accent) || !isRecord(value.edits)) return false;
  return Object.entries(value.edits).every(([id, edit]) => isMaterial(id) && isRecord(edit) && Object.entries(edit).every(([key, v]) =>
    key === 'borderGlow' ? v === 'original' || v === 'reader' : ['tint', 'borderColor', 'glowColor'].includes(key) ? isColor(v) : Object.hasOwn(ranges, key) && typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= ranges[key]));
}
export function encodeLooks(looks: SavedLook[]) { return JSON.stringify({ format: 'palette-materials', version: 2, looks }, null, 2); }
export function decodeLooks(text: string): SavedLook[] {
  if (text.length > 1_000_000) throw new Error('This file is too large. Choose a Palette & Materials export under 1 MB.');
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('This is not valid JSON. Choose a Palette & Materials export.'); }
  if (!isRecord(data) || data.format !== 'palette-materials' || ![1, 2].includes(data.version as number) || !Array.isArray(data.looks) || data.looks.length > 100
    || !data.looks.every(look => isRecord(look) && typeof look.id === 'string' && look.id.length > 0 && look.id.length <= 100
      && typeof look.name === 'string' && look.name.trim().length > 0 && look.name.length <= 80 && validSettings(look.settings))
    || new Set(data.looks.map(look => look.id)).size !== data.looks.length) {
    throw new Error('This file has an unsupported version or invalid look settings. Existing looks were kept.');
  }
  return data.looks as SavedLook[];
}
export function readLooks(storage: Pick<Storage, 'getItem'>): SavedLook[] {
  const raw = storage.getItem(STORAGE_KEY);
  return raw ? decodeLooks(raw) : [];
}
export function writeLooks(storage: Pick<Storage, 'setItem'>, looks: SavedLook[]) {
  if (looks.length > 100) throw new Error('Keep up to 100 looks. Export or delete a look before adding more.');
  storage.setItem(STORAGE_KEY, encodeLooks(looks));
}
