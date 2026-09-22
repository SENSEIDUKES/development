import { useRef, useState, type ReactNode } from 'react';
import './shopCard.css';

/**
 * One purchasable thing on a Store shelf.
 *
 * Deliberately generic: it knows about artwork, a name, a tier badge, a price
 * line and an owned state — not about Familiars. Familiars supply their own
 * hero renderer and price line, and a future Audio Pack or Theme can supply
 * theirs without touching this file. The card owns only presentation and the
 * preview gesture; what it costs, who owns it and what happens on open all
 * stay with the Store.
 */
export interface ShopCardProps {
  /** Identifier of the thing offered; surfaces as a styling and test hook. */
  offerId: string;
  /** What the thing is called, from its own catalogue. */
  name: string;
  /** Tier badge, e.g. a Familiar's catalogue rank. Omitted when a kind has no tiers. */
  rank?: string;
  /** Acquisition currency, for the per-currency emblem and framing. */
  currency?: string;
  /**
   * The artwork, told whether the card is currently being previewed so animated
   * media can stay still until a pointer, press, or focus asks for it.
   */
  renderMedia: (active: boolean) => ReactNode;
  /** The price line, already carrying its own currency mark. */
  price?: ReactNode;
  /** Shown instead of the price once the viewer owns it. */
  state?: { label: string; tone: 'owned' | 'equipped' };
  /** Opens the focused detail view; receives the control to return focus to. */
  onOpen: (opener: HTMLButtonElement | null) => void;
}

export function ShopCard({ offerId, name, rank, currency, renderMedia, price, state, onOpen }: ShopCardProps) {
  // Mouse hover previews like a trailer; touch presses and keyboard focus stand
  // in for hover where there is no pointer to hover with.
  const [active, setActive] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  return (
    <article className="shop-card" data-store-offer={offerId} data-store-currency={currency} data-rarity={rank}>
      <button
        ref={opener}
        type="button"
        className="shop-card-button"
        aria-haspopup="dialog"
        onClick={() => onOpen(opener.current)}
        onPointerEnter={event => { if (event.pointerType === 'mouse') setActive(true); }}
        onPointerLeave={event => { if (event.pointerType === 'mouse') setActive(false); }}
        onPointerDown={event => { if (event.pointerType !== 'mouse') setActive(true); }}
        onPointerUp={event => { if (event.pointerType !== 'mouse') setActive(false); }}
        onPointerCancel={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
      >
        {renderMedia(active)}
        <span className="shop-card-name">{name}</span>
        {rank && <span className="shop-card-rank" data-rarity={rank}>{rank}</span>}
        {state
          ? <span className="shop-card-state" data-tone={state.tone}>{state.label}</span>
          : price}
      </button>
    </article>
  );
}
