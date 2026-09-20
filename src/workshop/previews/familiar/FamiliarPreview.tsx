import { useId, useState } from 'react';
import { ProductFamiliarSession, ProductFamiliarSurface } from './ProductFamiliarPreview';
import { celestialGuardian } from '../../../host/familiar/celestialGuardian';
import { getPreviewScenario } from '../user-profile/previewData';
import { DEFAULT_USER_PROFILE_PREVIEW_STATE } from '../user-profile/previewStates';
import './familiarPreview.css';

export function FamiliarPreview() {
  const [animation, setAnimation] = useState('idle');
  const [paused, setPaused] = useState(false);
  const selectId = useId();
  // Reuse the profile's default account identity; only the server supplies Energy.
  const account = getPreviewScenario(DEFAULT_USER_PROFILE_PREVIEW_STATE).currentUser;

  return <section className="familiar-preview" aria-label="Celestial Guardian preview">
    <header className="familiar-preview-heading">
      <div><p className="familiar-eyebrow">Your Familiar</p><h2>{celestialGuardian.displayName}</h2><p>{celestialGuardian.description}</p></div>
      <span className="familiar-preview-tag">Celestial companion</span>
    </header>
    <ProductFamiliarSession><ProductFamiliarSurface animation={animation} paused={paused}>
      <div className="familiar-stage"><p>Drag your Familiar around this space. Tap to see Energy.</p></div>
    </ProductFamiliarSurface></ProductFamiliarSession>
    <div className="familiar-preview-controls">
      <label htmlFor={selectId}>Animation</label>
      <select id={selectId} value={animation} onChange={event => setAnimation(event.target.value)}>
        {Object.entries(celestialGuardian.animations).map(([id, clip]) => <option key={id} value={id}>{clip.label}</option>)}
      </select>
      <button type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Play animation' : 'Pause animation'}</button>
    </div>
    <p className="familiar-preview-note">Energy uses the current Workshop profile account ({account?.displayName ?? 'signed out'}). Reduced motion displays a still frame.</p>
  </section>;
}
