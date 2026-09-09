import React, { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Mail,
  Zap,
  Gem,
  Settings,
  Store,
  Flame,
  Image as ImageIcon,
  Orbit,
  Sigma,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { LibraryButton, LibraryPanel } from "@seihouse/library-ui";
import {
  SEIDialog,
  SEIDialogContent,
  SEIDialogTitle,
  SEIDialogDescription,
  SEILoadingState,
} from "@seihouse/ui";
import type { UserProfileController } from "../shared/userProfileServices";
import type { ActiveStatusEffect, PremiumTier } from "../shared/types";
import type { PublicProfilePresentation } from "./publicProfile";
import type { CaveAccountControls } from "./caveAccountControls";
import {
  getDaoRankData,
  getRankForQi,
  getAuraSelection,
  getAuraTextStyle,
  getAuraGlowStyle,
  resolveRankVisual,
  rankBackground,
} from "./qi";

const tiers: Record<PremiumTier, string> = {
  mortal: "Mortal",
  outer_sect: "Outer Sect",
  inner_sect: "Inner Sect",
  sect_master: "Sect Master",
  immortal: "Immortal",
};
const formatQi = (value: number) => value.toLocaleString();
export function isEffectActive(effect: ActiveStatusEffect, now: number) {
  return Date.parse(effect.expiresAt) > now && Date.parse(effect.appliedAt) <= now;
}

export function effectStatement(effect: ActiveStatusEffect, now: number) {
  const modifiers = [
    [effect.effectDef.qiMultiplier, "Qi"],
    [effect.effectDef.sectQiMultiplier, "Sect Qi"],
  ] as const;
  const description =
    modifiers
      .filter(([value]) => typeof value === "number" && Number.isFinite(value))
      .map(([value, label]) => {
        const percentage = Math.round((value! - 1) * 100);
        return `${percentage >= 0 ? "+" : ""}${percentage}% ${label}`;
      })
      .join(" · ") ||
    effect.effectDef.description ||
    effect.effectDef.name;
  const minutes = Math.max(
    1,
    Math.ceil((Date.parse(effect.expiresAt) - now) / 60000),
  );
  const amount =
    minutes > 1440
      ? Math.ceil(minutes / 1440)
      : minutes > 60
        ? Math.ceil(minutes / 60)
        : minutes;
  const unit = minutes > 1440 ? "day" : minutes > 60 ? "hour" : "minute";
  return `${description} · ${amount} ${unit}${amount === 1 ? "" : "s"}`;
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

type HomePanel = "qi" | "effects" | "stats" | "highlights";

/**
 * The Cave home composition, in one of two modes.
 *
 * Both modes render the same portrait, the same centered display name, the
 * same subscription badge in its own slot beside the rank, and the same rank.
 * Only the three information areas below them differ:
 *
 * | Area        | Private                | Public     |
 * | ----------- | ---------------------- | ---------- |
 * | Under rank  | Cultivation progress   | Bio        |
 * | Left card   | Qi Reserves            | Stats      |
 * | Right card  | Active Effects         | Highlights |
 * | Action      | Daily Dao Pillar claim | Boost      |
 *
 * Public mode reads nothing but `publicProfile`, which is built for the viewed
 * cultivator; it never reaches into the signed-in controller's private state.
 */
export function UserProfileHome({
  controller,
  mode = "private",
  publicProfile,
  boost,
  accountControls,
  onOpenRelics,
  onOpenSettings,
}: {
  controller: UserProfileController;
  mode?: UserProfileHomeMode;
  publicProfile?: PublicProfilePresentation;
  boost?: HomeBoostState;
  accountControls?: CaveAccountControls;
  /** Opens the Cave's existing `/relics` route and its inventory panel. */
  onOpenRelics?: () => void;
  onOpenSettings?: () => void;
}) {
  const {
    profile,
    formData,
    isLoading,
    currentStreak,
    isCracked,
    dailyClaim,
    handleRepairPillar,
  } = controller;
  const isPublic = mode === "public";
  // The same inventory the Relics destination reads; counted, never copied.
  const relicCount = profile?.cosmicInventory?.length ?? 0;
  const [panel, setPanel] = useState<HomePanel | null>(null);
  const [now, setNow] = useState(Date.now);
  const [repairing, setRepairing] = useState(false);
  const [repairError, setRepairError] = useState("");
  const repairLock = useRef(false);
  const reservesRef = useRef<HTMLButtonElement>(null);
  const lastPanel = useRef<HomePanel>("qi");
  const effectsRef = useRef<HTMLButtonElement>(null);
  const statsRef = useRef<HTMLButtonElement>(null);
  const highlightsRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const auraXp = profile?.dao_xp ?? profile?.qi ?? 0;
  const daoData = getDaoRankData(auraXp);
  const rank = getRankForQi(auraXp);
  const effects = (profile?.activeStatusEffects ?? []).filter((effect) =>
    isEffectActive(effect, now),
  );
  const auraSelection = getAuraSelection(profile?.displayNameColor, auraXp);
  const nameStyle = getAuraTextStyle(
    auraSelection,
    effects,
    auraXp,
  );
  const auraGlow = getAuraGlowStyle(
    auraSelection,
    effects,
    auraXp,
  );
  const activeRank = resolveRankVisual(auraSelection, auraXp);
  const showsRankParticles = activeRank.rank.motes;
  const moteColors = activeRank.visual.stops;
  const reserves = (
    [
      { id: "sect", label: "Sect Qi", balance: profile?.sect_qi ?? 0 },
      { id: "demonic", label: "Demonic Qi", balance: profile?.demonic_qi ?? 0 },
    ] as const
  ).filter(
    (reserve) =>
      profile &&
      (controller.unlockedSpecialQi
        ? controller.unlockedSpecialQi.includes(reserve.id)
        : reserve.balance > 0),
  );
  const collected =
    profile?.lastReadDate === new Date(now).toISOString().split("T")[0];
  const unresolved = dailyClaim?.result?.outcome === "unresolved";
  const blocked =
    !profile ||
    isLoading ||
    !dailyClaim ||
    dailyClaim.pending ||
    unresolved ||
    collected ||
    isCracked ||
    repairing;
  const claimLabel =
    !profile || isLoading
      ? "Loading cultivation…"
      : dailyClaim?.pending
        ? "Collecting…"
        : unresolved
          ? "Confirming collection…"
          : collected
            ? "Collected Today"
            : isCracked
              ? "Pillar cracked"
              : !dailyClaim
                ? "Collection unavailable"
                : "Collect today’s cultivation";
  const repair = async () => {
    if (repairLock.current) return;
    repairLock.current = true;
    setRepairing(true);
    setRepairError("");
    try {
      await handleRepairPillar();
    } catch {
      setRepairError("Repair failed. Please try again.");
    } finally {
      repairLock.current = false;
      setRepairing(false);
    }
  };

  const stats = publicProfile?.stats ?? null;
  const highlights = publicProfile?.highlights ?? null;
  const bio = publicProfile?.bio ?? null;
  const panelTitles: Record<HomePanel, string> = {
    qi: "Qi Reserves",
    effects: "Active Effects",
    stats: "Stats",
    highlights: "Highlights",
  };
  const openPanel = (next: HomePanel) => {
    lastPanel.current = next;
    setPanel(next);
  };
  const panelOpener = () => {
    const openers: Record<HomePanel, HTMLButtonElement | null> = {
      qi: reservesRef.current,
      effects: effectsRef.current,
      stats: statsRef.current,
      highlights: highlightsRef.current,
    };
    return openers[lastPanel.current] ?? reservesRef.current;
  };

  return (
    <div
      className="cave-home mx-auto w-full max-w-xl"
      data-cave-home
      data-cave-home-mode={mode}
    >
      <section aria-labelledby="cave-cultivator-name" className="relative">
        <div className="relative z-10 mx-auto mt-2 flex items-center justify-center">
          <span
            aria-hidden="true"
            className="cave-plaque absolute left-0 top-1/2 hidden -translate-y-1/2 min-[380px]:block md:-left-2"
          >
            守心见道
          </span>
          <span
            aria-hidden="true"
            className="cave-plaque absolute right-0 top-1/2 hidden -translate-y-1/2 min-[380px]:block md:-right-2"
          >
            静修成空
          </span>

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
              className={`absolute inset-1 rounded-full p-1 transition-all duration-700 ${auraGlow.className}`}
              style={auraGlow.style}
              data-cave-portrait
            >
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
                  <UserIcon
                    size={56}
                    aria-hidden="true"
                    className="text-neutral-700"
                  />
                )}
                {showsRankParticles ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden mix-blend-screen"
                  >
                    <div className="absolute inset-x-0 bottom-2 flex h-8 justify-around opacity-75">
                      <span
                        className="h-1 w-1 animate-ping rounded-full motion-reduce:animate-none"
                        style={{
                          animationDuration: "3s",
                          backgroundColor: moteColors[0],
                        }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full motion-reduce:animate-none"
                        style={{
                          animationDuration: "2s",
                          backgroundColor: moteColors[moteColors.length - 1],
                        }}
                      />
                      <span
                        className="h-1 w-1 animate-pulse rounded-full motion-reduce:animate-none"
                        style={{
                          animationDuration: "2.5s",
                          backgroundColor:
                            moteColors[Math.floor(moteColors.length / 2)],
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <LibraryPanel
          padding="md"
          className="cave-home-identity relative -mt-9 !rounded-[1.35rem] !border-[#d4af37]/45 !pt-12 text-center"
          data-cave-identity
        >
          {!isPublic && (
            <div className="cave-account-emblems" data-cave-account-controls>
              <button type="button" className="cave-account-emblem" onClick={accountControls?.onOpenInbox}
                disabled={!accountControls?.onOpenInbox}
                aria-label={accountControls?.inboxUnreadCount ? `Inbox, ${accountControls.inboxUnreadCount} unread messages` : "Inbox"}>
                <span className="relative">
                  <Mail size={24} aria-hidden="true" />
                  {(accountControls?.inboxUnreadCount ?? 0) > 0 && <span className="cave-unread-dot" data-cave-unread aria-hidden="true" />}
                </span>
                <span>Inbox</span>
              </button>
              <div className="cave-account-emblem" title="Energy is used to generate content" data-cave-energy>
                <Zap size={24} aria-hidden="true" />
                <span>Energy</span>
                <span className="font-mono" aria-live="polite">
                  {accountControls?.energyBalance == null ? "Unavailable" : formatQi(accountControls.energyBalance)}
                </span>
              </div>
            </div>
          )}
          {isLoading && !profile ? (
            <SEILoadingState size="sm" title="Loading profile" />
          ) : (
            <>
              {/* The name owns the centre line by itself; the subscription badge
                  sits in its own slot on the rank row below, so a long or short
                  tier can never shift the name off centre. */}
              <h2
                id="cave-cultivator-name"
                tabIndex={-1}
                className="font-display text-2xl leading-tight outline-none sm:text-3xl"
                data-cave-name
              >
                <span
                  className={`inline-block min-w-0 max-w-full [overflow-wrap:anywhere] ${nameStyle.className || "text-neutral-100"}`}
                  style={nameStyle.style}
                >
                  {profile?.displayName?.trim() || "Cultivator"}
                </span>
              </h2>
              {profile && (
                <>
                  <div className="cave-home-rank-row mt-2" data-cave-rank-row>
                    <p className="font-serif text-base text-neutral-200" data-cave-rank>
                      {daoData.rank}
                    </p>
                    <span
                      className="cave-tier-badge"
                      aria-label={`Subscription tier: ${tiers[profile.premiumTier ?? "mortal"]}`}
                    >
                      {tiers[profile.premiumTier ?? "mortal"]}
                    </span>
                  </div>
                  {isPublic ? (
                    <p className="cave-home-bio mt-3" data-cave-bio>
                      {bio === null
                        ? "This cultivator keeps their bio private."
                        : bio.trim() || "This cultivator has not written a bio yet."}
                    </p>
                  ) : (
                    <>
                      <div
                        className="cave-home-progress mt-3"
                        role="progressbar"
                        aria-label={
                          daoData.nextRank
                            ? `Cultivation toward ${daoData.nextRank}`
                            : "Maximum rank"
                        }
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(daoData.progress)}
                        aria-valuetext={`${formatQi(daoData.currentQi)} Qi${daoData.maxQi ? ` of ${formatQi(daoData.maxQi)}` : ", maximum rank"}`}
                        style={
                          {
                            "--cave-rank-background": rankBackground(rank.visual),
                            "--cave-progress": `${daoData.progress}%`,
                          } as React.CSSProperties
                        }
                        data-cave-progress
                      >
                        <span
                          aria-hidden="true"
                          className="cave-home-progress-indicator"
                        />
                      </div>
                      <p
                        className="mt-1.5 font-mono text-base text-neutral-300"
                        data-cave-qi
                      >
                        {formatQi(daoData.currentQi)}
                        {daoData.maxQi !== null
                          ? ` / ${formatQi(daoData.maxQi)} Qi`
                          : " Qi"}
                      </p>
                      <p className="mt-0.5 font-sc text-[10px] uppercase tracking-widest text-neutral-400">
                        {daoData.nextRank
                          ? `Cultivation to ${daoData.nextRank}`
                          : "Maximum rank"}
                      </p>
                    </>
                  )}
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
              <ChevronRight size={16} aria-hidden="true" className="shrink-0" />
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
              <ChevronRight size={16} aria-hidden="true" className="shrink-0" />
            </button>
          </>
        ) : (
          <>
            <button
              ref={reservesRef}
              type="button"
              className="cave-home-control"
              aria-haspopup="dialog"
              onClick={() => openPanel("qi")}
              data-cave-card="qi-reserves"
            >
              <Orbit aria-hidden="true" className="cave-home-glyph" />
              <span className="min-w-0 flex-1">
                <span className="block font-display">Qi Reserves</span>
                <span className="block text-xs text-neutral-400">
                  Unlocked Qi types
                </span>
              </span>
              <ChevronRight size={16} aria-hidden="true" className="shrink-0" />
            </button>
            {effects.length > 0 && (
              <button
                ref={effectsRef}
                type="button"
                className="cave-home-control"
                aria-haspopup="dialog"
                onClick={() => openPanel("effects")}
                data-cave-card="status-effects"
              >
                <Flame
                  aria-hidden="true"
                  className="cave-home-glyph text-violet-300"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-display">
                    Active Effects · {effects.length}
                  </span>
                  <span className="block truncate text-xs text-neutral-400">
                    {effectStatement(effects[0], now)}
                  </span>
                </span>
                <ChevronRight size={16} aria-hidden="true" className="shrink-0" />
              </button>
            )}
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
              disabled={blocked}
              aria-busy={dailyClaim?.pending}
              onClick={() => {
                void dailyClaim?.claim();
              }}
              data-cave-card="dao-pillar"
            >
              <span className="cave-home-pillar-art" aria-hidden="true">
                道
              </span>
              <span className="min-w-0">
                <span className="block font-display text-lg">Daily Dao Pillar</span>
                <span className="mt-1 block font-serif text-lg text-sky-300">
                  {currentStreak} Day Streak
                </span>
                <span className="mt-1 block text-sm">{claimLabel}</span>
              </span>
            </button>
            {isCracked && (
              <LibraryButton
                className="mt-2"
                disabled={repairing || dailyClaim?.pending || unresolved}
                onClick={() => {
                  void repair();
                }}
              >
                {repairing ? "Repairing…" : "Repair Pillar · 50 Qi"}
              </LibraryButton>
            )}
            {unresolved && (
              <LibraryButton
                className="mt-2"
                onClick={() => {
                  void dailyClaim?.reconcile();
                }}
              >
                Check collection status
              </LibraryButton>
            )}
            <p
              role="status"
              aria-live="polite"
              className="mt-1 text-sm text-neutral-300"
            >
              {repairError || dailyClaim?.result?.message}
            </p>
          </>
        )}
      </div>
      {/* Relics is a destination of its own, the same weight as the Dao Pillar
          it follows and above the smaller Store and Settings pair. It opens the
          Cave's existing `/relics` route, which mounts the one inventory panel;
          nothing about relics is implemented or stored a second time here. */}
      {!isPublic && (
        <div className="mt-3">
          <button
            type="button"
            className="cave-home-pillar"
            disabled={!onOpenRelics}
            onClick={onOpenRelics}
            data-cave-card="relics"
          >
            <span className="cave-home-pillar-art" aria-hidden="true">
              <Gem size={30} />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-lg">Relics</span>
              <span className="mt-1 block font-serif text-lg text-sky-300">
                {formatQi(relicCount)} {relicCount === 1 ? "Relic" : "Relics"}
              </span>
              <span className="mt-1 block text-sm">
                Inventory, attunement, and the Offering Hall
              </span>
            </span>
          </button>
        </div>
      )}
      {!isPublic && (
        <div className="mt-3 grid grid-cols-2 gap-3" data-cave-account-actions>
          <LibraryButton fullWidth variant="secondary" icon={Store} onClick={accountControls?.onOpenStore} disabled={!accountControls?.onOpenStore}>Store</LibraryButton>
          <LibraryButton fullWidth variant="secondary" icon={Settings} onClick={onOpenSettings} disabled={!onOpenSettings}>Settings</LibraryButton>
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
            {panel ? panelTitles[panel] : panelTitles.qi}
          </SEIDialogTitle>
          <SEIDialogDescription className="sr-only">
            {panel === "effects"
              ? "Current effects and remaining duration"
              : panel === "stats"
                ? "Public reading activity for this cultivator"
                : panel === "highlights"
                  ? "Media and moments this cultivator features"
                  : "Unlocked special Qi balances"}
          </SEIDialogDescription>
          {panel === "effects" ? (
            effects.length ? (
              <ul className="mt-4 space-y-3">
                {effects.map((effect) => (
                  <li
                    key={effect.id}
                    className="border-b border-white/10 pb-3 text-sm"
                  >
                    <p>{effectStatement(effect, now)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4">No active effects.</p>
            )
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
          ) : panel === "highlights" ? (
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
                      <span className="block">{highlight.title}</span>
                      <span className="block text-xs text-neutral-400">
                        {highlight.detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4">Nothing featured yet.</p>
            )
          ) : reserves.length ? (
            <dl className="mt-4 space-y-3">
              {reserves.map((reserve) => (
                <div key={reserve.id} className="flex justify-between gap-4">
                  <dt>{reserve.label}</dt>
                  <dd>{formatQi(reserve.balance)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4">No special Qi reserves unlocked.</p>
          )}
        </SEIDialogContent>
      </SEIDialog>
    </div>
  );
}
