import type { EnergyIdentityMode } from './config';
import type { EnergyPrincipal } from './types';

export interface EnergyRequestLike {
  headers?: Record<string, string | string[] | undefined>;
}

/** What a host's token verifier returns; mirrors Light-Novels' `verifyIdToken`. */
export interface VerifiedEnergyIdentity {
  uid: string;
  role?: 'owner' | 'admin' | 'user';
}

export type EnergyIdentityVerifier = (token: string) => Promise<VerifiedEnergyIdentity>;

export interface EnergyPrincipalResolverOptions {
  mode: EnergyIdentityMode;
  /**
   * Verifies a bearer token (a Firebase ID token in Light-Novels). Required in
   * `production`; optional in `development`, where it is tried before the
   * Workshop's self-declared identities.
   */
  verifyIdToken?: EnergyIdentityVerifier;
}

export type EnergyPrincipalResolver = (request: EnergyRequestLike) => Promise<EnergyPrincipal | null>;

export const DEVELOPMENT_TOKEN_PREFIX = 'dev:';

/** The bearer token the Workshop sends for a mock account. Only development mode accepts it. */
export const developmentEnergyToken = (uid: string) => `${DEVELOPMENT_TOKEN_PREFIX}${uid}`;

const bearerToken = (request: EnergyRequestLike): string | undefined => {
  const entry = Object.entries(request.headers ?? {})
    .find(([name]) => name.toLowerCase() === 'authorization');
  const value = entry?.[1];
  const authorization = (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(authorization);
  return match?.[1];
};

const validUid = (uid: string): boolean => /^[A-Za-z0-9_.:-]{1,128}$/.test(uid);

/**
 * Turns a request into the principal the ledger trusts. Identity is decided
 * here and only here: request bodies never name the user.
 *
 * - `production`: only a verified token counts, and no principal ever receives
 *   development access. Constructing this mode without a verifier fails fast.
 * - `development`: a verified token is honoured when a verifier exists;
 *   otherwise `Bearer dev:<uid>` identifies a Workshop account. Every
 *   development principal receives development access.
 */
export function createEnergyPrincipalResolver(options: EnergyPrincipalResolverOptions): EnergyPrincipalResolver {
  if (options.mode === 'production' && !options.verifyIdToken) {
    throw new Error('Energy production identity mode requires a token verifier.');
  }
  return async request => {
    const token = bearerToken(request);
    if (!token) return null;
    const isDevelopmentToken = token.startsWith(DEVELOPMENT_TOKEN_PREFIX);
    if (options.mode === 'production') {
      if (isDevelopmentToken) return null;
      const verified = await verifyQuietly(options.verifyIdToken!, token);
      return verified ? { ...verified, identity: 'verified', developmentAccess: false } : null;
    }
    if (!isDevelopmentToken && options.verifyIdToken) {
      const verified = await verifyQuietly(options.verifyIdToken, token);
      return verified ? { ...verified, identity: 'verified', developmentAccess: true } : null;
    }
    if (!isDevelopmentToken) return null;
    const uid = token.slice(DEVELOPMENT_TOKEN_PREFIX.length);
    if (!validUid(uid)) return null;
    return { uid, role: 'user', identity: 'development', developmentAccess: true };
  };
}

const verifyQuietly = async (
  verify: EnergyIdentityVerifier,
  token: string,
): Promise<{ uid: string; role: 'owner' | 'admin' | 'user' } | null> => {
  try {
    const identity = await verify(token);
    if (!identity.uid || !validUid(identity.uid)) return null;
    return { uid: identity.uid, role: identity.role ?? 'user' };
  } catch {
    return null;
  }
};
