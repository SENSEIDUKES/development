import { StoryFoundationEditor } from '@seihouse/sen/story-seed';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { FrozenNarrativeMedia, SoundWord, SoundtrackVocabulary } from '@seihouse/sen/audio';
import { BookOpen, CheckCircle2, CircleAlert, Compass, Download, FileText, ListTree, LoaderCircle, Pause, Pin, Play, Plus, RefreshCcw } from 'lucide-react';
import { CHAPTER_FUNCTIONS, CHAPTER_FUNCTION_LABELS, FATE_MODE_LABELS, FATE_PRESSURE_RHYTHM_CONFIG, FateArcGoalCard, FateConclusion, FateDestinedEnding, FatePathChooser, HARD_PIN_LIMIT, arcPlanGap, arcReviewGap, chapterDirectionGap, describeChapterPath, harnessStoryMode, nextArcStep } from '@seihouse/sen/harness-generation';
import type { ChapterDirectionChoice, HardPinInput, HarnessChapter, HarnessMissionReminder, StoryFoundationRevision } from '@seihouse/sen/harness-generation';
import { type MediaPack, type MediaPackEntitlement, type MediaPackReference, type StoryMediaLoadoutSlot } from '../media/mediaPacks';
import { NarrativeButton as LibraryButton, NarrativePanel as LibraryPanel, NarrativeTextArea as LibraryTextArea, NarrativeTextBox as LibraryTextBox, CreationButton as ManifestButton } from '@seihouse/sen/presentation';
import { LibraryManifestingIcon as SENManifestingIcon } from '@seihouse/library-ui';
import { findFoundationRevision, findStory } from '@seihouse/sen/harness-generation';
import { buildCanonicalStoryView } from '@seihouse/sen/harness-generation';
import { GENERATION_PACKET_BUDGET, PACKET_SECTION_ORDER } from '@seihouse/sen/harness-generation';
import { harnessSkillKey } from '@seihouse/sen/harness-generation';
import { type ChapterWritingStyle } from '@seihouse/sen/contracts';
import { StorySettingsPanel } from '../stories/settings/StorySettingsPanel';
import { StorySkillSlots } from '../stories/settings/StorySkillSlots';
import { MediaLoadoutPanel } from '../stories/settings/MediaLoadoutPanel';
import { includeBundledHarnessSkills } from '@seihouse/sen/harness-generation';
import { type HarnessGenerationRepository } from '@seihouse/sen/harness-generation';
import type { ReaderPreferenceStorage, ReaderStateRepository } from '@seihouse/sen/reader-runtime';
import { NovelBlueprintTab } from './NovelBlueprintTab';
import { useLibraryStories } from '../stories/useLibraryStories';
import { StoryPages } from '../stories/StoryPages';
import { downloadHarnessStory } from '../stories/storyExport';
import type { LoadingAgentPresentation } from '../manifestations/taskCard';
import { type HarnessGenerationAttempt, type HarnessGenerationModelAdapter, type HarnessCorrectionKind, type HarnessSemanticEvent, type HarnessStory, type HarnessStoryMode, type HarnessSkillManifest, type HarnessSkillReference, type HarnessSkillSlotId, type HarnessStorySeedOption, type HarnessStorySeedSource, type HarnessWorkspaceState, type StoryFoundationInput } from '@seihouse/sen/harness-generation';

export interface HarnessGenerationWorkspaceProps {
  /** Host-selected first-party records; never a built-in SEN catalog. */
  baseMedia?: FrozenNarrativeMedia;
  /** Injection points keep the live UI testable without a provider or browser database. */
  repository: HarnessGenerationRepository;
  modelAdapter: HarnessGenerationModelAdapter;
  /** Host-owned durable Reader state: the reading place for stories opened in the Reader. */
  readerStateRepository?: ReaderStateRepository;
  /** Host-owned device preferences for the Reader: narration voices and speed. */
  readerPreferences?: ReaderPreferenceStorage;
  /**
   * Host-controlled story open in the Reader, so a host can restore it after a
   * reload. Without `onReadingStoryChange` the workspace keeps it internally.
   */
  readingStoryId?: string;
  onReadingStoryChange?: (storyId: string | undefined) => void;
  /**
   * Host-controlled story shown on its World Info page, the way into the
   * Reader (Start Story, Start Reading, Continue). Without `onInfoStoryChange`
   * the workspace keeps it internally.
   */
  infoStoryId?: string;
  onInfoStoryChange?: (storyId: string | undefined) => void;
  /**
   * The agent the Aura Veil shows while the Reader writes a chapter (the host
   * owns agent art). Without it, the Reader's Next button says it is writing.
   */
  writingAgent?: LoadingAgentPresentation;
  /**
   * The novel to open first, when it exists — e.g. a world chosen on Library
   * Create or a story a Story Seed just started. Unknown ids fall back to the
   * usual first story.
   */
  initialStoryId?: string;
  /** With `initialStoryId`, `next-chapter` brings that novel's Generate Chapter panel into view once. */
  initialFocus?: 'next-chapter';
  /** Optional host bridge that supplies saved Story Seeds as frozen inputs. */
  storySeedSource?: HarnessStorySeedSource;
  /** Host-owned inventory. Passing a manifest means that exact skill version is installed and available to equip. */
  installedSkills?: HarnessSkillManifest[];
  /**
   * Development inspection of HARNESS internals: the CAPA skill slots, with the
   * managed slots' resolved state, and the host's package intake. Production
   * hosts leave it off, so a story's owner configures the story through Story
   * Settings and never sees slots, skill IDs or loadouts.
   */
  showHarnessInternals?: boolean;
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

/**
 * Story-direction sources: the Destined Ending, user-created Hard Pins, the
 * active Arc Goal, the story's Fate Pressure rhythm, the next chapter's path,
 * and the Mission Reminder. The Arc Goal, ending and path displays are the
 * same SEN Fate pieces the HARNESS Reader's Fate page shows; Arc Goals are
 * edited in the novel's Blueprint.
 */
function StoryDirectionPanel({ story, foundation, chapters, generatedThrough, missionReminder, busy, onSaveHardPins, onOpenBlueprint, onChooseDirection }: {
  story: HarnessStory;
  foundation?: StoryFoundationRevision;
  chapters: HarnessChapter[];
  generatedThrough: number;
  missionReminder?: HarnessMissionReminder | { error: string };
  busy: boolean;
  onSaveHardPins: (pins: HardPinInput[]) => Promise<void>;
  onOpenBlueprint: () => void;
  onChooseDirection: (choice: ChapterDirectionChoice | null) => Promise<void>;
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

  const mode = harnessStoryMode(foundation?.input);
  const recommendation = story.rhythmRecommendation;
  const tier = recommendation ? FATE_PRESSURE_RHYTHM_CONFIG.tiers[recommendation.fatePressure] : undefined;

  return (
    <LibraryPanel as="section" padding="md" aria-labelledby="harness-direction-title" data-testid="harness-story-direction">
      <div className="flex items-center gap-2">
        <Compass size={18} className="text-cyan-200" aria-hidden="true" />
        <h2 id="harness-direction-title" className="font-display text-xl text-white">Story direction</h2>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400">
        {FATE_MODE_LABELS[mode]}. Hard Pins describe the story’s long-term destiny beside the Destined Ending, and the Active Arc Goal its current destination. {mode === 'survival'
          ? 'The reader directs every chapter; nothing is written until they do.'
          : 'Fate Pressure picks each chapter’s path unless the reader chooses one for that chapter.'}
      </p>

      <div className="mt-5">
        <FateArcGoalCard story={story} foundation={foundation?.input} generatedThrough={generatedThrough}
          actions={<LibraryButton type="button" size="sm" variant="ghost" onClick={onOpenBlueprint} disabled={busy}>Edit Arc Goals in Blueprint</LibraryButton>} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <FateDestinedEnding foundation={foundation?.input} />

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

      <div className="mt-4">
        {story.conclusion
          ? <FateConclusion story={story} />
          : <FatePathChooser story={story} foundation={foundation?.input} chapters={chapters} busy={busy} onChoose={onChooseDirection} />}
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
        {mode === 'survival' && <p className="mt-2 text-xs leading-relaxed text-neutral-400">Fate Survival chapters follow the reader’s direction, so this automatic recommendation is not sent to the writer.</p>}
        {recommendation ? (
          <div className="mt-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">Recent rhythm (saved chapter functions)</p>
            {recommendation.recentFunctions.length ? (
              <ol className="mt-2 flex flex-wrap gap-2">
                {recommendation.recentFunctions.map(entry => (
                  <li key={entry.chapterNumber} className="rounded-full border border-white/15 px-2 py-1 font-mono text-[10px] text-neutral-300">Ch {entry.chapterNumber} · {CHAPTER_FUNCTION_LABELS[entry.chapterFunction]}</li>
                ))}
              </ol>
            ) : <p className="mt-2 text-xs text-neutral-500">No chapter function has been saved yet.</p>}
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">Recommended for Chapter {recommendation.forChapterNumber}</p>
            <p className="mt-1 text-sm font-semibold text-cyan-100">{CHAPTER_FUNCTION_LABELS[recommendation.recommendedFunction]}</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">{recommendation.reason}</p>
            <p className="mt-2 font-mono text-[10px] text-neutral-500">Weights: {CHAPTER_FUNCTIONS.map(type => `${type} ${recommendation.weights[type]}`).join(' · ')}{recommendation.blocked.length ? ` · blocked: ${recommendation.blocked.join(', ')}` : ''}</p>
          </div>
        ) : <p className="mt-2 text-xs text-neutral-500">The rhythm recommendation appears after the story is saved.</p>}
      </div>

      <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3" data-testid="harness-mission-reminder">
        <summary className="cursor-pointer text-sm font-medium text-neutral-200">Mission Reminder · from the equipped Author skill</summary>
        {missionReminder && 'error' in missionReminder
          ? <p className="mt-2 text-xs text-human">{missionReminder.error}</p>
          : <>
            <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">A brief reminder that the model is the author of this novel. Sourced from the Author portion of the CAPA Prompt; it performs no story analysis and travels as its own section of each chapter request.</p>
            <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-neutral-300">{missionReminder?.text ?? 'Equip an installed Author skill to see the Mission Reminder.'}</pre>
          </>}
      </details>
    </LibraryPanel>
  );
}

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
  // Hide the retired extraction warning without rewriting saved attempts.
  const warnings = attempt.warnings.filter(warning => warning.code !== 'capability_unresolved');
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
      {warnings.length > 0 && (
        <div className="mt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold-accent">Warnings and recoveries</p>
          <ul className="mt-2 space-y-2 text-xs leading-relaxed text-neutral-300">
            {warnings.map((warning, index) => <li key={`${warning.code}-${index}`}>• {warning.message}</li>)}
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
  onCorrection,
}: {
  state: HarnessWorkspaceState;
  story: HarnessStory;
  attempt?: HarnessGenerationAttempt;
  busy: boolean;
  onReplay: () => void;
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
  showHarnessInternals = false,
  renderSkillImport,
  renderSlotSkillImport,
  registeredMediaPacks = EMPTY_MEDIA_PACKS,
  baseMedia,
  mediaPackEntitlements = EMPTY_MEDIA_ENTITLEMENTS,
  onGrantDevelopmentMediaReward,
  preferredModel,
  onModelChange,
  readerStateRepository,
  readerPreferences,
  readingStoryId,
  onReadingStoryChange,
  infoStoryId,
  onInfoStoryChange,
  writingAgent,
  initialStoryId,
  initialFocus,
}: HarnessGenerationWorkspaceProps) {
  const availableSkills = useMemo(
    () => includeBundledHarnessSkills(installedSkills),
    [installedSkills],
  );
  // The stories, their controller and the writer: the same Library setup the app uses.
  const stories = useLibraryStories({
    repository: injectedRepository, modelAdapter: injectedAdapter, installedSkills,
    registeredMediaPacks, mediaPackEntitlements, baseMedia, preferredModel,
  });
  const { controller, state, serverInfo, model, setModel } = stories;
  const [selectedStoryId, setSelectedStoryId] = useState<string>();
  // The requested novel waits for the stored stories: the snapshot before hydration is empty.
  const requestedStoryId = useRef(initialStoryId);
  /** The novel's own page shows its story workspace or its Blueprint. */
  const [novelTab, setNovelTab] = useState<'novel' | 'blueprint'>('novel');
  useEffect(() => { setNovelTab('novel'); }, [selectedStoryId]);
  const [foundationForm, setFoundationForm] = useState<StoryFoundationInput>(emptyFoundation);
  const [batchCount, setBatchCount] = useState('');
  const [internalReadingStoryId, setInternalReadingStoryId] = useState<string>();
  const openReadingStoryId = onReadingStoryChange ? readingStoryId : internalReadingStoryId;
  const setReadingStoryId = onReadingStoryChange ?? setInternalReadingStoryId;
  const [internalInfoStoryId, setInternalInfoStoryId] = useState<string>();
  const openInfoStoryId = onInfoStoryChange ? infoStoryId : internalInfoStoryId;
  const setInfoStoryId = onInfoStoryChange ?? setInternalInfoStoryId;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  // Opening storage or reaching the writer failed: say so where actions report,
  // and take it down once a Retry succeeds (unless another message replaced it).
  const shownLoadError = useRef<string | undefined>(undefined);
  useEffect(() => {
    const previousLoadError = shownLoadError.current;
    shownLoadError.current = stories.loadError;
    if (stories.loadError) setMessage(stories.loadError);
    else if (previousLoadError) setMessage(current => current === previousLoadError ? undefined : current);
  }, [stories.loadError]);
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
    void loadStorySeeds();
  }, [loadStorySeeds]);

  const selectedStory = state && selectedStoryId ? findStory(state, selectedStoryId) : undefined;
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
    const requested = requestedStoryId.current;
    if (requested && state.stories.some(story => story.id === requested)) {
      requestedStoryId.current = undefined;
      setSelectedStoryId(requested);
      return;
    }
    if (selectedStoryId && state.stories.some(story => story.id === selectedStoryId)) return;
    setSelectedStoryId(state.stories[0]?.id);
  }, [state, selectedStoryId]);

  // Arriving to continue a novel lands once on its Generate Chapter panel.
  const landedOnNextChapter = useRef(false);
  useEffect(() => {
    if (initialFocus !== 'next-chapter' || landedOnNextChapter.current || !state) return;
    if (!initialStoryId || selectedStoryId !== initialStoryId || novelTab !== 'novel') return;
    const heading = document.getElementById('harness-generate-title');
    if (!heading) return;
    landedOnNextChapter.current = true;
    heading.scrollIntoView?.({ block: 'start' });
    heading.focus({ preventScroll: true });
  }, [initialFocus, initialStoryId, state, selectedStoryId, novelTab]);

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
        { chapterWritingStyle: option.chapterWritingStyle },
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
  const setReadingMode = (mode: ChapterWritingStyle) => {
    if (!selectedStory) return;
    void run(() => controller.setChapterWritingStyle(selectedStory.id, mode));
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
  /** The next chapter's path. Errors reach the chooser, which shows them beside the choice. */
  const chooseDirection = async (choice: ChapterDirectionChoice | null) => {
    if (!selectedStory) return;
    setBusy(true);
    setMessage(undefined);
    try { await controller.chooseChapterDirection(selectedStory.id, choice); }
    finally { setBusy(false); }
  };
  const retryArcPlan = () => selectedStory && void run(() => controller.planNextArc(selectedStory.id, model));
  const planArc = async () => {
    if (!selectedStory) return;
    setBusy(true);
    setMessage(undefined);
    try { await controller.planNextArc(selectedStory.id, model); }
    finally { setBusy(false); }
  };
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
  const acceptArcGoals = async (arcNumber: number) => {
    if (!selectedStory) return;
    setBusy(true);
    setMessage(undefined);
    try { await controller.acceptArcGoals(selectedStory.id, arcNumber); }
    finally { setBusy(false); }
  };
  const saveBlueprintFoundation = async (input: StoryFoundationInput) => {
    if (!selectedStory) return;
    setBusy(true);
    setMessage(undefined);
    try { await controller.saveFoundationRevision(selectedStory.id, input); }
    finally { setBusy(false); }
  };
  const saveRecap = async (chapterId: string, text: string) => {
    setBusy(true);
    setMessage(undefined);
    try { await controller.editChapterRecap(chapterId, text); }
    finally { setBusy(false); }
  };
  const soundWords = useMemo<SoundWord[]>(() => {
    if (!state || !selectedStory) return [];
    try { return controller.describeSoundVocabulary(selectedStory.id); }
    catch { return []; }
  }, [controller, state, selectedStory]);
  const soundtrackWords = useMemo<SoundtrackVocabulary>(() => {
    if (!state || !selectedStory) return { moods: [], atmospheres: [] };
    try { return controller.describeSoundtrackVocabulary(selectedStory.id); }
    catch { return { moods: [], atmospheres: [] }; }
  }, [controller, state, selectedStory]);
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
      downloadHarnessStory(state, selectedStory.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Harness story export failed.');
    }
  };

  const generationAvailable = Boolean(selectedStory && serverInfo?.configured && model && !busy);
  const selectedMode = harnessStoryMode(selectedFoundation?.input);
  // Fate Survival writes nothing until the reader directs the chapter, and never in batches.
  const directionGap = selectedStory ? chapterDirectionGap(selectedStory, selectedMode) : undefined;
  // At the start of an arc the next chapter waits for its goals to be planned and reviewed in the Blueprint.
  const arcStep = state && selectedStory ? nextArcStep(state, selectedStory.id) : undefined;
  const arcGap = selectedStory && selectedFoundation
    ? arcPlanGap(selectedStory, selectedFoundation.input) ?? arcReviewGap(selectedStory, selectedFoundation.input) : undefined;
  const chapterGap = arcGap ?? directionGap;
  // A story's own pages come first: the Reader, then its World Info page.
  // Back from the Reader returns to World Info when the reader came from there.
  // One StoryPages per story stays mounted as the reader moves between them.
  const storyPage: { id: string; page: 'info' | 'read' } | undefined = !state
    ? (openReadingStoryId ? { id: openReadingStoryId, page: 'read' } : openInfoStoryId ? { id: openInfoStoryId, page: 'info' } : undefined)
    : openReadingStoryId && findStory(state, openReadingStoryId) ? { id: openReadingStoryId, page: 'read' }
      : openInfoStoryId && findStory(state, openInfoStoryId) ? { id: openInfoStoryId, page: 'info' }
        : undefined;
  if (storyPage) return <StoryPages key={storyPage.id} stories={stories} storyId={storyPage.id} page={storyPage.page}
    readerStateRepository={readerStateRepository} readerPreferences={readerPreferences} writingAgent={writingAgent}
    onOpenReader={() => setReadingStoryId(storyPage.id)}
    onCloseReader={() => { setSelectedStoryId(storyPage.id); setReadingStoryId(undefined); }}
    onBack={() => { setSelectedStoryId(storyPage.id); setInfoStoryId(undefined); }} />;

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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div role="tablist" aria-label={`${selectedStory.title} pages`} className="flex flex-wrap gap-2" data-testid="novel-page-tabs">
                  {([['novel', 'Novel'], ['blueprint', 'Blueprint']] as const).map(([id, label]) => (
                    <button key={id} type="button" role="tab" id={`novel-tab-${id}`} aria-selected={novelTab === id} aria-controls={id === 'blueprint' ? 'novel-panel-blueprint' : undefined}
                      onClick={() => setNovelTab(id)}
                      className={`min-h-11 rounded-full border px-4 text-sm transition-colors ${novelTab === id ? 'border-cyan-300/40 bg-cyan-400/10 text-white' : 'border-white/15 text-neutral-300 hover:border-white/30'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                {/* The reader's way in: the story's World Info page, then Start Story or Start Reading. */}
                <LibraryButton type="button" size="sm" variant="secondary" icon={BookOpen} onClick={() => setInfoStoryId(selectedStory.id)}>World Info</LibraryButton>
              </div>
            )}

            {selectedStory && novelTab === 'blueprint' && (
              <div role="tabpanel" id="novel-panel-blueprint" aria-labelledby="novel-tab-blueprint">
                <NovelBlueprintTab story={selectedStory} foundation={selectedFoundation} busy={busy}
                  arcStep={arcStep} onPlanArc={model ? planArc : undefined} showLookahead={showHarnessInternals}
                  onEditArcGoals={editArcPlan} onAcceptArcGoals={acceptArcGoals} onSaveFoundation={saveBlueprintFoundation} />
              </div>
            )}

            {selectedStory && novelTab === 'novel' && (
              <StoryDirectionPanel
                story={selectedStory}
                foundation={selectedFoundation}
                chapters={chapters}
                generatedThrough={chapters.at(-1)?.chapterNumber ?? 0}
                missionReminder={missionReminder}
                busy={busy}
                onSaveHardPins={saveHardPins}
                onOpenBlueprint={() => setNovelTab('blueprint')}
                onChooseDirection={chooseDirection}
              />
            )}

            {selectedStory && novelTab === 'novel' && (
              <StorySettingsPanel
                story={selectedStory}
                installedSkills={availableSkills}
                busy={busy}
                onReadingModeChange={setReadingMode}
              />
            )}

            {showHarnessInternals && renderSkillImport?.(busy)}
            {showHarnessInternals && selectedStory && novelTab === 'novel' && (
              <StorySkillSlots
                inspect
                story={selectedStory}
                fateMode={selectedMode}
                installedSkills={availableSkills}
                soundWords={soundWords}
                soundtrackWords={soundtrackWords}
                busy={busy}
                onChange={setSkillSlot}
                renderSlotSkillImport={renderSlotSkillImport}
                onInstalled={equipInstalledSkill}
              />
            )}

            {selectedStory && novelTab === 'novel' && (
              <MediaLoadoutPanel
                inspect
                story={selectedStory}
                packs={registeredMediaPacks}
                entitlements={mediaPackEntitlements}
                soundWords={soundWords}
                busy={busy}
                onGrant={onGrantDevelopmentMediaReward ? grantDevelopmentMediaReward : undefined}
                onChange={setMediaLoadoutSlot}
              />
            )}

            {selectedStory && novelTab === 'novel' && (
              <LibraryPanel as="section" padding="md" aria-labelledby="harness-generate-title">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200/55">One-call generation</p>
                    <h2 id="harness-generate-title" tabIndex={-1} className="mt-1 scroll-mt-24 font-display text-xl text-white outline-none">Generate Chapter {selectedStory.head.nextChapterNumber}</h2>
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
                    disabled={!generationAvailable || Boolean(chapterGap) || Boolean(selectedStory.conclusion)}
                    loading={busy}
                  >
                    Generate Next Chapter
                  </ManifestButton>
                  {(chapterGap || selectedStory.conclusion) && <p className="mt-2 text-xs text-neutral-400" data-testid="harness-generation-gap">{selectedStory.conclusion ? 'This story has ended. No further chapter is written.' : chapterGap}</p>}
                  {arcGap && !selectedStory.conclusion && <LibraryButton type="button" size="sm" variant="secondary" className="mt-2" onClick={() => setNovelTab('blueprint')}>Open the Blueprint</LibraryButton>}
                </div>
                <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="min-w-48 text-xs text-neutral-400" htmlFor="harness-batch-count">Sequential batch chapter count
                      <input id="harness-batch-count" type="number" min="1" placeholder="Choose a count" value={batchCount} onChange={event => setBatchCount(event.target.value)} disabled={busy}
                        className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-black/35 px-3 text-sm text-white" />
                    </label>
                    <LibraryButton type="button" size="sm" icon={Play} onClick={startBatch} disabled={!generationAvailable || !batchCount || selectedMode === 'survival' || Boolean(arcGap) || Boolean(selectedStory.conclusion)}>Start sequential batch</LibraryButton>
                    {batch?.status === 'running' || batch?.status === 'pause_requested' ? <LibraryButton type="button" size="sm" variant="secondary" icon={Pause} onClick={pauseBatch} disabled={batch.status === 'pause_requested'}>Pause after active call</LibraryButton> : null}
                    {batch?.status === 'paused' && <LibraryButton type="button" size="sm" icon={Play} onClick={resumeBatch} loading={busy}>Resume batch</LibraryButton>}
                    {batch && ['failed', 'provider_outcome_unknown'].includes(batch.status) && <LibraryButton type="button" size="sm" variant="secondary" icon={RefreshCcw} onClick={retryBatch} loading={busy}>{batch.status === 'provider_outcome_unknown' ? 'Explicitly retry unknown call' : 'Retry failed batch chapter'}</LibraryButton>}
                  </div>
                  {batch && <p className="mt-3 text-xs text-neutral-400">Batch {batch.status.replace(/_/g, ' ')} · {batch.completedChapterIds.length}/{batch.requestedChapterCount} committed · usage: {batch.usage.reportedCalls} reported, {batch.usage.estimatedCalls} estimated, {batch.usage.unavailableCalls} unavailable calls</p>}
                  {batch?.failure && <p className="mt-2 text-xs text-human">{batch.failure}</p>}
                </div>
              </LibraryPanel>
            )}

            {selectedStory && novelTab === 'novel' && (
              <details className="rounded-xl border border-white/10 bg-black/15 p-3">
                <summary className="cursor-pointer text-sm font-medium text-neutral-300">Foundation snapshot and revisions</summary>
                <div className="mt-3">
                  <StoryFoundationEditor createIcon={SENManifestingIcon}
                    form={foundationForm}
                    story={selectedStory}
                    fixedDestinedEnding={selectedFoundation?.input.destinedEnding}
                    busy={busy}
                    error={foundationError}
                    onChange={setFoundationForm}
                    onSubmit={saveFoundation}
                  />
                </div>
              </details>
            )}

            {selectedStory && novelTab === 'novel' && chapters.length > 0 && (
              <LibraryPanel as="section" padding="md" aria-labelledby="harness-chapters-title">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-cyan-200" aria-hidden="true" />
                  <h2 id="harness-chapters-title" className="font-display text-xl text-white">Committed chapters</h2>
                  <LibraryButton type="button" size="sm" onClick={() => setReadingStoryId(selectedStory.id)}>Open Reader Chamber</LibraryButton>
                </div>
                <div className="mt-5 space-y-5">
                  {chapters.map(chapter => (
                    <article key={chapter.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200/55">Chapter {chapter.chapterNumber} · {chapter.responseMode === 'plain-prose-recovery' ? 'plain prose recovery' : 'structured response'}</p>
                      <h3 className="mt-2 font-display text-xl text-white">{chapter.title}</h3>
                      {/* Chapter scale and structure stay visible: a short or unstructured chapter is kept and flagged, never discarded. */}
                      <p className={`mt-1 font-mono text-[10px] uppercase tracking-[0.16em] ${chapter.metrics.meetsScaleTarget ? 'text-neutral-500' : 'text-amber-200/70'}`}>
                        {chapter.metrics.wordCount.toLocaleString()} words · {chapter.metrics.paragraphCount.toLocaleString()} paragraphs{chapter.metrics.paragraphTarget ? ` (${chapter.metrics.paragraphTarget.toLocaleString()} asked)` : ''} · {(chapter.soundCues?.length ?? 0).toLocaleString()} Sound Cues
                        {chapter.metrics.meetsScaleTarget ? '' : ' · below chapter-scale target'}
                        {chapter.metrics.paragraphTarget && chapter.metrics.paragraphTarget !== chapter.metrics.paragraphCount ? ' · paragraph count missed' : ''}
                      </p>
                      <LibraryButton type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void run(() => controller.replayStory(selectedStory.id, chapter.id))}>Repair chapter enhancements</LibraryButton>
                      <ChapterRecapEditor chapter={chapter} busy={busy} onSave={text => saveRecap(chapter.id, text)} />
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                        Chapter function: {chapter.rhythm?.chapterFunction ? CHAPTER_FUNCTION_LABELS[chapter.rhythm.chapterFunction] : 'not saved'}
                      </p>
                      {chapter.path && <p className="mt-1 text-xs text-neutral-400">Path: {describeChapterPath(chapter.path)}</p>}
                      {chapter.rhythm?.nextChapterSuggestions && (
                        <ul className="mt-1 space-y-1 text-xs text-neutral-400">
                          {CHAPTER_FUNCTIONS.map(type => chapter.rhythm?.nextChapterSuggestions?.[type]
                            ? <li key={type}><span className="text-neutral-500">{CHAPTER_FUNCTION_LABELS[type]} next:</span> {chapter.rhythm.nextChapterSuggestions[type]}</li>
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

            {selectedStory && novelTab === 'novel' && (
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

            {selectedStory && novelTab === 'novel' && <HarnessInspection
              state={state}
              story={selectedStory}
              attempt={attempt}
              busy={busy}
              onReplay={replay}
              onCorrection={addCorrection}
            />}

            {selectedStory && novelTab === 'novel' && <Diagnostics attempt={attempt} />}
          </div>
        </div>
      )}
    </main>
  );
}

export default HarnessGenerationWorkspace;
