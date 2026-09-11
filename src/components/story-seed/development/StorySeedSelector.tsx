import { NarrativeNavigationDrawerPanel } from '../../../presentation';
import { Check, ChevronRight, Sparkles } from 'lucide-react';
import type { StorySeedInput } from '../shared/storySeedSchema';
import { type NarrativeNavigationDrawerAccent as LibraryNavigationDrawerAccent, type NarrativeNavigationDrawerItem as LibraryNavigationDrawerItem, type NarrativeNavigationDrawerProfile as LibraryNavigationDrawerProfile, type NarrativeNavigationDrawerSection as LibraryNavigationDrawerSection } from '../../../presentation';
import {
  FAMILY_ICONS,
  FAMILY_SECTIONS,
  SEED_FAMILIES,
  type SeedFamily,
  type SeedSection,
  type SeedSectionId,
} from './seedSections';
import { SENStorySeedIcon } from './SENStorySeedIcon';

const familyAccent = (family: SeedFamily): LibraryNavigationDrawerAccent =>
  family === 'story' ? 'portal' : 'gold';

/**
 * The default title is the second rank on the cultivation ladder, renamed with
 * it: 'Wandering Disciple' became plain 'Disciple'. The ladder itself lives in
 * the user-profile fork (`user-profile/development/rankVisuals.ts`) and is not
 * imported here — the two forks transfer back to production separately, so
 * neither may depend on the other's `development/` folder.
 */
export const storySeedDrawerProfile = (equippedTitle?: string | null): LibraryNavigationDrawerProfile => ({
  name: equippedTitle?.trim() || 'Disciple',
  detail: equippedTitle?.trim() ? 'Equipped relic title' : 'Default Library title',
  eyebrow: 'Equipped Relic',
  emblem: (
    <span
      aria-hidden="true"
      className="grid size-11 shrink-0 place-items-center rounded-full border border-gold-accent/45 bg-[radial-gradient(circle_at_50%_35%,rgba(212,175,55,0.24),rgba(124,58,237,0.16)_48%,rgba(0,0,0,0.42))] text-gold-accent shadow-[0_0_26px_-10px_rgba(212,175,55,0.78),inset_0_1px_0_rgba(255,255,255,0.14)]"
    >
      <Sparkles size={18} strokeWidth={1.5} />
    </span>
  ),
});

const sectionTrailing = (section: SeedSection, filled: boolean, active: boolean) => (
  <>
    {section.required ? (
      filled ? (
        <Check size={13} className="text-portal" role="img" aria-label="complete" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-human/90" role="img" aria-label="missing" />
      )
    ) : (
      filled && <span className="h-1.5 w-1.5 rounded-full bg-portal/70" role="img" aria-label="has content" />
    )}
    <ChevronRight
      size={13}
      aria-hidden="true"
      className={`transition-opacity ${active ? 'opacity-70' : 'opacity-25 group-hover:opacity-50'}`}
    />
  </>
);

/**
 * Maps the Story/World section model onto the Library navigation drawer
 * shell, preserving the selector's required/filled status indicators and the
 * per-family portal/gold accents.
 */
export function buildStorySeedDrawerSections(
  seed: StorySeedInput,
  activeSection: SeedSectionId,
  onSelect: (id: SeedSectionId) => void,
): LibraryNavigationDrawerSection[] {
  return (['story', 'world'] as SeedFamily[]).map(family => {
    const accent = familyAccent(family);
    // Explicit class names (never template-built) so Tailwind picks them up.
    const accentText = family === 'story' ? 'text-portal' : 'text-gold-accent';
    const FamilyIcon = FAMILY_ICONS[family];
    const familyIcon = typeof FamilyIcon === 'string'
      ? <SENStorySeedIcon name={FamilyIcon} size={14} aria-hidden="true" className={accentText} />
      : <FamilyIcon size={14} aria-hidden="true" className={accentText} />;
    const items: LibraryNavigationDrawerItem[] = FAMILY_SECTIONS[family].map(section => {
      const active = activeSection === section.id;
      const filled = section.isFilled(seed);
      const icon = typeof section.icon === 'string'
        ? <SENStorySeedIcon name={section.icon} size={16} aria-hidden="true"
            className={active ? accentText : 'text-neutral-400 group-hover:text-neutral-300'} />
        : (() => {
          const SectionIcon = section.icon;
          return <SectionIcon size={16} aria-hidden="true"
            className={active ? accentText : 'text-neutral-400 group-hover:text-neutral-300'} />;
        })();
      return {
        id: section.id,
        label: section.label,
        icon,
        active,
        accent,
        required: section.required,
        trailing: sectionTrailing(section, filled, active),
        onSelect: () => onSelect(section.id),
      };
    });
    return {
      id: family,
      label: SEED_FAMILIES[family].label,
      tagline: SEED_FAMILIES[family].tagline,
      icon: familyIcon,
      items,
      footer: (
        <p className="font-serif text-[11px] leading-relaxed text-neutral-400">
          {family === 'story'
            ? 'Origin defines the story. ARC optionally shapes its journey and ending.'
            : 'Optional — the Library can generate the complete world automatically.'}
        </p>
      ),
    };
  });
}


/** Compatibility entry for consumers rendering only the feature section panel. */
export function StorySeedSelector({ seed, activeSection, onSelect, equippedTitle }: {
  seed: StorySeedInput; activeSection: SeedSectionId; onSelect: (id: SeedSectionId) => void; equippedTitle?: string | null;
}) {
  return <NarrativeNavigationDrawerPanel aria-label="Story Seed sections" profile={storySeedDrawerProfile(equippedTitle)}
    sections={buildStorySeedDrawerSections(seed, activeSection, onSelect)} />;
}
