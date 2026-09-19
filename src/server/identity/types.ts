/** Shared trusted host identity. Request bodies never establish this value. */
export interface LibraryPrincipal {
  uid: string;
  role: 'owner' | 'admin' | 'user';
  identity: 'verified' | 'development';
  /** Server configuration only, never a client claim. */
  developmentAccess: boolean;
}
export type IdentityMode = 'development' | 'production';

/** DEV entry points only; a production adapter must explicitly install a verifier. */
export const developmentRepositoryIdentityMode = (environment: Record<string, string | undefined>): IdentityMode =>
  environment.LIBRARY_IDENTITY_MODE?.trim().toLowerCase() === 'production' ? 'production' : 'development';
