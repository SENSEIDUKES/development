import type { CSSProperties } from 'react';
import { LibraryIcon, type LibraryIconName } from '@seihouse/library-ui';
import { LIBRARY_ICON_CATALOG as icons } from '@seihouse/library/presentation';

const GROUPS = [
  { title: 'Basic', description: 'Navigation, account, utility and reward artwork.' },
  { title: 'Special', description: 'Story creation, world-building and expanded narrative artwork.' },
] as const;

/** The existing Icons workspace inspects the exact public R2 artwork used by the Library skin. */
export function IconsGrid() {
  return (
    <div className="workshop-icons">
      {GROUPS.map(group => (
        <section className="workshop-icon-group" key={group.title} aria-labelledby={`icon-group-${group.title}`}>
          <header className="workshop-icon-group-header">
            <h2 id={`icon-group-${group.title}`}>{group.title}</h2>
            <p>{group.description}</p>
          </header>
          <div className="workshop-icon-grid">
            {icons.filter(icon => icon.key.includes(`/${group.title}/`)).map(icon => (
              <article className="workshop-icon-card" key={icon.key}>
                <div className="workshop-icon-preview">
                  {icon.libraryIcons.length
                    ? <LibraryIcon name={icon.libraryIcons[0] as LibraryIconName} size={48} aria-hidden />
                    : <span className="sen-icon" aria-hidden="true" style={{
                        width: 48, height: 48, '--sen-icon-mask': `url("${icon.url}")`,
                      } as CSSProperties} />}
                </div>
                <h3>{icon.file.replace(/\.svg$/, '')}</h3>
                <a href={icon.url} target="_blank" rel="noreferrer">Open SVG</a>
                <code>{icon.libraryIcons.join(', ') || 'Alternate / additional artwork'}</code>
              </article>
            ))}
          </div>
        </section>
      ))}
      <p className="workshop-library-note">
        All {icons.length} icons link to the original public SVGs. Existing Library icon adapters keep
        their semantic identifiers, sizes and currentColor styling; the Library skin selects the R2
        artwork. Original Help and Search are in use; EnergySun is deferred. V2 variants and World remain available here.
      </p>
    </div>
  );
}
