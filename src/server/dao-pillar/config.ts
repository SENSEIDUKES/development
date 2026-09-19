import type { IdentityMode } from '../identity/types';
import { DAO_PILLAR_THEMES, DaoPillarThemeError, findDaoPillarTheme, validateDaoPillarTheme } from './themes';
import type { DaoPillarTheme } from './types';

export type DaoPillarEnvironment = Record<string, string | undefined>;

export interface ResolvedDaoPillarConfig {
  identityMode: IdentityMode;
  /** The one theme cultivators see. Library configuration, never a user choice. */
  activeTheme: DaoPillarTheme;
}

export const DEFAULT_ACTIVE_THEME_ID = 'beta-test';

/**
 * Reads the Dao Pillar settings from the server environment.
 *
 * - `DAO_PILLAR_ACTIVE_THEME` — id of the theme to run (default `beta-test`).
 * - `DAO_PILLAR_TIME_ZONE` — overrides the active theme's day boundary.
 * - `DAO_PILLAR_STARTS_ON` — overrides the active theme's day 1 (YYYY-MM-DD),
 *   which starts a new cycle of the same theme without a code change.
 *
 * The identity mode is shared with Energy (`LIBRARY_IDENTITY_MODE`) so one
 * server never accepts Workshop identities for one system and not another.
 */
export function resolveDaoPillarConfig(
  environment: DaoPillarEnvironment,
  identityMode: IdentityMode,
  registry: readonly DaoPillarTheme[] = DAO_PILLAR_THEMES,
): ResolvedDaoPillarConfig {
  const themeId = environment.DAO_PILLAR_ACTIVE_THEME?.trim() || DEFAULT_ACTIVE_THEME_ID;
  const configured = findDaoPillarTheme(themeId, registry);
  if (!configured) throw new DaoPillarThemeError(themeId, ['No theme with this id is registered.']);
  const timeZone = environment.DAO_PILLAR_TIME_ZONE?.trim();
  const startsOn = environment.DAO_PILLAR_STARTS_ON?.trim();
  const activeTheme = validateDaoPillarTheme({
    ...configured,
    calendar: {
      ...configured.calendar,
      ...(timeZone ? { timeZone } : {}),
      ...(startsOn ? { startsOn } : {}),
    },
  });
  return { identityMode, activeTheme };
}
