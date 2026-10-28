import { LIBRARY_MATERIALS, LibraryMaterialSurface, type LibraryMaterialId } from '@seihouse/library/presentation';
import type { CSSProperties, ReactNode } from 'react';
import { LibraryButton, LibraryNavigationDrawerPanel, LibraryPanel } from '@seihouse/library-ui';
import { Home, Feather } from 'lucide-react';
import '@seihouse/library/styles.css';
import type { MaterialId } from './model';

export const MATERIALS: { id: MaterialId; name: string; usage: string; origin: string; source: string; archived?: boolean }[] = [
  ...LIBRARY_MATERIALS.map(material => ({ ...material, origin: 'Library · active foundation', source: material.id === 'reader' ? 'src/library/stories/reader-glass.css' : 'src/components/library-presentation/materials.css' })),
  { archived: true, id: 'home', name: 'Home glass', usage: 'Home filters and outer panels', origin: 'Library UI · shared', source: '@seihouse/library-ui · LibraryPanel' },
  { archived: true, id: 'create', name: 'Create glass', usage: 'Origin fields and nested groups', origin: 'Library UI + Story Seed treatment', source: 'src/components/story-seed/development/materials.css · .seed-field-scope .glass-panel' },
  { archived: true, id: 'signin', name: 'Sign-in glass', usage: 'Your Destiny Awaits', origin: 'Library · local material', source: 'src/components/story-seed/development/materials.css · .story-auth-glass' },
  { archived: true, id: 'navigation', name: 'Midnight navigation', usage: 'Home and Create sidebars', origin: 'Library UI · shared', source: '@seihouse/library-ui · LibraryNavigationDrawerPanel (pathways)' },
  { archived: true, id: 'familiar', name: 'Familiar blue', usage: 'Companion helper panel', origin: 'Library · local material', source: 'src/components/familiar/development/familiar.css · .familiar-helper' },
  { archived: true, id: 'button', name: 'Night-glass action', usage: 'Primary app actions', origin: 'Library UI + app override', source: 'src/components/library-presentation/night-glass.css · primary button' },
  { archived: true, id: 'secondary', name: 'Clear-glass action', usage: 'Secondary actions', origin: 'Library UI · package default', source: '@seihouse/library-ui · LibraryButton (secondary)' },
];

/** Canonical rendering, with geometry alone constrained to the common sample size. */
export function MaterialSurface({ id, style, children, className = '', disabled = false }: {
  id: MaterialId; style?: CSSProperties; children?: ReactNode; className?: string; disabled?: boolean;
}) {
  const props = { className: `pm-surface ${className}`, style, 'data-pm-recipe': id };
  const content = children ?? <><span className="pm-specimen-mark">Aa</span><span className="pm-specimen-copy">A world taking shape</span></>;
  if (LIBRARY_MATERIALS.some(material => material.id === id)) return <LibraryMaterialSurface material={id as LibraryMaterialId} {...props} disabled={disabled}>{id === 'rainbow-action' ? children ?? 'Carve new destiny' : content}</LibraryMaterialSurface>;
  if (id === 'home') return <LibraryPanel padding="none" {...props}>{content}</LibraryPanel>;
  if (id === 'create') return <div className="seed-field-scope pm-material-wrap"><div {...props} className={`glass-panel ${props.className}`}>{content}</div></div>;
  if (id === 'signin') return <div {...props} className={`story-auth-glass ${props.className}`}>{content}</div>;
  if (id === 'familiar') return <div {...props} className={`familiar-helper ${props.className}`} style={{ position: 'relative', inset: 'auto', zIndex: 'auto', width: '100%', maxHeight: 'none', ...style }}>{content}</div>;
  if (id === 'navigation') return <div className="pm-material-wrap">
    <LibraryNavigationDrawerPanel {...props} aria-label="Sample navigation" variant="pathways" sidebarMode="pinned" sidebarBehavior="double-tap"
      sections={[{ id: 'sample', label: 'Pathways', items: [
        { id: 'home', label: 'Home', icon: <Home size={16} />, active: true, onSelect: () => {} },
        { id: 'create', label: 'Create', icon: <Feather size={16} />, onSelect: () => {} },
      ] }]} />
    {children && <div className="pm-navigation-content">{children}</div>}
  </div>;
  return <LibraryButton {...props} variant={id === 'button' ? 'primary' : 'secondary'} disabled={disabled} type="button">
    {children ?? 'Carve new destiny'}
  </LibraryButton>;
}

export const COLOR_GROUPS = [
  { name: 'Active foundation', colors: [
    { name: 'Midnight violet', value: '#0b0e1e', usage: 'Header, navigation and footer', sample: 'violet-shell', property: 'backgroundColor' },
    { name: 'Tidal glass', value: '#00374a', usage: 'Outer panels', sample: 'blue-glass', property: 'backgroundColor' },
    { name: 'Smoked glass', value: '#000000', usage: 'Nested panels', sample: 'smoked-glass', property: 'backgroundColor' },
    { name: 'Obsidian', value: '#000000', usage: 'Black controls', sample: 'black-control', property: 'backgroundColor' },
    { name: 'Reader blue', value: '#203a4a', usage: 'Reader panels', sample: 'reader', property: 'gradientStart' },
    { name: 'Shared edge', value: '#d6bd87', usage: 'Reader rim on the foundation materials', sample: 'reader', property: 'borderColor' },
  ] },
  { name: 'Archived background inventory', colors: [
    { name: 'Void', value: '#000000', usage: 'Page foundation', token: '--color-void' },
    { name: 'Midnight', value: '#080f1e', usage: 'Pathways navigation', sample: 'navigation', property: 'backgroundColor' },
    { name: 'Familiar blue', value: '#101c2cf5', usage: 'Helper panel', sample: 'familiar', property: 'backgroundColor' },
    { name: 'Origin tint', value: '#0b0e1e', usage: 'Create glass', sample: 'create', property: 'backgroundColor' },
    { name: 'Reader blue', value: '#203a4a', usage: 'Reader panel · upper gradient', sample: 'reader', property: 'gradientStart' },
    { name: 'Reader deep blue', value: '#0c1c32', usage: 'Reader panel · lower gradient', sample: 'reader', property: 'gradientEnd' },
  ] },
  { name: 'Text', colors: [
    { name: 'Signal', value: '#fafafa', usage: 'Headings', token: '--color-signal' },
    { name: 'Warm white', value: '#f2efe8', usage: 'Primary action', sample: 'button', property: 'color' },
    { name: 'Companion white', value: '#eef7ff', usage: 'Familiar text', sample: 'familiar', property: 'color' },
    { name: 'Muted gray', value: '#a3a3a3', usage: 'Supporting text', token: '--color-neutral-400' },
  ] },
  { name: 'Accents', colors: [
    { name: 'Portal', value: '#04acff', usage: 'Highlights and actions', token: '--color-portal' },
    { name: 'Gold', value: '#d4af37', usage: 'Ornaments and labels', token: '--color-gold-accent' },
    { name: 'Violet', value: 'rgba(124, 92, 255, 0.4)', usage: 'Primary action hover glow', sample: 'button', property: 'hoverGlow' },
    { name: 'Human red', value: '#ff3333', usage: 'Required and warning accents', token: '--color-human' },
  ] },
  { name: 'Archived border inventory', colors: [
    { name: 'Cool panel edge', value: '#bed8ff42', usage: 'Home panel', sample: 'home', property: 'borderColor' },
    { name: 'Warm field edge', value: '#c4b69426', usage: 'Create panel', sample: 'create', property: 'borderColor' },
    { name: 'Sky edge', value: '#94c4ff38', usage: 'Sign-in panel', sample: 'signin', property: 'borderColor' },
    { name: 'Blue-gray edge', value: '#668698', usage: 'Familiar panel', sample: 'familiar', property: 'borderColor' },
  ] },
] as const;
