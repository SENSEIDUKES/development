/**
 * Workshop preview for the User Profile replica.
 *
 * Preview-only shell. It owns the scenario selector, the account identity the
 * page is rendered for, the mock services, and the excluded-action log. None of
 * this is part of the portable component — `src/components/user-profile/*`
 * renders identically under a real adapter in Light-Novels.
 */

import { useCallback, useMemo, useState } from 'react';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import DevelopmentUserProfile from '../../../components/user-profile/development/UserProfile';
import ReferenceUserProfile from '../../../components/user-profile/reference/UserProfile';
import { UserProfileServicesProvider } from '../../../components/user-profile/shared/userProfileServices';
import type { AppUser } from '../../../components/user-profile/shared/types';
import { createMockUserProfileServices } from './mockUserProfileServices';
import { getPreviewScenario } from './previewData';
import {
  DEFAULT_USER_PROFILE_PREVIEW_STATE,
  USER_PROFILE_PREVIEW_STATES,
  type UserProfilePreviewState,
} from './previewStates';

const entry = workshopEntries.find(candidate => candidate.id === 'user-profile')!;

const MAX_LOGGED_ACTIONS = 8;

export function UserProfileWorkspace() {
  const [previewState, setPreviewState] = useState<UserProfilePreviewState>(
    DEFAULT_USER_PROFILE_PREVIEW_STATE,
  );
  const [linkedAccount, setLinkedAccount] = useState<AppUser | null>(null);
  const [excludedActions, setExcludedActions] = useState<string[]>([]);

  const scenario = useMemo(() => getPreviewScenario(previewState), [previewState]);

  const logExcludedAction = useCallback((action: string) => {
    setExcludedActions(previous => [
      `${new Date().toLocaleTimeString()} · ${action}`,
      ...previous,
    ].slice(0, MAX_LOGGED_ACTIONS));
  }, []);

  const selectState = useCallback((next: UserProfilePreviewState) => {
    setPreviewState(next);
    setLinkedAccount(null);
    setExcludedActions([]);
  }, []);

  const services = useMemo(
    () =>
      createMockUserProfileServices({
        state: previewState,
        logExcludedAction,
        onSignIn: setLinkedAccount,
      }),
    [logExcludedAction, previewState],
  );

  const currentUser = scenario.currentUser ?? linkedAccount;

  const renderPane = (Component: typeof ReferenceUserProfile, pane: string) => (
    // Remounting on scenario change throws away the mock's in-memory account
    // state, so each scenario starts from its own snapshot rather than
    // inheriting edits made in the previous one.
    <div key={`${pane}-${previewState}-${currentUser?.uid ?? 'anonymous'}`} className="pb-16">
      <UserProfileServicesProvider services={services}>
        <Component
          currentUser={currentUser}
          stories={scenario.stories}
          onLogout={() => {
            logExcludedAction('Sign out — mock account unlinked locally instead');
            setLinkedAccount(null);
            if (scenario.currentUser) setPreviewState('signed-out');
          }}
          onNavigateHome={() => logExcludedAction('Navigate to Library home (production router)')}
        />
      </UserProfileServicesProvider>

      <section className="mx-auto mt-8 max-w-4xl px-4 sm:px-8">
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4">
          <h2 className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">
            Workshop only · excluded production actions
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-white/45">
            Buttons wired to Firebase, PostgreSQL, R2, or the production app shell are recorded
            here instead of performing anything. This panel is preview tooling and is never
            transferred.
          </p>
          {excludedActions.length === 0 ? (
            <p className="mt-3 text-[11px] italic text-white/30">Nothing invoked yet.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {excludedActions.map(action => (
                <li key={action} className="font-mono text-[10px] leading-relaxed text-cyan-200/60">
                  {action}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );

  return (
    <FeatureWorkspace
      entry={entry}
      workshopControls={{
        description:
          'Each scenario fixes the account and its profile snapshot. Everything inside a scenario — editing, check-in, attunement, portrait generation, admin edits — runs for real against local state.',
        defaultSection: 'states',
        sections: [
          {
            id: 'states',
            description: USER_PROFILE_PREVIEW_STATES.find(option => option.id === previewState)
              ?.description,
            content: (
              <div className="flex flex-wrap gap-2">
                {USER_PROFILE_PREVIEW_STATES.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={previewState === option.id}
                    onClick={() => selectState(option.id)}
                    className={`workshop-touch-target rounded-lg border px-3 py-2 text-xs transition-colors ${
                      previewState === option.id
                        ? 'border-cyan-400/35 bg-cyan-500/15 text-cyan-100'
                        : 'border-white/10 text-white/55 hover:border-white/20 hover:bg-white/5 hover:text-white/85'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ),
          },
        ],
      }}
      renderReference={() => renderPane(ReferenceUserProfile, 'reference')}
      renderDevelopment={() => renderPane(DevelopmentUserProfile, 'development')}
    />
  );
}
