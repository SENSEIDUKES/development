import type { FamiliarDefinition } from '../shared/familiar';
import { FamiliarSprite } from './FamiliarSprite';
import { useEffect, useRef } from 'react';

/** Place in the host header while its companion is minimized. */
export function FamiliarRecall({ familiar, onRecall }: { familiar: FamiliarDefinition; onRecall: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => { button.current?.focus({ preventScroll: true }); }, []);
  return <button ref={button} type="button" className="familiar-recall" aria-label={`Show ${familiar.displayName}`} title="Call back your Familiar" onClick={onRecall}>
    <span aria-hidden="true"><FamiliarSprite familiar={familiar} animation="neutral" paused /></span>
  </button>;
}
