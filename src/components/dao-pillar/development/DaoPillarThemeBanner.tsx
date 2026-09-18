import React from 'react';
import type { DaoPillarCycle, DaoPillarThemePresentation } from '../shared/daoPillarContracts';
import { formatCycleRange } from './daoPillarFormat';

/**
 * The active theme's banner: its art, name, tagline, pillars, dates and
 * motto, all from Library configuration. Nothing here is chosen by the user.
 */
export function DaoPillarThemeBanner({ theme, cycle }: { theme: DaoPillarThemePresentation; cycle: DaoPillarCycle }) {
  return (
    <section
      className="dao-banner"
      aria-labelledby="dao-banner-name"
      data-dao-theme={theme.id}
      style={{ '--dao-accent': theme.visual.accent, '--dao-gold': theme.visual.gold } as React.CSSProperties}
    >
      <div className="dao-banner-frame">
        <img className="dao-banner-art" src={theme.visual.bannerSrc} alt="" decoding="async" />
        <div className="dao-banner-veil" aria-hidden="true" />
        <div className="dao-banner-copy">
          <h3 id="dao-banner-name" className="dao-banner-name">{theme.name}</h3>
          <p className="dao-banner-tagline">{theme.tagline}</p>
          <p className="dao-banner-dates">
            <span className="sr-only">Active </span>
            <time dateTime={cycle.startsOn}>{formatCycleRange(cycle.startsOn, cycle.endsOn).split(' – ')[0]}</time>
            {' – '}
            <time dateTime={cycle.endsOn}>{formatCycleRange(cycle.startsOn, cycle.endsOn).split(' – ')[1]}</time>
          </p>
        </div>
        {theme.pillars.length > 0 ? (
          <ul className="dao-banner-pillars" aria-label="Theme pillars">
            {theme.pillars.map(pillar => <li key={pillar}>{pillar}</li>)}
          </ul>
        ) : null}
        <span className="dao-banner-seal" aria-hidden="true">{theme.visual.seal}</span>
        <p className="dao-banner-motto">{theme.motto}</p>
      </div>
      <p className="dao-banner-description">{theme.description}</p>
    </section>
  );
}
