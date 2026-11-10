import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { LibraryNavigationIcon } from '@seihouse/library-ui';
import type { QiAccountState } from '../../../library/cultivation/contracts';
import { formatQi, QiAmount } from '../../../library/cultivation/QiAmount';
import { BalancePills } from '../../energy/development/BalancePill';
import type { EnergyAccountState } from '../../energy/shared/useEnergyAccount';
import { EnergyAmount } from '../../energy/development/EnergyAmount';
import { EnergySunIcon } from '../../energy/development/EnergySunIcon';
import { FamiliarHero } from '../../familiar/development/FamiliarHero';
import type { FamiliarOption, FamiliarRarity } from '../../familiar/shared/familiar';
import { dailyStoreRotation, rotationDayKey, type CelestialStoreOffer } from '../shared/rotation';
import type { CelestialStoreConfig } from '../shared/storeConfig';
import {
  ownsFamiliar,
  type CelestialStorePurchase,
  type CelestialStorePurchaseResult,
} from '../shared/storeAccount';
import './celestialStore.css';

export type CelestialStoreTab = 'home' | 'familiar';

const TABS: readonly { id: CelestialStoreTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'familiar', label: 'Familiar' },
];

const RARITY_LABELS: Readonly<Record<FamiliarRarity, string>> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

const RARITY_STARS: Readonly<Record<FamiliarRarity, string>> = {
  common: '✦',
  rare: '✦✦',
  epic: '✦✦✦',
  legendary: '✦✦✦✦',
};

const SWIPE_DISTANCE = 48;

function offerTermsKey(offer: CelestialStoreOffer | null): string | null {
  if (!offer) return null;
  return `${offer.familiarId}:${offer.currency}:${offer.salePrice ?? offer.price}`;
}

function formatShelfPrice(amount: number): string {
  if (amount >= 10_000) {
    const thousands = Math.round((amount / 1_000) * 10) / 10;
    return `${thousands}k`;
  }
  return formatQi(amount);
}

function OfferPriceLine({ offer }: { offer: CelestialStoreOffer }) {
  const current = offer.salePrice ?? offer.price;
  return (
    <span className="celestial-store-price" data-store-price={current} data-currency={offer.currency}>
      {offer.currency === 'energy'
        ? <EnergyAmount amount={current} size="sm" label={`${current} Energy`} />
        : <QiAmount className="celestial-store-qi-amount" amount={current} label={`${formatQi(current)} QI`} />}
      <span className="celestial-store-price-currency" aria-hidden="true">
        {offer.currency === 'energy' ? 'Energy' : 'QI'}
      </span>
      {offer.salePrice !== undefined && (
        <s className="celestial-store-price-was" aria-label={`Normal price ${formatQi(offer.price)}`}>
          {formatQi(offer.price)}
        </s>
      )}
    </span>
  );
}

function RarityCrest({ rarity }: { rarity: FamiliarRarity }) {
  return (
    <span className="celestial-store-rarity-crest" data-rarity={rarity}>
      <span className="celestial-store-rarity-stars" aria-hidden="true">{RARITY_STARS[rarity]}</span>
      <span className="celestial-store-rank-value" data-rarity={rarity}>
        {RARITY_LABELS[rarity]}
      </span>
    </span>
  );
}

function CelestialAstrolabe() {
  return (
    <svg
      className="celestial-store-astrolabe"
      viewBox="0 0 260 260"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="130" cy="130" r="120" stroke="currentColor" strokeOpacity="0.24" strokeWidth="1" strokeDasharray="3 5" />
      <circle cx="130" cy="130" r="102" stroke="currentColor" strokeOpacity="0.38" strokeWidth="1.15" />
      <circle cx="130" cy="130" r="76" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.85" />
      <rect x="58" y="58" width="144" height="144" rx="2" transform="rotate(45 130 130)" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.85" />
      <path d="M130 3 L133.5 12 L142.5 15.5 L133.5 19 L130 28 L126.5 19 L117.5 15.5 L126.5 12 Z" fill="currentColor" fillOpacity="0.72" />
      <path d="M130 232 L133 239.5 L140.5 242.5 L133 245.5 L130 253 L127 245.5 L119.5 242.5 L127 239.5 Z" fill="currentColor" fillOpacity="0.5" />
      <path d="M14 130 L21.5 127 L24.5 119.5 L27.5 127 L35 130 L27.5 133 L24.5 140.5 L21.5 133 Z" fill="currentColor" fillOpacity="0.5" />
      <path d="M225 130 L232.5 127 L235.5 119.5 L238.5 127 L246 130 L238.5 133 L235.5 140.5 L232.5 133 Z" fill="currentColor" fillOpacity="0.5" />
    </svg>
  );
}

function StageFigure({
  offer,
  owned,
  ribbon,
  failedPortraits,
  onPortraitError,
}: {
  offer: CelestialStoreOffer;
  owned: boolean;
  ribbon?: { label: string; tone: 'featured' | 'sale' | 'owned' } | null;
  failedPortraits: ReadonlySet<string>;
  onPortraitError: (familiarId: string) => void;
}) {
  const usePortrait = Boolean(offer.option.portraitUrl && !failedPortraits.has(offer.familiarId));
  return (
    <div
      className="celestial-store-figure"
      data-rarity={offer.option.rarity}
      data-owned={owned || undefined}
    >
      {ribbon && (
        <span
          className="celestial-store-ribbon"
          data-tone={ribbon.tone}
          data-sale={ribbon.tone === 'sale' || undefined}
        >
          {ribbon.tone === 'owned' && <Check size={11} strokeWidth={2.8} aria-hidden="true" />}
          <span>{ribbon.label}</span>
        </span>
      )}
      <div className="celestial-store-halo" aria-hidden="true">
        <CelestialAstrolabe />
      </div>
      <div className="celestial-store-pedestal" aria-hidden="true" />
      {usePortrait ? (
        <img
          src={offer.option.portraitUrl}
          onError={() => onPortraitError(offer.familiarId)}
          alt={`${offer.option.name} Familiar`}
          className="celestial-store-hero-image"
          decoding="async"
          data-store-portrait
        />
      ) : (
        <FamiliarHero
          key={offer.option.heroUrl}
          option={offer.option}
          active
          className="celestial-store-hero-image"
        />
      )}
    </div>
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
  /** Return control when hosted inside the Cultivator Cave. */
  onBack?: () => void;
  backLabel?: string;
  /** Rotation date override for previews and tests; defaults to today. */
  date?: Date;
  config?: CelestialStoreConfig;
  /** Optional starting tab; defaults to `home`. */
  defaultTab?: CelestialStoreTab;
}

/**
 * Follow the live local day so a Store left open overnight rotates with it
 * rather than serving yesterday's offers. An explicitly supplied date is a
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
 * The official Celestial Store stage: a viewport-locked, phone-first shop
 * showcase inspired by Genshin Impact's shop layout.
 *
 * - `Home` spotlights today's lead unowned or discounted offer on a large open
 *   stage above a compact purchase plinth, with direct access to all 6 daily
 *   shop slots.
 * - `Familiar` displays one companion large on the open stage above a 6-slot
 *   daily shop shelf where unowned items carry bright gold/violet price tags
 *   and already-purchased items step back visually with dimmed `Owned` tags.
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
  onBack,
  backLabel = 'Return to cave',
  date,
  config,
  defaultTab = 'home',
}: CelestialStorePanelProps) {
  const instanceId = useId();
  const titleId = `${instanceId}-title`;
  const rotationDate = useRotationDate(date);
  const rotation = useMemo(() => dailyStoreRotation(options, rotationDate, config), [options, rotationDate, config]);
  // Energy offers lead so the rotation reads premium-first; each offer carries its own currency.
  const offers = useMemo(() => [...rotation.energy, ...rotation.qi], [rotation]);

  const isFamiliarOwned = (offer: CelestialStoreOffer) =>
    equippedFamiliarId === offer.familiarId
    || ownsFamiliar(ownedFamiliarIds, offer.familiarId, offer.option.isDefault);

  const [tab, setTab] = useState<CelestialStoreTab>(defaultTab);
  const [lastPurchasedHomeOfferId, setLastPurchasedHomeOfferId] = useState<string | null>(null);

  // Home is a Store front first: prioritize keeping a just-purchased offer featured
  // through confirmation, then prioritize an unowned sale, then any configured sale,
  // then the first unowned offer for sale today, falling back to the lead offer only
  // when the player already owns all 6 of today's shop offers.
  const featuredOffer = useMemo(
    () => {
      if (lastPurchasedHomeOfferId) {
        const justBought = offers.find(offer => offer.familiarId === lastPurchasedHomeOfferId);
        if (justBought) return justBought;
      }
      return (
        offers.find(offer => !isFamiliarOwned(offer) && offer.salePrice !== undefined)
        ?? offers.find(offer => offer.salePrice !== undefined)
        ?? offers.find(offer => !isFamiliarOwned(offer))
        ?? offers[0]
        ?? null
      );
    },
    [offers, ownedFamiliarIds, equippedFamiliarId, lastPurchasedHomeOfferId],
  );

  const [focusedId, setFocusedId] = useState<string | null>(() => (offers[0]?.familiarId ?? null));
  const [direction, setDirection] = useState<'next' | 'previous' | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<{
    termsKey: string;
    message: string;
    outcome: CelestialStorePurchaseResult['outcome'];
  } | null>(null);
  const [failedPortraits, setFailedPortraits] = useState<ReadonlySet<string>>(() => new Set());
  const [failedThumbs, setFailedThumbs] = useState<ReadonlySet<string>>(() => new Set());

  // An in-flight guard the host cannot omit: `purchasePending` is optional and
  // only lands a render later, so without this a double activation could send
  // a production adapter two debits for one offer.
  const purchaseLock = useRef(false);
  const [purchasing, setPurchasing] = useState(false);
  const tabRefs = useRef<Record<CelestialStoreTab, HTMLButtonElement | null>>({ home: null, familiar: null });
  const stripRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  // Keep the focused companion synced with today's live rotation: if midnight
  // reshuffles the rotation or a configuration change retires that Familiar,
  // move cleanly to the first offer in today's shelf so retired offers never linger.
  useEffect(() => {
    setFocusedId(previous => {
      if (previous && offers.some(offer => offer.familiarId === previous)) return previous;
      return offers[0]?.familiarId ?? null;
    });
  }, [offers]);

  const activeIndex = useMemo(() => {
    if (!offers.length) return -1;
    const found = offers.findIndex(offer => offer.familiarId === focusedId);
    return found >= 0 ? found : 0;
  }, [offers, focusedId]);

  const activeFamiliarOffer = activeIndex >= 0 ? offers[activeIndex] : null;
  const stageOffer = tab === 'home' ? featuredOffer : activeFamiliarOffer;

  // Clear stale purchase messages if an offer's price, currency, or day changes;
  // identical terms across a host re-render preserve the message.
  const currentTermsKey = offerTermsKey(stageOffer);
  useEffect(() => {
    if (purchaseStatus && purchaseStatus.termsKey !== currentTermsKey) {
      setPurchaseStatus(null);
    }
  }, [currentTermsKey, purchaseStatus]);

  const qiState = !cultivation || cultivation.status === 'unavailable' ? 'unavailable'
    : cultivation.status === 'ready' ? 'ready' : 'loading';
  const qiBalance = cultivation?.snapshot?.balance ?? null;
  const energyState = !energy || energy.status === 'unavailable' ? 'unavailable'
    : energy.status === 'ready' ? 'ready' : 'loading';
  const energyAvailable = energy?.snapshot?.available ?? null;

  const ownedTodayCount = useMemo(
    () => offers.filter(offer => isFamiliarOwned(offer)).length,
    [offers, ownedFamiliarIds, equippedFamiliarId],
  );
  const availableTodayCount = Math.max(0, offers.length - ownedTodayCount);

  const selectOfferAt = (nextIndex: number, stepDirection: 'next' | 'previous' | null = null) => {
    if (!offers.length) return;
    const wrapped = (nextIndex + offers.length) % offers.length;
    const target = offers[wrapped];
    setDirection(stepDirection);
    setFocusedId(target.familiarId);
    setPurchaseStatus(null);
    stripRefs.current[target.familiarId]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };

  const stepOffer = (step: 1 | -1) => {
    if (offers.length <= 1) return;
    selectOfferAt(activeIndex + step, step > 0 ? 'next' : 'previous');
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const order = TABS.map(item => item.id);
    const index = order.indexOf(tab);
    let next: CelestialStoreTab | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = order[(index + 1) % order.length];
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = order[(index - 1 + order.length) % order.length];
    } else if (event.key === 'Home') {
      next = order[0];
    } else if (event.key === 'End') {
      next = order[order.length - 1];
    }
    if (!next) return;
    event.preventDefault();
    setTab(next);
    setLastPurchasedHomeOfferId(null);
    setPurchaseStatus(null);
    tabRefs.current[next]?.focus();
  };

  const onStageKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); stepOffer(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); stepOffer(-1); }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    swipeStart.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
      stepOffer(dx < 0 ? 1 : -1);
    }
  };

  const buy = async (offer: CelestialStoreOffer) => {
    if (!onPurchase || purchaseLock.current) return;
    const price = offer.salePrice ?? offer.price;
    const key = offerTermsKey(offer)!;
    purchaseLock.current = true;
    setPurchasing(true);
    try {
      const result = await onPurchase({ familiarId: offer.familiarId, currency: offer.currency, price });
      if (result.outcome === 'purchased' && tab === 'home') {
        setLastPurchasedHomeOfferId(offer.familiarId);
      }
      setPurchaseStatus({ termsKey: key, message: result.message, outcome: result.outcome });
    } finally {
      purchaseLock.current = false;
      setPurchasing(false);
    }
  };

  const handlePortraitError = (familiarId: string) => {
    setFailedPortraits(previous => new Set(previous).add(familiarId));
  };

  const renderBuyButton = (offer: CelestialStoreOffer) => {
    const price = offer.salePrice ?? offer.price;
    const balance = offer.currency === 'energy' ? energyAvailable : qiBalance;
    const balanceKnown = (offer.currency === 'energy' ? energyState : qiState) === 'ready' && balance !== null;
    const affordable = balanceKnown && (balance ?? 0) >= price;

    return (
      <button
        type="button"
        className="celestial-store-cta is-buy"
        disabled={!onPurchase || purchasePending || purchasing || !affordable}
        onClick={() => void buy(offer)}
        data-store-action="buy"
      >
        {purchasePending || purchasing ? 'Purchasing…'
          : !onPurchase ? 'Purchases are not connected here'
          : !balanceKnown ? 'Balance unavailable'
          : !affordable ? `Not enough ${offer.currency === 'energy' ? 'Energy' : 'QI'}`
          : `Buy for ${formatQi(price)} ${offer.currency === 'energy' ? 'Energy' : 'QI'}`}
      </button>
    );
  };

  const renderEquipButton = (offer: CelestialStoreOffer) => {
    const equipped = equippedFamiliarId === offer.familiarId;
    return (
      <button
        type="button"
        className={`celestial-store-equip-pill${equipped ? ' is-equipped' : ''}`}
        aria-pressed={equipped}
        aria-label={equipped ? `${offer.option.name} is equipped` : `Equip ${offer.option.name}`}
        disabled={equipped || equipPending || !onEquip}
        onClick={() => void onEquip?.(offer.familiarId)}
        data-store-action="equip"
      >
        {equipped ? 'Equipped' : equipPending ? 'Equipping…' : 'Equip'}
      </button>
    );
  };

  const featuredOwned = featuredOffer ? isFamiliarOwned(featuredOffer) : false;
  const featuredEquipped = featuredOffer ? equippedFamiliarId === featuredOffer.familiarId : false;
  const activeOwned = activeFamiliarOffer ? isFamiliarOwned(activeFamiliarOffer) : false;
  const activeEquipped = activeFamiliarOffer ? equippedFamiliarId === activeFamiliarOffer.familiarId : false;
  const visibleMessage = purchaseStatus && purchaseStatus.termsKey === currentTermsKey ? purchaseStatus.message : '';

  const homeRibbon = featuredOffer
    ? featuredOffer.salePrice !== undefined && !featuredOwned
      ? { label: 'Special Offer', tone: 'sale' as const }
      : featuredOwned
        ? { label: availableTodayCount === 0 ? 'Daily Shop · All 6 Owned' : 'Purchased', tone: 'owned' as const }
        : { label: 'Daily Featured Offer', tone: 'featured' as const }
    : null;

  const familiarRibbon = activeFamiliarOffer && !activeOwned && activeFamiliarOffer.salePrice !== undefined
    ? { label: 'Special Offer', tone: 'sale' as const }
    : null;

  const homeShopLine = availableTodayCount === 0
    ? `All ${offers.length} daily offers owned · New rotation tomorrow`
    : availableTodayCount === offers.length
      ? `${offers.length} offers available today · Refreshes daily`
      : `${availableTodayCount} of ${offers.length} available to buy · Refreshes daily`;

  return (
    <section
      className="celestial-store"
      data-celestial-store
      data-cave-destination="store"
      data-store-day={rotation.dayKey}
      data-store-tab={tab}
      data-rarity={stageOffer?.option.rarity}
      aria-labelledby={titleId}
    >
      <div className="celestial-store-sky" aria-hidden="true"><span /><span /><span /></div>

      <div className="celestial-store-frame">
        <header className="celestial-store-topbar">
          <div className="celestial-store-topbar-start">
            {onBack && (
              <button
                type="button"
                className="celestial-store-icon-button"
                aria-label={backLabel}
                onClick={onBack}
              >
                <ArrowLeft size={18} aria-hidden="true" />
              </button>
            )}
            <h2 id={titleId} tabIndex={-1} className="celestial-store-title">
              <span className="celestial-store-title-prefix">Celestial </span>Store
            </h2>
          </div>
          <div className="celestial-store-topbar-end" data-store-balances>
            <BalancePills
              qi={{ amount: qiBalance, state: qiState }}
              energy={{ amount: energyAvailable, state: energyState }}
            />
          </div>
        </header>

        <div className="celestial-store-rail">
          <div className="celestial-store-rail-brand" aria-hidden="true">
            <LibraryNavigationIcon name="store" size={19} />
            <span>Shop</span>
          </div>
          <div
            className="celestial-store-tablist"
            role="tablist"
            aria-label="Store sections"
            onKeyDown={onTabKeyDown}
          >
            {TABS.map(item => (
              <button
                key={item.id}
                ref={node => { tabRefs.current[item.id] = node; }}
                type="button"
                role="tab"
                id={`${instanceId}-tab-${item.id}`}
                aria-controls={`${instanceId}-panel-${item.id}`}
                aria-selected={tab === item.id}
                tabIndex={tab === item.id ? 0 : -1}
                onClick={() => {
                  setTab(item.id);
                  setLastPurchasedHomeOfferId(null);
                  setPurchaseStatus(null);
                }}
                data-store-tab-trigger={item.id}
              >
                {item.id === 'home'
                  ? <LibraryNavigationIcon name="home" size={15} />
                  : <Sparkles size={15} aria-hidden="true" />}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="celestial-store-stage">
          <div
            role="tabpanel"
            id={`${instanceId}-panel-home`}
            aria-labelledby={`${instanceId}-tab-home`}
            hidden={tab !== 'home'}
            className="celestial-store-tabpanel"
          >
            {!featuredOffer ? (
              <div className="celestial-store-empty-stage">
                <p className="celestial-store-empty">Today’s offers could not be prepared. Return tomorrow.</p>
              </div>
            ) : (
              <div className="celestial-store-stage-content" data-store-panel="home">
                <div className="celestial-store-visual">
                  <StageFigure
                    offer={featuredOffer}
                    owned={featuredOwned}
                    ribbon={homeRibbon}
                    failedPortraits={failedPortraits}
                    onPortraitError={handlePortraitError}
                  />
                </div>

                <div
                  className="celestial-store-hud"
                  data-store-hud="home"
                  data-store-featured={featuredOffer.familiarId}
                  data-owned={featuredOwned || undefined}
                >
                  <div className="celestial-store-plinth-head">
                    <div className="celestial-store-identity">
                      <div className="celestial-store-meta-line">
                        <RarityCrest rarity={featuredOffer.option.rarity} />
                      </div>
                      <h3 className="celestial-store-name">{featuredOffer.option.name}</h3>
                      <p
                        className="celestial-store-shop-subnote"
                        data-store-owned-count={`${ownedTodayCount}/${offers.length}`}
                      >
                        {homeShopLine}
                      </p>
                    </div>

                    <div className="celestial-store-tag-slot">
                      {!featuredOwned ? (
                        <OfferPriceLine offer={featuredOffer} />
                      ) : (
                        <span
                          className="celestial-store-owned-stamp"
                          data-tone={featuredEquipped ? 'equipped' : 'owned'}
                        >
                          <Check size={11} strokeWidth={2.8} aria-hidden="true" />
                          <span>{featuredEquipped ? 'Owned · Active' : 'Owned'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {featuredOffer.option.description && (
                    <p className="celestial-store-description">{featuredOffer.option.description}</p>
                  )}

                  <div className={`celestial-store-actions ${featuredOwned ? 'is-owned-home' : 'is-dual'}`}>
                    {!featuredOwned ? (
                      <>
                        {renderBuyButton(featuredOffer)}
                        <button
                          type="button"
                          className="celestial-store-secondary-cta"
                          aria-label={`Browse all ${offers.length} daily shop offers`}
                          onClick={() => {
                            setLastPurchasedHomeOfferId(null);
                            setFocusedId(featuredOffer.familiarId);
                            setTab('familiar');
                          }}
                          data-store-browse-familiars
                        >
                          <span>{`Shop (${offers.length})`}</span>
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="celestial-store-secondary-cta is-browse-wide"
                          onClick={() => {
                            setLastPurchasedHomeOfferId(null);
                            setFocusedId(featuredOffer.familiarId);
                            setTab('familiar');
                          }}
                          data-store-browse-familiars
                        >
                          <span>{`View Today’s ${offers.length} Shop Offers`}</span>
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                        {renderEquipButton(featuredOffer)}
                      </>
                    )}
                  </div>

                  {tab === 'home' && (
                    <p
                      role="status"
                      aria-live="polite"
                      className="celestial-store-status"
                      data-outcome={purchaseStatus?.outcome}
                    >
                      {visibleMessage}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div
            role="tabpanel"
            id={`${instanceId}-panel-familiar`}
            aria-labelledby={`${instanceId}-tab-familiar`}
            hidden={tab !== 'familiar'}
            className="celestial-store-tabpanel"
            data-store-shelf="familiars"
          >
            {!activeFamiliarOffer ? (
              <div className="celestial-store-empty-stage">
                <p className="celestial-store-empty">Today’s offers could not be prepared. Return tomorrow.</p>
              </div>
            ) : (
              <div className="celestial-store-stage-content" data-store-panel="familiar">
                <div className="celestial-store-visual is-carousel">
                  <div
                    className="celestial-store-carousel"
                    role="group"
                    aria-roledescription="carousel"
                    aria-label="Today’s Familiar offers"
                    tabIndex={0}
                    onKeyDown={onStageKeyDown}
                    onPointerDown={onPointerDown}
                    onPointerUp={onPointerUp}
                    onPointerCancel={() => { swipeStart.current = null; }}
                  >
                    <div
                      key={activeFamiliarOffer.familiarId}
                      className="celestial-store-slide"
                      data-direction={direction ?? undefined}
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`${activeIndex + 1} of ${offers.length}: ${activeFamiliarOffer.option.name}`}
                      data-store-active-offer={activeFamiliarOffer.familiarId}
                    >
                      <StageFigure
                        offer={activeFamiliarOffer}
                        owned={activeOwned}
                        ribbon={familiarRibbon}
                        failedPortraits={failedPortraits}
                        onPortraitError={handlePortraitError}
                      />
                    </div>
                    {offers.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="celestial-store-nav is-previous"
                          aria-label="Previous Familiar offer"
                          onClick={() => stepOffer(-1)}
                        >
                          <ChevronLeft size={19} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="celestial-store-nav is-next"
                          aria-label="Next Familiar offer"
                          onClick={() => stepOffer(1)}
                        >
                          <ChevronRight size={19} aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="celestial-store-strip" role="group" aria-label="Daily Familiar shop shelf">
                    <div className="celestial-store-strip-track">
                      {offers.map((offer, idx) => {
                        const selected = idx === activeIndex;
                        const itemEquipped = equippedFamiliarId === offer.familiarId;
                        const itemOwned = isFamiliarOwned(offer);
                        const price = offer.salePrice ?? offer.price;
                        const thumbSrc = offer.option.portraitUrl && !failedThumbs.has(offer.familiarId)
                          ? offer.option.portraitUrl
                          : offer.option.stillUrl;
                        const stateLabel = itemEquipped
                          ? 'Equipped'
                          : itemOwned
                            ? 'Owned'
                            : `For sale: ${formatQi(price)} ${offer.currency === 'energy' ? 'Energy' : 'QI'}`;
                        return (
                          <button
                            key={offer.familiarId}
                            ref={node => { stripRefs.current[offer.familiarId] = node; }}
                            type="button"
                            className="celestial-store-strip-item"
                            data-store-offer={offer.familiarId}
                            data-store-currency={offer.currency}
                            data-rarity={offer.option.rarity}
                            data-store-state={itemEquipped ? 'equipped' : itemOwned ? 'owned' : 'available'}
                            aria-pressed={selected}
                            aria-label={`${offer.option.name} (${RARITY_LABELS[offer.option.rarity]}, ${stateLabel})`}
                            onClick={() => selectOfferAt(idx, idx > activeIndex ? 'next' : idx < activeIndex ? 'previous' : null)}
                          >
                            <span className="celestial-store-slot-art">
                              <img
                                src={thumbSrc}
                                onError={() => setFailedThumbs(previous => new Set(previous).add(offer.familiarId))}
                                alt=""
                                aria-hidden="true"
                                className="celestial-store-strip-avatar"
                                decoding="async"
                              />
                              {itemOwned && (
                                <span
                                  className="celestial-store-slot-check"
                                  data-equipped={itemEquipped || undefined}
                                  aria-hidden="true"
                                >
                                  <Check size={9} strokeWidth={3} />
                                </span>
                              )}
                            </span>

                            <span
                              className="celestial-store-slot-tag"
                              data-tag={itemEquipped ? 'equipped' : itemOwned ? 'owned' : offer.currency}
                              aria-hidden="true"
                            >
                              {itemEquipped ? (
                                'Active'
                              ) : itemOwned ? (
                                'Owned'
                              ) : offer.currency === 'energy' ? (
                                <>
                                  <EnergySunIcon size={9} />
                                  <span>{formatShelfPrice(price)}</span>
                                </>
                              ) : (
                                <>
                                  <span className="celestial-store-pip-qi">☯</span>
                                  <span>{formatShelfPrice(price)}</span>
                                </>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div
                  className="celestial-store-hud"
                  data-store-hud="familiar"
                  data-owned={activeOwned || undefined}
                >
                  {!activeOwned ? (
                    <>
                      <div className="celestial-store-plinth-head">
                        <div className="celestial-store-identity">
                          <div className="celestial-store-meta-line">
                            <RarityCrest rarity={activeFamiliarOffer.option.rarity} />
                            <span className="celestial-store-count" aria-hidden="true">
                              {`${activeIndex + 1} / ${offers.length}`}
                            </span>
                            {activeFamiliarOffer.salePrice !== undefined && (
                              <span className="celestial-store-badge" data-tone="sale">Sale</span>
                            )}
                          </div>
                          <h3 className="celestial-store-name">{activeFamiliarOffer.option.name}</h3>
                        </div>

                        <div className="celestial-store-tag-slot">
                          <OfferPriceLine offer={activeFamiliarOffer} />
                        </div>
                      </div>

                      {activeFamiliarOffer.option.description && (
                        <p className="celestial-store-description">{activeFamiliarOffer.option.description}</p>
                      )}

                      <div className="celestial-store-actions">
                        {renderBuyButton(activeFamiliarOffer)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="celestial-store-owned-bar">
                        <div className="celestial-store-identity">
                          <div className="celestial-store-meta-line">
                            <RarityCrest rarity={activeFamiliarOffer.option.rarity} />
                            <span className="celestial-store-count" aria-hidden="true">
                              {`${activeIndex + 1} / ${offers.length}`}
                            </span>
                            <span
                              className="celestial-store-owned-stamp"
                              data-tone={activeEquipped ? 'equipped' : 'owned'}
                            >
                              <Check size={10} strokeWidth={2.8} aria-hidden="true" />
                              <span>{activeEquipped ? 'Owned · Active' : 'Owned'}</span>
                            </span>
                          </div>
                          <h3 className="celestial-store-name">{activeFamiliarOffer.option.name}</h3>
                        </div>

                        <div className="celestial-store-owned-action">
                          {renderEquipButton(activeFamiliarOffer)}
                        </div>
                      </div>

                      {activeFamiliarOffer.option.description && (
                        <p className="celestial-store-description">{activeFamiliarOffer.option.description}</p>
                      )}
                    </>
                  )}

                  {tab === 'familiar' && (
                    <p
                      role="status"
                      aria-live="polite"
                      className="celestial-store-status"
                      data-outcome={purchaseStatus?.outcome}
                    >
                      {visibleMessage}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
