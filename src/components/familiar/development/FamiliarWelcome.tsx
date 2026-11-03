import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import FocusLock from 'react-focus-lock';
import type { FamiliarOption } from '../shared/familiar';
import { FamiliarHero } from './FamiliarHero';
import './familiar.css';

export interface FamiliarWelcomeProps {
  /** The reader's Familiar, as the catalogue shows it. */
  familiar: FamiliarOption;
  /** The name the reader knows it by: their own, or the catalogue's. */
  name?: string;
  /**
   * What it says when the reader first meets it. Each Familiar will have its
   * own; until then, one greeting in its name.
   */
  greeting?: string;
  /** Takes the reader to the Familiar's guides. */
  onShowAround: () => void;
  /** Closes the welcome; the guides stay on the Familiar page. */
  onLater: () => void;
}

/**
 * The first meeting: the reader's Familiar introduces itself, once, and
 * offers to show them around. It is the first thing a new reader is taught,
 * so it says who the Familiar is and where its guides live, nothing more.
 * Escape is Later. A bottom sheet on a phone, a centred card on wider screens.
 */
export function FamiliarWelcome({ familiar, name = familiar.name, greeting, onShowAround, onLater }: FamiliarWelcomeProps) {
  const titleId = useId();
  const lineId = useId();
  const [portraitFailed, setPortraitFailed] = useState(false);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onLater(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onLater]);
  const line = greeting ?? `I’ll be with you through every story: reading, creating, and everything in between. Want me to show you around?`;
  return createPortal(
    <FocusLock returnFocus>
      <div className="familiar-welcome" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={lineId} data-familiar-welcome>
        <div className="familiar-welcome-card">
          <div className="familiar-welcome-art" aria-hidden>
            {familiar.portraitUrl && !portraitFailed
              ? <img src={familiar.portraitUrl} alt="" decoding="async" onError={() => setPortraitFailed(true)} />
              : <FamiliarHero option={familiar} active className="familiar-welcome-hero" />}
          </div>
          <p className="familiar-welcome-kicker">Your Familiar</p>
          <h2 id={titleId} className="familiar-welcome-title">I’m {name}.</h2>
          <p id={lineId} className="familiar-welcome-line">{line}</p>
          <div className="familiar-welcome-actions">
            <button type="button" className="is-primary" onClick={onShowAround} autoFocus data-familiar-welcome-tour>Show me around</button>
            <button type="button" onClick={onLater} data-familiar-welcome-later>Later</button>
          </div>
          <p className="familiar-welcome-note">You can find my guides any time on the Familiar page.</p>
        </div>
      </div>
    </FocusLock>,
    document.body,
  );
}
