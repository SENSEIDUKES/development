import {
  AlertTriangle,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Download,
  FileJson,
  FileUp,
  FlaskConical,
  LoaderCircle,
  Layers3,
  Play,
  RotateCcw,
  ScrollText,
  Sigma,
  XCircle,
} from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type {
  ChapterGenerationErrorResponse,
  ChapterGenerationServerInfo,
  ChapterGenerationStreamEvent,
  ManifestChapterRequest,
  ManifestChapterResponse,
  SafeChapterGenerationFailure,
} from "../shared/liveChapterGeneration";
import {
  createFiveChapterBatchState,
  errorResponseToBatchFailure,
  runFiveChapterBatch,
  type BatchChapterRun,
  type ChapterBatchManifestFailure,
  type FiveChapterBatchState,
} from "../shared/batch/chapterBatch";
import { adaptFinalizedStorySeedToChapterContracts } from "../shared/packets/storySeedChapterAdapter";
import type { StorySeedChapterMappingReport } from "../shared/packets/storySeedChapterAdapter";
import { aggregateChapterTokenUsage } from "../shared/pipeline/usage";
import type { ChapterModelCallUsage, ChapterUsageStage } from "../shared/pipeline/usage";
import type { ChapterTokenUsageSummary } from "../shared/pipeline/usage";
import {
  buildBatchReviewMarkdown,
  buildChapterReviewMarkdown,
  buildRunDataExport,
  downloadReviewFile,
  reviewExportFilename,
  stoppedChapterNumber,
  usageForChapterRun,
} from "../shared/reviewExports";
import {
  listWorkshopStorySeeds,
  LOCAL_WORKSHOP_STORY_SEED_OWNER_ID,
  type StorySeedArtifact,
  type StorySeedRecord,
} from "../../story-seed/shared/storySeedRepository";
import { parseStorySeedJson } from "../../story-seed/shared/storySeedSerialization";
import type { RawStorySeedArtifact } from "../../story-seed/shared/storySeedSerialization";
import ChapterGenerationWorkspace from "./ChapterGenerationWorkspace";
import FiveChapterReaderSession from "./FiveChapterReaderSession";
import ManifestedChapterView from "./ManifestedChapterView";
import SingleChapterReaderSession from "./SingleChapterReaderSession";
import { Chip } from "./workspaceUi";

const ENDPOINT = "/api/chapter-generation";
const CHAPTER_REQUEST_TIMEOUT_MS = 300_000;

interface ArtifactChoice {
  id: string;
  label: string;
  source: "saved" | "upload";
  artifact: RawStorySeedArtifact;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const blueprintString = (artifact: RawStorySeedArtifact, field: string): string | undefined =>
  isRecord(artifact.blueprint) && typeof artifact.blueprint[field] === "string"
    ? artifact.blueprint[field].trim() || undefined
    : undefined;

const titleForArtifact = (artifact: RawStorySeedArtifact): string =>
  blueprintString(artifact, "title")
  || artifact.seed.world.optional.worldIdentity.title
  || artifact.seed.story.required.premise.slice(0, 70)
  || "Untitled Story Seed";

const savedChoice = (record: StorySeedRecord): ArtifactChoice => ({
  id: `saved:${record.id}`,
  label: `${record.title}${record.blueprint ? "" : " — Blueprint missing"}`,
  source: "saved",
  artifact: { seed: record.seed, ...(record.blueprint ? { blueprint: record.blueprint } : {}) },
});

const formatTokens = (value: number) => value.toLocaleString();

const formatDuration = (milliseconds: number) => milliseconds >= 1_000
  ? `${(milliseconds / 1_000).toFixed(1)}s`
  : `${milliseconds}ms`;

function UsageRow({ call }: { call: ChapterModelCallUsage }) {
  const breakdown = call.estimatedInputBreakdown;
  return (
    <li className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 border-b border-white/5 px-3 py-3 last:border-b-0 sm:grid-cols-[minmax(9rem,1fr)_minmax(9rem,1fr)_repeat(4,minmax(5rem,auto))] sm:items-center">
      <div className="min-w-0">
        <div className="text-xs font-medium text-white/85">{call.stage}</div>
        <div className="mt-0.5 text-[9px] uppercase tracking-wider text-white/35">
          {call.tokenSource === "estimated" ? "Estimated usage" : "Provider reported"}
        </div>
      </div>
      <div className="min-w-0 break-words font-mono text-[10px] text-cyan-100/65">
        {call.model}
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-wider text-white/35">Input</div>
        <div className="font-mono text-xs text-white/75">{formatTokens(call.inputTokens)}</div>
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-wider text-white/35">Output</div>
        <div className="font-mono text-xs text-white/75">{formatTokens(call.outputTokens)}</div>
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-wider text-white/35">Total</div>
        <div className="font-mono text-xs text-white/85">{formatTokens(call.totalTokens)}</div>
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-wider text-white/35">Time</div>
        <div className="font-mono text-xs text-white/75">{formatDuration(call.generationTimeMs)}</div>
      </div>
      {breakdown && (
        <details className="col-span-full rounded-lg border border-white/8 bg-black/20 px-3 py-2">
          <summary className="cursor-pointer text-[9px] font-semibold uppercase tracking-wider text-cyan-100/60">
            Estimated input-token breakdown · {formatTokens(breakdown.total)} tracked
          </summary>
          <p className="mt-1 text-[9px] leading-relaxed text-white/35">
            Estimated component sizes, not provider-reported. Stage artifacts and JSON framing can make this subtotal differ from provider input.
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] sm:grid-cols-4">
            {[
              ["Story Seed / Constitution", breakdown.storySeedConstitution],
              ["Blueprint", breakdown.blueprint],
              ["Living Story State", breakdown.livingStoryState],
              ["Chapter Mission", breakdown.chapterMission],
              ["Generation Rules", breakdown.generationRules],
              ["User instruction", breakdown.userInstruction],
              ["System prompts", breakdown.systemPrompts],
            ].map(([label, value]) => (
              <div key={String(label)} className="min-w-0">
                <dt className="truncate text-white/35">{label}</dt>
                <dd className="font-mono text-white/65">~{formatTokens(Number(value))}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </li>
  );
}

export function ChapterUsageSummary({
  result,
  usage,
  failed = false,
  scope = "Chapter",
}: {
  result?: ManifestChapterResponse;
  usage?: ChapterTokenUsageSummary;
  failed?: boolean;
  scope?: "Chapter" | "Batch";
}) {
  const titleId = useId();
  const summary = usage ?? result?.usage;
  if (!summary) return null;
  const { totals } = summary;
  return (
    <section aria-labelledby={titleId} className="overflow-hidden rounded-xl border border-white/10 bg-black/25">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-3 sm:px-4">
        <div>
          <h3 id={titleId} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/80">
            <Sigma size={13} className="text-cyan-200/70" />
            {failed ? "Model Usage Before Failure" : `${scope} Model Usage`}
          </h3>
          <p className="mt-1 text-[10px] leading-relaxed text-white/35">
            Packet assembly is code-only and is not listed as a model call.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip tone="cyan">{summary.calls.length} model calls</Chip>
          {totals.hasEstimatedUsage && <Chip tone="amber">Includes estimates</Chip>}
        </div>
      </div>
      <ol>
        {summary.calls.map((call, index) => (
          <UsageRow key={`${call.kind}-${index}`} call={call} />
        ))}
      </ol>
      <div className="grid grid-cols-2 gap-3 border-t border-cyan-500/20 bg-cyan-500/5 px-3 py-3 sm:grid-cols-4 sm:px-4">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-white/35">{scope} input</div>
          <div className="font-mono text-sm text-cyan-100">{formatTokens(totals.inputTokens)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-white/35">{scope} output</div>
          <div className="font-mono text-sm text-cyan-100">{formatTokens(totals.outputTokens)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-white/35">{scope} total</div>
          <div className="font-mono text-sm font-semibold text-cyan-50">{formatTokens(totals.totalTokens)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-white/35">Generation time</div>
          <div className="flex items-center gap-1 font-mono text-sm text-cyan-100">
            <Clock3 size={11} /> {formatDuration(totals.generationTimeMs)}
          </div>
        </div>
      </div>
    </section>
  );
}

function MappingLimits({ mapping }: { mapping: StorySeedChapterMappingReport }) {
  return (
    <section aria-labelledby="mapping-limits-title" className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-3">
      <h3 id="mapping-limits-title" className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-amber-100/80">
        <AlertTriangle size={12} /> Truthful chapter bridge
      </h3>
      <p className="mt-1 text-[11px] leading-relaxed text-amber-50/60">
        Mission source: <span className="font-mono text-amber-100/80">{mapping.chapterMissionSource}</span>.
        The following values are intentionally not guessed:
      </p>
      <ul className="mt-2 grid grid-cols-1 gap-1.5 md:grid-cols-2">
        {mapping.unresolved.map(note => (
          <li key={note.id} className="text-[10px] leading-relaxed text-white/50">
            <span className="font-medium text-white/70">{note.target}:</span> {note.message}
          </li>
        ))}
      </ul>
    </section>
  );
}

const readErrorResponse = async (response: Response): Promise<ChapterGenerationErrorResponse> => {
  try {
    const body = await response.json() as ChapterGenerationErrorResponse;
    return {
      error: body.error || `Chapter generation failed (${response.status}).`,
      ...(body.failure ? { failure: body.failure } : {}),
      ...(body.usage ? { usage: body.usage } : {}),
    };
  } catch {
    return { error: `Chapter generation failed (${response.status}).` };
  }
};

const errorMessage = async (response: Response): Promise<string> =>
  (await readErrorResponse(response)).error;

const manifestThroughServer = async (
  request: ManifestChapterRequest,
  accessToken: string,
  onStage: (stage: ChapterUsageStage) => void = () => undefined,
  signal?: AbortSignal,
): Promise<ManifestChapterResponse> => {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeout = window.setTimeout(() => {
    controller.abort(new DOMException("Chapter generation request timed out.", "TimeoutError"));
  }, CHAPTER_REQUEST_TIMEOUT_MS);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/x-ndjson",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/x-ndjson") || !response.body) {
      if (!response.ok) throw errorResponseToBatchFailure(await readErrorResponse(response));
      return response.json() as Promise<ManifestChapterResponse>;
    }

    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffered = "";
    let finalEvent: Extract<ChapterGenerationStreamEvent, { type: "result" }> | undefined;
    const consumeLine = (line: string) => {
      if (!line.trim()) return;
      const event = JSON.parse(line) as ChapterGenerationStreamEvent;
      if (event.type === "stage") onStage(event.stage);
      else finalEvent = event;
    };
    while (true) {
      const { done, value } = await reader.read();
      buffered += decoder.decode(value, { stream: !done });
      const lines = buffered.split("\n");
      buffered = lines.pop() ?? "";
      for (const line of lines) consumeLine(line);
      if (done) break;
    }
    consumeLine(buffered);
    if (!finalEvent) throw new Error("Chapter generation stream ended without a final result.");
    if (finalEvent.status < 200 || finalEvent.status >= 300 || "error" in finalEvent.body) {
      throw errorResponseToBatchFailure(finalEvent.body as ChapterGenerationErrorResponse);
    }
    return finalEvent.body;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
    await reader?.cancel().catch(() => undefined);
  }
};

const statusLabel = (chapter: BatchChapterRun) => ({
  queued: "Queued",
  planning: "Planning",
  manifesting: "Manifesting",
  processing: "Processing",
  repairing: "Repairing",
  completed: "Completed",
  paused: "Paused",
  failed: "Failed",
})[chapter.status];

export const pausedBatchMessage = (batch: FiveChapterBatchState): string => {
  const stoppedAt = stoppedChapterNumber(batch);
  const completed = batch.chapters
    .filter(chapter => chapter.status === "completed")
    .map(chapter => chapter.chapterNumber);
  const completedLabel = completed.length === 1
    ? `Chapter ${completed[0]} completed and is still available`
    : completed.length > 1
      ? `Chapters ${completed.join(" and ")} completed and are still available`
      : "No chapters completed";
  const failure = batch.chapters.find(chapter => chapter.chapterNumber === stoppedAt)?.error;
  return [
    `${completedLabel} in this temporary session.`,
    stoppedAt ? `The batch paused at Chapter ${stoppedAt}.` : "The batch is paused.",
    failure,
  ].filter(Boolean).join(" ");
};

export function BatchProgress({
  batch,
  selectedChapterNumber,
  onSelectChapter,
  onRetry,
  retrying,
  onReadInReaderChamber,
}: {
  batch: FiveChapterBatchState;
  selectedChapterNumber: number;
  onSelectChapter: (chapterNumber: number) => void;
  onRetry: () => void;
  retrying: boolean;
  onReadInReaderChamber?: () => void;
}) {
  return (
    <section aria-labelledby="batch-progress-title" className="overflow-hidden rounded-xl border border-violet-400/20 bg-violet-500/[0.05]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-3 sm:px-4">
        <div>
          <h3 id="batch-progress-title" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/80">
            <Layers3 size={13} className="text-violet-200/75" /> Manifest 5 Chapters
          </h3>
          <p className="mt-1 text-[10px] text-white/40">
            Five isolated chapter-sized requests · final processed state hands off sequentially.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Chip tone={batch.status === "completed" ? "emerald" : batch.status === "paused" ? "amber" : "violet"}>
            {batch.status}
          </Chip>
          {batch.status === "paused" && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 text-xs font-semibold text-amber-100 hover:bg-amber-500/20 disabled:opacity-45"
            >
              {retrying ? <LoaderCircle size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              Retry Chapter
            </button>
          )}
          {batch.status === "completed" && onReadInReaderChamber && (
            <button
              type="button"
              onClick={onReadInReaderChamber}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-500/15 px-3 text-xs font-semibold text-cyan-50 hover:bg-cyan-500/25"
            >
              <BookOpen size={14} /> Read in Reader Chamber
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-5">
        {batch.chapters.map(chapter => {
          const readable = Boolean(chapter.result ?? chapter.attempts.at(-1)?.result);
          const active = selectedChapterNumber === chapter.chapterNumber;
          const StatusIcon = chapter.status === "completed"
            ? CheckCircle2
            : chapter.status === "failed"
              ? XCircle
              : chapter.status === "queued"
                ? Circle
                : LoaderCircle;
          return (
            <button
              type="button"
              key={chapter.chapterNumber}
              disabled={!readable}
              onClick={() => onSelectChapter(chapter.chapterNumber)}
              className={`min-h-16 rounded-lg border px-3 py-2 text-left transition-colors ${
                active && readable
                  ? "border-cyan-400/45 bg-cyan-500/10"
                  : "border-white/10 bg-black/20"
              } disabled:cursor-default`}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
                <StatusIcon size={12} className={chapter.status === "planning" || chapter.status === "manifesting" || chapter.status === "processing" || chapter.status === "repairing" ? "animate-spin text-violet-200" : "text-white/45"} />
                Chapter {chapter.chapterNumber}
              </span>
              <span className="mt-1 block text-[9px] uppercase tracking-wider text-white/40">
                {statusLabel(chapter)}
              </span>
              {chapter.attempts.length > 1 && (
                <span className="mt-0.5 block text-[9px] text-amber-100/55">{chapter.attempts.length} attempts</span>
              )}
            </button>
          );
        })}
      </div>
      {batch.status === "paused" && (
        <p role="alert" className="border-t border-amber-400/15 px-3 py-2 text-[10px] leading-relaxed text-amber-100/70 sm:px-4">
          {pausedBatchMessage(batch)}
        </p>
      )}
    </section>
  );
}

function ReviewExportActions({
  title,
  artifact,
  batch,
  selectedChapter,
  response,
  failure,
  failureUsage,
}: {
  title: string;
  artifact: StorySeedArtifact;
  batch?: FiveChapterBatchState | null;
  selectedChapter?: BatchChapterRun;
  response?: ManifestChapterResponse | null;
  failure?: SafeChapterGenerationFailure | null;
  failureUsage?: ChapterTokenUsageSummary | null;
}) {
  const chapterUsage = selectedChapter ? usageForChapterRun(selectedChapter) : response?.usage;
  const chapterStatus = selectedChapter?.status ?? (response ? "completed" : undefined);
  const exportChapter = () => {
    if (!response || !chapterUsage || !chapterStatus) return;
    downloadReviewFile(
      reviewExportFilename(title, `chapter-${response.run.chapterPacket.chapterMission.number}-review`, "md"),
      buildChapterReviewMarkdown({
        response,
        status: chapterStatus,
        usage: chapterUsage,
        attemptCount: selectedChapter?.attempts.length ?? 1,
      }),
      "text/markdown",
    );
  };
  const exportBatch = () => {
    if (!batch) return;
    downloadReviewFile(
      reviewExportFilename(title, "batch-review", "md"),
      buildBatchReviewMarkdown(batch),
      "text/markdown",
    );
  };
  const exportRunData = () => downloadReviewFile(
    reviewExportFilename(title, "run-data", "json"),
    buildRunDataExport({
      artifact,
      batch,
      singleResult: batch ? undefined : response,
      singleFailure: batch ? undefined : failure,
      singleFailureUsage: batch ? undefined : failureUsage,
    }),
    "application/json",
  );
  const buttonClass = "inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-3 text-xs font-semibold text-white/75 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <section aria-label="Review exports" className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
      <span className="mr-1 text-[9px] font-semibold uppercase tracking-widest text-white/35">Review exports</span>
      <button type="button" onClick={exportChapter} disabled={!response} className={buttonClass}>
        <Download size={13} /> Export Chapter (.md)
      </button>
      {batch && (
        <button type="button" onClick={exportBatch} className={buttonClass}>
          <Download size={13} /> Export Batch (.md)
        </button>
      )}
      <button type="button" onClick={exportRunData} className={buttonClass}>
        <FileJson size={13} /> Export Run Data (.json)
      </button>
    </section>
  );
}

export function ChapterGenerationTestFlow() {
  const uploadSequence = useRef(0);
  const manifestInFlight = useRef(false);
  const activeManifestController = useRef<AbortController | null>(null);
  const [choices, setChoices] = useState<ArtifactChoice[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [serverInfo, setServerInfo] = useState<ChapterGenerationServerInfo | null>(null);
  const [model, setModel] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [temporaryInstruction, setTemporaryInstruction] = useState("");
  const [loadingSources, setLoadingSources] = useState(true);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ManifestChapterResponse | null>(null);
  const [failedUsage, setFailedUsage] = useState<ChapterTokenUsageSummary | null>(null);
  const [generationFailure, setGenerationFailure] = useState<SafeChapterGenerationFailure | null>(null);
  const [singleStage, setSingleStage] = useState<ChapterUsageStage | null>(null);
  const [batch, setBatch] = useState<FiveChapterBatchState | null>(null);
  const [selectedBatchChapterNumber, setSelectedBatchChapterNumber] = useState(1);
  const [readerBatch, setReaderBatch] = useState<FiveChapterBatchState | null>(null);
  const [readerResult, setReaderResult] = useState<ManifestChapterResponse | null>(null);

  const abortActiveManifest = () => activeManifestController.current?.abort();

  const selectedChoice = choices.find(choice => choice.id === selectedId);
  const preflight = useMemo(() => {
    if (!selectedChoice?.artifact.blueprint) {
      return {
        mapping: null,
        artifact: null,
        error: selectedChoice
          ? "This Story Seed has no finalized World Blueprint. Choose another artifact or upload the paired export."
          : null,
      };
    }
    try {
      const adapted = adaptFinalizedStorySeedToChapterContracts({
        seed: selectedChoice.artifact.seed,
        blueprint: selectedChoice.artifact.blueprint,
        temporaryInstruction,
      });
      return {
        mapping: adapted.mapping,
        artifact: { seed: adapted.seed, blueprint: adapted.blueprint } satisfies StorySeedArtifact,
        error: null,
      };
    } catch (error) {
      return {
        mapping: null,
        artifact: null,
        error: error instanceof Error ? error.message : "The selected Story Seed is not generation-ready.",
      };
    }
  }, [selectedChoice, temporaryInstruction]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      listWorkshopStorySeeds(LOCAL_WORKSHOP_STORY_SEED_OWNER_ID),
      fetch(ENDPOINT, { headers: { Accept: "application/json" } }).then(async response => {
        if (!response.ok) throw new Error(await errorMessage(response));
        return response.json() as Promise<ChapterGenerationServerInfo>;
      }),
    ]).then(([recordsResult, infoResult]) => {
      if (cancelled) return;
      const errors: string[] = [];
      if (recordsResult.status === "fulfilled") {
        const saved = recordsResult.value.map(savedChoice);
        setChoices(current => [
          ...current.filter(choice => choice.source === "upload"),
          ...saved,
        ]);
        const firstReady = saved.find(choice => choice.artifact.blueprint) ?? saved[0];
        setSelectedId(current => current || firstReady?.id || "");
      } else {
        errors.push(recordsResult.reason instanceof Error
          ? recordsResult.reason.message
          : "Saved Story Seeds could not be read.");
      }
      if (infoResult.status === "fulfilled") {
        setServerInfo(infoResult.value);
        setModel(infoResult.value.defaultModel);
      } else {
        errors.push(infoResult.reason instanceof Error
          ? infoResult.reason.message
          : "Chapter Generation model configuration could not be read.");
      }
      setSourceError(errors.length > 0 ? errors.join(" ") : null);
      setLoadingSources(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => () => activeManifestController.current?.abort(), []);

  const selectChoice = (nextId: string) => {
    abortActiveManifest();
    setSelectedId(nextId);
    setResult(null);
    setBatch(null);
    setReaderBatch(null);
    setReaderResult(null);
    setFailedUsage(null);
    setGenerationFailure(null);
    setGenerationError(null);
  };

  const uploadArtifact = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setSourceError(null);
    try {
      const artifacts = parseStorySeedJson(await file.text(), { normalizeBlueprint: false });
      const batch = ++uploadSequence.current;
      const uploaded = artifacts.map((artifact, index): ArtifactChoice => ({
        id: `upload:${batch}:${index}`,
        label: `${titleForArtifact(artifact)} — ${file.name}${artifacts.length > 1 ? ` (${index + 1})` : ""}`,
        source: "upload",
        artifact,
      }));
      setChoices(current => [...current.filter(choice => choice.source === "saved"), ...uploaded]);
      const firstReady = uploaded.find(choice => choice.artifact.blueprint) ?? uploaded[0];
      selectChoice(firstReady.id);
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "The selected Story Seed file could not be read.");
    }
  };

  const manifestChapter = async (event: FormEvent) => {
    event.preventDefault();
    if (
      manifestInFlight.current
      || !selectedChoice
      || !model
      || !accessToken.trim()
      || preflight.error
      || !preflight.artifact
    ) return;
    manifestInFlight.current = true;
    const controller = new AbortController();
    activeManifestController.current = controller;
    setGenerating(true);
    setGenerationError(null);
    setResult(null);
    setBatch(null);
    setReaderResult(null);
    setFailedUsage(null);
    setGenerationFailure(null);
    setSingleStage(null);
    try {
      const response = await manifestThroughServer(
        {
          artifact: preflight.artifact,
          model,
          ...(temporaryInstruction.trim() ? { temporaryInstruction: temporaryInstruction.trim() } : {}),
        },
        accessToken.trim(),
        setSingleStage,
        controller.signal,
      );
      setResult(response);
    } catch (error) {
      const failure = error as ChapterBatchManifestFailure;
      setFailedUsage(failure.usage ?? null);
      setGenerationFailure(failure.failure ?? null);
      setGenerationError(error instanceof Error ? error.message : "Chapter manifestation failed.");
    } finally {
      if (activeManifestController.current === controller) activeManifestController.current = null;
      manifestInFlight.current = false;
      setGenerating(false);
      setSingleStage(null);
    }
  };

  const runBatch = async (initialState: FiveChapterBatchState) => {
    if (
      manifestInFlight.current
      || !selectedChoice
      || !model
      || !accessToken.trim()
      || preflight.error
      || !preflight.artifact
    ) return;
    manifestInFlight.current = true;
    const controller = new AbortController();
    activeManifestController.current = controller;
    setGenerating(true);
    setGenerationError(null);
    setResult(null);
    setFailedUsage(null);
    setGenerationFailure(null);
    try {
      const completed = await runFiveChapterBatch({
        state: initialState,
        request: {
          artifact: preflight.artifact,
          model,
          ...(temporaryInstruction.trim()
            ? { temporaryInstruction: temporaryInstruction.trim() }
            : {}),
        },
        manifestChapter: (request, onStage, signal) =>
          manifestThroughServer(request, accessToken.trim(), onStage, signal),
        onUpdate: update => {
          setBatch(update);
          const readableActive = update.chapters.find(chapter =>
            chapter.chapterNumber === update.activeChapterNumber
            && Boolean(chapter.result ?? chapter.attempts.at(-1)?.result));
          if (readableActive) setSelectedBatchChapterNumber(readableActive.chapterNumber);
        },
        signal: controller.signal,
      });
      setBatch(completed);
      const lastReadable = [...completed.chapters].reverse()
        .find(chapter => chapter.result ?? chapter.attempts.at(-1)?.result);
      if (lastReadable) setSelectedBatchChapterNumber(lastReadable.chapterNumber);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "The five-chapter batch failed unexpectedly.");
    } finally {
      if (activeManifestController.current === controller) activeManifestController.current = null;
      manifestInFlight.current = false;
      setGenerating(false);
    }
  };

  const manifestFiveChapters = () => {
    setSelectedBatchChapterNumber(1);
    void runBatch(createFiveChapterBatchState());
  };

  const retryBatchChapter = () => {
    if (batch?.status === "paused") void runBatch(batch);
  };

  const selectedBatchChapter = batch?.chapters.find(
    chapter => chapter.chapterNumber === selectedBatchChapterNumber,
  );
  const batchChapterResult = selectedBatchChapter?.result
    ?? selectedBatchChapter?.attempts.at(-1)?.result;
  const displayedResult = batchChapterResult ?? result;
  const selectedChapterUsage = selectedBatchChapter
    ? aggregateChapterTokenUsage(
        selectedBatchChapter.attempts.flatMap(attempt => attempt.usage.calls),
      )
    : undefined;
  const chapterForReading = displayedResult?.run.finalOutput ?? null;

  if (readerResult) {
    return (
      <SingleChapterReaderSession
        result={readerResult}
        onClose={() => setReaderResult(null)}
      />
    );
  }

  if (readerBatch) {
    return <FiveChapterReaderSession batch={readerBatch} onClose={() => setReaderBatch(null)} />;
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 overflow-x-hidden px-3 py-6 sm:px-5">
      <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.08] via-white/[0.03] to-violet-500/[0.05] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100/65">
              <BrainCircuit size={13} /> Chapter Generation 1.0 · Pass 2
            </div>
            <h2 className="mt-2 font-display text-xl text-white/95 sm:text-2xl">Manifest connected real chapters</h2>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              Manifest one chapter or run five sequential chapter-sized requests. Every next chapter starts from the previous chapter's final processed Living Story State.
            </p>
          </div>
          <Chip tone={serverInfo?.configured ? "emerald" : "amber"}>
            {!serverInfo
              ? "Checking server model"
              : serverInfo.configured
                ? "Server model ready"
                : "Server generation not configured"}
          </Chip>
        </div>

        <form onSubmit={manifestChapter} className="mt-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/55">
              Finalized Story Seed + Blueprint
              <select
                value={selectedId}
                onChange={event => selectChoice(event.target.value)}
                disabled={generating || loadingSources || choices.length === 0}
                className="min-h-11 w-full rounded-lg border border-white/10 bg-[#080b14] px-3 text-sm normal-case tracking-normal text-white/85 outline-none focus:border-cyan-500/60 disabled:opacity-50"
              >
                {choices.length === 0 && <option value="">No saved finalized artifacts</option>}
                {choices.map(choice => (
                  <option key={choice.id} value={choice.id}>
                    {choice.source === "saved" ? "Saved · " : "Upload · "}{choice.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-0 flex-col gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/55">
              Configured model
              <select
                value={model}
                onChange={event => {
                  abortActiveManifest();
                  setModel(event.target.value);
                  setResult(null);
                  setBatch(null);
                  setFailedUsage(null);
                  setGenerationFailure(null);
                }}
                disabled={generating || !serverInfo || serverInfo.models.length === 0}
                className="min-h-11 w-full rounded-lg border border-white/10 bg-[#080b14] px-3 text-sm normal-case tracking-normal text-white/85 outline-none focus:border-cyan-500/60 disabled:opacity-50"
              >
                {(serverInfo?.models ?? []).map(option => (
                  <option key={option.id} value={option.id}>{option.label} · {option.id}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/55">
            Development access token
            <input
              type="password"
              value={accessToken}
              onChange={event => {
                abortActiveManifest();
                setAccessToken(event.target.value);
                setResult(null);
                setFailedUsage(null);
                setGenerationFailure(null);
                setGenerationError(null);
              }}
              autoComplete="off"
              disabled={generating}
              placeholder="Enter the server-configured testing token"
              className="min-h-11 w-full rounded-lg border border-white/10 bg-[#080b14] px-3 text-sm font-normal normal-case tracking-normal text-white/85 outline-none placeholder:text-white/25 focus:border-cyan-500/60"
            />
            <span className="text-[9px] font-normal normal-case tracking-normal text-white/30">
              Held in memory for this page only. This is separate from the server-side Gemini key.
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10">
              <FileUp size={13} /> Upload Story Seed JSON
              <input type="file" accept="application/json,.json" onChange={uploadArtifact} disabled={generating} className="sr-only" />
            </label>
            {selectedChoice && (
              <div className="flex flex-wrap gap-1.5">
                <Chip tone="cyan">{titleForArtifact(selectedChoice.artifact)}</Chip>
                <Chip>{blueprintString(selectedChoice.artifact, "blueprintVersion") ?? "Blueprint missing"}</Chip>
                <Chip>Story Seed v3</Chip>
              </div>
            )}
          </div>

          <label className="flex flex-col gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/55">
            Temporary testing instruction <span className="normal-case tracking-normal text-white/30">optional · this run only</span>
            <textarea
              value={temporaryInstruction}
              onChange={event => {
                abortActiveManifest();
                setTemporaryInstruction(event.target.value);
                setResult(null);
                setBatch(null);
                setFailedUsage(null);
                setGenerationFailure(null);
                setGenerationError(null);
              }}
              maxLength={2_000}
              disabled={generating}
              rows={3}
              placeholder="Example: Let the opening breathe before the first irreversible choice."
              className="w-full resize-y rounded-lg border border-white/10 bg-[#080b14] px-3 py-2.5 text-sm font-normal normal-case leading-relaxed tracking-normal text-white/85 outline-none placeholder:text-white/25 focus:border-cyan-500/60"
            />
            <span className="self-end font-mono text-[9px] font-normal tracking-normal text-white/30">
              {temporaryInstruction.length.toLocaleString()} / 2,000
            </span>
          </label>

          {loadingSources && (
            <p className="flex items-center gap-2 text-xs text-white/45">
              <LoaderCircle size={13} className="animate-spin" /> Loading saved Story Seeds and server models…
            </p>
          )}
          {sourceError && <p role="alert" className="text-xs leading-relaxed text-rose-200/80">{sourceError}</p>}
          {preflight.error && <p role="alert" className="text-xs leading-relaxed text-amber-200/80">{preflight.error}</p>}
          {!loadingSources && choices.length === 0 && !sourceError && (
            <p className="text-xs leading-relaxed text-white/45">
              No finalized local Story Seed is available yet. Upload the portable JSON exported from Story Seed with its sibling Blueprint.
            </p>
          )}
          {preflight.mapping && <MappingLimits mapping={preflight.mapping} />}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={
                generating
                || !selectedChoice
                || !preflight.artifact
                || !model
                || !accessToken.trim()
                || Boolean(preflight.error)
                || !serverInfo?.configured
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-500/15 px-4 text-sm font-semibold text-cyan-50 transition-colors hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {generating
                ? <><LoaderCircle size={15} className="animate-spin" /> {batch ? "Manifesting Batch…" : "Manifesting Chapter…"}</>
                : <><Play size={14} /> Manifest Chapter</>}
            </button>
            <button
              type="button"
              onClick={manifestFiveChapters}
              disabled={
                generating
                || !selectedChoice
                || !preflight.artifact
                || !model
                || !accessToken.trim()
                || Boolean(preflight.error)
                || !serverInfo?.configured
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-violet-400/35 bg-violet-500/15 px-4 text-sm font-semibold text-violet-50 transition-colors hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {generating && batch
                ? <><LoaderCircle size={15} className="animate-spin" /> Manifesting 5 Chapters…</>
                : <><Layers3 size={14} /> Manifest 5 Chapters</>}
            </button>
            <p className="text-[10px] leading-relaxed text-white/35">
              Per chapter: 3 normal calls, or 5 with repair. Five healthy chapters: 15 calls. Nothing is saved.
            </p>
          </div>
          {singleStage && !batch && (
            <p className="flex items-center gap-2 text-xs text-cyan-100/65">
              <LoaderCircle size={13} className="animate-spin" /> {singleStage}
            </p>
          )}
          {generationError && <p role="alert" className="text-xs leading-relaxed text-rose-200/80">{generationError}</p>}
          {failedUsage && <ChapterUsageSummary usage={failedUsage} failed />}
        </form>
      </section>

      {batch && (
        <>
          <BatchProgress
            batch={batch}
            selectedChapterNumber={selectedBatchChapterNumber}
            onSelectChapter={setSelectedBatchChapterNumber}
            onRetry={retryBatchChapter}
            retrying={generating}
            onReadInReaderChamber={batch.status === "completed" ? () => setReaderBatch(batch) : undefined}
          />
          {batch.usage.calls.length > 0 && <ChapterUsageSummary usage={batch.usage} scope="Batch" />}
        </>
      )}

      {preflight.artifact && (batch || displayedResult || generationFailure) && (
        <ReviewExportActions
          title={titleForArtifact(preflight.artifact)}
          artifact={preflight.artifact}
          batch={batch}
          selectedChapter={selectedBatchChapter}
          response={displayedResult}
          failure={generationFailure}
          failureUsage={failedUsage}
        />
      )}

      {displayedResult && chapterForReading && (
        <>
          <ChapterUsageSummary
            result={selectedBatchChapter ? undefined : displayedResult}
            usage={selectedChapterUsage}
          />
          <section aria-labelledby="manifested-chapter-title" className="rounded-2xl border border-white/10 bg-black/20 px-3 py-4 sm:px-6 sm:py-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h2 id="manifested-chapter-title" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-white/90">
                  <BookOpen size={14} className="text-cyan-200/70" /> Manifested Chapter
                </h2>
                <p className="mt-1 text-[10px] text-white/35">
                  Complete four-stage run · {displayedResult.run.repairApplied ? "serious-issue repair applied" : "normal path completed"}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {!batch && result && (
                  <button
                    type="button"
                    onClick={() => setReaderResult(result)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-500/15 px-3 text-xs font-semibold text-cyan-50 hover:bg-cyan-500/25"
                  >
                    <BookOpen size={14} /> Read in Reader Chamber
                  </button>
                )}
                <Chip tone="emerald">
                  {formatTokens((selectedChapterUsage ?? displayedResult.usage).totals.totalTokens)} total tokens
                </Chip>
              </div>
            </div>
            <ManifestedChapterView
              chapter={chapterForReading}
              title={displayedResult.run.chapterPacket.chapterMission.title}
              repaired={displayedResult.run.repairApplied}
              generationSource={{ provider: displayedResult.provider, model: displayedResult.model }}
            />
          </section>
        </>
      )}

      <details className="group overflow-hidden rounded-xl border border-white/10 bg-black/25">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <FlaskConical size={13} className="text-violet-200/65" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-widest text-white/75">Diagnostics</span>
            <span className="mt-0.5 block text-[10px] text-white/35">
              Four-stage packet, plan, manifest, processing result, prompts, and raw JSON.
            </span>
          </span>
          <ChevronRight size={13} className="text-white/35 transition-transform group-open:rotate-90" />
        </summary>
        <div className="border-t border-white/10">
          {displayedResult ? (
            <ChapterGenerationWorkspace
              run={displayedResult.run}
              generationSource={{ provider: displayedResult.provider, model: displayedResult.model }}
            />
          ) : (
            <div className="flex items-start gap-2 px-4 py-5 text-xs leading-relaxed text-white/45">
              <ScrollText size={13} className="mt-0.5 shrink-0" />
              Manifest a real chapter to populate Diagnostics. Each completed batch chapter keeps its own diagnostics; no fixture run is substituted here.
            </div>
          )}
        </div>
      </details>
    </main>
  );
}

export default ChapterGenerationTestFlow;
