export class FamiliarValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(issues.join(' '));
    this.name = 'FamiliarValidationError';
    this.issues = issues;
  }
}

/** The request cannot be applied in the account's current state (not owned, price changed, not offered). */
export class FamiliarConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FamiliarConflictError';
  }
}

export interface FamiliarOwnershipRecord {
  familiarId: string;
  acquiredVia: 'purchase' | 'development';
  /** The purchase key or development grant that acquired it. */
  sourceKey: string;
  acquiredAt: string;
}

export interface FamiliarOfferRecord {
  idempotencyKey: string;
  familiarId: string;
  /** What the cultivator offered; `spent` is less when the top tier needed less. */
  requested: number;
  spent: number;
  /** Total QI this Familiar had been offered before and after this offering. Tiers derive from these. */
  qiBefore: number;
  qiAfter: number;
  qiTransactionId: string | null;
  offeredAt: string;
}

export interface FamiliarAccountRecord {
  uid: string;
  owned: FamiliarOwnershipRecord[];
  /** Total QI offered per Familiar. */
  training: Record<string, number>;
  selections: Record<string, { formId: string | null; effectId: string | null }>;
  offers: FamiliarOfferRecord[];
}

/**
 * Durable Familiar account storage. The service serializes each account's
 * writes, so every method here is a single-record update; the Postgres
 * migration adds the row lock and unique constraints that make the QI spend
 * and the training (or ownership) change one transaction.
 */
export interface FamiliarRepository {
  getAccount(uid: string): Promise<FamiliarAccountRecord>;
  grantOwnership(uid: string, ownership: FamiliarOwnershipRecord): Promise<FamiliarAccountRecord>;
  recordOffer(uid: string, offer: FamiliarOfferRecord): Promise<FamiliarAccountRecord>;
  selectCosmetics(uid: string, familiarId: string, selection: { formId: string | null; effectId: string | null }): Promise<FamiliarAccountRecord>;
}
