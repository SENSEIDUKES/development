import {
  CELESTIAL_STORE_CONFIG,
  dailyStoreRotation,
  type CelestialStoreConfig,
} from '@seihouse/library/celestial-store';
import type {
  FamiliarCosmeticEffect,
  FamiliarForm,
  FamiliarOption,
  FamiliarTrainingSnapshot,
  FamiliarTrainingView,
  FamiliarUnlock,
  OfferQiInput,
  OfferQiResponse,
  PurchaseFamiliarInput,
  PurchaseFamiliarResponse,
  SelectFamiliarCosmeticsInput,
} from '@seihouse/library/familiar';
import { allFamiliarOptions } from '../../host/familiar/catalogue';
import type { EnergyService } from '../energy/service';
import type { LibraryPrincipal } from '../identity/types';
import type { QiLedger } from '../qi/qiLedger';
import { FamiliarConflictError, FamiliarValidationError, type FamiliarAccountRecord, type FamiliarRepository } from './repository';
import { FAMILIAR_TRAINING_LADDER, familiarElement, MAX_TRAINING_QI, tierFor, validateTrainingLadder, type FamiliarTrainingTier } from './training';

export interface FamiliarServiceDependencies {
  repository: FamiliarRepository;
  qi: QiLedger;
  energy: EnergyService;
  /** Host catalogue projection; availability here is ignored — ownership decides it. */
  catalogue?: readonly FamiliarOption[];
  store?: CelestialStoreConfig;
  ladder?: readonly FamiliarTrainingTier[];
  now?: () => Date;
}

const MAX_OFFER = 1_000_000;
/** Client keys are short (a UUID); 120 leaves room for the prefixes every ledger key adds. */
const MAX_KEY = 120;
const validKey = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_KEY;

/**
 * The Familiar account: ownership, QI training, and cosmetic selections.
 *
 * - Offering QI trains one Familiar. The QI ledger spends only what the
 *   remaining tiers need, and the offer is recorded once per idempotency key.
 * - Tiers unlock alternate forms and cosmetic effects, and nothing else.
 * - Buying a Familiar in the Celestial Store debits QI or Energy at today's
 *   server-resolved price, then grants ownership.
 *
 * Each account's writes run one at a time, the in-process equivalent of the
 * migration's row lock, so two taps can never spend twice for one Familiar.
 */
export class FamiliarService {
  private readonly repository: FamiliarRepository;
  private readonly qi: QiLedger;
  private readonly energy: EnergyService;
  private readonly catalogue: readonly FamiliarOption[];
  private readonly store: CelestialStoreConfig;
  private readonly ladder: readonly FamiliarTrainingTier[];
  private readonly now: () => Date;
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(dependencies: FamiliarServiceDependencies) {
    this.repository = dependencies.repository;
    this.qi = dependencies.qi;
    this.energy = dependencies.energy;
    this.catalogue = dependencies.catalogue ?? allFamiliarOptions;
    this.store = dependencies.store ?? CELESTIAL_STORE_CONFIG;
    this.ladder = validateTrainingLadder(dependencies.ladder ?? FAMILIAR_TRAINING_LADDER);
    this.now = dependencies.now ?? (() => new Date());
  }

  private serialize<T>(uid: string, work: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(uid) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(work);
    const tail = run.catch(() => undefined);
    this.queues.set(uid, tail);
    void tail.then(() => { if (this.queues.get(uid) === tail) this.queues.delete(uid); });
    return run;
  }

  private option(familiarId: unknown): FamiliarOption {
    const option = this.catalogue.find(candidate => candidate.id === familiarId);
    if (!option) throw new FamiliarValidationError(['That Familiar is not in the Library catalogue.']);
    return option;
  }

  private owns(account: FamiliarAccountRecord, option: FamiliarOption) {
    return Boolean(option.isDefault) || account.owned.some(entry => entry.familiarId === option.id);
  }

  private viewOf(account: FamiliarAccountRecord, option: FamiliarOption): FamiliarTrainingView {
    const element = familiarElement(option.id);
    const qiOffered = account.training[option.id] ?? 0;
    const reached = tierFor(qiOffered, this.ladder);
    const tiers = this.ladder.map(tier => ({
      tier: tier.tier, name: tier.name, qiRequired: tier.qiRequired,
      reached: qiOffered >= tier.qiRequired, unlocks: tier.unlocks(element),
    }));
    const unlocked = tiers.filter(tier => tier.reached).flatMap(tier => tier.unlocks);
    const unlockedForms = unlocked.flatMap(unlock => unlock.kind === 'form' ? [unlock.form] : []);
    const unlockedEffects = unlocked.flatMap(unlock => unlock.kind === 'effect' ? [unlock.effect] : []);
    const next = this.ladder.find(tier => tier.qiRequired > qiOffered);
    const stored = account.selections[option.id];
    return {
      familiarId: option.id,
      owned: this.owns(account, option),
      isDefault: Boolean(option.isDefault),
      element,
      qiOffered,
      tier: reached.tier,
      tierName: reached.name,
      nextTier: next ? { tier: next.tier, name: next.name, qiRequired: next.qiRequired, qiRemaining: next.qiRequired - qiOffered } : null,
      tiers,
      unlockedForms,
      unlockedEffects,
      // A stored choice that is no longer unlocked (a ladder change) quietly falls away.
      selection: {
        formId: stored?.formId && unlockedForms.some(form => form.id === stored.formId) ? stored.formId : null,
        effectId: stored?.effectId && unlockedEffects.some(effect => effect.id === stored.effectId) ? stored.effectId : null,
      },
    };
  }

  private snapshotOf(account: FamiliarAccountRecord): FamiliarTrainingSnapshot {
    const familiars = this.catalogue.map(option => this.viewOf(account, option));
    return {
      uid: account.uid,
      ownedFamiliarIds: familiars.filter(view => view.owned).map(view => view.familiarId),
      familiars,
      updatedAt: this.now().toISOString(),
    };
  }

  async getSnapshot(principal: Pick<LibraryPrincipal, 'uid'>): Promise<FamiliarTrainingSnapshot> {
    return this.snapshotOf(await this.repository.getAccount(principal.uid));
  }

  private unlocksBetween(familiarId: string, tierBefore: number, tierAfter: number): FamiliarUnlock[] {
    const element = familiarElement(familiarId);
    return this.ladder.filter(tier => tier.tier > tierBefore && tier.tier <= tierAfter).flatMap(tier => tier.unlocks(element));
  }

  /** Offers QI to one owned Familiar. Spends only what the remaining tiers need. */
  async offerQi(principal: LibraryPrincipal, input: OfferQiInput): Promise<OfferQiResponse> {
    const option = this.option(input.familiarId);
    if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > MAX_OFFER) throw new FamiliarValidationError(['Offer a positive whole amount of QI.']);
    if (!validKey(input.idempotencyKey)) throw new FamiliarValidationError([`An idempotency key of 1–${MAX_KEY} characters is required.`]);
    return this.serialize(principal.uid, async () => {
      const account = await this.repository.getAccount(principal.uid);
      const replay = account.offers.find(offer => offer.idempotencyKey === input.idempotencyKey);
      if (replay) {
        if (replay.familiarId !== option.id || replay.requested !== input.amount) {
          throw new FamiliarConflictError('That offering key was already used for a different offering.');
        }
        const tierBefore = tierFor(replay.qiBefore, this.ladder).tier;
        const tierAfter = tierFor(replay.qiAfter, this.ladder).tier;
        return {
          outcome: 'replayed', message: `That offering to ${option.name} was already made.`, spent: replay.spent,
          tierBefore, tierAfter, newUnlocks: this.unlocksBetween(option.id, tierBefore, tierAfter), snapshot: this.snapshotOf(account),
        };
      }
      if (!this.owns(account, option)) throw new FamiliarConflictError(`Bring ${option.name} home before training it.`);
      const qiOffered = account.training[option.id] ?? 0;
      const remaining = MAX_TRAINING_QI(this.ladder) - qiOffered;
      const tierBefore = tierFor(qiOffered, this.ladder).tier;
      if (remaining <= 0) {
        return { outcome: 'fully-trained', message: `${option.name} is fully trained.`, spent: 0, tierBefore, tierAfter: tierBefore, newUnlocks: [], snapshot: this.snapshotOf(account) };
      }
      const amount = Math.min(input.amount, remaining);
      const spend = await this.qi.spend({
        uid: principal.uid, amount, idempotencyKey: `familiar-training:${input.idempotencyKey}`,
        source: 'familiar-training', description: `${option.name} · training`, metadata: { familiarId: option.id },
      });
      const tierAfter = tierFor(qiOffered + amount, this.ladder).tier;
      const updated = await this.repository.recordOffer(principal.uid, {
        idempotencyKey: input.idempotencyKey, familiarId: option.id, requested: input.amount, spent: amount,
        qiBefore: qiOffered, qiAfter: qiOffered + amount, qiTransactionId: spend.transaction.id, offeredAt: this.now().toISOString(),
      });
      const newUnlocks = this.unlocksBetween(option.id, tierBefore, tierAfter);
      const reachedName = this.ladder.find(tier => tier.tier === tierAfter)?.name;
      return {
        outcome: 'trained',
        message: tierAfter > tierBefore
          ? `${option.name} reached ${reachedName} bond: ${newUnlocks.map(unlock => unlock.kind === 'form' ? unlock.form.label : unlock.effect.label).join(', ') || 'a new tier'}.`
          : `${option.name} accepted ${amount.toLocaleString('en-US')} QI.`,
        spent: amount, tierBefore, tierAfter, newUnlocks, snapshot: this.snapshotOf(updated),
      };
    });
  }

  /** Chooses the form and effect one owned Familiar wears. Only unlocked choices are accepted. */
  async selectCosmetics(principal: LibraryPrincipal, input: SelectFamiliarCosmeticsInput): Promise<FamiliarTrainingSnapshot> {
    const option = this.option(input.familiarId);
    return this.serialize(principal.uid, async () => {
      const account = await this.repository.getAccount(principal.uid);
      if (!this.owns(account, option)) throw new FamiliarConflictError(`Bring ${option.name} home before choosing its look.`);
      const view = this.viewOf(account, option);
      const form: FamiliarForm | undefined = input.formId === null ? undefined : view.unlockedForms.find(candidate => candidate.id === input.formId);
      const effect: FamiliarCosmeticEffect | undefined = input.effectId === null ? undefined : view.unlockedEffects.find(candidate => candidate.id === input.effectId);
      if (input.formId !== null && !form) throw new FamiliarConflictError('That form is not unlocked yet.');
      if (input.effectId !== null && !effect) throw new FamiliarConflictError('That effect is not unlocked yet.');
      return this.snapshotOf(await this.repository.selectCosmetics(principal.uid, option.id, { formId: form?.id ?? null, effectId: effect?.id ?? null }));
    });
  }

  /**
   * Buys a Familiar offered in today's Celestial Store rotation, at today's
   * price, in the offer's currency. The server resolves the price; the
   * cultivator's displayed price must match it or nothing is charged.
   */
  async purchase(principal: LibraryPrincipal, input: PurchaseFamiliarInput): Promise<PurchaseFamiliarResponse> {
    const option = this.option(input.familiarId);
    if (input.currency !== 'qi' && input.currency !== 'energy') throw new FamiliarValidationError(['The Store sells for QI or Energy.']);
    if (!Number.isSafeInteger(input.price) || input.price <= 0) throw new FamiliarValidationError(['A purchase needs the displayed price.']);
    if (!validKey(input.idempotencyKey)) throw new FamiliarValidationError([`An idempotency key of 1–${MAX_KEY} characters is required.`]);
    const sourceKey = `celestial-store:${input.idempotencyKey}`;
    return this.serialize(principal.uid, async () => {
      const account = await this.repository.getAccount(principal.uid);
      // One purchase key buys one Familiar: a key that already bought another
      // Familiar is refused, never read as a replay.
      const keyed = account.owned.find(entry => entry.sourceKey === sourceKey);
      if (keyed && keyed.familiarId !== option.id) throw new FamiliarConflictError('That purchase key was already used for a different Familiar.');
      if (keyed) return { outcome: 'purchased', message: `${option.name} joins your cave.`, snapshot: this.snapshotOf(account) };
      if (this.owns(account, option)) return { outcome: 'already-owned', message: `${option.name} already lives in your cave.`, snapshot: this.snapshotOf(account) };
      const rotation = dailyStoreRotation(this.catalogue, this.now(), this.store);
      const offer = rotation[input.currency].find(candidate => candidate.familiarId === option.id);
      if (!offer) throw new FamiliarConflictError(`${option.name} is not offered for ${input.currency === 'qi' ? 'QI' : 'Energy'} today.`);
      const price = offer.salePrice ?? offer.price;
      if (price !== input.price) throw new FamiliarConflictError(`${option.name}’s price changed. Refresh the Store to see today’s price.`);
      const description = `${option.name} · Celestial Store`;
      // The ledger key names the Familiar too, so a reused purchase key can
      // never replay the payment another Familiar was bought with.
      const ledgerKey = `${sourceKey}:${option.id}`;
      if (input.currency === 'qi') {
        await this.qi.spend({ uid: principal.uid, amount: price, idempotencyKey: ledgerKey, source: 'celestial-store', description, metadata: { familiarId: option.id } });
      } else {
        await this.energy.spend(principal, { amount: price, idempotencyKey: ledgerKey, description, metadata: { source: 'celestial-store', familiarId: option.id } });
      }
      const updated = await this.repository.grantOwnership(principal.uid, { familiarId: option.id, acquiredVia: 'purchase', sourceKey, acquiredAt: this.now().toISOString() });
      return { outcome: 'purchased', message: `${option.name} joins your cave. Equip it whenever you like.`, snapshot: this.snapshotOf(updated) };
    });
  }

  /** Development only: grants ownership a Workshop scenario assumes the account already has. */
  async grantFamiliarDevelopment(principal: LibraryPrincipal, familiarId: string): Promise<FamiliarTrainingSnapshot> {
    const option = this.option(familiarId);
    return this.serialize(principal.uid, async () => this.snapshotOf(await this.repository.grantOwnership(principal.uid, {
      familiarId: option.id, acquiredVia: 'development', sourceKey: `development:${option.id}`, acquiredAt: this.now().toISOString(),
    })));
  }
}
