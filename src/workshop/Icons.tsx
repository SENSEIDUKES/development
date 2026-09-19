import { LibraryIcon, type LibraryIconName } from '@seihouse/library-ui';

type IconGroup = {
  title: string;
  description: string;
  icons: readonly LibraryIconName[];
};

const ICON_GROUPS: readonly IconGroup[] = [
  {
    title: 'Header',
    description: 'Global Library actions and account identity.',
    icons: [
      'header-exit',
      'header-help',
      'header-manifesting',
      'header-profile',
      'header-profile-female',
      'header-qi',
      'header-qi-yin-yang',
      'header-search',
      'header-settings',
    ],
  },
  {
    title: 'Navigation',
    description: 'Library destinations and primary navigation.',
    icons: [
      'navigation-book',
      'navigation-discovery',
      'navigation-energy',
      'navigation-home',
      'navigation-relic',
      'navigation-stories',
      'navigation-store',
    ],
  },
  {
    title: 'Story Seed',
    description: 'World-building and story-creation vocabulary.',
    icons: [
      'story-ability',
      'story-ally-faction',
      'story-arc',
      'story-bank',
      'story-characters',
      'story-enemy-faction',
      'story-power-system',
      'story-scroll',
      'story-style-chinese',
      'story-style-japanese',
      'story-style-korean',
      'story-world-identity',
    ],
  },
];

function displayName(name: LibraryIconName) {
  return name.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
}

/**
 * Icons — a live catalog of the custom SVG glyphs published by
 * `@seihouse/library-ui`. The public `LibraryIcon` renderer is deliberately
 * used here instead of copied SVG paths, keeping this inspection surface in
 * lockstep with the artifact used by Library components.
 */
export function IconsGrid() {
  return (
    <div className="workshop-icons">
      {ICON_GROUPS.map(group => (
        <section className="workshop-icon-group" key={group.title} aria-labelledby={`icon-group-${group.title}`}>
          <header className="workshop-icon-group-header">
            <h2 id={`icon-group-${group.title}`}>{group.title}</h2>
            <p>{group.description}</p>
          </header>
          <div className="workshop-icon-grid">
            {group.icons.map(name => (
              <article className="workshop-icon-card" key={name}>
                <div className="workshop-icon-preview">
                  <LibraryIcon name={name} size={48} aria-hidden />
                </div>
                <h3>{displayName(name)}</h3>
                <code>{name}</code>
              </article>
            ))}
          </div>
        </section>
      ))}
      <p className="workshop-library-note">
        All 28 previews render the current custom SVG glyphs from <code>@seihouse/library-ui</code>. Use
        the named <code>Library*Icon</code> adapter when it matches the icon’s exact meaning, or{' '}
        <code>LibraryIcon</code> with the identifier shown above.
      </p>
    </div>
  );
}
