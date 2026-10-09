import type { ReactNode } from 'react';
import { Pencil, Sparkle, type LucideIcon } from 'lucide-react';

export const EditableChip = () => (
  <span data-editable-chip="" className="inline-flex items-center gap-1 rounded-full border border-[rgba(205,178,113,0.3)] bg-[rgba(205,178,113,0.05)] px-2 py-0.5 font-sc text-[9px] font-bold uppercase tracking-[0.18em] text-[#DDC58A]/80">
    <Pencil size={9} aria-hidden="true" />
    Editable
  </span>
);

export const BlueprintSectionHeading = ({
  id,
  icon: Icon,
  title,
  tagline,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  tagline?: string;
}) => (
  <div>
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(205,178,113,0.38)] bg-[radial-gradient(circle_at_32%_28%,rgba(205,178,113,0.14),rgba(11,14,30,0.55)_68%)] text-[#CDB271] shadow-[0_0_16px_rgba(205,178,113,0.12),inset_0_0_10px_rgba(205,178,113,0.08)]"
      >
        <Icon size={15} className="drop-shadow-[0_0_6px_rgba(205,178,113,0.35)]" />
      </span>
      <h2 id={id} className="font-display text-lg font-bold uppercase tracking-[0.12em] text-[#F3EDE0] sm:text-xl">
        {title}
      </h2>
    </div>
    {tagline && (
      <p className="mt-2 max-w-xl font-serif text-[13px] leading-relaxed text-[#B0A99B]">{tagline}</p>
    )}
    <div aria-hidden="true" className="mt-4 flex items-center gap-3">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[rgba(205,178,113,0.16)] to-[rgba(205,178,113,0.3)]" />
      <Sparkle size={9} className="shrink-0 text-[#CDB271]/60" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[rgba(205,178,113,0.16)] to-[rgba(205,178,113,0.3)]" />
    </div>
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
