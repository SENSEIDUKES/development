import React, { useMemo, useState } from 'react';
import { Archive, Award, Gem, Library, Sparkles, Zap } from 'lucide-react';
import { LibraryButton, LibraryPanel } from '@seihouse/library-ui';
import {
  SEIDialog,
  SEIDialogContent,
  SEIDialogDescription,
  SEIDialogTitle,
  SEIEmptyState,
  SEIInlineAlert,
  SEITabs,
  SEITabsList,
  SEITabsPanel,
  SEITabsTrigger,
} from '@seihouse/ui';
import { RelicCard, renderArtifactIcon } from '@seihouse/library/relics';
import type { CosmicArtifact, UserProfile as UserProfileType } from '../shared/types';
import { getCurrentOfferingWeekId } from '../shared/offeringWeek';
import { useUserProfileServices } from '../shared/userProfileServices';

interface UserProfileInventoryPanelProps {
  profile: UserProfileType | null;
  handleAttuneArtifact: (artifactId: string) => Promise<void>;
}

type RelicsTab = 'inventory' | 'pouch' | 'history';

// Performance Optimization: Cache Intl.DateTimeFormat at module level to avoid costly recreation during render loops
const dateFormatter = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
const safeFormatDate = (dateVal: unknown) => {
  if (!dateVal) return 'Unknown';
  const d = new Date(dateVal as string);
  return isNaN(d.getTime()) ? 'Unknown' : dateFormatter.format(d);
};

const RARITY_ACCENT: Record<CosmicArtifact['rarity'], string> = {
  Transcendent: '#22d3ee',
  Mythic: '#ef4444',
  Legendary: '#f59e0b',
  Epic: '#a78bfa',
  Rare: '#34d399',
  Common: '#a3a3a3',
};

const isSubmitted = (art: CosmicArtifact) => art.status === 'submitted' || art.status === 'auto_submitted';

/**
 * Relics destination: the relic inventory, soul attunement, the Celestial
 * Library Offering Hall, the submitted history, and the offering rewards, in
 * one surface. The week filter, the reward totals, and the submission call are
 * production behaviour; attunement uses the controller's existing rule set.
 */
export function UserProfileInventoryPanel({ profile, handleAttuneArtifact }: UserProfileInventoryPanelProps) {
  const [tab, setTab] = useState<RelicsTab>('inventory');
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAttuning, setIsAttuning] = useState(false);
  const [offeringResult, setOfferingResult] = useState<{ qi: number; sectMerit: number; count: number } | null>(null);
  const [offeringError, setOfferingError] = useState<string | null>(null);
  // Production imports `submitCurrentWeekOfferings` from `lib/artifacts`, which
  // writes the account's inventory. It arrives through the services port here.
  const { submitCurrentWeekOfferings } = useUserProfileServices();

  const artifacts = profile?.cosmicInventory || [];
  const currentWeek = getCurrentOfferingWeekId();

  const unsubmitted = artifacts.filter(art => art.status === 'unsubmitted' || (!art.status && art.offeringWeekId === currentWeek));
  const submittedHistory = useMemo(
    () =>
      artifacts
        .filter(isSubmitted)
        .sort((a, b) => new Date(b.gatheredAt || b.unlockedAt).getTime() - new Date(a.gatheredAt || a.unlockedAt).getTime()),
    [artifacts],
  );

  const totalRewardQi = unsubmitted.reduce((acc, art) => acc + (art.rewardValueQi || 0), 0);
  const totalRewardSectMerit = unsubmitted.reduce((acc, art) => acc + (art.rewardValueSectMerit || 0), 0);

  const inspectArtifact = inspectId ? artifacts.find(art => art.id === inspectId) ?? null : null;
  const attunedArtifact = artifacts.find(art => art.id === profile?.equippedArtifactId);

  const handleSubmitOfferings = async () => {
    setIsSubmitting(true);
    setOfferingError(null);
    setOfferingResult(null);
    const count = unsubmitted.length;
    try {
      const result = await submitCurrentWeekOfferings();
      setOfferingResult({ ...result, count });
    } catch (err) {
      console.error(err);
      setOfferingError('The Library could not accept this week’s offerings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAttunement = async (artifactId: string) => {
    setIsAttuning(true);
    try {
      await handleAttuneArtifact(artifactId);
    } finally {
      setIsAttuning(false);
    }
  };

  const renderGrid = (items: CosmicArtifact[], emptyIcon: typeof Library, emptyTitle: string, emptyDescription: string) =>
    items.length === 0 ? (
      <SEIEmptyState icon={emptyIcon} size="md" titleAs="p" title={emptyTitle} description={emptyDescription} />
    ) : (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(art => (
          <RelicCard key={art.id} artifact={art} onClick={relic => setInspectId(relic.id)} />
        ))}
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Attunement summary */}
      <LibraryPanel as="section" aria-label="Soul attunement" padding="sm" className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
            attunedArtifact ? 'border-amber-400/40 bg-amber-950/30' : 'border-white/10 bg-black/40'
          }`}
        >
          {attunedArtifact ? renderArtifactIcon(attunedArtifact.name, attunedArtifact.rarity, 18) : <Gem size={18} className="text-neutral-500" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-sc text-[10px] font-bold uppercase tracking-widest text-neutral-400">Soul Attuned</p>
          {attunedArtifact ? (
            <p className="truncate font-sans text-sm text-amber-200">
              {attunedArtifact.name}
              {attunedArtifact.attributeBoost ? (
                <span className="text-neutral-400"> · {attunedArtifact.attributeBoost}</span>
              ) : null}
            </p>
          ) : (
            <p className="font-sans text-sm text-neutral-400">No relic attuned. Inspect a relic to attune your soul.</p>
          )}
        </div>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
          {artifacts.length} {artifacts.length === 1 ? 'relic' : 'relics'}
        </span>
      </LibraryPanel>

      <SEITabs value={tab} onValueChange={value => setTab(value as RelicsTab)} variant="pill">
        <SEITabsList aria-label="Relic views">
          <SEITabsTrigger value="inventory">Inventory ({artifacts.length})</SEITabsTrigger>
          <SEITabsTrigger value="pouch">Offering Pouch ({unsubmitted.length})</SEITabsTrigger>
          <SEITabsTrigger value="history">History ({submittedHistory.length})</SEITabsTrigger>
        </SEITabsList>

        <SEITabsPanel value="inventory" className="pt-4">
          {renderGrid(
            artifacts,
            Gem,
            'No relics gathered yet',
            'Seal chapters, break through bottlenecks, or survive challenges to gather relics.',
          )}
        </SEITabsPanel>

        <SEITabsPanel value="pouch" className="space-y-4 pt-4">
          <LibraryPanel as="section" aria-labelledby="cave-offering-hall" padding="md" className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 id="cave-offering-hall" className="flex items-center gap-2 font-display text-lg text-neutral-100">
                  <Library size={16} aria-hidden="true" className="text-[#7dd3ff]" />
                  Celestial Library Offering Hall
                </h3>
                <p className="mt-1 font-mono text-[11px] text-neutral-400">
                  The Celestial Library accepts all records of fate, battle, wisdom, and karma. Offer your
                  gathered relics to deepen your cultivation.
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                  Week {currentWeek}
                </p>
                {unsubmitted.length > 0 ? (
                  <p className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[11px] text-[#7dd3ff]">
                    <span className="flex items-center gap-1"><Zap size={12} aria-hidden="true" /> +{totalRewardQi.toLocaleString()} Qi</span>
                    <span className="flex items-center gap-1"><Award size={12} aria-hidden="true" /> +{totalRewardSectMerit.toLocaleString()} Sect Merit</span>
                  </p>
                ) : null}
              </div>
              <LibraryButton
                variant="primary"
                icon={Sparkles}
                loading={isSubmitting}
                disabled={unsubmitted.length === 0 || isSubmitting}
                onClick={() => void handleSubmitOfferings()}
                className="shrink-0"
              >
                {isSubmitting ? 'Submitting…' : 'Submit Offerings'}
              </LibraryButton>
            </div>

            {offeringResult ? (
              <SEIInlineAlert
                tone="success"
                role="status"
                title="The Library accepted your offerings"
                onDismiss={() => setOfferingResult(null)}
                dismissLabel="Dismiss offering result"
              >
                {offeringResult.count} {offeringResult.count === 1 ? 'relic' : 'relics'} offered: +{offeringResult.qi.toLocaleString()} Qi
                and +{offeringResult.sectMerit.toLocaleString()} Sect Merit.
              </SEIInlineAlert>
            ) : null}
            {offeringError ? (
              <SEIInlineAlert tone="danger" role="alert">
                {offeringError}
              </SEIInlineAlert>
            ) : null}
          </LibraryPanel>

          {renderGrid(
            unsubmitted,
            Library,
            'Your pouch is empty',
            'Seal chapters, breakthrough bottlenecks, or survive challenges to gather relics.',
          )}
        </SEITabsPanel>

        <SEITabsPanel value="history" className="pt-4">
          {renderGrid(
            submittedHistory,
            Archive,
            'No offerings submitted yet',
            'Relics you offer to the Celestial Library are remembered here with the rewards they returned.',
          )}
        </SEITabsPanel>
      </SEITabs>

      <SEIDialog open={Boolean(inspectArtifact)} onOpenChange={open => { if (!open) setInspectId(null); }}>
        {inspectArtifact ? (
          <SEIDialogContent variant="dark" className="z-[310] sm:max-w-md" backdropClassName="z-[300]" data-relic-inspect={inspectArtifact.id}>
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-inner">
                  {renderArtifactIcon(inspectArtifact.name, inspectArtifact.rarity, 28)}
                </div>
                <span
                  className="rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    color: RARITY_ACCENT[inspectArtifact.rarity],
                    borderColor: `${RARITY_ACCENT[inspectArtifact.rarity]}55`,
                    backgroundColor: `${RARITY_ACCENT[inspectArtifact.rarity]}14`,
                  }}
                >
                  {inspectArtifact.rarity} Relic
                </span>
                <SEIDialogTitle className="font-display text-xl text-neutral-100">{inspectArtifact.name}</SEIDialogTitle>
                <SEIDialogDescription className="font-mono text-[10px] text-neutral-400">
                  Acquired on {safeFormatDate(inspectArtifact.unlockedAt)} · {isSubmitted(inspectArtifact) ? 'Submitted to Library' : 'In Pouch'}
                </SEIDialogDescription>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <h4 className="font-sc text-[9px] font-bold uppercase tracking-widest text-neutral-500">Sacred Relic Lore</h4>
                <p className="mt-2 font-serif text-xs italic leading-relaxed text-neutral-300">
                  “{inspectArtifact.description}”
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 p-4">
                <div>
                  <h4 className="font-sc text-[9px] font-bold uppercase tracking-widest text-neutral-500">Offering Rewards</h4>
                  <p className="mt-0.5 font-sans text-[10px] text-neutral-500">Granted by the Celestial Library upon submission</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 rounded-lg border border-[#04ACFF]/30 bg-[#04ACFF]/10 px-3 py-1.5 font-mono text-xs font-bold text-[#7dd3ff]">
                  <span className="flex items-center gap-1.5 whitespace-nowrap"><Zap size={12} aria-hidden="true" />+{inspectArtifact.rewardValueQi || 0} Qi</span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap"><Award size={12} aria-hidden="true" />+{inspectArtifact.rewardValueSectMerit || 0} Sect Merit</span>
                </div>
              </div>

              <dl className="space-y-1.5 px-1 font-mono text-[10px] text-neutral-500">
                <div className="flex items-center justify-between gap-3">
                  <dt>Unlock Catalyst</dt>
                  <dd className="font-sans font-medium text-neutral-300">{inspectArtifact.milestoneName}</dd>
                </div>
                {inspectArtifact.sourceStoryTitle ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt>Origin</dt>
                    <dd className="truncate font-sans text-neutral-300">
                      {inspectArtifact.sourceStoryTitle}
                      {inspectArtifact.sourceChapterNumber ? ` · Ch. ${inspectArtifact.sourceChapterNumber}` : ''}
                    </dd>
                  </div>
                ) : null}
                {inspectArtifact.attributeBoost ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt>Attribute Boost</dt>
                    <dd className="font-sans text-amber-200">{inspectArtifact.attributeBoost}</dd>
                  </div>
                ) : null}
                {inspectArtifact.statusEffectDef ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt>Grants</dt>
                    <dd className="font-sans text-neutral-300">
                      {inspectArtifact.statusEffectDef.name} ({inspectArtifact.statusEffectDef.type})
                    </dd>
                  </div>
                ) : null}
              </dl>

              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <LibraryButton
                  variant={profile?.equippedArtifactId === inspectArtifact.id ? 'secondary' : 'primary'}
                  icon={Award}
                  loading={isAttuning}
                  disabled={!profile || isAttuning}
                  onClick={() => void toggleAttunement(inspectArtifact.id)}
                  className="flex-1"
                >
                  {profile?.equippedArtifactId === inspectArtifact.id ? 'Release Attunement' : 'Attune Soul'}
                </LibraryButton>
                <LibraryButton variant="ghost" onClick={() => setInspectId(null)} className="flex-1">
                  Close
                </LibraryButton>
              </div>
            </div>
          </SEIDialogContent>
        ) : null}
      </SEIDialog>
    </div>
  );
}
