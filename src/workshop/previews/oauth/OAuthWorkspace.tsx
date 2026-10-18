import { useEffect, useState } from 'react';
import { StoryAuthGate, STORY_AUTH_DISSOLVE_MS } from '@seihouse/library/story-seed';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';

const entry = workshopEntries.find(candidate => candidate.id === 'oauth')!;

function OAuthPreview({ fail }: { fail: boolean }) {
  const [linked, setLinked] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!linked) return;
    const timeout = window.setTimeout(() => setComplete(true), STORY_AUTH_DISSOLVE_MS);
    return () => window.clearTimeout(timeout);
  }, [linked]);

  const authenticate = async () => {
    await new Promise(resolve => window.setTimeout(resolve, 650));
    if (fail) throw { code: 'auth/invalid-credential' };
    setLinked(true);
  };

  return (
    <div className="relative min-h-[100dvh]">
      {complete ? (
        <section className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center">
          <h2 className="font-display text-2xl text-white">Sign-in preview complete</h2>
          <p role="status" className="text-sm text-white/60">Simulated locally. No account was linked.</p>
          <button type="button" className="workshop-touch-target rounded-xl border border-white/20 px-4 py-2 text-sm text-cyan-100" onClick={() => { setLinked(false); setComplete(false); }}>
            Try sign-in again
          </button>
        </section>
      ) : <StoryAuthGate linked={linked} onAuthenticate={authenticate} />}
    </div>
  );
}

export function OAuthWorkspace() {
  const [fail, setFail] = useState(false);
  const [revision, setRevision] = useState(0);

  return (
    <FeatureWorkspace
      entry={entry}
      allowCompare={false}
      renderReference={() => <p className="p-6 text-sm text-white/60">This workspace uses the existing Library sign-in screen. There is no separate historical reference.</p>}
      renderDevelopment={() => <OAuthPreview key={revision} fail={fail} />}
      workshopControls={{
        description: 'Preview only. Google, Apple and email are simulated; nothing is sent or saved.',
        defaultSection: 'states',
        sections: [{
          id: 'states',
          content: <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
            <label className="flex items-center gap-2">
              Sign-in result
              <select className="min-h-11 rounded-lg border border-white/20 bg-slate-950 px-3" value={fail ? 'error' : 'success'} onChange={event => { setFail(event.target.value === 'error'); setRevision(value => value + 1); }}>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </label>
            <button type="button" className="workshop-touch-target rounded-lg border border-white/20 px-3 py-2" onClick={() => setRevision(value => value + 1)}>Reset preview</button>
          </div>,
        }],
      }}
    />
  );
}
