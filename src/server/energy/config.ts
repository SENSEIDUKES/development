export type EnergyEnvironment = Record<string, string | undefined>;

export type EnergyIdentityMode = 'development' | 'production';

export interface ResolvedEnergyConfig {
  /**
   * `development` accepts the Workshop's self-declared identities and enables
   * the test grant and reset controls. `production` requires a verified
   * identity from the host and exposes no development control to anyone.
   */
  identityMode: EnergyIdentityMode;
  /** Energy a development user receives exactly once when their account is created. */
  developmentInitialGrant: number;
  /** The amount the development grant control applies when none is requested. */
  developmentDefaultGrant: number;
  /** The most one development grant call may add. */
  developmentMaxGrant: number;
}

const wholeNumber = (value: string | undefined, fallback: number, minimum: number, maximum: number): number => {
  const parsed = value === undefined || value.trim() === '' ? Number.NaN : Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
};

/**
 * Reads the Energy settings from the server environment. The identity mode
 * has no default on purpose: each entry point states which mode it runs in,
 * so a production host can never accept Workshop identities by omission.
 */
export function resolveEnergyConfig(
  environment: EnergyEnvironment,
  identityMode: EnergyIdentityMode,
): ResolvedEnergyConfig {
  return {
    identityMode,
    developmentInitialGrant: wholeNumber(environment.ENERGY_DEVELOPMENT_INITIAL_GRANT, 500, 0, 1_000_000),
    developmentDefaultGrant: wholeNumber(environment.ENERGY_DEVELOPMENT_DEFAULT_GRANT, 100, 1, 1_000_000),
    developmentMaxGrant: wholeNumber(environment.ENERGY_DEVELOPMENT_MAX_GRANT, 10_000, 1, 1_000_000),
  };
}

/**
 * The identity mode this Development repository's own entry points run in.
 * The Workshop has no Firebase verifier, so it is `development` unless the
 * environment says otherwise. Production hosts pass `production` explicitly.
 */
export const developmentRepositoryIdentityMode = (environment: EnergyEnvironment): EnergyIdentityMode =>
  environment.ENERGY_IDENTITY_MODE?.trim().toLowerCase() === 'production' ? 'production' : 'development';
