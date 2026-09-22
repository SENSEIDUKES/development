import { useId, useState } from 'react';
import type { FamiliarActivity } from '@seihouse/library/familiar';
import { ProductFamiliarSession, ProductFamiliarSurface } from './ProductFamiliarPreview';
import { defaultFamiliar, familiarCatalogue, familiarCatalogueEntry } from '../../../host/familiar/catalogue';
import { getPreviewScenario } from '../user-profile/previewData';
import { DEFAULT_USER_PROFILE_PREVIEW_STATE } from '../user-profile/previewStates';
import './familiarPreview.css';

/** Exercise the real atlas and Energy client inside a bounded Workshop canvas. */
export function FamiliarPreview() {
  const [familiarId, setFamiliarId] = useState(defaultFamiliar.definition.id);
  const [animation, setAnimation] = useState('');
  const [activity, setActivity] = useState<FamiliarActivity | ''>('');
  const [paused, setPaused] = useState(false);
  const familiarIdControl = useId();
  const selectId = useId();
  const activityId = useId();
  const familiar = familiarCatalogueEntry(familiarId)!.definition;
  // Reuse the profile's default account identity; only the server supplies Energy.
  const account = getPreviewScenario(DEFAULT_USER_PROFILE_PREVIEW_STATE).currentUser;

  return <section className="familiar-preview" aria-label="Familiar preview">
    <header className="familiar-preview-heading">
      <div><p className="familiar-eyebrow">Your Familiar</p><h2>{familiar.displayName}</h2><p>{familiar.description}</p></div>
      <span className="familiar-preview-tag" data-rarity={familiar.rarity}>{familiar.rarity}{familiar.isDefault ? ' · Default' : ''}</span>
    </header>
    <ProductFamiliarSession key={familiar.id} initialFamiliarId={familiar.id}><ProductFamiliarSurface activity={activity || undefined} animation={animation || undefined} paused={paused}>
      <div className="familiar-stage"><p>Drag your Familiar around this space. Tap for actions, then choose Energy.</p></div>
    </ProductFamiliarSurface></ProductFamiliarSession>
    <div className="familiar-preview-controls">
      <label htmlFor={familiarIdControl}>Inspect Familiar</label>
      <select id={familiarIdControl} value={familiarId} onChange={event => {
        setFamiliarId(event.target.value); setAnimation(''); setActivity(''); setPaused(false);
      }}>
        {familiarCatalogue.map(entry => <option key={entry.definition.id} value={entry.definition.id}>{entry.definition.displayName}{entry.definition.isDefault ? ' (Default)' : ''}</option>)}
      </select>
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
        {Object.entries(familiar.animations).map(([id, clip]) => <option key={id} value={id}>{clip.label}</option>)}
      </select>
      <button type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Play animation' : 'Pause animation'}</button>
    </div>
    <p className="familiar-preview-note">Codex activity drives the matching supplied running, waiting, review, or blocked clip. An atlas inspection choice deliberately overrides it. Energy uses the current Workshop profile account ({account?.displayName ?? 'signed out'}). Reduced motion displays a still frame.</p>
  </section>;
}
