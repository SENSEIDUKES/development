import type { ReactNode } from 'react';

/**
 * A card's picture slot: the tall portrait of a character, or the corner
 * emblem of a world card. Until a picture exists it shows the card's initial
 * over its kind's gradient; a picture (made or imported) takes its place.
 */
export const PortraitFrame = ({ name, kind, picture, caption, badges, size = 'portrait' }: {
  name: string;
  kind: string;
  /** The card's picture, once one exists. */
  picture?: string;
  /** Shown over the art, under the name (age, role). */
  caption?: string;
  badges?: readonly ReactNode[];
  size?: 'portrait' | 'emblem';
}) => {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <figure className="bp-portrait" data-kind={kind} data-size={size}>
      <div className="bp-portrait-art" aria-hidden="true">
        {picture ? <img src={picture} alt="" /> : <span className="bp-portrait-initial">{initial}</span>}
      </div>
      {size === 'portrait' && (
        <figcaption className="bp-portrait-caption">
          <span className="bp-portrait-name">{name.trim() || 'Unnamed'}</span>
          {caption && <span className="bp-portrait-sub">{caption}</span>}
        </figcaption>
      )}
      {size === 'portrait' && badges?.length ? <div className="bp-portrait-badges">{badges}</div> : null}
    </figure>
  );
};
