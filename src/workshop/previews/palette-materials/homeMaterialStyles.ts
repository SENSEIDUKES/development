import type { CSSProperties } from 'react';
import { materialStyle, type MaterialId, type MeasuredMaterial, type PaletteSettings } from '../../../components/palette-materials/development/model';

export type MaterialMeasurements = Partial<Record<MaterialId, MeasuredMaterial>>;
const selectors = {
  navigation: ':is(.workspace-header, [data-slot="app-shell-sidebar"], .library-global-navigation > div, .library-footer)',
  panel: ':is([data-home-events], [data-home-panel]:not(.home-featured [data-home-panel]))',
  card: '[data-slot="empty-state"]',
  button: '.home-featured .library-glass-button',
};
// CSS stays in the private frame; no theme tokens or package APIs are changed.
const declarations = (style: CSSProperties) => Object.entries(style).filter(([, value]) => value !== undefined)
  .map(([property, value]) => `${property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}:${value} !important;`).join('');

export function homeMaterialStyles(settings: PaletteSettings, measured: MaterialMeasurements) {
  const rules = Object.entries(selectors).map(([role, selector]) => {
    const id = settings.roles[role as keyof typeof selectors];
    const base = measured[id];
    if (!base) return '';
    // Home may adopt a different combination from an individual original paint.
    // Explicitly assign that paint here; keep the native spectrum action live.
    const assigned: CSSProperties = role === 'button' && id === 'rainbow-action' ? {} : {
      backgroundColor: base.backgroundColor, backgroundImage: base.backgroundImage,
      borderColor: base.borderColor, borderWidth: base.borderWidth, borderStyle: 'solid',
      boxShadow: base.boxShadow, backdropFilter: base.backdropFilter, WebkitBackdropFilter: base.backdropFilter,
    };
    const style = { ...assigned, ...materialStyle(base, settings.edits[id], measured.reader), color: settings.colors.text };
    // Actions always keep the real ManifestButton spectrum; only their face is painted.
    const ring = role === 'button' ? '' : `.pm-home-canvas ${selector}::after { display: ${settings.edits[id]?.borderGlow === 'reader' || !['home', 'create', 'signin', 'navigation', 'familiar', 'button', 'secondary'].includes(id) ? 'block' : 'none'}; }`;
    return `.pm-home-canvas ${selector} { ${declarations(style)} }${ring}`;
  });
  return rules.join('\n') + `
    .pm-home-canvas .library-look { ${settings.colors.text.toLowerCase() === '#ffffff' ? '' : `--color-signal: ${settings.colors.text}; --sh-text-primary: ${settings.colors.text}; --library-material-text: ${settings.colors.text};`} }
    .pm-home-canvas .home-filter-label { color: ${settings.colors.accent}; }
    /* Keep the original media backing and contrast layers, even with fully opaque paints. */
    .pm-home-canvas :is(.home-event, .home-featured [data-home-panel], .world-card-base, .world-card-banner) { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }
    @media (prefers-reduced-transparency: reduce) {
      .pm-home-canvas ${Object.values(selectors).join(', .pm-home-canvas ')} { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; background-color: #111820 !important; background-image: none !important; }
    }
    @media (forced-colors: active) {
      .pm-home-canvas ${Object.values(selectors).join(', .pm-home-canvas ')} { background: Canvas !important; color: CanvasText !important; box-shadow: none !important; border-color: ButtonText !important; }
    }`;
}
