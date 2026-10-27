import React, { useContext, useId, useState } from 'react';
import { Check, Info, Sparkle, Sparkles } from 'lucide-react';
import { handleRadioGroupKeyDown, radioGroupTabIndex } from '../radioGroupKeyboard';
import { SEED_FAMILIES, type SeedSection } from '../seedSections';
import { SENStorySeedIcon } from '../SENStorySeedIcon';
import { SeedPartContext } from '../creator/SeedPart';
import { SECTION_PARTS } from '../creator/creatorSteps';

/**
 * Shared field styling for the finalized workspaces — the glass field system
 * from `@seihouse/library-uiglass-field.css` (imported via the Library
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

/**
 * Family / section breadcrumb + title + tagline every Story Seed section opens
 * with. Section content, not a shell: the Library Shell's `WorkspaceShell` owns
 * the page frame and its workspace mode owns the navigation.
 */
export const SeedSectionFrame = ({
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
  // On a phone, a long step's later parts keep the heading but not the tagline,
  // which its first part already showed.
  const part = useContext(SeedPartContext);
  const showTagline = part === null || SECTION_PARTS[section.id]?.[0]?.id === part;
  const iconClassName = 'drop-shadow-[0_0_6px_rgba(205,178,113,0.35)]';
  const sectionIcon = typeof section.icon === 'string'
    ? <SENStorySeedIcon name={section.icon} size={19} className={iconClassName} />
    : (() => {
      const SectionIcon = section.icon;
      return <SectionIcon size={19} className={iconClassName} />;
    })();
  return (
    <section aria-labelledby={`seed-workspace-${section.id}-title`} className="seed-field-scope max-w-3xl">
      {/* The step strip already says where a phone is, so the breadcrumb is for wider screens. */}
      <p className="hidden font-sc text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400 sm:block">
        <span className={section.family === 'story' ? 'text-[#CDB271]/90' : 'text-gold-accent/80'}>
          {family.label}
        </span>
        <span className="mx-2 text-neutral-700">/</span>
        <span className="text-neutral-400">{section.label}</span>
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:mt-2.5">
        <h2
          id={`seed-workspace-${section.id}-title`}
          className="flex items-center gap-2.5 font-display font-bold text-lg sm:gap-3 sm:text-3xl uppercase tracking-[0.12em] sm:tracking-[0.14em] text-[#F3EDE0]"
        >
          <span
            aria-hidden="true"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(205,178,113,0.38)] bg-[radial-gradient(circle_at_32%_28%,rgba(205,178,113,0.14),rgba(11,14,30,0.55)_68%)] shadow-[0_0_16px_rgba(205,178,113,0.12),inset_0_0_10px_rgba(205,178,113,0.08)] sm:h-11 sm:w-11 ${familyAccentText(section)}`}
          >
            {sectionIcon}
          </span>
          {section.label}
        </h2>
        {section.required && (
          complete ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(168,192,230,0.32)] bg-[rgba(168,192,230,0.06)] px-2.5 py-0.5 font-sc text-[10px] font-bold uppercase tracking-[0.22em] text-[#AFC4E4]">
              <Check size={11} aria-hidden="true" />
              Complete
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(205,178,113,0.45)] bg-[rgba(205,178,113,0.07)] px-2.5 py-0.5 font-sc text-[10px] font-bold uppercase tracking-[0.22em] text-[#DDC58A] shadow-[0_0_14px_rgba(205,178,113,0.12),inset_0_0_8px_rgba(205,178,113,0.05)]">
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
      <p hidden={!showTagline} className="mt-1.5 max-w-xl font-serif text-[13px] leading-snug text-[#B0A99B] sm:mt-2 sm:text-[15px] sm:leading-relaxed">
        {section.tagline}
      </p>
      <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-6">{children}</div>
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

/**
 * A field's explanation in two layers: one short line always shown, and the
 * full explanation behind a small info toggle. Nothing is removed; the long
 * copy simply waits until the author asks for it.
 */
export const SeedNote = ({ children, more, moreLabel = 'More about this' }: {
  children?: React.ReactNode;
  more: React.ReactNode;
  moreLabel?: string;
}) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="block">
      {children}
      <button type="button" aria-expanded={open} aria-controls={id} aria-label={moreLabel} title={moreLabel}
        onClick={() => setOpen(value => !value)}
        className="story-seed-compact-hit-target ml-1 inline-flex translate-y-[2px] items-center text-neutral-400 transition-colors hover:text-[#DDC58A] aria-expanded:text-[#DDC58A]">
        <Info size={13} aria-hidden="true" />
      </button>
      {open && <span id={id} className="mt-1.5 block border-l border-[rgba(205,178,113,0.3)] pl-2.5 text-neutral-300">{more}</span>}
    </span>
  );
};

/**
 * A compact one-line choice: the options sit side by side and only the
 * selected option's description shows beneath them. Keyboard behavior is the
 * shared radio-group pattern; option ids are `${idPrefix}-${value}`.
 */
export function SeedSegmented<T extends string>({ label, idPrefix, value, options, onSelect, describedBy }: {
  label: string;
  idPrefix: string;
  value: T | undefined;
  options: ReadonlyArray<{ value: T; label: string; description?: string; icon?: React.ReactNode }>;
  onSelect: (value: T) => void;
  describedBy?: string;
}) {
  const selected = options.find(option => option.value === value);
  return (
    <div>
      <div role="radiogroup" aria-label={label} aria-describedby={[describedBy, selected?.description ? `${idPrefix}-description` : ''].filter(Boolean).join(' ') || undefined}
        className="grid gap-1 rounded-xl border border-neutral-800/90 bg-black/30 p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option, index) => {
          const isSelected = option.value === value;
          return (
            <button key={option.value} id={`${idPrefix}-${option.value}`} type="button" role="radio" aria-checked={isSelected}
              tabIndex={radioGroupTabIndex(isSelected, Boolean(selected), index)}
              title={option.description}
              onClick={() => onSelect(option.value)} onKeyDown={handleRadioGroupKeyDown}
              className={`min-h-10 min-w-0 rounded-lg px-1.5 py-1 font-sc leading-tight break-words text-[10px] font-bold uppercase tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB271]/70 motion-reduce:transition-none ${isSelected
                ? 'bg-[#CDB271]/10 text-[#F3EDE0] shadow-[inset_0_0_0_1px_rgba(205,178,113,0.5)]'
                : 'text-neutral-400 hover:text-neutral-200'}`}>
              {option.icon ? <span className="flex flex-col items-center gap-1 py-1.5"><span aria-hidden="true">{option.icon}</span><span className="text-[9px] tracking-normal">{option.label}</span></span> : option.label}
            </button>
          );
        })}
      </div>
      {selected?.description && (
        <p id={`${idPrefix}-description`} aria-live="polite" className="mt-1.5 font-sans text-[11px] leading-relaxed text-neutral-300">
          {selected.description}
        </p>
      )}
    </div>
  );
}
