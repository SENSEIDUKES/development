import { useEffect, useRef, useState } from 'react';
import { WorkspaceSheet } from '@seihouse/library/shell';
import { NarrativeButton, NarrativeTextBox } from '@seihouse/sen/presentation';

/** An open request for the token; `resolve` answers it with the token, or nothing when cancelled. */
export interface AccessTokenRequest {
  /** The server did not accept the last token. */
  rejected: boolean;
  resolve: (token: string | undefined) => void;
}

/**
 * World Blueprints are still a development service, so the server asks for
 * its access token. This sheet asks for it the first time a Blueprint is
 * requested; the app keeps it only in this tab's memory.
 */
export function AccessTokenSheet({ request }: { request?: AccessTokenRequest }) {
  const [token, setToken] = useState('');
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!request) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setToken('');
  }, [request]);
  const value = token.trim();

  return <WorkspaceSheet open={Boolean(request)} onOpenChange={open => { if (!open) request?.resolve(undefined); }}
    title="Development access token" closeLabel="Cancel" returnFocusRef={returnFocus}>
    <form data-testid="access-token-sheet" className="space-y-4 font-sans"
      onSubmit={event => { event.preventDefault(); if (value) request?.resolve(value); }}>
      <p className="text-sm text-neutral-300">
        World Blueprints are still in development, so the server asks for its access token.
        It stays in this tab only and is forgotten when you close it.
      </p>
      {request?.rejected && <p role="alert" className="text-sm text-amber-200">That token was not accepted. Check it and try again.</p>}
      <NarrativeTextBox type="password" label="Access token" value={token} onChange={setToken} autoComplete="off" autoFocus />
      <div className="flex justify-end gap-3">
        <NarrativeButton type="button" variant="ghost" onClick={() => request?.resolve(undefined)}>Cancel</NarrativeButton>
        <NarrativeButton type="submit" disabled={!value}>Continue</NarrativeButton>
      </div>
    </form>
  </WorkspaceSheet>;
}
