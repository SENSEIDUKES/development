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
