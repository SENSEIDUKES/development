import { ENERGY_GRADE_LABELS, type EnergyGrade } from '@seihouse/library/energy';
import { LibraryHeavenPressureIcon, LibraryImmortalPressureIcon, LibraryMortalPressureIcon } from '@seihouse/library/presentation';

/** Story Seed's Fate Pressure flames: the readers' icons for the three tiers. */
export const TIER_ICONS = { mortal: LibraryMortalPressureIcon, immortal: LibraryImmortalPressureIcon, heaven: LibraryHeavenPressureIcon } as const;

export const TIER_STYLES: Record<EnergyGrade, string> = {
  mortal: 'border-slate-300/25 text-slate-200',
  immortal: 'border-violet-400/40 text-violet-200',
  heaven: 'border-amber-300/45 text-amber-200',
};

/** A tier's flame and name, with what follows it (a price): "🔥 Immortal · 4". */
export function TierBadge({ grade, children, className = '' }: { grade: EnergyGrade; children?: React.ReactNode; className?: string }) {
  const Icon = TIER_ICONS[grade];
  return (
    <span data-energy-grade={grade} className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded border px-1 py-px ${TIER_STYLES[grade]} ${className}`.trim()}>
      <Icon size={12} />{ENERGY_GRADE_LABELS[grade]}{children}
    </span>
  );
}
