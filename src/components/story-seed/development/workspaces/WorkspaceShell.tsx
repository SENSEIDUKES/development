import React from 'react';
import { Check, Sparkle, Sparkles } from 'lucide-react';
import { SEED_FAMILIES, type SeedSection } from '../seedSections';

/**
 * Shared field styling for the finalized workspaces — the glass field system
 * from `src/components/library/glass-field.css` (imported via the Library
 * barrel), combined
 * with layout utilities. Text inputs and textareas use `LibraryTextBox` /
 * `LibraryTextArea` (which own these classes internally); only
 * `workspaceCompactLabelClass` remains, for the Story Tags picker headings.
 */
export const workspaceCompactLabelClass =
  'block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1';

/**
 * Muted, sacred family accents for the workspace header chrome. The raw
 * portal cyan is reserved for interactive affordances deeper in the form;
 * the header speaks in parchment gold and soft silver instead.
 */
const familyAccentText = (section: SeedSection) =>
  section.family === 'story' ? 'text-[#CDB271]' : 'text-gold-accent';

/** Family / section breadcrumb + title + tagline every workspace opens with. */
export const WorkspaceShell = ({
  section,
  complete,
  optionalNote,
  children,
}: {
  section: SeedSection;
  complete: boolean;
  /** Replaces the plain "Optional" chip on optional sections (e.g. Story Tags). */
  optionalNote?: string;
  children: React.ReactNode;
}) => {
  const family = SEED_FAMILIES[section.family];
  const Icon = section.icon;
  return (
    <section aria-labelledby={`seed-workspace-${section.id}-title`} className="seed-workspace-shell max-w-3xl">
      <p className="font-sc text-[11px] font-bold uppercase tracking-[0.34em] text-neutral-400">
        <span className={section.family === 'story' ? 'text-[#CDB271]/90' : 'text-gold-accent/80'}>
          {family.label}
        </span>
        <span className="mx-2.5 text-neutral-700">/</span>
        <span className="text-neutral-400">{section.label}</span>
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        <h2
          id={`seed-workspace-${section.id}-title`}
          className="flex items-center gap-3.5 font-display font-bold text-2xl sm:text-3xl uppercase tracking-[0.14em] text-[#F3EDE0]"
        >
          <span
            aria-hidden="true"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[rgba(205,178,113,0.38)] bg-[radial-gradient(circle_at_32%_28%,rgba(205,178,113,0.14),rgba(11,14,30,0.55)_68%)] shadow-[0_0_16px_rgba(205,178,113,0.12),inset_0_0_10px_rgba(205,178,113,0.08)] ${familyAccentText(section)}`}
          >
            <Icon size={19} className="drop-shadow-[0_0_6px_rgba(205,178,113,0.35)]" />
          </span>
          {section.label}
        </h2>
        {section.required && (
          complete ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(168,192,230,0.32)] bg-[rgba(168,192,230,0.06)] px-3 py-1 font-sc text-[10px] font-bold uppercase tracking-[0.22em] text-[#AFC4E4]">
              <Check size={11} aria-hidden="true" />
              Complete
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(205,178,113,0.45)] bg-[rgba(205,178,113,0.07)] px-3 py-1 font-sc text-[10px] font-bold uppercase tracking-[0.22em] text-[#DDC58A] shadow-[0_0_14px_rgba(205,178,113,0.12),inset_0_0_8px_rgba(205,178,113,0.05)]">
              <Sparkle size={10} aria-hidden="true" />
              Required
            </span>
          )
        )}
        {!section.required && (
          <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/60 px-2.5 py-0.5 font-sc text-[10px] uppercase tracking-widest text-neutral-400">
            Optional
            {optionalNote && (
              <span className="border-l border-neutral-800 pl-2 normal-case tracking-normal text-neutral-400">
                {optionalNote}
              </span>
            )}
          </span>
        )}
      </div>
      <p className="mt-3 max-w-xl font-serif text-[15px] leading-relaxed text-[#B0A99B]">
        {section.tagline}
      </p>
      <div aria-hidden="true" className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[rgba(205,178,113,0.16)] to-[rgba(205,178,113,0.34)]" />
        <Sparkle size={10} className="shrink-0 text-[#CDB271]/70" />
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[rgba(205,178,113,0.16)] to-[rgba(205,178,113,0.34)]" />
      </div>
      <div className="mt-6 space-y-7">{children}</div>
    </section>
  );
};

/** Sub-group heading used inside larger workspaces (Story Seed Settings, Characters). */
export const WorkspaceSubheading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="border-b border-neutral-900/70 pb-2 font-sc text-[11px] font-bold uppercase tracking-widest text-neutral-300">
    {children}
  </h3>
);

/** The "how this section helps generation" note from the design reference. */
export const GuidanceNote = ({
  title,
  tone = 'story',
  children,
}: {
  title: string;
  tone?: SeedSection['family'];
  children: React.ReactNode;
}) => (
  <div
    className={`flex gap-3 rounded-xl border p-4 ${
      tone === 'story'
        ? 'border-portal/15 bg-portal/5'
        : 'border-gold-accent/15 bg-gold-accent/5'
    }`}
  >
    <Sparkles
      size={15}
      aria-hidden="true"
      className={`mt-0.5 shrink-0 ${tone === 'story' ? 'text-portal' : 'text-gold-accent'}`}
    />
    <div>
      <p
        className={`font-sc text-[10px] font-bold uppercase tracking-widest ${
          tone === 'story' ? 'text-portal' : 'text-gold-accent'
        }`}
      >
        {title}
      </p>
      <div className="mt-1 font-sans text-xs leading-relaxed text-neutral-400">{children}</div>
    </div>
  </div>
);
