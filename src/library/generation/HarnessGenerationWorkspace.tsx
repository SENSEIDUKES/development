import { StoryFoundationEditor } from '@seihouse/sen/story-seed';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { FrozenNarrativeMedia } from '@seihouse/sen/audio';
import { BookOpen, CheckCircle2, CircleAlert, Compass, Download, FileText, ListTree, LoaderCircle, Pause, Pin, Play, Plus, Puzzle, RefreshCcw, Target, Volume2 } from 'lucide-react';
import { ARC_LENGTH, ArcPlanView } from '@seihouse/sen/arc-goals';
import { CHAPTER_FUNCTIONS, FATE_PRESSURE_RHYTHM_CONFIG, HARD_PIN_LIMIT, harnessArcContext } from '@seihouse/sen/harness-generation';
import type { ChapterFunction, HardPinInput, HarnessChapter, HarnessMissionReminder, StoryFoundationRevision } from '@seihouse/sen/harness-generation';
import { createLibraryMediaPort, isMediaPackEntitlementActive, mediaPackKey, type MediaPack, type MediaPackEntitlement, type MediaPackReference, type StoryMediaLoadoutSlot } from '../media/mediaPacks';
import { NarrativeButton as LibraryButton, NarrativePanel as LibraryPanel, NarrativeTextArea as LibraryTextArea, NarrativeTextBox as LibraryTextBox, CreationButton as ManifestButton } from '@seihouse/sen/presentation';
import { LibraryManifestingIcon as SENManifestingIcon } from '@seihouse/library-ui';
import { HarnessGenerationController, exportHarnessStory } from '@seihouse/sen/harness-generation';
import { findFoundationRevision, findStory } from '@seihouse/sen/harness-generation';
import { buildCanonicalStoryView } from '@seihouse/sen/harness-generation';
import { GENERATION_PACKET_BUDGET, PACKET_SECTION_ORDER } from '@seihouse/sen/harness-generation';
import { CAPA_SCHEMA, HARNESS_OFFICIAL_OUTPUT_REQUIREMENTS, harnessSkillKey } from '@seihouse/sen/harness-generation';
import { isTranslationSkillCompatible, translationTargetLanguage } from '@seihouse/sen/harness-generation';
import { includeBundledHarnessSkills } from '@seihouse/sen/harness-generation';
import { HarnessReaderSession } from '@seihouse/sen/harness-generation';
import { type HarnessGenerationRepository } from '@seihouse/sen/harness-generation';
import type { ReaderStateRepository } from '@seihouse/sen/reader-runtime';
import { type HarnessGenerationAttempt, type HarnessGenerationModelAdapter, type HarnessGenerationServerInfo, type HarnessCorrectionKind, type HarnessSemanticEvent, type HarnessStory, type HarnessSkillManifest, type HarnessSkillReference, type HarnessSkillSlotId, type HarnessStorySeedOption, type HarnessStorySeedSource, type HarnessWorkspaceState, type StoryFoundationInput } from '@seihouse/sen/harness-generation';

export interface HarnessGenerationWorkspaceProps {
  /** Host-selected first-party records; never a built-in SEN catalog. */
  baseMedia?: FrozenNarrativeMedia;
  /** Injection points keep the live UI testable without a provider or browser database. */
  repository: HarnessGenerationRepository;
  modelAdapter: HarnessGenerationModelAdapter;
  /** Host-owned durable Reader state (place, bookmarks, settings) for stories opened in SEN. */
  readerStateRepository?: ReaderStateRepository;
  /**
   * Host-controlled story open in the Reader, so a host can restore it after a
   * reload. Without `onReadingStoryChange` the workspace keeps it internally.
   */
  readingStoryId?: string;
  onReadingStoryChange?: (storyId: string | undefined) => void;
  /** Optional host bridge that supplies saved Story Seeds as frozen inputs. */
  storySeedSource?: HarnessStorySeedSource;
  /** Host-owned inventory. Passing a manifest means that exact skill version is installed and available to equip. */
  installedSkills?: HarnessSkillManifest[];
  /** Host-owned package intake, shown alongside the existing skill slots. */
  renderSkillImport?: (busy: boolean) => ReactNode;
  /**
   * The same host-owned intake, opened from one CAPA slot. The slot is the
   * locked destination, and `equip` equips the installed skill for the open
   * story so the author never installs globally and returns to equip.
   */
  renderSlotSkillImport?: (
    slot: HarnessSkillSlotId,
    busy: boolean,
    equip: (skill: HarnessSkillManifest) => Promise<void>,
  ) => ReactNode;
  /** Host-owned runtime catalog. Media Packs are never merged into installedSkills. */
  registeredMediaPacks?: MediaPack[];
  /** Current account/reward truth supplied by the host; HARNESS never persists it. */
  mediaPackEntitlements?: MediaPackEntitlement[];
  /** Optional Development adapter. Its host callback owns the simulated reward state. */
  onGrantDevelopmentMediaReward?: (reference: MediaPackReference) => void | Promise<void>;
  /** Host-remembered model choice (the Model Router); used whenever the server offers it. */
  preferredModel?: string;
  /** Tells the host the author picked a different model here. */
  onModelChange?: (model: string) => void;
}

const emptyFoundation = (): StoryFoundationInput => ({ premise: '' });
const EMPTY_INSTALLED_SKILLS: HarnessSkillManifest[] = [];
const EMPTY_MEDIA_PACKS: MediaPack[] = [];
const EMPTY_MEDIA_ENTITLEMENTS: MediaPackEntitlement[] = [];

const stageLabel: Record<HarnessGenerationAttempt['stage'], string> = {
  request_started: 'Request started',
  provider_outcome_unknown: 'Provider outcome unknown',
  raw_received: 'Raw response saved',
  prose_accepted: 'Prose accepted',
  events_preserved: 'Events preserved',
  accepted_not_durable: 'Needs local persistence retry',
  committed: 'Committed',
  generation_failed: 'Generation failed',
  abandoned: 'Superseded by an explicit retry',
};

const formatDate = (value: string | undefined) => value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—';

const latestAttemptForStory = (state: HarnessWorkspaceState, storyId: string) => state.attempts
  .filter(attempt => attempt.storyId === storyId)
  .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0];

const storyChapters = (state: HarnessWorkspaceState, storyId: string) => state.chapters
  .filter(chapter => chapter.storyId === storyId)
  .sort((left, right) => left.chapterNumber - right.chapterNumber);

const storyEvents = (state: HarnessWorkspaceState, storyId: string) => state.events
  .filter(event => event.storyId === storyId)
  .sort((left, right) => left.chapterNumber - right.chapterNumber);

function StorySeedStart({
  options,
  loading,
  error,
  busy,
  manageHref,
  onRefresh,
  onSelect,
  onManual,
}: {
  options: HarnessStorySeedOption[];
  loading: boolean;
  error?: string;
  busy: boolean;
  manageHref?: string;
  onRefresh: () => void;
  onSelect: (option: HarnessStorySeedOption) => void;
  onManual: () => void;
}) {
  return (
    <LibraryPanel as="section" padding="md" aria-labelledby="harness-story-seed-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/55">Story Seed → Harness → Story</p>
          <h2 id="harness-story-seed-title" className="mt-1 font-display text-xl text-white">Choose a Story Seed</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-400">
            The Harness copies the selected seed and Blueprint into its own frozen Foundation, then owns generation from there.
          </p>
        </div>
        <LibraryButton type="button" size="sm" variant="ghost" icon={RefreshCcw} onClick={onRefresh} loading={loading} disabled={busy}>
          Refresh
        </LibraryButton>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-human">{error}</p>}
      {!loading && options.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-white/15 bg-black/15 p-4">
          <p className="text-sm text-neutral-300">No saved Story Seeds are available in this browser yet.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {manageHref && <a className="inline-flex min-h-11 items-center rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-4 text-sm font-medium text-cyan-100 no-underline" href={manageHref}>Open Story Seed</a>}
            <LibraryButton type="button" variant="ghost" onClick={onManual}>Start from a premise instead</LibraryButton>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {options.map(option => (
            <article key={option.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-white">{option.title}</h3>
                  <p className="mt-1 text-xs text-neutral-500">Updated {formatDate(option.updatedAt)}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${option.hasBlueprint ? 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-neutral-500'}`}>
                  {option.hasBlueprint ? 'Blueprint ready' : 'Seed only'}
                </span>
              </div>
              <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-neutral-400">{option.foundation.premise}</p>
              <div className="mt-4">
                <ManifestButton type="button" icon={SENManifestingIcon} onClick={() => onSelect(option)} disabled={busy}>
                  Start with Harness
                </ManifestButton>
              </div>
            </article>
          ))}
        </div>
      )}

      {options.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
          {manageHref && <a className="text-xs text-cyan-200 no-underline hover:text-cyan-100" href={manageHref}>Manage Story Seeds</a>}
          <LibraryButton type="button" size="sm" variant="ghost" onClick={onManual}>Manual premise</LibraryButton>
        </div>
      )}
    </LibraryPanel>
  );
}

function AttemptStatus({
  attempt,
  onRetryStage,
  onRetryModel,
  busy,
}: {
  attempt?: HarnessGenerationAttempt;
  onRetryStage: () => void;
  onRetryModel: () => void;
  busy: boolean;
}) {
  if (!attempt) {
    return (
      <LibraryPanel variant="callout" padding="sm">
        <p className="text-sm text-neutral-300">No chapter has been requested yet.</p>
      </LibraryPanel>
    );
  }
  const canResume = ['raw_received', 'prose_accepted', 'events_preserved'].includes(attempt.stage)
    || (attempt.stage === 'accepted_not_durable' && Boolean(attempt.recoveryStage));
  const canRetryModel = ['generation_failed', 'provider_outcome_unknown'].includes(attempt.stage);
  return (
    <LibraryPanel variant="callout" padding="sm" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100/55">Current attempt</p>
          <p className="mt-1 text-sm font-semibold text-white">Chapter {attempt.chapterNumber} · {stageLabel[attempt.stage]}</p>
          <p className="mt-1 text-xs text-neutral-400">Started {formatDate(attempt.startedAt)}</p>
          {attempt.failure && <p className="mt-2 max-w-2xl text-xs leading-relaxed text-human">{attempt.failure.message}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {canResume && (
            <LibraryButton type="button" size="sm" icon={RefreshCcw} onClick={onRetryStage} loading={busy}>
              Resume checkpoint
            </LibraryButton>
          )}
          {canRetryModel && (
            <LibraryButton type="button" size="sm" variant="secondary" icon={RefreshCcw} onClick={onRetryModel} loading={busy}>
              {attempt.stage === 'provider_outcome_unknown' ? 'Explicitly retry model' : 'Retry model request'}
            </LibraryButton>
          )}
        </div>
      </div>
    </LibraryPanel>
  );
}

function SkillLoadoutPanel({
  story,
  installedSkills,
  busy,
  onChange,
  renderSlotSkillImport,
  onInstalled,
}: {
  story: HarnessStory;
  installedSkills: HarnessSkillManifest[];
  busy: boolean;
  onChange: (slot: HarnessSkillSlotId, reference?: HarnessSkillReference) => void;
  renderSlotSkillImport?: HarnessGenerationWorkspaceProps['renderSlotSkillImport'];
  onInstalled?: (slot: HarnessSkillSlotId, skill: HarnessSkillManifest) => Promise<void>;
}) {
  const installedByKey = new Map(installedSkills.map(skill => [harnessSkillKey(skill), skill]));
  const equippedCount = Object.keys(story.skillLoadout ?? {}).length;
  const missingCount = Object.values(story.skillLoadout ?? {})
    .filter(reference => reference && !installedByKey.has(harnessSkillKey(reference))).length;

  return (
    <LibraryPanel as="section" padding="md" aria-labelledby="harness-skills-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Puzzle size={18} className="text-cyan-200" aria-hidden="true" />
            <h2 id="harness-skills-title" className="font-display text-xl text-white">CAPA skill slots</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400">
            The Author skill tells the model how to write. Equipped generation skills are assembled once, in schema order, into the CAPA Prompt frozen with each chapter attempt.
          </p>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-100">
          {equippedCount}/{CAPA_SCHEMA.length} equipped · 1 locked
        </span>
      </div>

      {missingCount > 0 && (
        <p role="alert" className="mt-4 rounded-xl border border-human/30 bg-human-brand/10 p-3 text-sm text-human">
          {missingCount} equipped {missingCount === 1 ? 'skill is' : 'skills are'} unavailable in this host. Reinstall or empty the affected slot before generation.
        </p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CAPA_SCHEMA.map(slot => {
          const reference = story.skillLoadout?.[slot.id];
          const selectedKey = reference ? harnessSkillKey(reference) : '';
          const selected = reference ? installedByKey.get(selectedKey) : undefined;
          const slotSkills = installedSkills.filter(skill => skill.slot === slot.id);
          // Translation skills stay visible with their declared language so an
          // incompatible one is explained rather than silently hidden.
          const compatible = slot.id === 'translation'
            ? slotSkills.filter(skill => isTranslationSkillCompatible(skill, story.originalLanguage))
            : slotSkills;
          const incompatible = slot.id === 'translation'
            ? slotSkills.filter(skill => !isTranslationSkillCompatible(skill, story.originalLanguage))
            : [];
          const missing = Boolean(reference && !selected);
          const applications = selected?.applications.map(value => value.replace(/-/g, ' ')).join(' · ');
          return (
            <article key={slot.id} className={`rounded-xl border p-4 ${selected ? 'border-cyan-300/30 bg-cyan-400/[0.07]' : missing ? 'border-human/30 bg-human-brand/[0.06]' : 'border-white/10 bg-black/20'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Puzzle size={16} className="shrink-0 text-cyan-200/75" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-white">{slot.label}</h3>
                </div>
                <span className={`shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] ${selected ? 'text-cyan-100' : missing ? 'text-human' : 'text-neutral-500'}`}>
                  {selected ? 'Equipped' : missing ? 'Missing' : 'Empty'}
                </span>
              </div>
              <p className="mt-2 min-h-10 text-xs leading-relaxed text-neutral-500">{slot.description}</p>
              <label className="mt-3 block text-[10px] uppercase tracking-[0.14em] text-neutral-500" htmlFor={`harness-skill-${slot.id}`}>Installed skill</label>
              <select
                id={`harness-skill-${slot.id}`}
                value={selectedKey}
                disabled={busy}
                onChange={event => {
                  const manifest = installedByKey.get(event.target.value);
                  onChange(slot.id, manifest ? { id: manifest.id, version: manifest.version } : undefined);
                }}
                className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-black/35 px-3 text-sm text-neutral-100 outline-none focus:border-cyan-300/60"
              >
                {slot.id !== 'author' && <option value="">No skill equipped</option>}
                {missing && <option value={selectedKey}>{selectedKey} · unavailable</option>}
                {compatible.map(skill => <option key={harnessSkillKey(skill)} value={harnessSkillKey(skill)}>
                  {skill.name} · v{skill.version}{slot.id === 'translation' ? ` · ${translationTargetLanguage(skill)}` : ''}
                </option>)}
                {incompatible.map(skill => <option key={harnessSkillKey(skill)} value={harnessSkillKey(skill)} disabled>
                  {skill.name} · v{skill.version} · {translationTargetLanguage(skill)} · not this story’s language
                </option>)}
              </select>
              {slot.id === 'translation' && (
                <p className="mt-2 text-[11px] text-neutral-500">
                  This story’s Original Language is <span className="font-mono text-neutral-300">{story.originalLanguage}</span>.
                  {incompatible.length > 0 && ` ${incompatible.length} installed Translation ${incompatible.length === 1 ? 'skill targets' : 'skills target'} another language and cannot be equipped here.`}
                </p>
              )}
              {selected ? (
                <div className="mt-3 border-t border-white/10 pt-3">
                  <p className="text-xs leading-relaxed text-neutral-300">{selected.description}</p>
                  <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">{applications}</p>
                  {selected.assetCount !== undefined && <p className="mt-1 text-[11px] text-neutral-500">{selected.assetCount} packaged assets</p>}
                  {selected.runtimeLabel && <p className="mt-1 text-[11px] text-neutral-500">Runtime: {selected.runtimeLabel}</p>}
                  {selected.instructions && (
                    <details className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      <summary className="cursor-pointer text-[11px] font-medium text-cyan-100">View skill instructions</summary>
                      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-neutral-300">{selected.instructions}</pre>
                    </details>
                  )}
                </div>
              ) : compatible.length === 0 && !missing ? (
                <p className="mt-3 text-[11px] text-neutral-500">No installed skill is available for this slot.</p>
              ) : null}
              {/* Direct intake: the package is validated against this slot and
                  equipped here, without a separate global install step. */}
              {renderSlotSkillImport && onInstalled && (
                <details className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <summary className="cursor-pointer text-[11px] font-medium text-cyan-100">Upload SPP to {slot.label}</summary>
                  <div className="mt-3">
                    {renderSlotSkillImport(slot.id, busy, skill => onInstalled(slot.id, skill))}
                  </div>
                </details>
              )}
            </article>
          );
        })}
        <article className="rounded-xl border border-gold-accent/30 bg-gold-accent/[0.07] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileText size={17} className="shrink-0 text-gold-accent" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-white">Official Requirements</h3>
            </div>
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-gold-accent">
              Locked
            </span>
          </div>
          <p className="mt-2 min-h-10 text-xs leading-relaxed text-neutral-400">
            Permanent HARNESS rules applied after every equipped CAPA Skill.
          </p>
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
            Always active · not replaceable
          </p>
          <details className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <summary className="cursor-pointer text-[11px] font-medium text-gold-accent">View official requirements</summary>
            <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-neutral-300">{HARNESS_OFFICIAL_OUTPUT_REQUIREMENTS}</pre>
          </details>
        </article>
      </div>
    </LibraryPanel>
  );
}

function MediaLoadoutPanel({
  story,
  packs,
  entitlements,
  busy,
  onGrant,
  onChange,
}: {
  story: HarnessStory;
  packs: MediaPack[];
  entitlements: MediaPackEntitlement[];
  busy: boolean;
  onGrant?: (reference: MediaPackReference) => void;
  onChange: (slot: StoryMediaLoadoutSlot, reference?: MediaPackReference) => void;
}) {
  const [entitlementClock, setEntitlementClock] = useState(() => Date.now());
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const scheduleNextExpiration = () => {
      const now = Date.now();
      setEntitlementClock(now);
      const nearestBoundary = entitlements
        .flatMap(item => [Date.parse(item.unlockedAt), item.expiresAt ? Date.parse(item.expiresAt) : Number.NaN])
        .filter(boundary => Number.isFinite(boundary) && boundary > now)
        .sort((left, right) => left - right)[0];
      if (nearestBoundary === undefined || cancelled) return;
      timeout = setTimeout(scheduleNextExpiration, Math.min(nearestBoundary - now + 1, 2_147_483_647));
    };
    scheduleNextExpiration();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [entitlements]);
  const checkedAt = new Date(entitlementClock).toISOString();
  const entitled = new Set(entitlements
    .filter(item => isMediaPackEntitlementActive(item, checkedAt))
    .map(item => mediaPackKey(item.pack)));
  const slots: Array<{ id: StoryMediaLoadoutSlot; type: MediaPack['type']; label: string }> = [
    { id: 'soundscapes', type: 'soundscape', label: 'Soundscapes' },
    { id: 'soundCues', type: 'sound-cue', label: 'Sound Cues' },
  ];
  const validEquipped = new Set(slots.flatMap(slot => {
    const reference = story.mediaLoadout?.[slot.id];
    if (!reference) return [];
    const key = mediaPackKey(reference);
    return packs.some(pack => pack.type === slot.type && mediaPackKey(pack) === key) ? [key] : [];
  }));
  const activeEquipped = new Set([...validEquipped].filter(key => entitled.has(key)));
  return (
    <LibraryPanel as="section" padding="md" aria-labelledby="harness-media-loadout-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Volume2 size={18} className="text-emerald-200" aria-hidden="true" />
            <h2 id="harness-media-loadout-title" className="font-display text-xl text-white">Media Loadout</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400">
            Reward unlocks make registered packs available. Equipping is a separate story choice, and only expands deterministic runtime resolution after generation. Nothing here enters CAPA or the model request.
          </p>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-100">
          {activeEquipped.size}/2 equipped
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {slots.map(slot => {
          const slotPacks = packs.filter(pack => pack.type === slot.type);
          const reference = story.mediaLoadout?.[slot.id];
          const selectedKey = reference ? mediaPackKey(reference) : '';
          const registeredForSlot = slotPacks.some(pack => mediaPackKey(pack) === selectedKey);
          const slotState = reference
            ? !registeredForSlot ? 'Missing' : entitled.has(selectedKey) ? 'Equipped' : 'Locked'
            : 'Empty';
          return (
            <article key={slot.id} className="rounded-xl border border-emerald-300/20 bg-emerald-400/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">{slot.label}</h3>
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-emerald-100">{slotState}</span>
              </div>
              <label className="mt-3 block text-[10px] uppercase tracking-[0.14em] text-neutral-500" htmlFor={`harness-media-${slot.id}`}>Available pack</label>
              <select
                id={`harness-media-${slot.id}`}
                value={selectedKey}
                disabled={busy}
                onChange={event => {
                  const pack = slotPacks.find(item => mediaPackKey(item) === event.target.value);
                  onChange(slot.id, pack ? { id: pack.id, version: pack.version } : undefined);
                }}
                className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-black/35 px-3 text-sm text-neutral-100 outline-none focus:border-emerald-300/60"
              >
                <option value="">No pack equipped</option>
                {reference && !registeredForSlot && (
                  <option value={selectedKey} disabled>Unavailable pack · {reference.id} · v{reference.version}</option>
                )}
                {slotPacks.map(pack => (
                  <option key={mediaPackKey(pack)} value={mediaPackKey(pack)} disabled={!entitled.has(mediaPackKey(pack))}>
                    {pack.displayName} · v{pack.version}{entitled.has(mediaPackKey(pack)) ? '' : ' · locked'}
                  </option>
                ))}
              </select>
            </article>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {packs.map(pack => {
          const key = mediaPackKey(pack);
          const state = validEquipped.has(key) && entitled.has(key) ? 'Equipped' : entitled.has(key) ? 'Available' : 'Locked';
          return (
            <article key={key} className={`rounded-xl border p-4 ${state === 'Equipped' ? 'border-emerald-300/35 bg-emerald-400/[0.08]' : state === 'Available' ? 'border-cyan-300/20 bg-cyan-400/[0.05]' : 'border-white/10 bg-black/20'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{pack.displayName}</h3>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">{pack.type === 'soundscape' ? 'Soundscape Pack' : 'Sound Cue Pack'} · v{pack.version}</p>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-300">{state}</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-neutral-400">{pack.description}</p>
              <p className="mt-2 text-[11px] text-neutral-500">{pack.entries.length} validated catalog {pack.entries.length === 1 ? 'entry' : 'entries'}</p>
              {state === 'Locked' && onGrant && (
                <LibraryButton type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onGrant({ id: pack.id, version: pack.version })}>
                  Grant test reward
                </LibraryButton>
              )}
            </article>
          );
        })}
      </div>
      {packs.length === 0 && <p className="mt-4 text-sm text-neutral-500">No registered Media Packs are available. The built-in catalogs remain active.</p>}
    </LibraryPanel>
  );
}

const chapterFunctionLabel: Record<ChapterFunction, string> = {
  progression: 'Progression',
  worldBuilding: 'World-building',
  conflict: 'Conflict',
};

/**
 * The permanent Active Arc Goal display. Every value comes from the existing
 * Arc Goal authority (`harnessArcContext`), never from a second goal system.
 */
function ActiveArcGoalCard({ story, foundation, generatedThrough, busy, onEditPlan }: {
  story: HarnessStory;
  foundation?: StoryFoundationRevision;
  generatedThrough: number;
  busy: boolean;
  onEditPlan: (plan: Parameters<typeof ArcPlanView>[0]['plan']) => Promise<void>;
}) {
  const [planOpen, setPlanOpen] = useState(false);
  const context = foundation ? harnessArcContext(story, foundation.input, story.head.nextChapterNumber) : undefined;
  if (!context) {
    return (
      <div className="rounded-xl border border-dashed border-cyan-300/25 bg-cyan-400/[0.04] p-4" data-testid="harness-active-arc-goal">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200/55">Active Arc Goal</p>
        <p className="mt-2 text-sm text-neutral-300">No Arc Plan exists yet. The Arc planner creates it automatically before Chapter {story.head.nextChapterNumber} is requested.</p>
      </div>
    );
  }
  const goalIndex = context.plan.goals.findIndex(goal => goal.id === context.activeGoal.id) + 1;
  const remaining = context.completionDeadline - story.head.nextChapterNumber;
  const status = context.completionConfirmed
    ? 'Completed with verbatim evidence'
    : remaining > 0 ? `${remaining} ${remaining === 1 ? 'chapter' : 'chapters'} left before the deadline`
      : remaining === 0 ? 'Due in the next chapter: it cannot commit without completion evidence'
        : 'Overdue: the next chapter cannot commit without completion evidence';
  return (
    <div className="rounded-xl border border-cyan-300/30 bg-cyan-400/[0.07] p-4" data-testid="harness-active-arc-goal">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200/55">Active Arc Goal · Arc {context.arcNumber}</p>
          <p className="mt-1 text-sm font-semibold text-white">Goal {goalIndex} of {context.plan.goals.length}</p>
          <p className="mt-2 text-base leading-relaxed text-neutral-100">{context.activeGoal.text}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${context.completionConfirmed ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100' : remaining <= 0 ? 'border-human/30 bg-human-brand/10 text-human' : 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100'}`}>
          Deadline · Chapter {context.completionDeadline}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-xs text-neutral-400 sm:grid-cols-3">
        <div><dt className="font-mono uppercase tracking-[0.14em] text-neutral-500">Allocated chapters</dt><dd className="mt-1 text-neutral-200">{context.activeGoal.startChapter}–{context.activeGoal.endChapter} · {context.activeGoal.chapters} of {ARC_LENGTH}</dd></div>
        <div><dt className="font-mono uppercase tracking-[0.14em] text-neutral-500">Current position</dt><dd className="mt-1 text-neutral-200">Next: Chapter {story.head.nextChapterNumber} · {context.display} · segment chapter {context.positionInSegment} of {context.activeGoal.chapters}</dd></div>
        <div><dt className="font-mono uppercase tracking-[0.14em] text-neutral-500">Status</dt><dd className="mt-1 text-neutral-200">{status}</dd></div>
      </dl>
      <LibraryButton type="button" size="sm" variant="ghost" className="mt-3" onClick={() => setPlanOpen(open => !open)} disabled={busy}>
        {planOpen ? 'Hide complete Arc Plan' : 'Open complete Arc Plan'}
      </LibraryButton>
      {planOpen && <ArcPlanView key={`${context.plan.arcNumber}-${story.arcPlans?.length ?? 0}`} defaultOpen plan={context.plan} activeGoalId={context.activeGoal.id} generatedThrough={generatedThrough} onEdit={onEditPlan} />}
    </div>
  );
}

/**
 * Story-direction sources: the Destined Ending, user-created Hard Pins, the
 * story's Fate Pressure with its rhythm recommendation, and the Mission
 * Reminder. These are displayed and edited here; none of them enters the
 * provider request yet.
 */
function StoryDirectionPanel({ story, foundation, chapters, generatedThrough, missionReminder, busy, onSaveHardPins, onEditPlan }: {
  story: HarnessStory;
  foundation?: StoryFoundationRevision;
  chapters: HarnessChapter[];
  generatedThrough: number;
  missionReminder?: HarnessMissionReminder | { error: string };
  busy: boolean;
  onSaveHardPins: (pins: HardPinInput[]) => Promise<void>;
  onEditPlan: (plan: Parameters<typeof ArcPlanView>[0]['plan']) => Promise<void>;
}) {
  const savedPins = story.hardPins ?? [];
  // Only the saved pins themselves reset the draft, so an unrelated story
  // update (a recap edit, a commit) never discards unsaved pin text.
  const savedKey = JSON.stringify(savedPins.map(pin => ({ id: pin.id, text: pin.text })));
  const [draft, setDraft] = useState<HardPinInput[]>(() => savedPins.map(pin => ({ id: pin.id, text: pin.text })));
  const [pinError, setPinError] = useState('');
  useEffect(() => {
    setDraft(JSON.parse(savedKey) as HardPinInput[]);
    setPinError('');
  }, [story.id, savedKey]);
  const dirty = JSON.stringify(draft) !== savedKey;
  const savePins = async () => {
    setPinError('');
    try { await onSaveHardPins(draft); }
    catch (error) { setPinError(error instanceof Error ? error.message : 'The Hard Pins could not be saved.'); }
  };

  const recommendation = story.rhythmRecommendation;
  const tier = recommendation ? FATE_PRESSURE_RHYTHM_CONFIG.tiers[recommendation.fatePressure] : undefined;
  const latestRhythmChapter = [...chapters].reverse().find(chapter => chapter.rhythm?.nextChapterSuggestions);
  const suggestions = latestRhythmChapter?.rhythm?.nextChapterSuggestions;

  return (
    <LibraryPanel as="section" padding="md" aria-labelledby="harness-direction-title" data-testid="harness-story-direction">
      <div className="flex items-center gap-2">
        <Compass size={18} className="text-cyan-200" aria-hidden="true" />
        <h2 id="harness-direction-title" className="font-display text-xl text-white">Story direction</h2>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400">
        Hard Pins describe the story’s long-term destiny beside the Destined Ending. The Active Arc Goal describes its immediate current direction. Fate Pressure decides which of the writer’s next-chapter possibilities to favor. Nothing here is sent to the provider yet.
      </p>

      <div className="mt-5">
        <ActiveArcGoalCard story={story} foundation={foundation} generatedThrough={generatedThrough} busy={busy} onEditPlan={onEditPlan} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-gold-accent" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-white">Destined Ending</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-neutral-200">
            {foundation?.input.destinedEnding ?? 'Not set yet. The Arc planner supplies the novel-wide ending before the first chapter; edit it in the Foundation.'}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4" data-testid="harness-hard-pins">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Pin size={16} className="text-gold-accent" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-white">Hard Pins</h3>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">{savedPins.length}/{HARD_PIN_LIMIT} saved</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-neutral-500">Story-wide intentions only you write. The writer never invents or completes them, and they carry no weight or ranking.</p>
          <ol className="mt-3 space-y-2">
            {draft.map((pin, index) => (
              <li key={pin.id ?? `new-${index}`} className="flex flex-wrap items-center gap-2">
                <span className="w-5 font-mono text-[10px] text-neutral-500">{index + 1}.</span>
                <input
                  aria-label={`Hard Pin ${index + 1}`}
                  value={pin.text}
                  disabled={busy}
                  onChange={event => setDraft(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item))}
                  placeholder="Make Yi Chen take the Azure Sect to glory throughout the entire story."
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/15 bg-black/35 px-3 text-sm text-white"
                />
                <LibraryButton type="button" size="sm" variant="ghost" disabled={busy || index === 0} aria-label={`Move Hard Pin ${index + 1} earlier`} onClick={() => setDraft(current => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })}>↑</LibraryButton>
                <LibraryButton type="button" size="sm" variant="ghost" disabled={busy || index === draft.length - 1} aria-label={`Move Hard Pin ${index + 1} later`} onClick={() => setDraft(current => { const next = [...current]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; })}>↓</LibraryButton>
                <LibraryButton type="button" size="sm" variant="ghost" disabled={busy} aria-label={`Remove Hard Pin ${index + 1}`} onClick={() => setDraft(current => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</LibraryButton>
              </li>
            ))}
          </ol>
          {draft.length === 0 && <p className="mt-3 text-xs text-neutral-500">No Hard Pins yet.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <LibraryButton type="button" size="sm" variant="secondary" icon={Plus} disabled={busy || draft.length >= HARD_PIN_LIMIT} onClick={() => setDraft(current => [...current, { text: '' }])}>Add Hard Pin</LibraryButton>
            <LibraryButton type="button" size="sm" disabled={busy || !dirty} onClick={() => void savePins()}>Save Hard Pins</LibraryButton>
          </div>
          {pinError && <p role="alert" className="mt-2 text-xs text-human">{pinError}</p>}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4" data-testid="harness-fate-pressure">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Fate Pressure and rhythm</h3>
          {recommendation && (
            <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-100">
              {tier?.label ?? recommendation.fatePressure} · {recommendation.fatePressureSource === 'story' ? 'story value' : 'Development default'}
            </span>
          )}
        </div>
        {tier && <p className="mt-2 text-xs leading-relaxed text-neutral-500">{tier.summary} Tuning: {FATE_PRESSURE_RHYTHM_CONFIG.source.replace(/-/g, ' ')}.</p>}
        {recommendation ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">Recent rhythm (saved chapter functions)</p>
              {recommendation.recentFunctions.length ? (
                <ol className="mt-2 flex flex-wrap gap-2">
                  {recommendation.recentFunctions.map(entry => (
                    <li key={entry.chapterNumber} className="rounded-full border border-white/15 px-2 py-1 font-mono text-[10px] text-neutral-300">Ch {entry.chapterNumber} · {chapterFunctionLabel[entry.chapterFunction]}</li>
                  ))}
                </ol>
              ) : <p className="mt-2 text-xs text-neutral-500">No chapter function has been saved yet.</p>}
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">Recommended for Chapter {recommendation.forChapterNumber}</p>
              <p className="mt-1 text-sm font-semibold text-cyan-100">{chapterFunctionLabel[recommendation.recommendedFunction]}</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-400">{recommendation.reason}</p>
              <p className="mt-2 font-mono text-[10px] text-neutral-500">Weights: {CHAPTER_FUNCTIONS.map(type => `${type} ${recommendation.weights[type]}`).join(' · ')}{recommendation.blocked.length ? ` · blocked: ${recommendation.blocked.join(', ')}` : ''}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">Writer’s next-chapter possibilities{latestRhythmChapter ? ` (after Chapter ${latestRhythmChapter.chapterNumber})` : ''}</p>
              {suggestions ? (
                <ul className="mt-2 space-y-2">
                  {CHAPTER_FUNCTIONS.map(type => (
                    <li key={type} className={`rounded-lg border p-2 text-xs ${type === recommendation.recommendedFunction ? 'border-cyan-300/40 bg-cyan-400/[0.08] text-neutral-100' : 'border-white/10 text-neutral-300'}`}>
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">{chapterFunctionLabel[type]}{type === recommendation.recommendedFunction ? ' · favored' : ''}</span>
                      <p className="mt-1 leading-relaxed">{suggestions[type] ?? 'Not supplied for this chapter.'}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-xs text-neutral-500">The writer has not supplied next-chapter possibilities yet.</p>}
            </div>
          </div>
        ) : <p className="mt-2 text-xs text-neutral-500">The rhythm recommendation appears after the story is saved.</p>}
      </div>

      <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3" data-testid="harness-mission-reminder">
        <summary className="cursor-pointer text-sm font-medium text-neutral-200">Mission Reminder · from the equipped Author skill</summary>
        {missionReminder && 'error' in missionReminder
          ? <p className="mt-2 text-xs text-human">{missionReminder.error}</p>
          : <>
            <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">A brief reminder that the model is the author of this novel. Sourced from the Author portion of the CAPA Prompt; it performs no story analysis and is not sent to the provider yet.</p>
            <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-neutral-300">{missionReminder?.text ?? 'Equip an installed Author skill to see the Mission Reminder.'}</pre>
          </>}
      </details>
    </LibraryPanel>
  );
}

/** A saved "Previously On" recap with in-place author editing. Prose is never touched here. */
function ChapterRecapEditor({ chapter, busy, onSave }: { chapter: HarnessChapter; busy: boolean; onSave: (text: string) => Promise<void> }) {
  const [text, setText] = useState(chapter.recap?.text ?? '');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setText(chapter.recap?.text ?? ''); setEditing(false); setError(''); }, [chapter.id, chapter.recap?.updatedAt]);
  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs" data-testid={`harness-recap-${chapter.chapterNumber}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">Previously on · {chapter.recap ? `${chapter.recap.source === 'author' ? 'edited by author' : 'written by the chapter model'} · ${formatDate(chapter.recap.updatedAt)}` : 'no recap saved'}</p>
        {!editing && <LibraryButton type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(true)}>{chapter.recap ? 'Edit recap' : 'Write recap'}</LibraryButton>}
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea aria-label={`Chapter ${chapter.chapterNumber} recap`} value={text} disabled={busy} onChange={event => setText(event.target.value)}
            className="min-h-20 w-full rounded-lg border border-white/15 bg-black/35 p-2 text-sm text-white" />
          <div className="flex flex-wrap gap-2">
            <LibraryButton type="button" size="sm" disabled={busy} onClick={() => void (async () => {
              setError('');
              try { await onSave(text); setEditing(false); }
              catch (cause) { setError(cause instanceof Error ? cause.message : 'The recap could not be saved.'); }
            })()}>Save recap</LibraryButton>
            <LibraryButton type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { setText(chapter.recap?.text ?? ''); setEditing(false); setError(''); }}>Cancel</LibraryButton>
          </div>
          {error && <p role="alert" className="text-human">{error}</p>}
        </div>
      ) : chapter.recap ? <p className="mt-2 leading-relaxed text-neutral-300">{chapter.recap.text}</p> : null}
    </div>
  );
}

function SemanticEventList({ events }: { events: HarnessSemanticEvent[] }) {
  if (!events.length) return <p className="text-sm text-neutral-400">No semantic events were supplied for committed chapters.</p>;
  return (
    <ol className="space-y-3">
      {events.map(event => (
        <li key={event.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-sm leading-relaxed text-neutral-100">{event.description}</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-200/55">
            Chapter {event.chapterNumber} · {event.category ?? 'general narrative event'}
          </p>
          {event.subjects?.length ? <p className="mt-1 text-xs text-neutral-400">Subjects: {event.subjects.join(', ')}</p> : null}
          {event.evidence && <blockquote className="mt-2 border-l border-cyan-200/25 pl-3 text-xs text-neutral-400">{event.evidence}</blockquote>}
        </li>
      ))}
    </ol>
  );
}

function Diagnostics({ attempt }: { attempt?: HarnessGenerationAttempt }) {
  if (!attempt) return null;
  const usage = attempt.providerReceipt?.usage;
  return (
    <LibraryPanel as="section" padding="md" aria-labelledby="harness-diagnostics-title">
      <div className="flex items-center gap-2">
        <ListTree size={17} className="text-cyan-200" aria-hidden="true" />
        <h2 id="harness-diagnostics-title" className="font-display text-lg text-white">Diagnostics</h2>
      </div>
      <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="font-mono uppercase tracking-[0.14em] text-neutral-500">Provider</p>
          <p className="mt-1 text-neutral-200">{attempt.providerReceipt ? `${attempt.providerReceipt.provider} · ${attempt.providerReceipt.model}` : 'No provider receipt yet'}</p>
          {attempt.providerReceipt?.durationMs !== undefined && <p className="mt-1 text-neutral-400">{attempt.providerReceipt.durationMs} ms</p>}
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="font-mono uppercase tracking-[0.14em] text-neutral-500">Usage</p>
          <p className="mt-1 text-neutral-200">
            {usage ? `${usage.source} · ${usage.totalTokens ?? '—'} total tokens` : 'Unavailable'}
          </p>
          {usage?.inputTokens !== undefined && <p className="mt-1 text-neutral-400">{usage.inputTokens} input · {usage.outputTokens ?? '—'} output</p>}
        </div>
      </div>
      {attempt.warnings.length > 0 && (
        <div className="mt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold-accent">Warnings and recoveries</p>
          <ul className="mt-2 space-y-2 text-xs leading-relaxed text-neutral-300">
            {attempt.warnings.map((warning, index) => <li key={`${warning.code}-${index}`}>• {warning.message}</li>)}
          </ul>
        </div>
      )}
      {attempt.rejectedEvents?.length ? (
        <div className="mt-4 rounded-xl border border-human/25 bg-human-brand/10 p-3 text-xs text-neutral-300">
          <p className="font-medium text-human">Rejected optional events</p>
          <ul className="mt-2 space-y-1">
            {attempt.rejectedEvents.map(event => <li key={`${event.index}-${event.reason}`}>Event {event.index + 1}: {event.reason}</li>)}
          </ul>
        </div>
      ) : null}
      <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-xs font-medium text-neutral-200">Frozen CAPA Prompt</summary>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-neutral-400">{attempt.capaPrompt.text}</pre>
      </details>
      <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-xs font-medium text-neutral-200">Frozen Mission Reminder · not in the provider request</summary>
        <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">Sourced from {attempt.missionReminder.sourceSkill.name} v{attempt.missionReminder.sourceSkill.version}. Kept beside the attempt for later packet assembly.</p>
        <pre className="mt-3 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-neutral-400">{attempt.missionReminder.text}</pre>
      </details>
      <details className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.03] p-3">
        <summary className="cursor-pointer text-xs font-medium text-emerald-100">Frozen Media Loadout · runtime only</summary>
        <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">This catalog snapshot is stored beside the attempt. It is absent from the CAPA Prompt, Story Information Packet, and provider request.</p>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-neutral-400">{JSON.stringify(attempt.mediaLoadout, null, 2)}</pre>
      </details>
      <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-xs font-medium text-neutral-200">Frozen Story Information Packet</summary>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-neutral-400">{JSON.stringify(attempt.storyInformation, null, 2)}</pre>
      </details>
      <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-xs font-medium text-neutral-200">Immediate Chapter Request</summary>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-neutral-400">{JSON.stringify(attempt.immediateChapterRequest, null, 2)}</pre>
      </details>
      {attempt.rawProviderResponse && (
        <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <summary className="cursor-pointer text-xs font-medium text-neutral-200">Raw provider response</summary>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-neutral-400">{attempt.rawProviderResponse}</pre>
        </details>
      )}
    </LibraryPanel>
  );
}

function HarnessInspection({
  state,
  story,
  attempt,
  busy,
  onReplay,
  onRecover,
  onCorrection,
}: {
  state: HarnessWorkspaceState;
  story: HarnessStory;
  attempt?: HarnessGenerationAttempt;
  busy: boolean;
  onReplay: () => void;
  onRecover: (chapterId: string) => void;
  onCorrection: (input: {
    kind: HarnessCorrectionKind;
    reason: string;
    targetRecordIds?: string[];
    referenceLabel?: string;
    resolvedRecordId?: string;
    replacement?: { kind: 'narrative-event'; evidence: string; facts: { description: string } };
  }) => void;
}) {
  const view = buildCanonicalStoryView(state, story.id);
  const receipts = state.capabilityReceipts.filter(receipt => receipt.storyId === story.id && receipt.status !== 'superseded');
  const projections = state.projections.filter(projection => projection.storyId === story.id);
  const [correctionKind, setCorrectionKind] = useState<HarnessCorrectionKind>('resolve-entity');
  const [correctionReason, setCorrectionReason] = useState('');
  const [targetRecordId, setTargetRecordId] = useState('');
  const [referenceLabel, setReferenceLabel] = useState('');
  const [resolvedRecordId, setResolvedRecordId] = useState('');
  const [replacementEvidence, setReplacementEvidence] = useState('');
  useEffect(() => {
    setCorrectionReason('');
    setTargetRecordId('');
    setReferenceLabel('');
    setResolvedRecordId('');
    setReplacementEvidence('');
  }, [story.id]);

  const groups = [
    ['Characters', view.characters], ['Relationships', view.relationships], ['Locations and world', view.locations],
    ['Factions', view.factions], ['Plot threads', view.threads], ['Mysteries', view.mysteries],
    ['Timeline', view.timeline], ['Artifacts', view.artifacts], ['Progression', view.progression],
    ['General fallback events', view.narrativeEvents],
  ] as const;

  return (
    <LibraryPanel as="section" padding="md" aria-labelledby="harness-state-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200/55">Deterministic story harness</p>
          <h2 id="harness-state-title" className="mt-1 font-display text-xl text-white">Canonical state and projections</h2>
        </div>
        <LibraryButton type="button" size="sm" variant="secondary" icon={RefreshCcw} onClick={onReplay} loading={busy}>Replay committed events</LibraryButton>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-neutral-400">These records are replayable views over committed evidence. They never replace chapter prose or original events.</p>
      <div className="mt-3 space-y-3">
        {state.chapters.filter(chapter => chapter.storyId === story.id).map(chapter => {
          const chapterAttempt = state.attempts.find(entry => entry.id === chapter.attemptId);
          const recovery = state.memoryRecoveries?.filter(entry => entry.chapterId === chapter.id).at(-1);
          return <div key={chapter.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-3 text-xs">
            <div><p className="text-neutral-200">Chapter {chapter.chapterNumber}: prose saved · {chapterAttempt?.postCommitProcessing === 'complete' ? 'memory interpreted' : 'memory interpretation incomplete'}</p>
              {recovery && <p className="mt-1 text-neutral-400">Memory recovery: {recovery.status.replace(/_/g, ' ')}{recovery.failure ? ` · ${recovery.failure}` : ''}</p>}
            </div>
            <LibraryButton type="button" size="sm" variant="secondary" disabled={busy} onClick={() => onRecover(chapter.id)}>Recover memory from saved prose</LibraryButton>
            {recovery?.rawProviderResponse && <details className="w-full min-w-0"><summary className="cursor-pointer text-neutral-400">Saved memory extraction</summary><pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-neutral-400">{recovery.rawProviderResponse}</pre></details>}
          </div>;
        })}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {groups.map(([label, records]) => (
          <details key={label} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <summary className="cursor-pointer text-sm font-medium text-neutral-200">{label} <span className="text-neutral-500">({records.length})</span></summary>
            {records.length ? <ul className="mt-3 space-y-2 text-xs text-neutral-300">{records.map(record => (
              <li key={record.id} className="rounded-lg border border-white/5 p-2">
                <span className="font-medium text-white">{record.label ?? String(record.facts.description ?? record.kind)}</span>
                <span className="ml-2 text-neutral-500">{record.confidence}</span>
                <p className="mt-1 text-neutral-400">{record.evidence}</p>
                <p className="mt-1 text-neutral-500">{record.sourceFoundationRevisionId ? 'Foundation identity' : `Chapter ${state.chapters.find(chapter => chapter.id === record.chapterId)?.chapterNumber ?? 'unknown'} evidence`}</p>
                {Object.entries(record.facts).filter(([key]) => key !== 'description').map(([key, value]) => <p key={key} className="mt-1 text-neutral-400">{key}: {Array.isArray(value) ? value.join(', ') : String(value ?? '')}</p>)}
              </li>
            ))}</ul> : <p className="mt-3 text-xs text-neutral-500">No committed evidence in this view.</p>}
          </details>
        ))}
      </div>

      <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-sm font-medium text-neutral-200">Capability receipts and replay status ({receipts.length})</summary>
        <ul className="mt-3 space-y-2 text-xs text-neutral-300">{receipts.map(receipt => (
          <li key={receipt.id}>{receipt.capabilityId} {receipt.capabilityVersion} · {receipt.status} · replay {receipt.replayCount}
            {receipt.warnings.map(warning => <p key={warning} className="mt-1 text-gold-accent">{warning}</p>)}
          </li>
        ))}</ul>
      </details>
      <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-sm font-medium text-neutral-200">Unresolved references and conflicts ({view.unresolvedReferences.length + view.conflicts.length})</summary>
        <ul className="mt-3 space-y-2 text-xs text-neutral-300">
          {view.unresolvedReferences.map((reference, index) => <li key={`${reference.label}-${index}`}>{reference.label}: {reference.reason}</li>)}
          {view.conflicts.map(record => <li key={record.id}>{record.label ?? record.id}: conflicting canonical evidence</li>)}
        </ul>
      </details>
      <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-sm font-medium text-neutral-200">Codex candidates and System intents ({projections.length})</summary>
        <ul className="mt-3 space-y-2 text-xs text-neutral-300">{projections.map(item => (
          <li key={item.id}><span className="text-white">{item.kind}</span> · {item.status} — {item.explanation}</li>
        ))}</ul>
      </details>
      <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3" data-testid="harness-packet-diagnostics">
        <summary className="cursor-pointer text-sm font-medium text-neutral-200">Generation packet budget and diagnostics</summary>
        <p className="mt-2 text-xs leading-relaxed text-neutral-500">
          Centralized {GENERATION_PACKET_BUDGET.source.replace(/-/g, ' ')} budgets. Protected sections are never removed; canonical state is selected by relevance to the current arc, request, cast, and recent chapters. This audit stays in HARNESS and never enters the provider request.
        </p>
        {attempt ? (
          <>
            <table className="mt-3 w-full text-left text-xs text-neutral-300">
              <thead><tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500"><th className="pr-2">Section</th><th className="pr-2">Estimated tokens</th><th className="pr-2">Budget</th><th className="pr-2">Sent characters</th></tr></thead>
              <tbody>
                {PACKET_SECTION_ORDER.map(section => {
                  const measured = attempt.storyInformation.diagnostics.sections.find(item => item.section === section);
                  const budget = GENERATION_PACKET_BUDGET.sections[section];
                  const sent = attempt.requestMeasurement?.sections.find(item => item.section === section)?.characters;
                  return <tr key={section} className={measured?.overBudget ? 'text-amber-200' : ''}>
                    <td className="pr-2 py-1">{section}{budget.protected ? ' · protected' : ''}</td>
                    <td className="pr-2 py-1">{measured ? measured.estimatedTokens.toLocaleString() : section === 'capaPrompt' ? attempt.capaPrompt.estimatedTokens.toLocaleString() : '—'}</td>
                    <td className="pr-2 py-1">{'tokens' in budget ? budget.tokens.toLocaleString() : 'none'}</td>
                    <td className="pr-2 py-1">{sent !== undefined ? sent.toLocaleString() : '—'}</td>
                  </tr>;
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-neutral-300">
              {attempt.requestMeasurement
                ? `Serialized provider request: ${attempt.requestMeasurement.totalCharacters.toLocaleString()} characters (${attempt.requestMeasurement.systemInstructionCharacters.toLocaleString()} system · ${attempt.requestMeasurement.userPromptCharacters.toLocaleString()} user · ${attempt.requestMeasurement.responseSchemaCharacters.toLocaleString()} schema) ≈ ${attempt.requestMeasurement.estimatedTokens.toLocaleString()} tokens of a ${GENERATION_PACKET_BUDGET.requestTokens.toLocaleString()} soft ceiling.`
                : 'The serialized request size arrives with the provider response.'}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Storage: {attempt.storyInformation.diagnostics.storage.chapters} chapters · {attempt.storyInformation.diagnostics.storage.events} events · {attempt.storyInformation.diagnostics.storage.canonicalRecords} canonical records ({attempt.storyInformation.diagnostics.storage.activeRecords} active) · {attempt.storyInformation.diagnostics.storage.recaps} recaps.
            </p>
            {attempt.storyInformation.diagnostics.identityAmbiguities.length > 0 && <div className="mt-3">
              <p className="font-mono text-[10px] uppercase text-gold-accent">Probable near-duplicate identities (kept apart)</p>
              <ul className="mt-2 space-y-1 text-xs text-neutral-400">{attempt.storyInformation.diagnostics.identityAmbiguities.map((item, index) => <li key={`${item.kind}-${index}`}>{item.kind}: {item.labels.join(' / ')} · {item.reason}</li>)}</ul>
            </div>}
            <div className="mt-3">
              <p className="font-mono text-[10px] uppercase text-neutral-500">Omitted or compacted ({attempt.storyInformation.diagnostics.omitted.length})</p>
              <ul className="mt-2 space-y-1 text-xs text-neutral-500">{attempt.storyInformation.diagnostics.omitted.map((item, index) => <li key={`${item.section}-${index}`}>{item.section} · {item.label} · {item.reason}</li>)}</ul>
            </div>
          </>
        ) : <p className="mt-3 text-xs text-neutral-500">Diagnostics appear with the first chapter attempt.</p>}
      </details>

      <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-sm font-medium text-neutral-200">Author corrections ({view.corrections.length})</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select className="min-w-0 w-full rounded-lg border border-white/15 bg-black/35 p-2 text-sm text-white" value={correctionKind} onChange={event => setCorrectionKind(event.target.value as HarnessCorrectionKind)}>
            <option value="resolve-entity">Resolve ambiguous entity</option><option value="correct-fact">Correct fact</option><option value="mark-incorrect">Mark incorrect</option><option value="add-missing-fact">Add missing fact</option><option value="supersede-interpretation">Supersede interpretation</option>
          </select>
          <select className="min-w-0 w-full rounded-lg border border-white/15 bg-black/35 p-2 text-sm text-white" value={targetRecordId} onChange={event => setTargetRecordId(event.target.value)}><option value="">No target record</option>{view.records.map(record => <option key={record.id} value={record.id}>{record.label ?? record.kind}</option>)}</select>
          {correctionKind === 'resolve-entity' && <><input className="min-w-0 w-full rounded-lg border border-white/15 bg-black/35 p-2 text-sm text-white" placeholder="Ambiguous label" value={referenceLabel} onChange={event => setReferenceLabel(event.target.value)} /><select className="min-w-0 w-full rounded-lg border border-white/15 bg-black/35 p-2 text-sm text-white" value={resolvedRecordId} onChange={event => setResolvedRecordId(event.target.value)}><option value="">Choose resolved character</option>{view.characters.map(record => <option key={record.id} value={record.id}>{record.label}</option>)}</select></>}
          {['correct-fact', 'add-missing-fact', 'supersede-interpretation'].includes(correctionKind) && <textarea className="min-h-20 rounded-lg border border-white/15 bg-black/35 p-2 text-sm text-white sm:col-span-2" placeholder="Explicit replacement fact or evidence" value={replacementEvidence} onChange={event => setReplacementEvidence(event.target.value)} />}
          <textarea className="min-h-20 rounded-lg border border-white/15 bg-black/35 p-2 text-sm text-white sm:col-span-2" placeholder="Reason for correction" value={correctionReason} onChange={event => setCorrectionReason(event.target.value)} />
        </div>
        <div className="mt-3"><LibraryButton type="button" size="sm" onClick={() => onCorrection({
          kind: correctionKind, reason: correctionReason, ...(targetRecordId ? { targetRecordIds: [targetRecordId] } : {}),
          ...(referenceLabel ? { referenceLabel } : {}), ...(resolvedRecordId ? { resolvedRecordId } : {}),
          ...(replacementEvidence ? { replacement: { kind: 'narrative-event', evidence: replacementEvidence, facts: { description: replacementEvidence } } } : {}),
        })} disabled={busy}>Append correction</LibraryButton></div>
      </details>
    </LibraryPanel>
  );
}

export function HarnessGenerationWorkspace({
  repository: injectedRepository,
  modelAdapter: injectedAdapter,
  storySeedSource,
  installedSkills = EMPTY_INSTALLED_SKILLS,
  renderSkillImport,
  renderSlotSkillImport,
  registeredMediaPacks = EMPTY_MEDIA_PACKS,
  baseMedia,
  mediaPackEntitlements = EMPTY_MEDIA_ENTITLEMENTS,
  onGrantDevelopmentMediaReward,
  preferredModel,
  onModelChange,
  readerStateRepository,
  readingStoryId,
  onReadingStoryChange,
}: HarnessGenerationWorkspaceProps) {
  const availableSkills = useMemo(
    () => includeBundledHarnessSkills(installedSkills),
    [installedSkills],
  );
  const repository = injectedRepository;
  const modelAdapter = injectedAdapter;
  const controller = useMemo(
    () => new HarnessGenerationController({ repository, modelAdapter, media: createLibraryMediaPort({ registered: registeredMediaPacks, entitlements: mediaPackEntitlements, base: baseMedia }) }),
    [repository, modelAdapter],
  );
  useEffect(() => controller.setInstalledSkills(installedSkills), [controller, installedSkills]);
  useEffect(() => controller.setMediaPort(createLibraryMediaPort({ registered: registeredMediaPacks, entitlements: mediaPackEntitlements, base: baseMedia })), [controller, registeredMediaPacks, mediaPackEntitlements, baseMedia]);
  const [state, setState] = useState<HarnessWorkspaceState>();
  const [serverInfo, setServerInfo] = useState<HarnessGenerationServerInfo>();
  const [selectedStoryId, setSelectedStoryId] = useState<string>();
  const [foundationForm, setFoundationForm] = useState<StoryFoundationInput>(emptyFoundation);
  const [model, setModel] = useState('');
  const [batchCount, setBatchCount] = useState('');
  const [direction, setDirection] = useState('');
  const [reviseHistory, setReviseHistory] = useState(false);
  const [internalReadingStoryId, setInternalReadingStoryId] = useState<string>();
  const openReadingStoryId = onReadingStoryChange ? readingStoryId : internalReadingStoryId;
  const setReadingStoryId = onReadingStoryChange ?? setInternalReadingStoryId;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [foundationError, setFoundationError] = useState<string>();
  const [storySeedOptions, setStorySeedOptions] = useState<HarnessStorySeedOption[]>([]);
  const [storySeedLoading, setStorySeedLoading] = useState(Boolean(storySeedSource));
  const [storySeedError, setStorySeedError] = useState<string>();
  const [manualStart, setManualStart] = useState(!storySeedSource);

  const loadStorySeeds = useCallback(async () => {
    if (!storySeedSource) return;
    setStorySeedLoading(true);
    setStorySeedError(undefined);
    try {
      setStorySeedOptions(await storySeedSource.list());
    } catch (error) {
      setStorySeedError(error instanceof Error ? error.message : 'Saved Story Seeds could not be loaded.');
    } finally {
      setStorySeedLoading(false);
    }
  }, [storySeedSource]);

  useEffect(() => {
    let active = true;
    const unsubscribe = controller.subscribe(snapshot => {
      if (active) setState(snapshot);
    });
    void controller.hydrate()
      .catch(error => active && setMessage(error instanceof Error ? error.message : 'Harness Generation could not open local storage.'));
    void modelAdapter.getServerInfo()
      .then(info => {
        if (!active) return;
        setServerInfo(info);
        setModel(current => current || info.defaultModel);
      })
      .catch(error => active && setMessage(error instanceof Error ? error.message : 'Harness Generation could not load provider configuration.'));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [controller, modelAdapter]);

  // Follow the host's remembered choice (the Model Router) whenever the server offers it.
  useEffect(() => {
    if (preferredModel && serverInfo?.models.some(option => option.id === preferredModel)) setModel(preferredModel);
  }, [preferredModel, serverInfo]);

  useEffect(() => {
    void loadStorySeeds();
  }, [loadStorySeeds]);

  const selectedStory = state && selectedStoryId ? findStory(state, selectedStoryId) : undefined;
  useEffect(() => {
    setDirection('');
    setReviseHistory(false);
  }, [selectedStory?.id]);

  const selectedFoundation = state && selectedStory
    ? findFoundationRevision(state, selectedStory.activeFoundationRevisionId)
    : undefined;
  const chapters = state && selectedStory ? storyChapters(state, selectedStory.id) : [];
  const events = state && selectedStory ? storyEvents(state, selectedStory.id) : [];
  const attempt = state && selectedStory ? latestAttemptForStory(state, selectedStory.id) : undefined;
  const arcPlanOperation = state && selectedStory ? state.arcPlanOperations
    .filter(operation => operation.storyId === selectedStory.id && ['provider_outcome_unknown', 'failed'].includes(operation.status)).at(-1) : undefined;
  const batch = state && selectedStory ? state.batches
    .filter(entry => entry.storyId === selectedStory.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] : undefined;
  const visibleEvents = [
    ...events,
    ...(attempt && attempt.stage !== 'committed' ? attempt.preservedEvents ?? [] : []),
  ];

  useEffect(() => {
    if (!state) return;
    if (selectedStoryId && state.stories.some(story => story.id === selectedStoryId)) return;
    setSelectedStoryId(state.stories[0]?.id);
  }, [state, selectedStoryId]);

  useEffect(() => {
    setFoundationForm(selectedFoundation?.input ?? emptyFoundation());
    setFoundationError(undefined);
  }, [selectedFoundation?.id]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setMessage(undefined);
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Harness Generation could not complete that action.');
    } finally {
      setBusy(false);
    }
  };

  const saveFoundation = () => {
    setFoundationError(undefined);
    void run(async () => {
      try {
        if (selectedStory) {
          await controller.saveFoundationRevision(selectedStory.id, foundationForm);
        } else {
          const created = await controller.createStory(foundationForm);
          setSelectedStoryId(created.id);
        }
      } catch (error) {
        const next = error instanceof Error ? error.message : 'The Story Foundation could not be saved.';
        setFoundationError(next);
        throw error;
      }
    });
  };

  const startFromStorySeed = (option: HarnessStorySeedOption) => {
    void run(async () => {
      const created = await controller.createStory(
        option.foundation,
        option.originalLanguage,
        option.initialSkillLoadout,
      );
      setSelectedStoryId(created.id);
      setManualStart(false);
    });
  };

  const generate = () => {
    if (!selectedStory) {
      setMessage('Create or open a Harness story before generating a chapter.');
      return;
    }
    void run(() => controller.generateNextChapter(selectedStory.id, model));
  };
  const setSkillSlot = (slot: HarnessSkillSlotId, reference?: HarnessSkillReference) => {
    if (!selectedStory) return;
    void run(() => controller.setSkillSlot(selectedStory.id, slot, reference));
  };
  /**
   * Equips a skill the host has just installed from its slot. The catalog is
   * refreshed first so the new manifest resolves in the same interaction, and
   * the error is rethrown so the slot's importer reports it.
   */
  const equipInstalledSkill = async (slot: HarnessSkillSlotId, skill: HarnessSkillManifest) => {
    if (!selectedStory) throw new Error('Open a Harness story before equipping a skill.');
    setBusy(true);
    setMessage(undefined);
    try {
      controller.setInstalledSkills([...installedSkills.filter(item => harnessSkillKey(item) !== harnessSkillKey(skill)), skill]);
      await controller.setSkillSlot(selectedStory.id, slot, { id: skill.id, version: skill.version });
    } finally {
      setBusy(false);
    }
  };
  const setMediaLoadoutSlot = (slot: StoryMediaLoadoutSlot, reference?: MediaPackReference) => {
    if (!selectedStory) return;
    void run(() => controller.setMediaSelection(selectedStory.id, slot, reference));
  };
  const grantDevelopmentMediaReward = (reference: MediaPackReference) => {
    if (!onGrantDevelopmentMediaReward) return;
    void run(() => Promise.resolve(onGrantDevelopmentMediaReward(reference)));
  };

  const retryStage = () => {
    if (!attempt) return;
    void run(() => controller.retryAppropriateStage(attempt.id));
  };

  const retryModel = () => {
    if (!attempt) return;
    void run(() => controller.retryModelRequest(attempt.id));
  };
  const retryArcPlan = () => selectedStory && void run(() => controller.retryArcPlan(selectedStory.id, model));
  const saveHardPins = async (pins: HardPinInput[]) => {
    if (!selectedStory) return;
    setBusy(true);
    setMessage(undefined);
    try { await controller.setHardPins(selectedStory.id, pins); }
    finally { setBusy(false); }
  };
  const editArcPlan = async (plan: Parameters<typeof controller.editArcGoals>[1]) => {
    if (!selectedStory) return;
    setBusy(true);
    setMessage(undefined);
    try { await controller.editArcGoals(selectedStory.id, plan); }
    finally { setBusy(false); }
  };
  const saveRecap = async (chapterId: string, text: string) => {
    setBusy(true);
    setMessage(undefined);
    try { await controller.editChapterRecap(chapterId, text); }
    finally { setBusy(false); }
  };
  const missionReminder = useMemo<HarnessMissionReminder | { error: string } | undefined>(() => {
    if (!state || !selectedStory) return undefined;
    try { return controller.describeMissionReminder(selectedStory.id); }
    catch (error) { return { error: error instanceof Error ? error.message : 'The Mission Reminder is unavailable.' }; }
  }, [controller, state, selectedStory]);

  const replay = () => selectedStory && void run(() => controller.replayStory(selectedStory.id));
  const addCorrection = (input: Parameters<typeof controller.addCorrection>[1]) => {
    if (!selectedStory) return;
    void run(() => controller.addCorrection(selectedStory.id, input));
  };
  const startBatch = () => {
    if (!selectedStory) return;
    void run(() => controller.startBatch(selectedStory.id, model, Number(batchCount)));
  };
  const pauseBatch = () => {
    if (!batch) return;
    setMessage(undefined);
    void controller.requestBatchPause(batch.id).catch(error => setMessage(error instanceof Error ? error.message : 'The batch could not be paused.'));
  };
  const resumeBatch = () => batch && void run(() => controller.resumeBatch(batch.id));
  const retryBatch = () => batch && void run(() => controller.retryBatchChapter(batch.id));

  const download = () => {
    if (!state || !selectedStory) return;
    try {
      const archive = exportHarnessStory(state, selectedStory.id);
      const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${selectedStory.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'harness-story'}.json`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Harness story export failed.');
    }
  };

  const generationAvailable = Boolean(selectedStory && serverInfo?.configured && model && !busy);

  const readingStory = state && openReadingStoryId ? findStory(state, openReadingStoryId) : undefined;
  if (state && readingStory) return <HarnessReaderSession key={readingStory.id} state={state} storyId={readingStory.id}
    controller={controller} installedSkills={availableSkills} readerStateRepository={readerStateRepository}
    onClose={() => { setSelectedStoryId(readingStory.id); setReadingStoryId(undefined); }} />;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 sm:pt-6" data-testid="harness-generation-workspace">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-200/55">Deterministic story harness · Phases 3–4</p>
          <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">Harness Generation</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400">
            One model call writes each chapter. Deterministic capabilities preserve canon, continuity, provenance, and recoverable projections around the committed prose.
          </p>
        </div>
        {selectedStory && (
          <LibraryButton type="button" variant="ghost" icon={Download} onClick={download} disabled={busy}>
            Export local story
          </LibraryButton>
        )}
      </header>

      {message && (
        <div role="alert" className="mb-5 flex gap-2 rounded-xl border border-human/35 bg-human-brand/10 px-4 py-3 text-sm leading-relaxed text-human">
          <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      {!state ? (
        <LibraryPanel className="flex min-h-64 items-center justify-center gap-3" padding="lg">
          <LoaderCircle className="animate-spin text-cyan-200 motion-reduce:animate-none" aria-hidden="true" />
          <span className="text-sm text-neutral-300">Opening feature-owned local story storage…</span>
        </LibraryPanel>
      ) : (
        <div className="min-w-0 grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="min-w-0 space-y-4">
            <LibraryPanel as="section" padding="sm" aria-label="Harness stories">
              <div className="flex items-center justify-between gap-2 px-1 pb-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Local stories</p>
                  <p className="mt-1 text-sm text-neutral-300">{state.stories.length} durable {state.stories.length === 1 ? 'story' : 'stories'}</p>
                </div>
                <LibraryButton
                  type="button"
                  variant="ghost"
                  size="icon"
                  icon={Plus}
                  aria-label="Create a new Harness story"
                  onClick={() => {
                    setSelectedStoryId(undefined);
                    setFoundationForm(emptyFoundation());
                    setFoundationError(undefined);
                    setMessage(undefined);
                    setManualStart(!storySeedSource);
                  }}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                {state.stories.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-xs leading-relaxed text-neutral-500">Choose a saved Story Seed to begin. The resulting story stays independently durable in Harness storage.</p>
                ) : state.stories.map(story => {
                  const selected = story.id === selectedStoryId;
                  return (
                    <button
                      key={story.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedStoryId(story.id)}
                      className={`min-w-0 max-w-full w-full rounded-xl border px-3 py-3 text-left transition-colors ${selected ? 'border-cyan-300/35 bg-cyan-400/10 text-white' : 'border-white/10 bg-black/10 text-neutral-300 hover:border-white/25 hover:bg-white/[0.04]'}`}
                    >
                      <span className="block truncate text-sm font-medium">{story.title}</span>
                      <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">Next: Chapter {story.head.nextChapterNumber}</span>
                    </button>
                  );
                })}
              </div>
            </LibraryPanel>
            {selectedStory && <AttemptStatus attempt={attempt} busy={busy} onRetryStage={retryStage} onRetryModel={retryModel} />}
            {arcPlanOperation && (
              <LibraryPanel variant="callout" padding="sm" aria-live="polite">
                <p className="text-sm font-medium text-white">Arc planning needs an explicit retry</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-400">{arcPlanOperation.failure ?? 'The previous Arc planning provider outcome is unknown.'}</p>
                <LibraryButton type="button" size="sm" variant="secondary" icon={RefreshCcw} className="mt-3" onClick={retryArcPlan} loading={busy}>
                  Explicitly retry Arc planning
                </LibraryButton>
              </LibraryPanel>
            )}
          </aside>

          <div className="min-w-0 space-y-5">
            {!selectedStory && storySeedSource && !manualStart && (
              <StorySeedStart
                options={storySeedOptions}
                loading={storySeedLoading}
                error={storySeedError}
                busy={busy}
                manageHref={storySeedSource.manageHref}
                onRefresh={() => void loadStorySeeds()}
                onSelect={startFromStorySeed}
                onManual={() => setManualStart(true)}
              />
            )}

            {!selectedStory && (!storySeedSource || manualStart) && (
              <>
                {storySeedSource && (
                  <LibraryButton type="button" size="sm" variant="ghost" onClick={() => setManualStart(false)}>
                    Back to saved Story Seeds
                  </LibraryButton>
                )}
                <StoryFoundationEditor createIcon={SENManifestingIcon}
                  form={foundationForm}
                  busy={busy}
                  error={foundationError}
                  onChange={setFoundationForm}
                  onSubmit={saveFoundation}
                />
              </>
            )}

            {selectedStory && (
              <StoryDirectionPanel
                story={selectedStory}
                foundation={selectedFoundation}
                chapters={chapters}
                generatedThrough={chapters.at(-1)?.chapterNumber ?? 0}
                missionReminder={missionReminder}
                busy={busy}
                onSaveHardPins={saveHardPins}
                onEditPlan={editArcPlan}
              />
            )}

            {renderSkillImport?.(busy)}
            {selectedStory && (
              <SkillLoadoutPanel
                story={selectedStory}
                installedSkills={availableSkills}
                busy={busy}
                onChange={setSkillSlot}
                renderSlotSkillImport={renderSlotSkillImport}
                onInstalled={equipInstalledSkill}
              />
            )}

            {selectedStory && (
              <MediaLoadoutPanel
                story={selectedStory}
                packs={registeredMediaPacks}
                entitlements={mediaPackEntitlements}
                busy={busy}
                onGrant={onGrantDevelopmentMediaReward ? grantDevelopmentMediaReward : undefined}
                onChange={setMediaLoadoutSlot}
              />
            )}

            {selectedStory && (
              <LibraryPanel as="section" padding="md" aria-labelledby="harness-generate-title">
                <div className="mb-5 space-y-3">
                  <label className="block text-sm text-neutral-300" htmlFor="harness-direction">Story direction</label>
                  <textarea id="harness-direction" value={direction} onChange={event => setDirection(event.target.value)} disabled={busy}
                    placeholder="Make the planned enemy an ally. Keep the consequences of their earlier actions."
                    className="min-h-24 w-full rounded-lg border border-white/15 bg-black/35 p-3 text-sm text-white" />
                  <label className="flex min-h-11 items-center gap-2 text-xs text-neutral-400">
                    <input type="checkbox" checked={reviseHistory} onChange={event => setReviseHistory(event.target.checked)} disabled={busy} />
                    This direction explicitly revises past history
                  </label>
                  <LibraryButton type="button" size="sm" disabled={busy || !direction.trim()} onClick={() => void run(async () => {
                    await controller.steerStory(selectedStory.id, direction, reviseHistory ? 'revise-history' : 'future');
                    setDirection(''); setReviseHistory(false);
                  })}>Save direction</LibraryButton>
                  {selectedStory.steering?.at(-1) && <p className="text-sm text-neutral-300">Latest direction: {selectedStory.steering.at(-1)!.direction}</p>}
                </div>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200/55">One-call generation</p>
                    <h2 id="harness-generate-title" className="mt-1 font-display text-xl text-white">Generate Chapter {selectedStory.head.nextChapterNumber}</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-400">
                      The provider receives the frozen Foundation revision and the visible, audited selection of committed prose, corrections, and canonical evidence.
                    </p>
                  </div>
                  <div className="min-w-52">
                    <label className="block font-sc text-xs uppercase tracking-widest text-neutral-400" htmlFor="harness-generation-model">Provider model</label>
                    <select
                      id="harness-generation-model"
                      className="mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-black/35 px-3 text-sm text-neutral-100 outline-none focus:border-cyan-300/60"
                      value={model}
                      onChange={event => { setModel(event.target.value); onModelChange?.(event.target.value); }}
                      disabled={busy || !serverInfo?.models.length}
                    >
                      {(serverInfo?.models ?? []).map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                    {serverInfo ? (
                      <p className={`mt-2 text-xs ${serverInfo.configured ? 'text-neutral-500' : 'text-human'}`}>
                        {serverInfo.configured ? 'Server-side provider configured.' : 'No server-side model provider key is configured.'}
                      </p>
                    ) : <p className="mt-2 text-xs text-neutral-500">Checking provider configuration…</p>}
                  </div>
                </div>
                <div className="mt-5">
                  <ManifestButton
                    type="button"
                    icon={SENManifestingIcon}
                    onClick={generate}
                    disabled={!generationAvailable}
                    loading={busy}
                  >
                    Generate Next Chapter
                  </ManifestButton>
                </div>
                <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="min-w-48 text-xs text-neutral-400" htmlFor="harness-batch-count">Sequential batch chapter count
                      <input id="harness-batch-count" type="number" min="1" placeholder="Choose a count" value={batchCount} onChange={event => setBatchCount(event.target.value)} disabled={busy}
                        className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-black/35 px-3 text-sm text-white" />
                    </label>
                    <LibraryButton type="button" size="sm" icon={Play} onClick={startBatch} disabled={!generationAvailable || !batchCount}>Start sequential batch</LibraryButton>
                    {batch?.status === 'running' || batch?.status === 'pause_requested' ? <LibraryButton type="button" size="sm" variant="secondary" icon={Pause} onClick={pauseBatch} disabled={batch.status === 'pause_requested'}>Pause after active call</LibraryButton> : null}
                    {batch?.status === 'paused' && <LibraryButton type="button" size="sm" icon={Play} onClick={resumeBatch} loading={busy}>Resume batch</LibraryButton>}
                    {batch && ['failed', 'provider_outcome_unknown'].includes(batch.status) && <LibraryButton type="button" size="sm" variant="secondary" icon={RefreshCcw} onClick={retryBatch} loading={busy}>{batch.status === 'provider_outcome_unknown' ? 'Explicitly retry unknown call' : 'Retry failed batch chapter'}</LibraryButton>}
                  </div>
                  {batch && <p className="mt-3 text-xs text-neutral-400">Batch {batch.status.replace(/_/g, ' ')} · {batch.completedChapterIds.length}/{batch.requestedChapterCount} committed · usage: {batch.usage.reportedCalls} reported, {batch.usage.estimatedCalls} estimated, {batch.usage.unavailableCalls} unavailable calls</p>}
                  {batch?.failure && <p className="mt-2 text-xs text-human">{batch.failure}</p>}
                </div>
              </LibraryPanel>
            )}

            {selectedStory && (
              <details className="rounded-xl border border-white/10 bg-black/15 p-3">
                <summary className="cursor-pointer text-sm font-medium text-neutral-300">Foundation snapshot and revisions</summary>
                <div className="mt-3">
                  <StoryFoundationEditor createIcon={SENManifestingIcon}
                    form={foundationForm}
                    story={selectedStory}
                    busy={busy}
                    error={foundationError}
                    onChange={setFoundationForm}
                    onSubmit={saveFoundation}
                  />
                </div>
              </details>
            )}

            {selectedStory && chapters.length > 0 && (
              <LibraryPanel as="section" padding="md" aria-labelledby="harness-chapters-title">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-cyan-200" aria-hidden="true" />
                  <h2 id="harness-chapters-title" className="font-display text-xl text-white">Committed chapters</h2>
                  <LibraryButton type="button" size="sm" onClick={() => setReadingStoryId(selectedStory.id)}>Open in SEN</LibraryButton>
                </div>
                <div className="mt-5 space-y-5">
                  {chapters.map(chapter => (
                    <article key={chapter.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200/55">Chapter {chapter.chapterNumber} · {chapter.responseMode === 'plain-prose-recovery' ? 'plain prose recovery' : 'structured response'}</p>
                      <h3 className="mt-2 font-display text-xl text-white">{chapter.title}</h3>
                      {/* Chapter scale and structure stay visible: a short or unstructured chapter is kept and flagged, never discarded. */}
                      <p className={`mt-1 font-mono text-[10px] uppercase tracking-[0.16em] ${chapter.metrics.meetsScaleTarget ? 'text-neutral-500' : 'text-amber-200/70'}`}>
                        {chapter.metrics.wordCount.toLocaleString()} words · {chapter.metrics.paragraphCount.toLocaleString()} paragraphs · {chapter.blocks?.length.toLocaleString() ?? '0'} blocks
                        {chapter.metrics.meetsScaleTarget ? '' : ' · below chapter-scale target'}
                      </p>
                      <LibraryButton type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void run(() => controller.replayStory(selectedStory.id, chapter.id))}>Repair chapter enhancements</LibraryButton>
                      <ChapterRecapEditor chapter={chapter} busy={busy} onSave={text => saveRecap(chapter.id, text)} />
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                        Chapter function: {chapter.rhythm?.chapterFunction ? chapterFunctionLabel[chapter.rhythm.chapterFunction] : 'not saved'}
                      </p>
                      {chapter.rhythm?.nextChapterSuggestions && (
                        <ul className="mt-1 space-y-1 text-xs text-neutral-400">
                          {CHAPTER_FUNCTIONS.map(type => chapter.rhythm?.nextChapterSuggestions?.[type]
                            ? <li key={type}><span className="text-neutral-500">{chapterFunctionLabel[type]} next:</span> {chapter.rhythm.nextChapterSuggestions[type]}</li>
                            : null)}
                        </ul>
                      )}
                      {chapter.plan && (
                        <details className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-neutral-300">
                          <summary className="cursor-pointer">Optional plan</summary>
                          <pre className="mt-2 whitespace-pre-wrap text-neutral-400">{typeof chapter.plan === 'string' ? chapter.plan : JSON.stringify(chapter.plan, null, 2)}</pre>
                        </details>
                      )}
                      <div className="mt-4 whitespace-pre-wrap text-[15px] leading-8 text-neutral-100">{chapter.prose}</div>
                    </article>
                  ))}
                </div>
              </LibraryPanel>
            )}

            {selectedStory && (
              <LibraryPanel as="section" padding="md" aria-labelledby="harness-events-title">
                <div className="flex items-center gap-2">
                  <FileText size={17} className="text-cyan-200" aria-hidden="true" />
                  <h2 id="harness-events-title" className="font-display text-lg text-white">Semantic event ledger</h2>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  Every accepted description remains append-only evidence. Specific deterministic capabilities may interpret it, while unfamiliar or insufficient events remain available through the general narrative fallback.
                </p>
                <div className="mt-4"><SemanticEventList events={visibleEvents} /></div>
              </LibraryPanel>
            )}

            {selectedStory && <HarnessInspection
              state={state}
              story={selectedStory}
              attempt={attempt}
              busy={busy}
              onReplay={replay}
              onRecover={chapterId => { void run(() => controller.recoverChapterMemory(chapterId, model)); }}
              onCorrection={addCorrection}
            />}

            {selectedStory && <Diagnostics attempt={attempt} />}
          </div>
        </div>
      )}
    </main>
  );
}

export default HarnessGenerationWorkspace;
