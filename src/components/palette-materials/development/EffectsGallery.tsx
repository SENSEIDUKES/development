import { LibraryButton } from '@seihouse/library-ui';
import { LibraryMaterialSurface } from '@seihouse/library/presentation';
import { NovelExpandedLogo } from '@library-studios/brand';
import '@library-studios/brand/styles.css';
import { MaterialSurface } from './samples';

/** Live owners, not screenshots or re-created gradients. */
export function EffectsGallery() {
  return <section id="pm-effects" className="pm-section">
    <div className="pm-section-heading"><div><span className="pm-eyebrow">Light and motion</span><h2>Rings, glows and highlights.</h2></div><p>Hover, tap or Tab through the real controls to compare their resting, pressed and focus effects.</p></div>
    <div className="pm-effects-grid">
      <article><h3>Spectrum action</h3><LibraryMaterialSurface material="rainbow-action">Carve new destiny</LibraryMaterialSurface><p>Primary actions · Library UI ManifestButton. Animated rainbow edge and outer halo.</p><LibraryMaterialSurface material="rainbow-action" disabled>Disabled action</LibraryMaterialSurface></article>
      <article><h3>Emblem spectrum</h3><NovelExpandedLogo /><p>App header · @library-studios/brand. The logo’s own animated ring and halo.</p></article>
      <article><h3>Reader border</h3><LibraryMaterialSurface material="reader" className="pm-effect-panel">Reader blue</LibraryMaterialSurface><p>Panels and sheets · reader-glass.css. Rounded gold-to-blue rim and cool inner highlight.</p></article>
      <article><h3>Codex spectrum</h3><button type="button" className="reader-glass-control reader-glass-primary rounded-full" style={{ width: 64, height: 64 }}>Aa</button><p>Reader Codex action · reader-glass.css. The quieter animated spectrum halo.</p></article>
      <article><h3>Navigation selection</h3><MaterialSurface id="navigation" /><p>Library UI navigation · native selected edge, hover and focus glow. The material fill is archived; these interaction effects remain in use.</p></article>
      <article><h3>Button highlights</h3><LibraryButton variant="primary">Night glass</LibraryButton><LibraryButton variant="secondary">Secondary glass</LibraryButton><p>Library UI buttons + night-glass.css · existing hover, press and focus highlights. These material variants are archived.</p></article>
    </div>
    <p className="pm-note">Effects retain their owners’ motion and accessibility behavior. They are shown separately from material experiments; editing a surface halo does not replace a component’s animated rainbow.</p>
  </section>;
}
