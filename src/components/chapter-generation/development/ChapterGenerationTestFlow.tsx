import {
  AlertTriangle,
  BookOpen,
  BrainCircuit,
  ChevronRight,
  Clock3,
  FileUp,
  FlaskConical,
  LoaderCircle,
  Play,
  ScrollText,
  Sigma,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type {
  ChapterGenerationErrorResponse,
  ChapterGenerationServerInfo,
  ManifestChapterResponse,
} from "../shared/liveChapterGeneration";
import { adaptFinalizedStorySeedToChapterContracts } from "../shared/packets/storySeedChapterAdapter";
import type { StorySeedChapterMappingReport } from "../shared/packets/storySeedChapterAdapter";
import type { ChapterModelCallUsage } from "../shared/pipeline/usage";
import type { ChapterTokenUsageSummary } from "../shared/pipeline/usage";
import {
  listWorkshopStorySeeds,
  LOCAL_WORKSHOP_STORY_SEED_OWNER_ID,
  type StorySeedArtifact,
  type StorySeedRecord,
} from "../../story-seed/shared/storySeedRepository";
import { parseStorySeedJson } from "../../story-seed/shared/storySeedSerialization";
import type { RawStorySeedArtifact } from "../../story-seed/shared/storySeedSerialization";
import ChapterGenerationWorkspace from "./ChapterGenerationWorkspace";
import ManifestedChapterView from "./ManifestedChapterView";
import { Chip } from "./workspaceUi";

const ENDPOINT = "/api/chapter-generation";

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
    </li>
  );
}

export function ChapterUsageSummary({
  result,
  usage,
  failed = false,
}: {
  result?: ManifestChapterResponse;
  usage?: ChapterTokenUsageSummary;
  failed?: boolean;
}) {
  const summary = usage ?? result?.usage;
  if (!summary) return null;
  const { totals } = summary;
  return (
    <section aria-labelledby="chapter-usage-title" className="overflow-hidden rounded-xl border border-white/10 bg-black/25">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-3 sm:px-4">
        <div>
          <h3 id="chapter-usage-title" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/80">
            <Sigma size={13} className="text-cyan-200/70" />
            {failed ? "Model Usage Before Failure" : "Model Usage"}
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
          <div className="text-[9px] uppercase tracking-wider text-white/35">Chapter input</div>
          <div className="font-mono text-sm text-cyan-100">{formatTokens(totals.inputTokens)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-white/35">Chapter output</div>
          <div className="font-mono text-sm text-cyan-100">{formatTokens(totals.outputTokens)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-white/35">Chapter total</div>
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
        <AlertTriangle size={12} /> Truthful one-chapter bridge
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
      ...(body.usage ? { usage: body.usage } : {}),
    };
  } catch {
    return { error: `Chapter generation failed (${response.status}).` };
  }
};

const errorMessage = async (response: Response): Promise<string> =>
  (await readErrorResponse(response)).error;

export function ChapterGenerationTestFlow() {
  const uploadSequence = useRef(0);
  const manifestInFlight = useRef(false);
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

  const selectChoice = (nextId: string) => {
    setSelectedId(nextId);
    setResult(null);
    setFailedUsage(null);
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
    setGenerating(true);
    setGenerationError(null);
    setResult(null);
    setFailedUsage(null);
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${accessToken.trim()}`,
        },
        body: JSON.stringify({
          artifact: preflight.artifact,
          model,
          ...(temporaryInstruction.trim() ? { temporaryInstruction: temporaryInstruction.trim() } : {}),
        }),
      });
      if (!response.ok) {
        const failure = await readErrorResponse(response);
        setFailedUsage(failure.usage ?? null);
        throw new Error(failure.error);
      }
      setResult(await response.json() as ManifestChapterResponse);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Chapter manifestation failed.");
    } finally {
      manifestInFlight.current = false;
      setGenerating(false);
    }
  };

  const chapterForReading = result
    ? (result.run.repairApplied ? result.run.finalOutput : result.run.manifestedChapter)
    : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 overflow-x-hidden px-3 py-6 sm:px-5">
      <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.08] via-white/[0.03] to-violet-500/[0.05] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100/65">
              <BrainCircuit size={13} /> Chapter Generation 1.0 · Pass 1
            </div>
            <h2 className="mt-2 font-display text-xl text-white/95 sm:text-2xl">Manifest one real chapter</h2>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              Use one finalized Story Seed and its reviewed Blueprint. The server assembles the Chapter Packet in code, then calls Plan, Manifest, and Process exactly once on a healthy run.
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
                  setModel(event.target.value);
                  setResult(null);
                  setFailedUsage(null);
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
                setAccessToken(event.target.value);
                setResult(null);
                setFailedUsage(null);
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
                setTemporaryInstruction(event.target.value);
                setResult(null);
                setFailedUsage(null);
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
                ? <><LoaderCircle size={15} className="animate-spin" /> Manifesting Chapter…</>
                : <><Play size={14} /> Manifest Chapter</>}
            </button>
            <p className="text-[10px] leading-relaxed text-white/35">
              Normal: 3 model calls. Serious repair: 5 total calls. Nothing is saved.
            </p>
          </div>
          {generationError && <p role="alert" className="text-xs leading-relaxed text-rose-200/80">{generationError}</p>}
          {failedUsage && <ChapterUsageSummary usage={failedUsage} failed />}
        </form>
      </section>

      {result && chapterForReading && (
        <>
          <ChapterUsageSummary result={result} />
          <section aria-labelledby="manifested-chapter-title" className="rounded-2xl border border-white/10 bg-black/20 px-3 py-4 sm:px-6 sm:py-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h2 id="manifested-chapter-title" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-white/90">
                  <BookOpen size={14} className="text-cyan-200/70" /> Manifested Chapter
                </h2>
                <p className="mt-1 text-[10px] text-white/35">
                  Complete four-stage run · {result.run.repairApplied ? "serious-issue repair applied" : "normal path completed"}
                </p>
              </div>
              <Chip tone="emerald">{formatTokens(result.usage.totals.totalTokens)} total tokens</Chip>
            </div>
            <ManifestedChapterView
              chapter={chapterForReading}
              title={result.run.chapterPacket.chapterMission.title}
              repaired={result.run.repairApplied}
              generationSource={{ provider: result.provider, model: result.model }}
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
          {result ? (
            <ChapterGenerationWorkspace
              run={result.run}
              generationSource={{ provider: result.provider, model: result.model }}
            />
          ) : (
            <div className="flex items-start gap-2 px-4 py-5 text-xs leading-relaxed text-white/45">
              <ScrollText size={13} className="mt-0.5 shrink-0" />
              Manifest a real chapter to populate Diagnostics. No fixture run is substituted here.
            </div>
          )}
        </div>
      </details>
    </main>
  );
}

export default ChapterGenerationTestFlow;
