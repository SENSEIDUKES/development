import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Lock, Plus, Settings, Sparkles } from 'lucide-react';
import {
  activeNameEffect,
  bondRankLabel,
  FAMILIAR_ELEMENT_LABELS,
  familiarFormFilter,
  familiarTraining,
  type FamiliarBondRank,
  type OfferQiResponse,
} from '../../../library/familiars/contracts';
import { LibraryGlobalIcon } from '@seihouse/library-ui';
import { useOverlayScrollbar } from '@seihouse/ui';
import { BalancePills } from '../../energy/development/BalancePill';
import { familiarRarityLabel, type FamiliarOption, type FamiliarPersonalizations } from '../../familiar/shared/familiar';
import { FamiliarHero } from '../../familiar/development/FamiliarHero';
import { FamiliarNameEffect } from './FamiliarNameEffect';
import { bondProgress, FamiliarBondTab, formatWhole } from './FamiliarBondTab';
import { FamiliarElementsTab } from './FamiliarElementsTab';
import { FamiliarLoreTab } from './FamiliarLoreTab';
import { FamiliarSettingsMenu, type FamiliarCompanionSettings } from './FamiliarSettingsMenu';
import type { FamiliarsAccount } from './familiarsAccount';
import './familiarTraining.css';
import './familiarStage.css';

const DEFAULT_OFFERS = [100, 500, 1_000] as const;
const SWIPE_DISTANCE = 48;
const RANK_NUMERALS = ['I', 'II', 'III', 'IV'] as const;
type StageTab = 'bond' | 'elements' | 'lore';
const TABS: readonly { id: StageTab; label: string }[] = [
  { id: 'bond', label: 'Bond' },
  { id: 'elements', label: 'Elements' },
  { id: 'lore', label: 'Lore' },
];
const CREATE_SLIDE = 'create-your-own';

export interface FamiliarStageProps {
  familiars: FamiliarsAccount;
  /** The host's Familiar catalogue, with availability from ownership. */
  options: readonly FamiliarOption[];
  /** The cultivator's spendable QI, from the QI ledger; null while unknown. */
  qiBalance: number | null;
  /** The cultivator's available Energy; null while unknown. Omit where Energy is not connected. */
  energyBalance?: number | null;
  /** The Active Familiar: the companion that follows the cultivator (host profile state). */
  activeFamiliarId?: string | null;
  /** The name the elemental effect letters. */
  displayName: string;
  onBack?: () => void;
  backLabel?: string;
  /** Makes the Familiar on the stage the Active Familiar. */
  onActivate?: (familiarId: string) => void;
  activating?: boolean;
  /** Where a Familiar not yet owned can be brought home. */
  onOpenStore?: () => void;
  /** Called after an offering lands, so the host can refresh its QI projection. */
  onOffered?: (response: OfferQiResponse) => void;
  offerAmounts?: readonly number[];
  /** The companion's behaviour settings, shown in the ⚙ menu. */
  settings?: FamiliarCompanionSettings;
  /** The cultivator's own names and stories for their Familiars. */
  personal?: FamiliarPersonalizations;
  onPersonalChange?: (familiarId: string, changes: { name?: string | null; backstory?: string | null }) => void;
}

/**
 * The Familiar page: one home for everything about the cultivator's
 * companions, built for a phone first.
 *
 * The stage shows one Familiar at a time, swiped left and right, with its
 * bond rail, who it is, and the effect bonding lends the cultivator's name.
 * Bond, Elements and Lore open in a sheet; offering QI sits in the thumb's
 * reach; companion settings and personalisation open from ⚙. A wider screen
 * moves the sheet beside the stage. The server decides every spend and
 * unlock; this page asks and shows the answer. Nothing here grants an
 * advantage.
 */
export function FamiliarStage({
  familiars, options, qiBalance, energyBalance, activeFamiliarId, displayName, onBack, backLabel = 'Return to cave',
  onActivate, activating = false, onOpenStore, onOffered, offerAmounts = DEFAULT_OFFERS,
  settings, personal, onPersonalChange,
}: FamiliarStageProps) {
  const slideIds = useMemo(() => [...options.map(option => option.id), CREATE_SLIDE], [options]);
  const startIndex = Math.max(0, options.findIndex(option => option.id === activeFamiliarId));
  const [index, setIndex] = useState(startIndex);
  const [direction, setDirection] = useState<'next' | 'previous' | null>(null);
  const swiped = useRef(false);
  // The Active Familiar can arrive after the first render; follow it until the cultivator swipes.
  useEffect(() => {
    if (!swiped.current) setIndex(startIndex);
  }, [startIndex]);
  const [tab, setTab] = useState<StageTab>('bond');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [focusedRank, setFocusedRank] = useState<FamiliarBondRank | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storyRequest, setStoryRequest] = useState(0);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const offerRef = useRef<HTMLDivElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const panelScroller = useOverlayScrollbar<HTMLDivElement>({ fades: true });

  const current = Math.min(index, slideIds.length - 1);
  const option = options[current] as FamiliarOption | undefined;
  const isCreate = !option;
  const snapshot = familiars.snapshot;
  const view = option ? familiarTraining(snapshot, option.id) : null;
  const owned = option ? (view ? view.owned : option.available) : false;
  const isActive = Boolean(option && option.id === activeFamiliarId);
  const nameOf = (id: string) => personal?.[id]?.name ?? options.find(entry => entry.id === id)?.name ?? id;
  const name = option ? nameOf(option.id) : 'Your own Familiar';
  const element = view?.element ?? null;
  const form = view?.unlockedForms.find(entry => entry.id === view.selection.formId) ?? null;
  const progress = view && owned ? bondProgress(view) : null;
  // What bonding lends the name: the Active Familiar's live effect, or what this one would lend.
  const resolvedActive = isActive ? activeNameEffect(snapshot, activeFamiliarId) : null;
  const nameEffect = isActive ? resolvedActive?.effect ?? null : view && owned ? view.bondEffect : null;
  const nameCaption = !option || !view || !owned ? null
    : isActive
      ? resolvedActive ? `Your name wears ${resolvedActive.effect.label}` : 'Your name keeps your rank colours'
      : `Make ${name} active and your name wears ${view.bondEffect.label}`;

  const go = (step: 1 | -1) => {
    swiped.current = true;
    setDirection(step > 0 ? 'next' : 'previous');
    setIndex(previous => (previous + step + slideIds.length) % slideIds.length);
    setMessage(null);
    setFocusedRank(null);
  };
  const onPointerDown = (event: PointerEvent) => { pointer.current = { x: event.clientX, y: event.clientY }; };
  const onPointerUp = (event: PointerEvent) => {
    const start = pointer.current;
    pointer.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); go(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1); }
  };
  const openTab = (next: StageTab) => {
    setTab(next);
    setSheetOpen(true);
  };
  const focusRank = (rank: FamiliarBondRank) => {
    setFocusedRank(rank);
    openTab('bond');
  };
  useEffect(() => {
    if (focusedRank && tab === 'bond') document.getElementById(`familiar-bond-rank-${focusedRank}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [focusedRank, tab, sheetOpen]);

  // The amounts close on a tap elsewhere or Escape.
  useEffect(() => {
    if (!offerOpen) return;
    const away = (event: Event) => { if (!offerRef.current?.contains(event.target as Node)) setOfferOpen(false); };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setOfferOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', escape); };
  }, [offerOpen]);
  useEffect(() => { setOfferOpen(false); }, [current]);

  const offer = async (amount: number) => {
    if (!option) return;
    setOfferOpen(false);
    setMessage(null);
    setTab('bond');
    try {
      const response = await familiars.offerQi(option.id, amount);
      onOffered?.(response);
      setMessage({ tone: 'success', text: response.message });
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'The offering could not be made. No QI was spent.' });
    }
  };
  const chooseForm = async (formId: string | null) => {
    if (!option) return;
    setMessage(null);
    try {
      await familiars.selectForm({ familiarId: option.id, formId });
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'That form could not be chosen.' });
    }
  };
  const closeSettings = () => {
    setSettingsOpen(false);
    settingsButton.current?.focus();
  };

  const identity = option
    ? [familiarRarityLabel(option.rarity), element ? `${FAMILIAR_ELEMENT_LABELS[element]} element` : null].filter(Boolean).join(' · ')
    : 'Coming soon';
  const canPersonalize = Boolean(option && owned && onPersonalChange);

  return (
    <section className="familiar-stage library-scrollbars" data-familiar-stage data-element={element ?? undefined} data-sheet-open={sheetOpen || undefined}
      aria-labelledby="familiar-stage-title">
      <div className="familiar-stage-sky" aria-hidden="true"><span /><span /><span /></div>

      <header className="familiar-stage-topbar">
        {onBack ? (
          <button type="button" className="familiar-stage-icon-button" aria-label={backLabel} onClick={onBack}><ArrowLeft size={20} aria-hidden /></button>
        ) : <span />}
        <h2 id="familiar-stage-title" tabIndex={-1} className="familiar-stage-title">Familiar</h2>
        <div className="familiar-stage-topbar-end">
          <BalancePills
            qi={{ amount: qiBalance, state: qiBalance === null ? 'unavailable' : 'ready' }}
            energy={energyBalance === undefined ? undefined : { amount: energyBalance, state: energyBalance === null ? 'loading' : 'ready' }} />
          {settings || onPersonalChange ? (
            <button ref={settingsButton} type="button" className="familiar-stage-icon-button" aria-label="Familiar settings" aria-haspopup="dialog"
              onClick={() => setSettingsOpen(true)} data-familiar-settings-open><Settings size={20} aria-hidden /></button>
          ) : null}
        </div>
      </header>

      <div className="familiar-stage-hero" role="group" aria-roledescription="carousel" aria-label="Your Familiars"
        tabIndex={0} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { pointer.current = null; }}>
        <div key={slideIds[current]} className="familiar-stage-art" data-direction={direction ?? undefined}
          role="group" aria-roledescription="slide" aria-label={`${current + 1} of ${slideIds.length}: ${name}`}
          data-familiar-slide={slideIds[current]} data-owned={owned || undefined}>
          {option ? (
            <div className="familiar-stage-art-frame" style={{ filter: familiarFormFilter(form) } as CSSProperties}>
              {option.portraitUrl
                ? <img src={option.portraitUrl} alt={`${option.name} Familiar`} className="familiar-stage-hero-image" decoding="async" data-familiar-portrait />
                : <FamiliarHero option={option} active className="familiar-stage-hero-image" />}
            </div>
          ) : (
            <div className="familiar-stage-create" data-familiar-create>
              <Plus size={40} aria-hidden />
              <span>Create your own Familiar</span>
            </div>
          )}
          {option && !owned ? <span className="familiar-stage-lock"><Lock size={12} aria-hidden /> Not yet yours</span> : null}
        </div>
        {option && owned && view?.nextBondRank && progress ? (
          <div className="familiar-stage-offer" ref={offerRef} data-open={offerOpen || undefined}>
            <button type="button" className="familiar-stage-offer-button" aria-expanded={offerOpen} aria-controls="familiar-stage-offer-amounts"
              disabled={familiars.pending} onClick={() => setOfferOpen(open => !open)} data-familiar-offer-open>
              <LibraryGlobalIcon name="qi" size="1.6rem" aria-hidden="true" />
              <span className="familiar-stage-offer-label">Offer</span>
            </button>
            {offerOpen ? (
              <div id="familiar-stage-offer-amounts" className="familiar-stage-offer-amounts" role="group" aria-label={`Offer QI to ${name}`}>
                {offerAmounts.map(amount => {
                  const spend = Math.min(amount, progress.remaining);
                  return (
                    <button key={amount} type="button" data-familiar-offer={amount} aria-label={`Offer ${formatWhole(spend)} QI`}
                      disabled={familiars.pending || (qiBalance !== null && qiBalance < spend)} onClick={() => void offer(amount)}>
                      <LibraryGlobalIcon name="qi-yin-yang" size="1em" className="qi-glyph" aria-hidden="true" />{formatWhole(spend)}
                    </button>
                  );
                })}
                {qiBalance !== null && qiBalance < Math.min(...offerAmounts.map(amount => Math.min(amount, progress.remaining))) ? (
                  <p data-familiar-no-qi>Earn QI from the Dao Pillar and Mystery Scrolls.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        <button type="button" className="familiar-stage-nav is-previous" aria-label="Previous Familiar" onClick={() => go(-1)}><ChevronLeft size={22} aria-hidden /></button>
        <button type="button" className="familiar-stage-nav is-next" aria-label="Next Familiar" onClick={() => go(1)}><ChevronRight size={22} aria-hidden /></button>

        {view ? (
          <ol className="familiar-stage-rail" aria-label={`${name} bond ranks`}>
            {view.bondRanks.map((rank, rankIndex) => {
              const reached = owned && rank.reached;
              const next = owned && view.nextBondRank?.rank === rank.rank;
              return (
                <li key={rank.rank}>
                  <button type="button" onClick={() => focusRank(rank.rank)} data-familiar-rail={rank.rank}
                    data-reached={reached || undefined} data-next={next || undefined} data-current={owned && view.bondRank === rank.rank || undefined}
                    aria-label={`${bondRankLabel(rank.rank)}, ${reached ? 'reached' : `${formatWhole(rank.qiRequired)} QI`}`}>
                    <span className="familiar-stage-rail-mark" aria-hidden>{reached ? RANK_NUMERALS[rankIndex] : <Lock size={12} />}</span>
                    <span className="familiar-stage-rail-label" aria-hidden>{bondRankLabel(rank.rank).replace(' bond', '')}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : null}
        <p className="familiar-stage-count" aria-hidden>{current + 1} / {slideIds.length}</p>
      </div>

      <div className="familiar-stage-identity">
        {/* Offering and form results show here, on the stage, whether or not the details sheet is open. */}
        {message ? (
          <p role={message.tone === 'error' ? 'alert' : 'status'} aria-live="polite" className="familiar-stage-message"
            data-tone={message.tone} data-familiar-message>{message.text}</p>
        ) : null}
        <p className="familiar-stage-kicker" data-familiar-identity>{identity}</p>
        <div className="familiar-stage-name-row">
          <h3 className="familiar-stage-name" data-familiar-name>{name}</h3>
          {option && isActive ? <span className="familiar-option-equipped" data-familiar-active>Active</span> : null}
          {option && owned && !isActive && onActivate ? (
            <button type="button" className="familiar-stage-activate" disabled={activating} onClick={() => onActivate(option.id)} data-familiar-activate>
              {activating ? 'Saving…' : 'Make active'}
            </button>
          ) : null}
        </div>
        {option && name !== option.name ? <p className="familiar-stage-kind">{option.name}</p> : null}
        {view && owned && progress ? (
          <>
            <p className="familiar-stage-bond" data-familiar-bond={view.bondRank}>{bondRankLabel(view.bondRank)}</p>
            <div className="familiar-training-track" role="progressbar" aria-label={`${name} bond`}
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}
              aria-valuetext={view.nextBondRank ? `${formatWhole(view.qiOffered)} of ${formatWhole(view.nextBondRank.qiRequired)} QI toward ${bondRankLabel(view.nextBondRank.rank)}` : 'Legendary bond reached'}>
              <span style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="familiar-stage-qi-line" data-familiar-qi-offered>
              {view.nextBondRank
                ? `${formatWhole(view.qiOffered)} / ${formatWhole(view.nextBondRank.qiRequired)} QI · ${formatWhole(view.nextBondRank.qiRemaining)} to ${bondRankLabel(view.nextBondRank.rank)}`
                : `${formatWhole(view.qiOffered)} QI offered · ${FAMILIAR_ELEMENT_LABELS[view.element]} mastered`}
            </p>
          </>
        ) : null}
        {nameCaption ? (
          <div className="familiar-stage-name-effect" data-familiar-name-preview={nameEffect?.id ?? 'none'}>
            <FamiliarNameEffect as="p" size="md" effect={nameEffect} className="font-display" plainClassName="text-lg text-neutral-100">{displayName}</FamiliarNameEffect>
            <p>{nameCaption}</p>
          </div>
        ) : null}
        {isCreate ? <p className="familiar-stage-note">Make a Familiar that is wholly yours, and channel every element you have mastered through it. Arriving for top-tier cultivators.</p> : null}
      </div>

      {option ? <div className="familiar-stage-sheet" data-familiar-sheet>
        <div className="familiar-stage-tabs" role="tablist" aria-label="Familiar details">
          {TABS.map(entry => (
            <button key={entry.id} type="button" role="tab" id={`familiar-tab-${entry.id}`} aria-controls="familiar-stage-panel"
              aria-selected={tab === entry.id} onClick={() => openTab(entry.id)} data-familiar-tab={entry.id}>
              {entry.label}
            </button>
          ))}
          <button type="button" className="familiar-stage-sheet-toggle" aria-expanded={sheetOpen} aria-controls="familiar-stage-panel"
            aria-label={sheetOpen ? 'Show less' : 'Show details'} onClick={() => setSheetOpen(open => !open)}>
            {sheetOpen ? <ChevronDown size={18} aria-hidden /> : <ChevronUp size={18} aria-hidden />}
          </button>
        </div>
        {option ? (
          <div ref={panelScroller} id="familiar-stage-panel" role="tabpanel" aria-labelledby={`familiar-tab-${tab}`} className="familiar-stage-panel familiar-training">
            {tab === 'bond' ? (
              <FamiliarBondTab familiars={familiars} view={view} name={name} owned={owned} focusedRank={focusedRank} onChooseForm={formId => void chooseForm(formId)} />
            ) : tab === 'elements' ? (
              <FamiliarElementsTab familiars={familiars} activeFamiliarId={activeFamiliarId} nameOf={nameOf} displayName={displayName} />
            ) : (
              <FamiliarLoreTab option={option} name={name} element={element} backstory={personal?.[option.id]?.backstory} editRequest={storyRequest}
                onBackstoryChange={canPersonalize ? backstory => onPersonalChange!(option.id, { backstory }) : undefined} />
            )}
          </div>
        ) : null}
      </div> : null}

      {isCreate || !owned || (view && !view.nextBondRank) ? <div className="familiar-stage-actions" data-familiar-actions>
        {isCreate ? (
          <button type="button" className="familiar-stage-action" disabled data-familiar-create-action>
            <Sparkles size={16} aria-hidden /> Create your own · Coming soon
          </button>
        ) : !owned ? (
          onOpenStore ? <button type="button" className="familiar-stage-action is-primary" onClick={onOpenStore} data-familiar-store>Find {option!.name} in the Celestial Store</button>
            : <p className="familiar-stage-action-note">{option!.name} is not yours yet.</p>
        ) : view && !view.nextBondRank ? (
          <p className="familiar-stage-action-note"><Check size={14} aria-hidden /> {name} has reached Legendary bond. Every bond reward is yours.</p>
        ) : null}
      </div> : null}

      {settingsOpen ? (
        <FamiliarSettingsMenu
          settings={settings ?? {}}
          familiar={{ id: option?.id ?? CREATE_SLIDE, catalogueName: option?.name ?? 'Your Familiar', name: option ? personal?.[option.id]?.name : undefined, owned: Boolean(option && owned) }}
          onNameChange={canPersonalize ? next => onPersonalChange!(option!.id, { name: next }) : undefined}
          onRewriteStory={canPersonalize ? () => { setSettingsOpen(false); openTab('lore'); setStoryRequest(value => value + 1); } : undefined}
          onClose={closeSettings}
        />
      ) : null}
    </section>
  );
}
