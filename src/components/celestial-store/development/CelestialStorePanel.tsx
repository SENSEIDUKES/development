import { useMemo, useRef, useState } from 'react';
import { LibraryButton } from '@seihouse/library-ui';
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
import { dailyStoreRotation, type CelestialStoreOffer } from '../shared/rotation';
import type { CelestialStoreConfig } from '../shared/storeConfig';
import {
  ownsFamiliar,
  type CelestialStorePurchase,
  type CelestialStorePurchaseResult,
} from '../shared/storeAccount';
import './celestialStore.css';

const formatQi = new Intl.NumberFormat('en-US').format;

/** The single 🌀 + number rendering the Store's QI amounts share. */
function QiAmount({ amount, state = 'ready', label }: { amount: number | null; state?: 'ready' | 'loading' | 'unavailable'; label: string }) {
  return (
    <span className="celestial-store-qi-amount" data-qi-state={state} aria-label={label} role="img">
      <span className="celestial-store-qi-glyph" aria-hidden="true">🌀</span>
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

function OfferCard({ offer, owned, equipped, onOpen }: {
  offer: CelestialStoreOffer;
  owned: boolean;
  equipped: boolean;
  onOpen: (offer: CelestialStoreOffer, opener: HTMLButtonElement | null) => void;
}) {
  const [active, setActive] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  return (
    <article className="celestial-store-card" data-store-offer={offer.familiarId} data-store-currency={offer.currency} data-rarity={offer.option.rarity}>
      <button
        ref={opener}
        type="button"
        className="celestial-store-card-button"
        aria-haspopup="dialog"
        onClick={() => onOpen(offer, opener.current)}
        onPointerEnter={event => { if (event.pointerType === 'mouse') setActive(true); }}
        onPointerLeave={event => { if (event.pointerType === 'mouse') setActive(false); }}
        onPointerDown={event => { if (event.pointerType !== 'mouse') setActive(true); }}
        onPointerUp={event => { if (event.pointerType !== 'mouse') setActive(false); }}
        onPointerCancel={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
      >
        <FamiliarHero key={offer.option.heroUrl} option={offer.option} active={active} />
        <span className="celestial-store-card-name">{offer.option.name}</span>
        <span className="familiar-option-rarity" data-rarity={offer.option.rarity}>{offer.option.rarity}</span>
        {equipped
          ? <span className="familiar-option-equipped celestial-store-card-state">Equipped</span>
          : owned
            ? <span className="familiar-option-default celestial-store-card-state">Owned</span>
            : <OfferPriceLine offer={offer} />}
      </button>
    </article>
  );
}

function Shelf({ id, title, tagline, offers, ownedFamiliarIds, equippedFamiliarId, onOpen }: {
  id: 'energy' | 'qi';
  title: string;
  tagline: string;
  offers: readonly CelestialStoreOffer[];
  ownedFamiliarIds: readonly string[];
  equippedFamiliarId?: string;
  onOpen: (offer: CelestialStoreOffer, opener: HTMLButtonElement | null) => void;
}) {
  return (
    <section className="celestial-store-shelf" data-store-shelf={id} aria-labelledby={`celestial-store-shelf-${id}`}>
      <header className="celestial-store-shelf-header">
        <h3 id={`celestial-store-shelf-${id}`} className="celestial-store-shelf-title">{title}</h3>
        <p className="celestial-store-shelf-tagline">{tagline}</p>
      </header>
      {offers.length === 0
        ? <p className="celestial-store-shelf-empty">Today’s offers could not be prepared. Return tomorrow.</p>
        : (
          <div className="celestial-store-grid">
            {offers.map(offer => (
              <OfferCard
                key={offer.familiarId}
                offer={offer}
                owned={ownsFamiliar(ownedFamiliarIds, offer.familiarId, offer.option.isDefault)}
                equipped={equippedFamiliarId === offer.familiarId}
                onOpen={onOpen}
              />
            ))}
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
  const rotation = useMemo(() => dailyStoreRotation(options, date ?? new Date(), config), [options, date, config]);
  const [selected, setSelected] = useState<CelestialStoreOffer | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const dialogOpener = useRef<HTMLButtonElement | null>(null);

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
    if (!selected || !onPurchase) return;
    const result = await onPurchase({ familiarId: selected.familiarId, currency: selected.currency, price: selectedPrice });
    setPurchaseMessage(result.message);
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

      <Shelf id="energy" title="Energy Familiars" tagline="Premium companions acquired with Energy."
        offers={rotation.energy} ownedFamiliarIds={ownedFamiliarIds} equippedFamiliarId={equippedFamiliarId} onOpen={openOffer} />
      <Shelf id="qi" title="QI Familiars" tagline="Companions cultivated through the Library."
        offers={rotation.qi} ownedFamiliarIds={ownedFamiliarIds} equippedFamiliarId={equippedFamiliarId} onOpen={openOffer} />

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
                    disabled={!onPurchase || purchasePending || !affordable}
                    onClick={() => void buy()}>
                    {purchasePending ? 'Purchasing…'
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
