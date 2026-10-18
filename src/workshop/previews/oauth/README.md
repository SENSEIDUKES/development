# OAuth workspace

The dedicated **Pages → Account → OAuth** workspace at `?preview=oauth` renders
the canonical Library `StoryAuthGate` from `@seihouse/library/story-seed` inside
the shared `FeatureWorkspace`. The Library owns the sign-in surface; the Workshop
owns only its preview state and simulated authentication callback.

Google, Apple and email sign-in/account creation stay local to this mounted
preview. No authentication service is called, credentials are not logged or saved,
and app/Profile/Story Seed state is untouched. The existing host-supplied artwork
is used, including the gate's reduced-motion and data-saver behavior.

Workshop Controls offers Success and Error outcomes and Reset preview. Successful
sign-in includes the existing dissolve followed by a replay action. Error keeps the
gate available for retry. There is no separate historical reference for this
workspace, so Compare is disabled and Original Reference explains that boundary.

## History

- **2026-10-18:** Added the dedicated OAuth workspace and Account card, reusing the
  existing sign-in surface without changing its consumers or authentication wiring.
