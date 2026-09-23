import { DEFAULT_ACTIVE_ELEMENTAL_EFFECT, type ActiveElementalEffectSelection } from '@seihouse/library/familiar';
import {
  FamiliarConflictError,
  type FamiliarAccountRecord,
  type FamiliarMasteryRecord,
  type FamiliarOfferRecord,
  type FamiliarOwnershipRecord,
  type FamiliarRepository,
} from './repository';

const clone = <T,>(value: T): T => structuredClone(value);

/** Familiar ownership, bonds, masteries and selections without a database. */
export class InMemoryFamiliarRepository implements FamiliarRepository {
  private readonly accounts = new Map<string, FamiliarAccountRecord>();

  private ensure(uid: string): FamiliarAccountRecord {
    let account = this.accounts.get(uid);
    if (!account) {
      account = { uid, owned: [], training: {}, forms: {}, offers: [], masteries: [], activeEffect: { ...DEFAULT_ACTIVE_ELEMENTAL_EFFECT } };
      this.accounts.set(uid, account);
    }
    return account;
  }

  async getAccount(uid: string): Promise<FamiliarAccountRecord> {
    return clone(this.ensure(uid));
  }

  async grantOwnership(uid: string, ownership: FamiliarOwnershipRecord): Promise<FamiliarAccountRecord> {
    const account = this.ensure(uid);
    // Mirrors the migration's UNIQUE (uid, source_key): one source acquires one Familiar.
    if (account.owned.some(entry => entry.sourceKey === ownership.sourceKey && entry.familiarId !== ownership.familiarId)) {
      throw new FamiliarConflictError('That purchase key was already used for a different Familiar.');
    }
    if (!account.owned.some(entry => entry.familiarId === ownership.familiarId)) account.owned.push(clone(ownership));
    return clone(account);
  }

  async recordOffer(uid: string, offer: FamiliarOfferRecord, mastery: FamiliarMasteryRecord | null): Promise<FamiliarAccountRecord> {
    const account = this.ensure(uid);
    if (account.offers.some(entry => entry.idempotencyKey === offer.idempotencyKey)) return clone(account);
    account.offers.push(clone(offer));
    account.training[offer.familiarId] = (account.training[offer.familiarId] ?? 0) + offer.spent;
    // Mirrors the migration's PRIMARY KEY (uid, element): the first mastery of an element stands.
    if (mastery && !account.masteries.some(entry => entry.element === mastery.element)) account.masteries.push(clone(mastery));
    return clone(account);
  }

  async selectForm(uid: string, familiarId: string, formId: string | null): Promise<FamiliarAccountRecord> {
    const account = this.ensure(uid);
    account.forms[familiarId] = formId;
    return clone(account);
  }

  async selectActiveEffect(uid: string, selection: ActiveElementalEffectSelection): Promise<FamiliarAccountRecord> {
    const account = this.ensure(uid);
    account.activeEffect = clone(selection);
    return clone(account);
  }

  /** Test and development helper. */
  reset(uid: string): void {
    this.accounts.delete(uid);
  }
}
