import type { ActiveElementalEffectSelection, FamiliarElement } from '@seihouse/library/familiar';

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
  /** What the cultivator offered; `spent` is less when the bond needed less. */
  requested: number;
  spent: number;
  /** Total QI this Familiar had been offered before and after this offering. Bond ranks derive from these. */
  qiBefore: number;
  qiAfter: number;
  qiTransactionId: string | null;
  offeredAt: string;
}

/** One mastered element. The first Legendary bond in an element masters it, permanently. */
export interface FamiliarMasteryRecord {
  element: FamiliarElement;
  familiarId: string;
  masteredAt: string;
}

export interface FamiliarAccountRecord {
  uid: string;
  owned: FamiliarOwnershipRecord[];
  /** Total QI offered per Familiar. */
  training: Record<string, number>;
  /** Each companion's chosen form. */
  forms: Record<string, string | null>;
  offers: FamiliarOfferRecord[];
  masteries: FamiliarMasteryRecord[];
  activeEffect: ActiveElementalEffectSelection;
}

/**
 * Durable Familiar account storage. The service serializes each account's
 * writes, so every method here is a single-record update; the Postgres
 * migrations add the row lock and unique constraints that make the QI spend,
 * the training change and any mastery it earns one transaction.
 */
export interface FamiliarRepository {
  getAccount(uid: string): Promise<FamiliarAccountRecord>;
  grantOwnership(uid: string, ownership: FamiliarOwnershipRecord): Promise<FamiliarAccountRecord>;
  /** Records an offering and, when it reached Legendary bond in a new element, that mastery with it. */
  recordOffer(uid: string, offer: FamiliarOfferRecord, mastery: FamiliarMasteryRecord | null): Promise<FamiliarAccountRecord>;
  selectForm(uid: string, familiarId: string, formId: string | null): Promise<FamiliarAccountRecord>;
  selectActiveEffect(uid: string, selection: ActiveElementalEffectSelection): Promise<FamiliarAccountRecord>;
}
