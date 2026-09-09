import React, { useEffect, useRef, useState } from "react";
import { ChevronRight, Flame, Orbit, User as UserIcon } from "lucide-react";
import { LibraryButton, LibraryPanel } from "@seihouse/library-ui";
import {
  SEIDialog,
  SEIDialogContent,
  SEIDialogTitle,
  SEIDialogDescription,
  SEILoadingState,
  SEIProgressBar,
} from "@seihouse/ui";
import type { UserProfileController } from "../shared/userProfileServices";
import type { ActiveStatusEffect, PremiumTier } from "../shared/types";
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

export function UserProfileHome({
  controller,
}: {
  controller: UserProfileController;
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
  const [panel, setPanel] = useState<"qi" | "effects" | null>(null);
  const [now, setNow] = useState(Date.now);
  const [repairing, setRepairing] = useState(false);
  const repairLock = useRef(false);
  const reservesRef = useRef<HTMLButtonElement>(null);
  const lastPanel = useRef<"qi" | "effects">("qi");
  const effectsRef = useRef<HTMLButtonElement>(null);
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
  const auraSelection = getAuraSelection(profile?.displayNameColor, auraXp);
  const nameStyle = getAuraTextStyle(
    auraSelection,
    profile?.activeStatusEffects,
    auraXp,
  );
  const auraGlow = getAuraGlowStyle(
    auraSelection,
    profile?.activeStatusEffects,
    auraXp,
  );
  const activeRank = resolveRankVisual(auraSelection, auraXp);
  const showsRankParticles = activeRank.rank.motes;
  const moteColors = activeRank.visual.stops;
  const effects = (profile?.activeStatusEffects ?? []).filter(
    (effect) =>
      Date.parse(effect.expiresAt) > now && Date.parse(effect.appliedAt) <= now,
  );
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
    try {
      await handleRepairPillar();
    } finally {
      repairLock.current = false;
      setRepairing(false);
    }
  };
  return (
    <div className="cave-home mx-auto w-full max-w-xl" data-cave-home>
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
          {isLoading && !profile ? (
            <SEILoadingState size="sm" title="Loading profile" />
          ) : (
            <>
              <h2
                id="cave-cultivator-name"
                tabIndex={-1}
                className="flex items-center justify-center gap-2 font-display text-2xl leading-tight outline-none sm:text-3xl"
              >
                <span
                  className={`min-w-0 [overflow-wrap:anywhere] ${nameStyle.className || "text-neutral-100"}`}
                  style={nameStyle.style}
                >
                  {profile?.displayName?.trim() || "Cultivator"}
                </span>
                {profile && (
                  <span
                    className="cave-tier-badge"
                    aria-label={`Subscription tier: ${tiers[profile.premiumTier ?? "mortal"]}`}
                  >
                    {tiers[profile.premiumTier ?? "mortal"]}
                  </span>
                )}
              </h2>
              {profile && (
                <>
                  <p
                    className="mt-2 font-serif text-base text-neutral-200"
                    data-cave-rank
                  >
                    {daoData.rank}
                  </p>
                  <SEIProgressBar
                    className="cave-home-progress mt-3"
                    size="md"
                    value={daoData.progress}
                    aria-label={
                      daoData.nextRank
                        ? `Cultivation toward ${daoData.nextRank}`
                        : "Maximum rank"
                    }
                    valueText={`${formatQi(daoData.currentQi)} Qi${daoData.maxQi ? ` of ${formatQi(daoData.maxQi)}` : ", maximum rank"}`}
                    style={
                      {
                        "--cave-rank-background": rankBackground(rank.visual),
                      } as React.CSSProperties
                    }
                    data-cave-progress
                  />
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
        </LibraryPanel>
      </section>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          ref={reservesRef}
          type="button"
          className="cave-home-control"
          aria-haspopup="dialog"
          onClick={() => {
            lastPanel.current = "qi";
            setPanel("qi");
          }}
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
            onClick={() => {
              lastPanel.current = "effects";
              setPanel("effects");
            }}
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
      </div>
      <div className="mt-3">
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
          {dailyClaim?.result?.message}
        </p>
      </div>
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
          finalFocus={() =>
            effectsRef.current && lastPanel.current === "effects"
              ? effectsRef.current
              : reservesRef.current
          }
        >
          <SEIDialogTitle>
            {panel === "effects" ? "Active Effects" : "Qi Reserves"}
          </SEIDialogTitle>
          <SEIDialogDescription className="sr-only">
            {panel === "effects"
              ? "Current effects and remaining duration"
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
