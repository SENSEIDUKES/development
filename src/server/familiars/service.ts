import {
  CELESTIAL_STORE_CONFIG,
  dailyStoreRotation,
  type CelestialStoreConfig,
} from '@seihouse/library/celestial-store';
import {
  bondRankIndex,
  bondRankLabel,
  FAMILIAR_ELEMENT_LABELS,
  FAMILIAR_ELEMENTS,
  type ActiveElementalEffectSelection,
  type FamiliarBondRank,
  type FamiliarElementalMastery,
  type FamiliarElementalTitleEffect,
  type FamiliarOption,
  type FamiliarSignatureEffect,
  type FamiliarTrainingSnapshot,
  type FamiliarTrainingView,
  type FamiliarUnlock,
  type OfferQiInput,
  type OfferQiResponse,
  type PurchaseFamiliarInput,
  type PurchaseFamiliarResponse,
  type SelectFamiliarFormInput,
} from '@seihouse/library/familiar';
import { allFamiliarOptions } from '../../host/familiar/catalogue';
import type { EnergyService } from '../energy/service';
import type { LibraryPrincipal } from '../identity/types';
import type { QiLedger } from '../qi/qiLedger';
import { FamiliarConflictError, FamiliarValidationError, type FamiliarAccountRecord, type FamiliarMasteryRecord, type FamiliarRepository } from './repository';
import { FAMILIAR_SIGNATURES, validateSignatures, type FamiliarSignatureDefinition } from './signatures';
import { bondRankFor, FAMILIAR_BOND_LADDER, familiarElement, MAX_BOND_QI, masteryEffect, validateBondLadder, type FamiliarBondRankDefinition } from './training';

export interface FamiliarServiceDependencies {
  repository: FamiliarRepository;
  qi: QiLedger;
  energy: EnergyService;
  /** Host catalogue projection; availability here is ignored — ownership decides it. */
  catalogue?: readonly FamiliarOption[];
  store?: CelestialStoreConfig;
  ladder?: readonly FamiliarBondRankDefinition[];
  signatures?: readonly FamiliarSignatureDefinition[];
  now?: () => Date;
}

const unlockLabel = (unlock: FamiliarUnlock) => unlock.kind === 'form' ? unlock.form.label : unlock.effect.label;
const signatureEffect = (definition: FamiliarSignatureDefinition): FamiliarSignatureEffect =>
  ({ id: definition.id, kind: 'signature', label: definition.label, familiarId: definition.familiarId });

const MAX_OFFER = 1_000_000;
/** Client keys are short (a UUID); 120 leaves room for the prefixes every ledger key adds. */
const MAX_KEY = 120;
const validKey = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_KEY;

/**
 * The Familiar account: ownership, bonds, element mastery, and the
 * cultivator's cosmetic selections.
 *
 * - Offering QI cultivates one Familiar's bond. The QI ledger spends only
 *   what the remaining bond ranks need, and the offer is recorded once per
 *   idempotency key.
 * - Bond ranks unlock stronger elemental titles, forms and (where SEIHouse
 *   wrote one) the Familiar's signature — and nothing else.
 * - Legendary bond masters the Familiar's element, permanently, in the same
 *   write as the offering that reached it.
 * - The Active Elemental Effect is one account-level choice; the Active
 *   Familiar stays host profile state and is resolved against it.
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
  private readonly ladder: readonly FamiliarBondRankDefinition[];
  private readonly signatures: readonly FamiliarSignatureDefinition[];
  private readonly now: () => Date;
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(dependencies: FamiliarServiceDependencies) {
    this.repository = dependencies.repository;
    this.qi = dependencies.qi;
    this.energy = dependencies.energy;
    this.catalogue = dependencies.catalogue ?? allFamiliarOptions;
    this.store = dependencies.store ?? CELESTIAL_STORE_CONFIG;
    this.ladder = validateBondLadder(dependencies.ladder ?? FAMILIAR_BOND_LADDER);
    this.signatures = validateSignatures(dependencies.signatures ?? FAMILIAR_SIGNATURES, this.catalogue);
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

  private signatureFor(familiarId: string) {
    return this.signatures.find(signature => signature.familiarId === familiarId) ?? null;
  }

  /** What one bond rank unlocks for one Familiar: the shared ladder in its element, plus its own signature. */
  private unlocksAt(familiarId: string, rank: FamiliarBondRankDefinition): FamiliarUnlock[] {
    const signature = this.signatureFor(familiarId);
    return [
      ...rank.unlocks(familiarElement(familiarId)),
      ...(signature?.requiredBondRank === rank.rank ? [{ kind: 'signature' as const, effect: signatureEffect(signature) }] : []),
    ];
  }

  private viewOf(account: FamiliarAccountRecord, option: FamiliarOption): FamiliarTrainingView {
    const element = familiarElement(option.id);
    const qiOffered = account.training[option.id] ?? 0;
    const reached = bondRankFor(qiOffered, this.ladder);
    const bondRanks = this.ladder.map(rank => ({
      rank: rank.rank, qiRequired: rank.qiRequired, reached: qiOffered >= rank.qiRequired, unlocks: this.unlocksAt(option.id, rank),
    }));
    const unlocked = bondRanks.filter(rank => rank.reached).flatMap(rank => rank.unlocks);
    const unlockedForms = unlocked.flatMap(unlock => unlock.kind === 'form' ? [unlock.form] : []);
    // The strongest title reached: a bond effect below Legendary, the mastered title at Legendary.
    const bondEffect = unlocked.flatMap(unlock => unlock.kind === 'bond-effect' || unlock.kind === 'mastery' ? [unlock.effect] : []).at(-1)!;
    const next = this.ladder.find(rank => rank.qiRequired > qiOffered);
    const signature = this.signatureFor(option.id);
    const storedForm = account.forms[option.id];
    return {
      familiarId: option.id,
      owned: this.owns(account, option),
      isDefault: Boolean(option.isDefault),
      element,
      qiOffered,
      bondRank: reached.rank,
      nextBondRank: next ? { rank: next.rank, qiRequired: next.qiRequired, qiRemaining: next.qiRequired - qiOffered } : null,
      bondRanks,
      bondEffect,
      signature: signature ? {
        effect: signatureEffect(signature),
        requiredBondRank: signature.requiredBondRank,
        unlocked: bondRankIndex(reached.rank) >= bondRankIndex(signature.requiredBondRank),
      } : null,
      unlockedForms,
      // A stored form that is no longer unlocked (a ladder change) quietly falls away.
      selection: { formId: storedForm && unlockedForms.some(form => form.id === storedForm) ? storedForm : null },
    };
  }

  private masteryOf(record: FamiliarMasteryRecord): FamiliarElementalMastery {
    return { element: record.element, effect: masteryEffect(record.element), masteredWith: record.familiarId, masteredAt: record.masteredAt };
  }

  private snapshotOf(account: FamiliarAccountRecord): FamiliarTrainingSnapshot {
    const familiars = this.catalogue.map(option => this.viewOf(account, option));
    return {
      uid: account.uid,
      ownedFamiliarIds: familiars.filter(view => view.owned).map(view => view.familiarId),
      familiars,
      masteredElements: FAMILIAR_ELEMENTS.flatMap(element => account.masteries.filter(record => record.element === element).map(record => this.masteryOf(record))),
      activeEffect: account.activeEffect,
      updatedAt: this.now().toISOString(),
    };
  }

  async getSnapshot(principal: Pick<LibraryPrincipal, 'uid'>): Promise<FamiliarTrainingSnapshot> {
    return this.snapshotOf(await this.repository.getAccount(principal.uid));
  }

  private unlocksBetween(familiarId: string, before: FamiliarBondRank, after: FamiliarBondRank): FamiliarUnlock[] {
    return this.ladder
      .filter(rank => bondRankIndex(rank.rank) > bondRankIndex(before) && bondRankIndex(rank.rank) <= bondRankIndex(after))
      .flatMap(rank => this.unlocksAt(familiarId, rank));
  }

  /** Offers QI to one owned Familiar. Spends only what the remaining bond ranks need. */
  async offerQi(principal: LibraryPrincipal, input: OfferQiInput): Promise<OfferQiResponse> {
    const option = this.option(input.familiarId);
    if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > MAX_OFFER) throw new FamiliarValidationError(['Offer a positive whole amount of QI.']);
    if (!validKey(input.idempotencyKey)) throw new FamiliarValidationError([`An idempotency key of 1–${MAX_KEY} characters is required.`]);
    return this.serialize(principal.uid, async () => {
      const account = await this.repository.getAccount(principal.uid);
      const element = familiarElement(option.id);
      const replay = account.offers.find(offer => offer.idempotencyKey === input.idempotencyKey);
      if (replay) {
        if (replay.familiarId !== option.id || replay.requested !== input.amount) {
          throw new FamiliarConflictError('That offering key was already used for a different offering.');
        }
        const bondRankBefore = bondRankFor(replay.qiBefore, this.ladder).rank;
        const bondRankAfter = bondRankFor(replay.qiAfter, this.ladder).rank;
        const reachedLegendary = bondRankAfter === 'legendary' && bondRankBefore !== 'legendary';
        const mastery = reachedLegendary ? account.masteries.find(record => record.element === element && record.familiarId === option.id) : undefined;
        return {
          outcome: 'replayed', message: `That offering to ${option.name} was already made.`, spent: replay.spent,
          bondRankBefore, bondRankAfter, newUnlocks: this.unlocksBetween(option.id, bondRankBefore, bondRankAfter),
          mastered: mastery ? this.masteryOf(mastery) : null, snapshot: this.snapshotOf(account),
        };
      }
      if (!this.owns(account, option)) throw new FamiliarConflictError(`Bring ${option.name} home before cultivating its bond.`);
      const qiOffered = account.training[option.id] ?? 0;
      const remaining = MAX_BOND_QI(this.ladder) - qiOffered;
      const bondRankBefore = bondRankFor(qiOffered, this.ladder).rank;
      if (remaining <= 0) {
        return {
          outcome: 'fully-bonded', message: `${option.name} has reached Legendary bond.`, spent: 0,
          bondRankBefore, bondRankAfter: bondRankBefore, newUnlocks: [], mastered: null, snapshot: this.snapshotOf(account),
        };
      }
      const amount = Math.min(input.amount, remaining);
      const spend = await this.qi.spend({
        uid: principal.uid, amount, idempotencyKey: `familiar-training:${input.idempotencyKey}`,
        source: 'familiar-training', description: `${option.name} · bond`, metadata: { familiarId: option.id },
      });
      const bondRankAfter = bondRankFor(qiOffered + amount, this.ladder).rank;
      // Legendary bond masters the element, unless another Familiar already mastered it.
      const mastery: FamiliarMasteryRecord | null = bondRankAfter === 'legendary' && !account.masteries.some(record => record.element === element)
        ? { element, familiarId: option.id, masteredAt: this.now().toISOString() }
        : null;
      const updated = await this.repository.recordOffer(principal.uid, {
        idempotencyKey: input.idempotencyKey, familiarId: option.id, requested: input.amount, spent: amount,
        qiBefore: qiOffered, qiAfter: qiOffered + amount, qiTransactionId: spend.transaction.id, offeredAt: this.now().toISOString(),
      }, mastery);
      const newUnlocks = this.unlocksBetween(option.id, bondRankBefore, bondRankAfter);
      const shown = newUnlocks.filter(unlock => unlock.kind !== 'mastery').map(unlockLabel);
      const elementName = FAMILIAR_ELEMENT_LABELS[element];
      return {
        outcome: 'trained',
        message: bondRankAfter === bondRankBefore
          ? `${option.name} accepted ${amount.toLocaleString('en-US')} QI.`
          : bondRankAfter === 'legendary'
            ? mastery
              ? `${option.name} reached ${bondRankLabel('legendary')}. You mastered ${elementName}: ${elementName} Mastery joins your collection and can be worn with any Familiar.`
              : `${option.name} reached ${bondRankLabel('legendary')}. You had already mastered ${elementName}.`
            : `${option.name} reached ${bondRankLabel(bondRankAfter)}: ${shown.join(', ')}.`,
        spent: amount, bondRankBefore, bondRankAfter, newUnlocks, mastered: mastery ? this.masteryOf(mastery) : null, snapshot: this.snapshotOf(updated),
      };
    });
  }

  /** Chooses the form one owned Familiar wears. Only unlocked forms are accepted. */
  async selectForm(principal: LibraryPrincipal, input: SelectFamiliarFormInput): Promise<FamiliarTrainingSnapshot> {
    const option = this.option(input.familiarId);
    return this.serialize(principal.uid, async () => {
      const account = await this.repository.getAccount(principal.uid);
      if (!this.owns(account, option)) throw new FamiliarConflictError(`Bring ${option.name} home before choosing its form.`);
      if (input.formId !== null && !this.viewOf(account, option).unlockedForms.some(form => form.id === input.formId)) {
        throw new FamiliarConflictError('That form is not unlocked yet.');
      }
      return this.snapshotOf(await this.repository.selectForm(principal.uid, option.id, input.formId));
    });
  }

  /**
   * Chooses the Active Elemental Effect. Following the Active Familiar (its
   * bond effect or its signature) and wearing nothing are always allowed; a
   * mastered element only once the cultivator has mastered it.
   */
  async selectElementalEffect(principal: LibraryPrincipal, selection: ActiveElementalEffectSelection): Promise<FamiliarTrainingSnapshot> {
    const source = (selection as { source?: unknown } | null)?.source;
    if (source !== 'bond' && source !== 'signature' && source !== 'mastered' && source !== 'none') {
      throw new FamiliarValidationError(['Choose the Active Familiar’s bond, its signature, a mastered element, or none.']);
    }
    const element = source === 'mastered' ? (selection as { element?: unknown }).element : undefined;
    if (source === 'mastered' && !FAMILIAR_ELEMENTS.includes(element as never)) throw new FamiliarValidationError(['Name the mastered element to wear.']);
    return this.serialize(principal.uid, async () => {
      const account = await this.repository.getAccount(principal.uid);
      if (source === 'mastered' && !account.masteries.some(record => record.element === element)) {
        throw new FamiliarConflictError('Reach Legendary bond with a Familiar of that element to master it first.');
      }
      const stored: ActiveElementalEffectSelection = source === 'mastered' ? { source, element: element as FamiliarElementalTitleEffect['element'] } : { source };
      return this.snapshotOf(await this.repository.selectActiveEffect(principal.uid, stored));
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
