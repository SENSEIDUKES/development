import type { FamiliarAccountRecord, FamiliarOfferRecord, FamiliarOwnershipRecord, FamiliarRepository } from './repository';

const clone = <T,>(value: T): T => structuredClone(value);

/** Familiar ownership, training and cosmetic selections without a database. */
export class InMemoryFamiliarRepository implements FamiliarRepository {
  private readonly accounts = new Map<string, FamiliarAccountRecord>();

  private ensure(uid: string): FamiliarAccountRecord {
    let account = this.accounts.get(uid);
    if (!account) {
      account = { uid, owned: [], training: {}, selections: {}, offers: [] };
      this.accounts.set(uid, account);
    }
    return account;
  }

  async getAccount(uid: string): Promise<FamiliarAccountRecord> {
    return clone(this.ensure(uid));
  }

  async grantOwnership(uid: string, ownership: FamiliarOwnershipRecord): Promise<FamiliarAccountRecord> {
    const account = this.ensure(uid);
    if (!account.owned.some(entry => entry.familiarId === ownership.familiarId)) account.owned.push(clone(ownership));
    return clone(account);
  }

  async recordOffer(uid: string, offer: FamiliarOfferRecord): Promise<FamiliarAccountRecord> {
    const account = this.ensure(uid);
    if (account.offers.some(entry => entry.idempotencyKey === offer.idempotencyKey)) return clone(account);
    account.offers.push(clone(offer));
    account.training[offer.familiarId] = (account.training[offer.familiarId] ?? 0) + offer.spent;
    return clone(account);
  }

  async selectCosmetics(uid: string, familiarId: string, selection: { formId: string | null; effectId: string | null }): Promise<FamiliarAccountRecord> {
    const account = this.ensure(uid);
    account.selections[familiarId] = { ...selection };
    return clone(account);
  }

  /** Test and development helper. */
  reset(uid: string): void {
    this.accounts.delete(uid);
  }
}
