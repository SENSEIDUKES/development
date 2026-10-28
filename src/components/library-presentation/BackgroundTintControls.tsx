import { LibraryButton } from '@seihouse/library-ui';
import { LibraryAppearanceScope } from './LibraryAppearanceScope';
import { LibraryMaterialSurface } from './LibraryMaterialSurface';
import { backgroundTintColor, DEFAULT_BACKGROUND_TINT, type BackgroundTint } from './backgroundTint';

/** Shared preference controls; the host supplies persistence through its profile port. */
export function BackgroundTintControls({ value, onChange, disabled = false, onApplyAppColors, appColorsActive = false }: {
  value?: BackgroundTint; onChange: (value?: BackgroundTint) => void; disabled?: boolean;
  onApplyAppColors?: () => void; appColorsActive?: boolean;
}) {
  const tint = value ?? DEFAULT_BACKGROUND_TINT;
  return <div className="space-y-4 py-1">
    {onApplyAppColors && <div role="group" aria-label="Appearance presets" className="space-y-2">
      <LibraryButton variant="secondary" fullWidth className="min-h-11" disabled={disabled} aria-pressed={appColorsActive} onClick={onApplyAppColors}>
        App colors · Default
      </LibraryButton>
      <p className="text-xs text-neutral-400">Purple glass, original accents, black controls and spectrum glows.</p>
    </div>}
    <label className="flex min-h-11 flex-wrap items-center gap-3">
      <span className="font-sc text-sm">Background color</span>
      <input type="color" aria-label="Background color" value={tint.color} disabled={disabled}
        onChange={event => onChange({ ...tint, color: event.target.value })}
        className="h-11 w-14 cursor-pointer rounded-lg border border-white/25 bg-black p-1 disabled:cursor-not-allowed" />
      <span className="text-sm text-neutral-300">{tint.color}</span>
    </label>
    <label className="block space-y-1">
      <span className="flex justify-between gap-3 text-sm"><span>Tint strength</span><output>{tint.strength}%</output></span>
      <input type="range" aria-label="Tint strength" min={0} max={100} step={1} value={tint.strength} disabled={disabled}
        style={{ accentColor: 'var(--library-accent, var(--color-sen-portal))' }}
        aria-valuetext={tint.strength === 0 ? 'Black' : `${tint.strength}% color`}
        onChange={event => onChange({ ...tint, strength: Number(event.target.value) })}
        className="min-h-11 w-full cursor-pointer disabled:cursor-not-allowed" />
      <span className="flex justify-between text-xs text-neutral-400"><span>Black</span><span>Full color</span></span>
    </label>
    <LibraryAppearanceScope backgroundTint={value}>
      <LibraryMaterialSurface material="violet-shell" className="flex min-h-28 flex-wrap items-center justify-between gap-3 p-4" role="group" aria-label="Background tint preview">
        <div><span className="text-2xl font-serif">Aa</span><p className="text-sm">Your next chapter</p></div>
        <LibraryMaterialSurface material="violet-card" className="flex w-full flex-wrap items-center justify-between gap-3 p-3" aria-label="Card tint preview">
          <span className="text-sm">Your story</span>
          <LibraryMaterialSurface material="black-control" className="px-4 py-2 text-sm">Button</LibraryMaterialSurface>
        </LibraryMaterialSurface>
      </LibraryMaterialSurface>
    </LibraryAppearanceScope>
    <p className="text-xs text-neutral-400">Colors stay dark enough for clear text. Background and plain cards share the tint, while the glass keeps its blur and transparency.</p>
    <LibraryButton variant="secondary" size="sm" className="min-h-11" disabled={disabled || !value}
      onClick={() => onChange(undefined)}>Use default background</LibraryButton>
    <details className="text-xs text-neutral-400"><summary className="cursor-pointer py-2">Color details</summary>
      <p>Chosen color: {tint.color}. Background tone: {backgroundTintColor(tint)}{!value && ' (app default, with its existing light gradients)'}.</p>
    </details>
  </div>;
}
