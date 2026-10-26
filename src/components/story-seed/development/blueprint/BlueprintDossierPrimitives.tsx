import type { ReactNode } from 'react';
import { Pencil, Sparkle, type LucideIcon } from 'lucide-react';

export const EditableChip = () => (
  <span data-editable-chip="" className="inline-flex items-center gap-1 rounded-full border border-[rgba(205,178,113,0.3)] bg-[rgba(205,178,113,0.05)] px-2 py-0.5 font-sc text-[9px] font-bold uppercase tracking-[0.18em] text-[#DDC58A]/80">
    <Pencil size={9} aria-hidden="true" />
    Editable
  </span>
);

/**
 * A Star Rail-style section strip: a gold-edged bar with the section's mark
 * and name, its quiet tagline beneath, and an optional action at its end
 * (Edit on a character).
 */
export const BlueprintSectionHeading = ({
  id,
  icon: Icon,
  title,
  tagline,
  action,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  tagline?: string;
  action?: ReactNode;
}) => (
  <div className="bp-heading">
    <div className="bp-heading-bar">
      <Icon size={15} aria-hidden="true" className="bp-heading-icon" />
      <h2 id={id} className="bp-heading-title">{title}</h2>
      <span aria-hidden="true" className="bp-heading-flourish"><Sparkle size={8} /><Sparkle size={8} /></span>
      {action && <span className="bp-heading-action">{action}</span>}
    </div>
    {tagline && <p className="bp-heading-tagline">{tagline}</p>}
  </div>
);

export const MetadataChip = ({
  icon: Icon,
  children,
  gold = false,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  gold?: boolean;
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
      gold
        ? 'border-[rgba(205,178,113,0.45)] bg-[rgba(205,178,113,0.07)] text-[#DDC58A] shadow-[0_0_14px_rgba(205,178,113,0.12)]'
        : 'border-[rgba(172,166,214,0.25)] bg-[rgba(11,14,30,0.5)] text-neutral-300'
    }`}
  >
    {Icon && <Icon size={11} aria-hidden="true" className={gold ? 'text-[#DDC58A]' : 'text-[#ACA6D6]'} />}
    {children}
  </span>
);

export const FieldLabelRow = ({ htmlFor, children }: { htmlFor: string; children: ReactNode }) => (
  <div className="mb-2 flex items-end justify-between gap-3">
    <label className="block font-sc text-xs uppercase tracking-widest text-neutral-400" htmlFor={htmlFor}>
      {children}
    </label>
    <EditableChip />
  </div>
);
