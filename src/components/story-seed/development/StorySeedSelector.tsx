import { memo } from 'react';
import { Check, ChevronRight, Sparkles } from 'lucide-react';
import type { StorySeedInput } from '../shared/storySeedSchema';
import {
  LibraryNavigationDrawerPanel,
  type LibraryNavigationDrawerAccent,
  type LibraryNavigationDrawerItem,
  type LibraryNavigationDrawerProfile,
  type LibraryNavigationDrawerSection,
} from '../../library';
import {
  FAMILY_ICONS,
  FAMILY_SECTIONS,
  haveSameSeedSectionState,
  SEED_FAMILIES,
  type SeedFamily,
  type SeedSection,
  type SeedSectionId,
} from './seedSections';

interface StorySeedSelectorProps {
  seed: StorySeedInput;
  activeSection: SeedSectionId;
  onSelect: (id: SeedSectionId) => void;
  equippedTitle?: string | null;
}

const familyAccent = (family: SeedFamily): LibraryNavigationDrawerAccent =>
  family === 'story' ? 'portal' : 'gold';

export const storySeedDrawerProfile = (equippedTitle?: string | null): LibraryNavigationDrawerProfile => ({
  name: equippedTitle?.trim() || 'Wandering Disciple',
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
        <Check size={13} className="text-portal" aria-label="complete" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-human/90" aria-label="missing" />
      )
    ) : (
      filled && <span className="h-1.5 w-1.5 rounded-full bg-portal/70" aria-label="has content" />
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
    const items: LibraryNavigationDrawerItem[] = FAMILY_SECTIONS[family].map(section => {
      const active = activeSection === section.id;
      const filled = section.isFilled(seed);
      const Icon = section.icon;
      return {
        id: section.id,
        label: section.label,
        icon: (
          <Icon
            size={16}
            aria-hidden="true"
            className={active ? accentText : 'text-neutral-400 group-hover:text-neutral-300'}
          />
        ),
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
      icon: <FamilyIcon size={14} aria-hidden="true" className={accentText} />,
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

/**
 * The Story Seed navigation menu (Story → World) rendered through the Library
 * navigation drawer panel. The desktop sidebar renders it directly; the
 * mobile drawer wraps the same sections in `LibraryNavigationDrawer` (see
 * CreationModal). Pure section navigation — profile access lives in the
 * bottom navigation's Profile tab, not here.
 */
const StorySeedSelectorComponent = ({ seed, activeSection, onSelect, equippedTitle }: StorySeedSelectorProps) => (
  <LibraryNavigationDrawerPanel
    aria-label="Story Seed sections"
    profile={storySeedDrawerProfile(equippedTitle)}
    sections={buildStorySeedDrawerSections(seed, activeSection, onSelect)}
  />
);

export const StorySeedSelector = memo(
  StorySeedSelectorComponent,
  (previous, next) => previous.activeSection === next.activeSection
    && previous.equippedTitle === next.equippedTitle
    && previous.onSelect === next.onSelect
    && haveSameSeedSectionState(previous.seed, next.seed),
);
