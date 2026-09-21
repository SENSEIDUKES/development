import { useId, useState } from 'react';
import type { FamiliarActivity } from '@seihouse/library/familiar';
import { ProductFamiliarSession, ProductFamiliarSurface } from './ProductFamiliarPreview';
import { celestialGuardian } from '../../../host/familiar/celestialGuardian';
import { getPreviewScenario } from '../user-profile/previewData';
import { DEFAULT_USER_PROFILE_PREVIEW_STATE } from '../user-profile/previewStates';
import './familiarPreview.css';

/** Exercise the real atlas and Energy client inside a bounded Workshop canvas. */
export function FamiliarPreview() {
  const [animation, setAnimation] = useState('');
  const [activity, setActivity] = useState<FamiliarActivity | ''>('');
  const [paused, setPaused] = useState(false);
  const selectId = useId();
  const activityId = useId();
  // Reuse the profile's default account identity; only the server supplies Energy.
  const account = getPreviewScenario(DEFAULT_USER_PROFILE_PREVIEW_STATE).currentUser;

  return <section className="familiar-preview" aria-label="Celestial Guardian preview">
    <header className="familiar-preview-heading">
      <div><p className="familiar-eyebrow">Your Familiar</p><h2>{celestialGuardian.displayName}</h2><p>{celestialGuardian.description}</p></div>
      <span className="familiar-preview-tag">Celestial companion</span>
    </header>
    <ProductFamiliarSession><ProductFamiliarSurface activity={activity || undefined} animation={animation || undefined} paused={paused}>
      <div className="familiar-stage"><p>Drag your Familiar around this space. Tap for actions, then choose Energy.</p></div>
    </ProductFamiliarSurface></ProductFamiliarSession>
    <div className="familiar-preview-controls">
      <label htmlFor={activityId}>Codex activity</label>
      <select id={activityId} value={activity} onChange={event => setActivity(event.target.value as FamiliarActivity | '')}>
        <option value="">No active chat</option>
        <option value="running">Running</option>
        <option value="needs-input">Needs input</option>
        <option value="ready">Ready</option>
        <option value="blocked">Blocked</option>
      </select>
      <label htmlFor={selectId}>Inspect atlas clip</label>
      <select id={selectId} value={animation} onChange={event => setAnimation(event.target.value)}>
        <option value="">Automatic</option>
        {Object.entries(celestialGuardian.animations).map(([id, clip]) => <option key={id} value={id}>{clip.label}</option>)}
      </select>
      <button type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Play animation' : 'Pause animation'}</button>
    </div>
    <p className="familiar-preview-note">Codex activity drives the matching supplied running, waiting, review, or blocked clip. An atlas inspection choice deliberately overrides it. Energy uses the current Workshop profile account ({account?.displayName ?? 'signed out'}). Reduced motion displays a still frame.</p>
  </section>;
}
