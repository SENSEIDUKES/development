import React, { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Mail,
  Image as ImageIcon,
  Sigma,
  Sparkles,
} from "lucide-react";
import { LibraryButton, LibraryElementalTitle, LibraryPanel } from "@seihouse/library-ui";
import {
  SEIDialog,
  SEIDialogContent,
  SEIDialogTitle,
  SEIDialogDescription,
  SEILoadingState,
} from "@seihouse/ui";
import type { UserProfileController } from "./userProfileServices";
import type { PremiumTier } from "./types";
import type { FamiliarCosmeticEffect } from "../../../library/familiars/contracts";
import type { PublicProfilePresentation } from "./publicProfile";
import type { CaveAccountControls } from "./caveAccountControls";
import { EnergyBalanceIndicator } from "../../energy/development/EnergyBalanceIndicator";
import type { EnergyAccountState } from "../../energy/shared/useEnergyAccount";
import type { DaoPillarCalendarState } from "../../dao-pillar/shared/useDaoPillarCalendar";
import { describeRewards, type DaoPillarCalendarSnapshot } from "../../dao-pillar/shared/daoPillarContracts";
import { formatScheduledDate } from "../../dao-pillar/development/daoPillarFormat";
import { LibraryTierBadge } from "./LibraryTierBadge";
import { caveHref, publicCavePath, useCaveRoute } from './caveNavigation';
import {
  getDaoRankData,
  getRankForDaoXp,
  getAuraSelection,
  getAuraTextStyle,
  getAuraGlowStyle,
  resolvePermanentDaoXp,
  rankBackground,
} from "../../../library/cultivation/progression";
import { LibraryNavigationIcon as SENNavigationIcon } from '@seihouse/library-ui';
import { LibraryProfileIcon as SENProfileIcon, LibraryQiYinYangIcon as SENQiYinYangIcon, LibrarySettingsIcon as SENSettingsIcon } from '@seihouse/library-ui';

const tiers: Record<PremiumTier, string> = {
  mortal: "Mortal",
  outer_sect: "Outer Sect",
  inner_sect: "Inner Sect",
  sect_master: "Sect Master",
  immortal: "Immortal",
};
const formatQi = (value: number) => value.toLocaleString();

/** What the Home card says about the Dao Pillar, straight from the server snapshot. */
export function daoPillarCardLabels(daoPillar?: DaoPillarCalendarState): { streakLabel: string; daoPillarLabel: string } {
  const snapshot: DaoPillarCalendarSnapshot | null = daoPillar?.snapshot ?? null;
  const streakLabel = snapshot
    ? `${snapshot.streak.current} Day Streak`
    : daoPillar?.status === "loading" ? "Streak loading…" : "Streak unavailable";
  if (!daoPillar || daoPillar.status === "unavailable") return { streakLabel, daoPillarLabel: "Dao Pillar not connected" };
  if (!snapshot) {
    return { streakLabel, daoPillarLabel: daoPillar.status === "error" ? "Calendar unavailable · open to retry" : "Opening the calendar…" };
  }
  const { today } = snapshot;
  if (today.phase === "before") return { streakLabel, daoPillarLabel: `${snapshot.theme.name} begins ${formatScheduledDate(snapshot.cycle.startsOn)}` };
  if (today.phase === "after") return { streakLabel, daoPillarLabel: `${snapshot.theme.name} ended ${formatScheduledDate(snapshot.cycle.endsOn)}` };
  if (today.status === "collected" && today.collected) {
    return { streakLabel, daoPillarLabel: `Collected today · +${describeRewards(today.collected.delivered)}` };
  }
  const openTile = snapshot.tiles.find(tile => tile.day === today.day);
  return { streakLabel, daoPillarLabel: `Day ${today.day} · ${openTile ? describeRewards(openTile.rewards) : "Reward"} ready to collect` };
}
const HIGHLIGHT_MEDIUM_LABELS = {
  "codex-image": "Codex image",
  audio: "Audio",
  clip: "Clip",
  moment: "Moment",
} as const;

/** The local endorsement Public Home offers. No Qi, reward, or ranking is attached. */
export interface HomeBoostState {
  count: number;
  boosted: boolean;
  toggle: () => void;
}

export type UserProfileHomeMode = "private" | "public";

type HomePanel = "stats" | "highlights" | "progress" | "bio";

/** The equipped Familiar as the Home card shows it; the Familiar account is its authority. */
export interface HomeFamiliarSummary {
  name: string;
  /** The Familiar's training tier, when training is connected. */
  tierName: string | null;
  /** Its selected cosmetic effect: the cultivator's one active effect. */
  effect: FamiliarCosmeticEffect | null;
  onOpen: () => void;
}

/** What the Rewards card counts, straight from the achievements and Relics ledgers. */
export interface HomeRewardsSummary {
  sealedScrolls: number | null;
  relics: number | null;
  onOpen: () => void;
}

/** Profile identity reads the viewed controller and its existing bio presentation. */
export function UserProfileHome({
  controller,
  mode = "private",
  publicProfile,
  boost,
  accountControls,
  energy,
  qi,
  familiar,
  rewards,
  daoPillar,
  onOpenDaoPillar,
  onOpenSettings,
}: {
  controller: UserProfileController;
  mode?: UserProfileHomeMode;
  publicProfile?: PublicProfilePresentation;
  boost?: HomeBoostState;
  accountControls?: CaveAccountControls;
  /** The shared Energy account state and where the emblem leads; absent when Energy is not connected. */
  energy?: { account: EnergyAccountState; onOpen: () => void };
  /** The server-owned Daily Dao Pillar calendar; absent when the calendar is not connected. */
  daoPillar?: DaoPillarCalendarState;
  /** Spendable QI from the QI ledger, and where the balances page is. Absent when QI is not connected. */
  qi?: { balance: number | null; onOpen: () => void };
  /** The equipped Familiar and its active cosmetic effect. */
  familiar?: HomeFamiliarSummary;
  /** Achievements, Mystery Scrolls and Fate Survival Relics. */
  rewards?: HomeRewardsSummary;
  /** Opens the Cave's `/home/dao-pillar` destination holding the reward calendar. */
  onOpenDaoPillar?: () => void;
  onOpenSettings?: () => void;
}) {
  const { profile, formData, isLoading } = controller;
  const isPublic = mode === "public";
  const daoXp = resolvePermanentDaoXp(profile?.dao_xp, profile?.dao_rank);
  const daoXpKnown = daoXp !== null;
  const { navigate } = useCaveRoute();
  const creatorLinks = profile?.uid ? (['worlds', 'storefront'] as const).map(destination => {
    const path = publicCavePath(destination, profile.uid);
    return <a key={destination} href={caveHref(path)}
      className={`cave-account-emblem cave-creator-link cave-creator-link--${destination}`}
      onClick={event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); navigate(path);
      }}>
      <SENNavigationIcon name={destination === 'worlds' ? 'discovery' : 'store'} size={24} />
      <span>{destination === 'worlds' ? 'Worlds' : 'Store'}</span>
    </a>;
  }) : null;
  const [panel, setPanel] = useState<HomePanel | null>(null);
  const lastPanel = useRef<HomePanel>("progress");
  const statsRef = useRef<HTMLButtonElement>(null);
  const highlightsRef = useRef<HTMLButtonElement>(null);
  const daoProgress = daoXp ?? 0;
  const daoData = getDaoRankData(daoProgress);
  const rank = getRankForDaoXp(daoProgress);
  // Rank chooses the colours. The equipped Familiar's selected effect, when
  // there is one, letters the name in its element instead; the rank colours
  // stay on the portrait ring, the progress bar and the rank row.
  const auraSelection = getAuraSelection(profile?.displayNameColor, daoProgress);
  const nameStyle = getAuraTextStyle(auraSelection, daoProgress);
  const auraGlow = getAuraGlowStyle(auraSelection, daoProgress);
  const titleEffect = isPublic ? null : familiar?.effect ?? null;
  const nextRank = !daoXpKnown || daoData.maxDaoXp === null ? null : getRankForDaoXp(daoData.maxDaoXp);
  const currentRankStyle = getAuraTextStyle(`rank:${rank.id}`, daoProgress);
  const nextRankStyle = nextRank ? getAuraTextStyle(`rank:${nextRank.id}`, daoData.maxDaoXp!) : {};
  const progressRef = useRef<HTMLButtonElement>(null);
  const bioOpenerRef = useRef<HTMLButtonElement>(null);
  const bioRef = useRef<HTMLParagraphElement>(null);
  const [bioOverflows, setBioOverflows] = useState(false);
  const identityRef = useRef<HTMLDivElement>(null);
  const [markerLayout, setMarkerLayout] = useState({ nameWidth: 0, inline: false });
  useEffect(() => {
    const group = identityRef.current;
    const name = group?.querySelector<HTMLElement>('[data-cave-name]');
    const badge = group?.querySelector<HTMLElement>('.cave-tier-badge');
    if (!group || !name || !badge) return;
    const measure = () => {
      const nameWidth = name.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(group).columnGap) || 0;
      const inline = nameWidth + 2 * (badge.getBoundingClientRect().width + gap) <= group.clientWidth;
      setMarkerLayout(previous => previous.nameWidth === nameWidth && previous.inline === inline
        ? previous : { nameWidth, inline });
    };
    measure();
    const observer = new ResizeObserver(measure);
    [group, name, badge].forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [profile?.displayName, profile?.premiumTier, isLoading]);
  // Everything the card says about the Dao Pillar is the server's snapshot:
  // streak, whether today is open or collected, and what was collected.
  const { streakLabel, daoPillarLabel } = daoPillarCardLabels(daoPillar);

  const stats = publicProfile?.stats ?? null;
  const highlights = publicProfile?.highlights ?? null;
  const bio = publicProfile?.bio?.trim() || '';
  useEffect(() => {
    const element = bioRef.current;
    if (!element) { setBioOverflows(false); return; }
    const measure = () => setBioOverflows(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [bio]);
  useEffect(() => { setPanel(null); }, [profile?.uid, bio]);
  const panelTitles: Record<HomePanel, string> = {
    progress: "DAO XP progress",
    bio: "Cultivator bio",
    stats: "Stats",
    highlights: "Highlights",
  };
  const openPanel = (next: HomePanel) => {
    lastPanel.current = next;
    setPanel(next);
  };
  const panelOpener = () => {
    const openers: Record<HomePanel, HTMLButtonElement | null> = {
      progress: progressRef.current,
      bio: bioOpenerRef.current,
      stats: statsRef.current,
      highlights: highlightsRef.current,
    };
    return openers[lastPanel.current] ?? progressRef.current;
  };

  return (
    <div
      className="cave-home mx-auto w-full max-w-xl"
      data-cave-home
      data-cave-home-mode={mode}
    >
      <section aria-labelledby="cave-cultivator-name" className="relative">
        <div className="relative z-10 mx-auto mt-2 flex items-center justify-center">
          <div className="relative aspect-square w-[min(58vw,15rem)] md:w-56 lg:w-60">
            <div
              aria-hidden="true"
              className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(4,172,255,0.28),rgba(4,172,255,0.06)_45%,transparent_70%)] blur-xl"
            />
            <div
              aria-hidden="true"
              className="cave-portrait-ring cave-drift absolute -inset-1.5 rounded-full opacity-90"
            />
            <span
              aria-hidden="true"
              className="cave-diamond left-1/2 top-[-6px]"
            />
            <span
              aria-hidden="true"
              className="cave-diamond left-1/2 bottom-[-15px]"
            />
            <span
              aria-hidden="true"
              className="cave-diamond left-[-6px] top-1/2"
            />
            <span
              aria-hidden="true"
              className="cave-diamond right-[-15px] top-1/2"
            />
            <div
              className={`absolute inset-1 rounded-full p-1 transition-all duration-700 motion-reduce:transition-none ${auraGlow.className}`}
              style={auraGlow.style}
              data-cave-portrait
            >
              {!isPublic && (
                <button
                  type="button"
                  aria-label={formData.avatarUrl || profile?.avatarUrl ? 'Change cultivator portrait' : 'Add cultivator portrait'}
                  aria-haspopup="dialog"
                  onClick={() => controller.setShowPortraitModal(true)}
                  className="absolute inset-0 z-10 cursor-pointer rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7dd3ff]"
                />
              )}
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#04070f]">
                {formData.avatarUrl || profile?.avatarUrl ? (
                  <img
                    src={formData.avatarUrl || profile?.avatarUrl}
                    alt={
                      profile
                        ? `${profile.displayName || "Cultivator"} portrait`
                        : "Cultivator portrait"
                    }
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <SENProfileIcon
                    size={56}
                    aria-hidden="true"
                    className="text-neutral-700"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <LibraryPanel
          padding="md"
          className="cave-home-identity relative -mt-9 !rounded-[1.35rem] !border-[#d4af37]/45 !pt-12 text-center"
          data-cave-identity
        >
          {(!isPublic || creatorLinks) && (
            <div className="cave-account-emblems" data-cave-account-controls={isPublic ? undefined : ''} data-cave-identity-actions>
              {!isPublic && (
              <button type="button" className="cave-account-emblem" onClick={accountControls?.onOpenInbox}
                disabled={!accountControls?.onOpenInbox}
                aria-label={accountControls?.inboxUnreadCount ? `Inbox, ${accountControls.inboxUnreadCount} unread messages` : "Inbox"}>
                <span className="relative">
                  <Mail size={24} aria-hidden="true" />
                  {(accountControls?.inboxUnreadCount ?? 0) > 0 && <span className="cave-unread-dot" data-cave-unread aria-hidden="true" />}
                </span>
                <span>Inbox</span>
              </button>
              )}
              {creatorLinks}
              {!isPublic && (
              <button type="button" className="cave-account-emblem" title="Energy powers generation throughout SEN" data-cave-energy
                data-cave-energy-status={energy?.account.status ?? 'unavailable'}
                onClick={energy?.onOpen} disabled={!energy}
                aria-label={energy?.account.snapshot ? `Energy, ${energy.account.snapshot.available} available` : 'Energy'}>
                <SENNavigationIcon name="energy" size={24} />
                <span>Energy</span>
                {energy ? <EnergyBalanceIndicator account={energy.account} size="sm" /> : null}
              </button>
              )}
            </div>
          )}
          {isLoading && !profile ? (
            <SEILoadingState size="sm" title="Loading profile" />
          ) : (
            <>
              <div ref={identityRef} className="cave-home-identity-group" data-cave-identity-group
                data-marker-inline={markerLayout.inline}
                style={{ "--cave-name-width": `${markerLayout.nameWidth}px` } as React.CSSProperties}>
              <LibraryElementalTitle
                as="h2"
                element={titleEffect?.element ?? "none"}
                intensity={titleEffect?.intensity ?? "active"}
                shadow={titleEffect ? (titleEffect.intensity === "legendary" ? "outlined" : "soft") : "none"}
                id="cave-cultivator-name"
                tabIndex={-1}
                className={`cave-home-username w-fit font-display text-2xl leading-tight outline-none sm:text-3xl ${titleEffect ? "" : nameStyle.className || "text-neutral-100"}`}
                style={titleEffect ? undefined : nameStyle.style}
                data-cave-name
                data-cave-name-effect={titleEffect?.id}
              >
                {profile?.displayName?.trim() || "Cultivator"}
              </LibraryElementalTitle>
              {profile && (
                <LibraryTierBadge className="cave-tier-badge"
                  aria-label={`Subscription tier: ${tiers[profile.premiumTier ?? "mortal"]}`}>
                  {tiers[profile.premiumTier ?? "mortal"]}
                </LibraryTierBadge>
              )}
              </div>
              {profile && (
                <>
                  <button ref={progressRef} type="button" className="cave-progress-trigger mt-3"
                    aria-label="Show exact DAO XP progress" aria-haspopup="dialog"
                    onClick={() => openPanel("progress")}>
                    <span className="cave-home-progress" role="progressbar"
                      aria-label={daoData.nextRank ? `DAO XP toward ${daoData.nextRank}` : "Maximum rank"}
                      aria-valuemin={0} aria-valuemax={100} aria-valuenow={daoXpKnown ? Math.round(daoData.progress) : undefined}
                      aria-valuetext={daoXpKnown ? `${formatQi(daoData.currentDaoXp)} DAO XP${daoData.maxDaoXp !== null ? ` of ${formatQi(daoData.maxDaoXp)}` : ", maximum rank"}` : 'DAO XP unavailable'}
                      style={{ "--cave-rank-background": rankBackground(rank.visual),
                        "--cave-progress": `${daoData.progress}%` } as React.CSSProperties}
                      data-cave-progress>
                      <span aria-hidden="true" className="cave-home-progress-indicator" />
                    </span>
                  </button>
                  <div className="cave-home-rank-row" data-cave-rank-row>
                    <p className={currentRankStyle.className} style={currentRankStyle.style}
                      data-cave-rank>{daoXpKnown ? daoData.rank : 'DAO XP unavailable'}</p>
                    {nextRank ? <p className={nextRankStyle.className} style={nextRankStyle.style}
                      data-cave-next-rank>{nextRank.name}</p>
                      : <p className="text-neutral-400" data-cave-next-rank>{daoXpKnown ? 'Maximum rank' : 'Waiting for DAO XP'}</p>}
                  </div>
                  {bio && <section className="mt-4" aria-label="Cultivator bio" data-cave-bio-section>
                    <h3 className="cave-bio-label">CULTIVATOR BIO</h3>
                    <p ref={bioRef} className="cave-home-bio mt-2" data-cave-bio>{bio}</p>
                    {bioOverflows && <button ref={bioOpenerRef} type="button"
                      className="cave-bio-reveal" aria-haspopup="dialog"
                      onClick={() => openPanel("bio")}>Read full bio</button>}
                  </section>}
                </>
              )}
            </>
          )}
        </LibraryPanel>
      </section>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {isPublic ? (
          <>
            <button
              ref={statsRef}
              type="button"
              className="cave-home-control"
              aria-haspopup={stats ? "dialog" : undefined}
              disabled={!stats}
              onClick={() => openPanel("stats")}
              data-cave-card="stats"
            >
              <Sigma aria-hidden="true" className="cave-home-glyph" />
              <span className="min-w-0 flex-1">
                <span className="block font-display">Stats</span>
                <span className="block truncate text-xs text-neutral-400">
                  {stats
                    ? stats.length
                      ? `${stats[0].label} ${stats[0].value}`
                      : "No stats yet"
                    : "Kept private"}
                </span>
              </span>
              {stats ? <ChevronRight size={16} aria-hidden="true" className="shrink-0" /> : null}
            </button>
            <button
              ref={highlightsRef}
              type="button"
              className="cave-home-control"
              aria-haspopup={highlights?.length ? "dialog" : undefined}
              disabled={!highlights?.length}
              onClick={() => openPanel("highlights")}
              data-cave-card="highlights"
            >
              <ImageIcon
                aria-hidden="true"
                className="cave-home-glyph text-violet-300"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-display">
                  {highlights?.length
                    ? `Highlights · ${highlights.length}`
                    : "Highlights"}
                </span>
                <span className="block truncate text-xs text-neutral-400">
                  {highlights === null
                    ? "Kept private"
                    : highlights.length
                      ? highlights[0].title
                      : "Nothing featured yet"}
                </span>
              </span>
              {highlights?.length ? <ChevronRight size={16} aria-hidden="true" className="shrink-0" /> : null}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="cave-home-control"
              onClick={qi?.onOpen}
              disabled={!qi}
              data-cave-card="qi"
              aria-label={qi?.balance != null ? `QI, ${formatQi(qi.balance)} to spend` : "QI"}
            >
              <SENQiYinYangIcon aria-hidden="true" className="cave-home-glyph" />
              <span className="min-w-0 flex-1">
                <span className="block font-display">QI</span>
                <span className="line-clamp-2 text-xs text-neutral-400" data-cave-qi>
                  {qi ? (qi.balance == null ? "Balance loading…" : `${formatQi(qi.balance)} to spend`) : "Not connected"}
                </span>
              </span>
              {qi ? <ChevronRight size={16} aria-hidden="true" className="shrink-0" /> : null}
            </button>
            <button
              type="button"
              className="cave-home-control"
              onClick={familiar?.onOpen}
              disabled={!familiar}
              data-cave-card="familiar"
              aria-label={familiar ? [familiar.name, familiar.tierName, familiar.effect?.label ?? "no effect chosen"].filter(Boolean).join(", ") : undefined}
            >
              <Sparkles aria-hidden="true" className="cave-home-glyph text-violet-300" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display">{familiar?.name ?? "Familiar"}</span>
                {/* The active effect is what the card is for; its tier shows here
                    only while no effect is chosen, and always on the Familiar page. */}
                <span className="line-clamp-3 text-xs text-neutral-400" data-cave-familiar-effect={familiar?.effect?.id}
                  data-cave-familiar-tier={familiar?.tierName ?? undefined}>
                  {familiar
                    ? familiar.effect?.label ?? [familiar.tierName, "No effect chosen"].filter(Boolean).join(" · ")
                    : "Not connected"}
                </span>
              </span>
              {familiar ? <ChevronRight size={16} aria-hidden="true" className="shrink-0" /> : null}
            </button>
          </>
        )}
      </div>
      <div className="mt-3">
        {isPublic ? (
          <>
            <button
              type="button"
              className={`cave-home-pillar cave-home-boost${boost?.boosted ? " is-boosted" : ""}`}
              aria-pressed={Boolean(boost?.boosted)}
              disabled={!boost}
              onClick={() => boost?.toggle()}
              data-cave-card="boost"
            >
              <span className="cave-home-pillar-art" aria-hidden="true">
                <Sparkles size={30} />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-lg">Boost</span>
                <span className="mt-1 block font-serif text-lg text-sky-300">
                  {formatQi(boost?.count ?? 0)}{" "}
                  {boost?.count === 1 ? "Boost" : "Boosts"}
                </span>
                <span className="mt-1 block text-sm">
                  {boost?.boosted
                    ? "Boost sent · press again to withdraw"
                    : "Send this cultivator a boost"}
                </span>
              </span>
            </button>
            <p
              role="status"
              aria-live="polite"
              className="mt-1 text-sm text-neutral-300"
              data-cave-boost-status
            >
              {boost?.boosted ? "Your boost is showing." : ""}
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              className="cave-home-pillar"
              disabled={!onOpenDaoPillar}
              onClick={onOpenDaoPillar}
              data-cave-card="dao-pillar"
              data-cave-dao-status={daoPillar?.status ?? "unavailable"}
              data-cave-dao-today={daoPillar?.snapshot?.today.status}
              aria-busy={daoPillar?.status === "loading" || undefined}
            >
              <span className="cave-home-pillar-art" aria-hidden="true">
                道
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg">Daily Dao Pillar</span>
                <span className="mt-1 block font-serif text-lg text-sky-300">
                  {streakLabel}
                </span>
                <span className="mt-1 block text-sm">{daoPillarLabel}</span>
              </span>
              <ChevronRight size={16} aria-hidden="true" className="shrink-0" />
            </button>
          </>
        )}
      </div>
      {/* Rewards is a destination of its own, the same weight as the Dao Pillar
          it follows. It counts what the achievements and Relics ledgers hold;
          nothing about rewards is stored or decided here. */}
      {!isPublic && (
        <div className="mt-3">
          <button
            type="button"
            className="cave-home-pillar"
            disabled={!rewards}
            onClick={rewards?.onOpen}
            data-cave-card="rewards"
          >
            <span className="cave-home-pillar-art" aria-hidden="true">
              <SENNavigationIcon name="relic" size={30} />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-lg">Rewards</span>
              <span className="mt-1 block font-serif text-lg text-sky-300" data-cave-sealed-scrolls={rewards?.sealedScrolls ?? undefined}>
                {rewards?.sealedScrolls == null ? "Mystery Scrolls"
                  : rewards.sealedScrolls === 0 ? "No sealed scrolls"
                  : `${formatQi(rewards.sealedScrolls)} sealed ${rewards.sealedScrolls === 1 ? "scroll" : "scrolls"}`}
              </span>
              <span className="mt-1 block text-sm">
                Achievements, Mystery Scrolls{rewards?.relics ? ` and ${formatQi(rewards.relics)} Fate Survival ${rewards.relics === 1 ? "Relic" : "Relics"}` : " and Fate Survival Relics"}
              </span>
            </span>
          </button>
        </div>
      )}
      {!isPublic && (
        <div className="mt-3 grid grid-cols-2 gap-3" data-cave-account-actions>
          <LibraryButton fullWidth variant="secondary" onClick={accountControls?.onOpenStore} disabled={!accountControls?.onOpenStore}>
            <SENNavigationIcon name="store" size={20} /><span>Store</span>
          </LibraryButton>
          <LibraryButton fullWidth variant="secondary" icon={SENSettingsIcon} onClick={onOpenSettings} disabled={!onOpenSettings}>Settings</LibraryButton>
        </div>
      )}
      <SEIDialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <SEIDialogContent
          variant="dark"
          className="z-[310] max-h-[80dvh] overflow-y-auto sm:max-w-md"
          backdropClassName="z-[300]"
          finalFocus={panelOpener}
        >
          <SEIDialogTitle>
            {panelTitles[panel ?? lastPanel.current]}
          </SEIDialogTitle>
          <SEIDialogDescription className="sr-only">
            {panel === "bio" ? "Complete bio for this cultivator"
              : panel === "stats" ? "Public reading activity for this cultivator"
              : panel === "highlights" ? "Media and moments this cultivator features"
              : "Exact DAO XP toward the next rank"}
          </SEIDialogDescription>
          {panel === "progress" ? (
            <p className="mt-4 font-mono" data-cave-dao-xp>
              {daoXpKnown ? `${formatQi(daoData.currentDaoXp)}${daoData.maxDaoXp !== null ? ` / ${formatQi(daoData.maxDaoXp)} DAO XP` : ' DAO XP · Maximum rank'}` : 'DAO XP is not available on this profile.'}
            </p>
          ) : panel === "bio" ? (
            <p className="mt-4 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{bio}</p>
          ) : panel === "stats" ? (
            stats?.length ? (
              <dl className="mt-4 space-y-3">
                {stats.map((stat) => (
                  <div key={stat.id} className="flex justify-between gap-4">
                    <dt>{stat.label}</dt>
                    <dd className="font-mono">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4">No public stats.</p>
            )
          ) : (
            highlights?.length ? (
              <ul className="mt-4 space-y-3">
                {highlights.map((highlight) => (
                  <li
                    key={highlight.id}
                    className="flex items-center gap-3 border-b border-white/10 pb-3 text-sm"
                    data-cave-highlight={highlight.medium}
                  >
                    {highlight.previewSrc ? (
                      <img
                        src={highlight.previewSrc}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/40 font-sc text-[9px] uppercase tracking-wider text-neutral-400"
                      >
                        {HIGHLIGHT_MEDIUM_LABELS[highlight.medium].slice(0, 5)}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block break-words [overflow-wrap:anywhere]">{highlight.title}</span>
                      <span className="block break-words text-xs text-neutral-400 [overflow-wrap:anywhere]">
                        {highlight.detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4">Nothing featured yet.</p>
            )
          )}
          {(panel === "progress" || panel === "bio") && (
            <LibraryButton className="mt-4" onClick={() => setPanel(null)}>Close</LibraryButton>
          )}
        </SEIDialogContent>
      </SEIDialog>
    </div>
  );
}
