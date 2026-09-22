import { useEffect, useMemo, useRef, useState } from 'react';
import { LibraryButton, LibraryGlobalIcon } from '@seihouse/library-ui';
import {
  SEIDialog,
  SEIDialogContent,
  SEIDialogDescription,
  SEIDialogTitle,
} from '@seihouse/ui';
import type { QiAccountState } from '../../../library/cultivation/contracts';
import type { EnergyAccountState } from '../../energy/shared/useEnergyAccount';
import { EnergyAmount } from '../../energy/development/EnergyAmount';
import { FamiliarHero } from '../../familiar/development/FamiliarSelection';
import type { FamiliarOption } from '../../familiar/shared/familiar';
import { ShopCard } from './ShopCard';
import { dailyStoreRotation, rotationDayKey, type CelestialStoreOffer } from '../shared/rotation';
import type { CelestialStoreConfig } from '../shared/storeConfig';
import {
  ownsFamiliar,
  type CelestialStorePurchase,
  type CelestialStorePurchaseResult,
} from '../shared/storeAccount';
import './celestialStore.css';

const formatQi = new Intl.NumberFormat('en-US').format;

/** The single QI mark + number rendering the Store's QI amounts share. */
function QiAmount({ amount, state = 'ready', label }: { amount: number | null; state?: 'ready' | 'loading' | 'unavailable'; label: string }) {
  return (
    <span className="celestial-store-qi-amount" data-qi-state={state} aria-label={label} role="img">
      <LibraryGlobalIcon name="qi-yin-yang" size="1em" className="celestial-store-qi-glyph" aria-hidden="true" />
      <span aria-hidden="true">{state === 'ready' && amount !== null ? formatQi(amount) : '—'}</span>
    </span>
  );
}

function OfferPriceLine({ offer }: { offer: CelestialStoreOffer }) {
  const current = offer.salePrice ?? offer.price;
  return (
    <span className="celestial-store-price" data-store-price={current}>
      {offer.currency === 'energy'
        ? <EnergyAmount amount={current} size="sm" label={`${current} Energy`} />
        : <QiAmount amount={current} label={`${formatQi(current)} QI`} />}
      <span className="celestial-store-price-currency" aria-hidden="true">{offer.currency === 'energy' ? 'Energy' : 'QI'}</span>
      {offer.salePrice !== undefined && (
        <s className="celestial-store-price-was" aria-label={`Normal price ${formatQi(offer.price)}`}>{formatQi(offer.price)}</s>
      )}
    </span>
  );
}

/**
 * One shelf holding every Familiar on offer today, whatever it costs. The
 * price line on each card carries its own currency emblem, so a cultivator
 * reads Energy from QI at a glance without the Store sorting them into
 * separate pens and naming the obvious.
 */
function FamiliarShelf({ offers, ownedFamiliarIds, equippedFamiliarId, onOpen }: {
  offers: readonly CelestialStoreOffer[];
  ownedFamiliarIds: readonly string[];
  equippedFamiliarId?: string;
  onOpen: (offer: CelestialStoreOffer, opener: HTMLButtonElement | null) => void;
}) {
  return (
    <section className="celestial-store-shelf" data-store-shelf="familiars" aria-labelledby="celestial-store-shelf-familiars">
      <header className="celestial-store-shelf-header">
        <h3 id="celestial-store-shelf-familiars" className="celestial-store-shelf-title">Familiars</h3>
        <p className="celestial-store-shelf-tagline">Companions who walk the Library beside you.</p>
      </header>
      {offers.length === 0
        ? <p className="celestial-store-shelf-empty">Today’s offers could not be prepared. Return tomorrow.</p>
        : (
          <div className="celestial-store-grid">
            {offers.map(offer => {
              const equipped = equippedFamiliarId === offer.familiarId;
              const owned = ownsFamiliar(ownedFamiliarIds, offer.familiarId, offer.option.isDefault);
              return (
                <ShopCard
                  key={offer.familiarId}
                  offerId={offer.familiarId}
                  name={offer.option.name}
                  rank={offer.option.rarity}
                  currency={offer.currency}
                  renderMedia={active => <FamiliarHero key={offer.option.heroUrl} option={offer.option} active={active} />}
                  price={<OfferPriceLine offer={offer} />}
                  state={equipped ? { label: 'Equipped', tone: 'equipped' }
                    : owned ? { label: 'Owned', tone: 'owned' }
                    : undefined}
                  onOpen={opener => onOpen(offer, opener)}
                />
              );
            })}
          </div>
        )}
    </section>
  );
}

export interface CelestialStorePanelProps {
  /** Catalogue projections supplied by the host — the only source of name, rank, and artwork. */
  options: readonly FamiliarOption[];
  /** Live QI ledger read; the Store never keeps a balance of its own. */
  cultivation?: QiAccountState;
  /** Live Energy account read; spendable Energy is the server's `available`. */
  energy?: EnergyAccountState;
  equippedFamiliarId?: string;
  /** Account-owned Familiar IDs beyond implicit defaults. */
  ownedFamiliarIds?: readonly string[];
  onEquip?: (id: string) => void | Promise<void>;
  equipPending?: boolean;
  onPurchase?: (purchase: CelestialStorePurchase) => Promise<CelestialStorePurchaseResult>;
  purchasePending?: boolean;
  /** Rotation date override for previews and tests; defaults to today. */
  date?: Date;
  config?: CelestialStoreConfig;
}

/**
 * Follow the live local day so a Store left open overnight rotates with it
 * rather than serving yesterday's shelves. An explicitly supplied date is a
 * fixed instant for previews and tests, and never re-reads the clock.
 */
function useRotationDate(fixed?: Date): Date {
  const fixedTime = fixed?.getTime();
  const [current, setCurrent] = useState(() => (fixedTime === undefined ? new Date() : new Date(fixedTime)));
  useEffect(() => {
    if (fixedTime !== undefined) {
      setCurrent(previous => (previous.getTime() === fixedTime ? previous : new Date(fixedTime)));
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const follow = () => {
      const now = new Date();
      // Same day means the same rotation: keep the old instant so nothing re-renders.
      setCurrent(previous => (rotationDayKey(previous) === rotationDayKey(now) ? previous : now));
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
      timer = setTimeout(follow, Math.max(1_000, midnight - now.getTime()));
    };
    follow();
    return () => clearTimeout(timer);
  }, [fixedTime]);
  return current;
}

/**
 * The dedicated Celestial Store page: live balances over two framed shelves —
 * Energy Familiars and QI Familiars — showing today's shared rotation. Cards
 * open a focused detail dialog with the purchase or equip action. Familiars
 * only; future categories arrive as their own shelves, never placeholders.
 */
export function CelestialStorePanel({
  options,
  cultivation,
  energy,
  equippedFamiliarId,
  ownedFamiliarIds = [],
  onEquip,
  equipPending = false,
  onPurchase,
  purchasePending = false,
  date,
  config,
}: CelestialStorePanelProps) {
  const rotationDate = useRotationDate(date);
  const rotation = useMemo(() => dailyStoreRotation(options, rotationDate, config), [options, rotationDate, config]);
  // One shelf, Energy offers first: the emblem on each price tells them apart.
  const offers = useMemo(() => [...rotation.energy, ...rotation.qi], [rotation]);
  const [selected, setSelected] = useState<CelestialStoreOffer | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const dialogOpener = useRef<HTMLButtonElement | null>(null);
  // An in-flight guard the host cannot omit: `purchasePending` is optional and
  // only lands a render later, so without this a double activation could send
  // a production adapter two debits for one offer.
  const purchaseLock = useRef(false);
  const [purchasing, setPurchasing] = useState(false);

  // A new day is a new rotation, so yesterday's open offer stops being for sale:
  // close the dialog rather than let a stale offer reach `onPurchase`.
  useEffect(() => {
    setSelected(null);
    setPurchaseMessage(null);
  }, [rotation.dayKey]);

  const qiState = !cultivation || cultivation.status === 'unavailable' ? 'unavailable'
    : cultivation.status === 'ready' ? 'ready' : 'loading';
  const qiBalance = cultivation?.snapshot?.balance ?? null;
  const energyState = !energy || energy.status === 'unavailable' ? 'unavailable'
    : energy.status === 'ready' ? 'ready' : 'loading';
  const energyAvailable = energy?.snapshot?.available ?? null;

  const openOffer = (offer: CelestialStoreOffer, opener: HTMLButtonElement | null) => {
    dialogOpener.current = opener;
    setPurchaseMessage(null);
    setSelected(offer);
  };

  const selectedOwned = selected ? ownsFamiliar(ownedFamiliarIds, selected.familiarId, selected.option.isDefault) : false;
  const selectedEquipped = selected ? equippedFamiliarId === selected.familiarId : false;
  const selectedPrice = selected ? selected.salePrice ?? selected.price : 0;
  const selectedBalance = selected?.currency === 'energy' ? energyAvailable : qiBalance;
  const balanceKnown = selected ? (selected.currency === 'energy' ? energyState : qiState) === 'ready' && selectedBalance !== null : false;
  const affordable = balanceKnown && (selectedBalance ?? 0) >= selectedPrice;

  const buy = async () => {
    if (!selected || !onPurchase || purchaseLock.current) return;
    purchaseLock.current = true;
    setPurchasing(true);
    try {
      const result = await onPurchase({ familiarId: selected.familiarId, currency: selected.currency, price: selectedPrice });
      setPurchaseMessage(result.message);
    } finally {
      purchaseLock.current = false;
      setPurchasing(false);
    }
  };

  return (
    <div className="celestial-store" data-store-day={rotation.dayKey}>
      <div className="celestial-store-balances" data-store-balances>
        <div className="celestial-store-balance" data-store-balance="qi">
          <QiAmount amount={qiBalance} state={qiState} label={qiState === 'ready' && qiBalance !== null ? `QI balance ${formatQi(qiBalance)}` : 'QI balance unavailable'} />
          <span className="celestial-store-balance-label" aria-hidden="true">QI</span>
        </div>
        <div className="celestial-store-balance" data-store-balance="energy">
          <EnergyAmount amount={energyAvailable} state={energyState} label={energyState === 'ready' && energyAvailable !== null ? `Energy balance ${energyAvailable}` : 'Energy balance unavailable'} />
          <span className="celestial-store-balance-label" aria-hidden="true">Energy</span>
        </div>
      </div>

      <FamiliarShelf offers={offers} ownedFamiliarIds={ownedFamiliarIds}
        equippedFamiliarId={equippedFamiliarId} onOpen={openOffer} />

      <SEIDialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
        <SEIDialogContent
          variant="dark"
          className="celestial-store-detail z-[310] max-h-[85dvh] overflow-y-auto sm:max-w-md"
          backdropClassName="z-[300]"
          finalFocus={dialogOpener}
        >
          {selected && (
            <>
              <SEIDialogTitle className="celestial-store-detail-title">{selected.option.name}</SEIDialogTitle>
              <SEIDialogDescription className="sr-only">
                {`${selected.option.name} details, price, and actions`}
              </SEIDialogDescription>
              <div className="celestial-store-detail-hero" data-rarity={selected.option.rarity}>
                <FamiliarHero option={selected.option} active />
              </div>
              <div className="celestial-store-detail-meta">
                <span className="familiar-option-rarity" data-rarity={selected.option.rarity}>{selected.option.rarity}</span>
                {selectedEquipped && <span className="familiar-option-equipped">Equipped</span>}
                {!selectedEquipped && selectedOwned && <span className="familiar-option-default">Owned</span>}
              </div>
              {selected.option.description && <p className="celestial-store-detail-description">{selected.option.description}</p>}
              {!selectedOwned && <OfferPriceLine offer={selected} />}
              <div className="celestial-store-detail-actions">
                {selectedOwned ? (
                  <LibraryButton fullWidth variant="secondary" aria-pressed={selectedEquipped}
                    disabled={selectedEquipped || equipPending || !onEquip}
                    onClick={() => void onEquip?.(selected.familiarId)}>
                    {selectedEquipped ? 'Equipped' : equipPending ? 'Equipping…' : `Equip ${selected.option.name}`}
                  </LibraryButton>
                ) : (
                  <LibraryButton fullWidth variant="secondary"
                    disabled={!onPurchase || purchasePending || purchasing || !affordable}
                    onClick={() => void buy()}>
                    {purchasePending || purchasing ? 'Purchasing…'
                      : !onPurchase ? 'Purchases are not connected here'
                      : !balanceKnown ? 'Balance unavailable'
                      : !affordable ? `Not enough ${selected.currency === 'energy' ? 'Energy' : 'QI'}`
                      : `Buy for ${formatQi(selectedPrice)} ${selected.currency === 'energy' ? 'Energy' : 'QI'}`}
                  </LibraryButton>
                )}
              </div>
              <p role="status" className="celestial-store-detail-status">{purchaseMessage ?? ''}</p>
            </>
          )}
        </SEIDialogContent>
      </SEIDialog>
    </div>
  );
}
