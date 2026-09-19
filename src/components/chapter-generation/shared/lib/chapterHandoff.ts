/**
 * Verbatim port of Light-Novels `src/lib/chapterHandoff.ts` (verified against
 * `main`). Pure — no network/DB — safe to run in the Workshop.
 */
import { ChapterContract, ChapterEndState, ChapterHandoff, ContractReport, SceneActionType, SceneFingerprint } from '../../../../narrative/chapter';

export const SCENE_ACTION_TYPES: SceneActionType[] = [
  "battle",
  "duel",
  "breakthrough",
  "acquisition",
  "discovery",
  "death",
  "travel-arrival",
  "social",
  "training",
  "ritual",
  "escape",
  "revelation",
  "other",
];

const MAX_COMPLETED_EVENTS = 6;
const MAX_FINGERPRINTS = 8;
const MAX_PARTICIPANTS = 6;
const MAX_DO_NOT_REPEAT = 8;
const MAX_LINE_LENGTH = 220;

const cleanLine = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > MAX_LINE_LENGTH
    ? `${trimmed.slice(0, MAX_LINE_LENGTH - 3)}...`
    : trimmed;
};

const cleanLineArray = (value: unknown, max: number): string[] =>
  Array.isArray(value)
    ? value.map(cleanLine).filter((line): line is string => Boolean(line)).slice(0, max)
    : [];

export const normalizeSceneActionType = (value: unknown): SceneActionType => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (SCENE_ACTION_TYPES as string[]).includes(normalized)
    ? (normalized as SceneActionType)
    : "other";
};

const sanitizeFingerprint = (
  raw: any,
  chapterNumber: number,
): SceneFingerprint | null => {
  const participants = cleanLineArray(raw?.participants, MAX_PARTICIPANTS);
  const outcome = cleanLine(raw?.outcome);
  if (participants.length === 0 || !outcome) return null;
  return {
    actionType: normalizeSceneActionType(raw?.actionType),
    participants,
    location: cleanLine(raw?.location),
    outcome,
    chapterNumber,
  };
};

const sanitizeEndState = (raw: any): ChapterEndState => ({
  location: cleanLine(raw?.location),
  timeMarker: cleanLine(raw?.timeMarker),
  charactersPresent: cleanLineArray(raw?.charactersPresent, MAX_PARTICIPANTS),
  mcCondition: cleanLine(raw?.mcCondition),
  openTension: cleanLine(raw?.openTension),
});

export const sanitizeChapterHandoff = (
  raw: any,
  chapterNumber: number,
): ChapterHandoff | undefined => {
  if (!raw || typeof raw !== "object") return undefined;

  const endState = sanitizeEndState(raw.endState);
  const completedEvents = cleanLineArray(raw.completedEvents, MAX_COMPLETED_EVENTS);
  const fingerprints = (Array.isArray(raw.fingerprints) ? raw.fingerprints : [])
    .map((fp: any) => sanitizeFingerprint(fp, chapterNumber))
    .filter((fp: SceneFingerprint | null): fp is SceneFingerprint => fp !== null)
    .slice(0, MAX_FINGERPRINTS);
  const nextImmediateAction = cleanLine(raw.nextImmediateAction);

  const hasContent =
    completedEvents.length > 0
    || fingerprints.length > 0
    || Boolean(nextImmediateAction)
    || Object.values(endState).some(value =>
      Array.isArray(value) ? value.length > 0 : Boolean(value));
  if (!hasContent) return undefined;

  return {
    version: 1,
    chapterNumber,
    endState,
    completedEvents,
    nextImmediateAction,
    fingerprints,
  };
};

export const sanitizeContractReport = (raw: any): ContractReport | undefined => {
  if (!raw || typeof raw !== "object") return undefined;
  if (typeof raw.objectiveFulfilled !== "boolean") return undefined;
  return {
    objectiveFulfilled: raw.objectiveFulfilled,
    evidence: cleanLine(raw.evidence),
    openingMatched: typeof raw.openingMatched === "boolean"
      ? raw.openingMatched
      : undefined,
  };
};

export const fingerprintToDoNotRepeatLine = (fp: SceneFingerprint): string => {
  const where = fp.location ? ` at ${fp.location}` : "";
  return `Ch ${fp.chapterNumber}: ${fp.actionType} — ${fp.participants.join(", ")}${where} → ${fp.outcome}`;
};

export const buildChapterContract = (input: {
  chapterNumber: number;
  premise: string;
  previousHandoff?: ChapterHandoff;
  recentFingerprints?: SceneFingerprint[];
}): ChapterContract | undefined => {
  const objective = cleanLine(input.premise);
  const { previousHandoff } = input;
  if (!objective && !previousHandoff) return undefined;

  const doNotRepeat: string[] = [];
  if (previousHandoff) {
    doNotRepeat.push(
      ...previousHandoff.completedEvents.map(
        event => `Ch ${previousHandoff.chapterNumber}: ${event}`,
      ),
    );
  }
  const olderFingerprints = (input.recentFingerprints || [])
    .filter(fp =>
      fp.chapterNumber < input.chapterNumber
      && fp.chapterNumber !== previousHandoff?.chapterNumber)
    .sort((a, b) => b.chapterNumber - a.chapterNumber);
  for (const fp of olderFingerprints) {
    if (doNotRepeat.length >= MAX_DO_NOT_REPEAT) break;
    doNotRepeat.push(fingerprintToDoNotRepeatLine(fp));
  }

  return {
    version: 1,
    chapterNumber: input.chapterNumber,
    startingState: previousHandoff?.endState,
    requiredOpening: previousHandoff?.nextImmediateAction,
    objective: objective || "",
    doNotRepeat: doNotRepeat.slice(0, MAX_DO_NOT_REPEAT),
  };
};

export interface RenderedContractLines {
  coreLines: string[];
  doNotRepeatLines: string[];
}

export const renderChapterContractLines = (
  contract: ChapterContract,
): RenderedContractLines => {
  const coreLines: string[] = [];

  const state = contract.startingState;
  if (state) {
    const stateParts = [
      state.location ? `Location: ${state.location}` : "",
      state.timeMarker ? `Time: ${state.timeMarker}` : "",
      state.charactersPresent?.length
        ? `Present: ${state.charactersPresent.join(", ")}`
        : "",
      state.mcCondition ? `MC condition: ${state.mcCondition}` : "",
      state.openTension ? `Open tension: ${state.openTension}` : "",
    ].filter(Boolean);
    if (stateParts.length > 0) {
      coreLines.push(`Opening state (canon): ${stateParts.join(" | ")}`);
    }
  }
  if (contract.requiredOpening) {
    coreLines.push(`Open with, or explicitly continue past: ${contract.requiredOpening}`);
  }
  if (contract.objective) {
    coreLines.push(`Objective of this chapter: ${contract.objective}`);
  }
  if (contract.completionCriteria?.length) {
    coreLines.push(
      "Completion criteria:",
      ...contract.completionCriteria.map(criterion => `- ${criterion}`),
    );
  }
  if (coreLines.length > 0) {
    coreLines.push(
      "This contract is canon. Continue forward from the opening state; never rewind before it.",
    );
  }

  const doNotRepeat = contract.doNotRepeat ?? [];
  const doNotRepeatLines = doNotRepeat.length > 0
    ? [
        "ALREADY HAPPENED — canon, never re-narrate or replay as new events:",
        ...doNotRepeat.map(line => `- ${line}`),
      ]
    : [];

  return { coreLines, doNotRepeatLines };
};

export const formatHandoffContextForGuard = (
  handoff: ChapterHandoff,
): string => {
  const lines: string[] = [];
  const state = handoff.endState;
  const stateParts = [
    state.location ? `location: ${state.location}` : "",
    state.timeMarker ? `time: ${state.timeMarker}` : "",
    state.charactersPresent?.length
      ? `present: ${state.charactersPresent.join(", ")}`
      : "",
    state.mcCondition ? `MC: ${state.mcCondition}` : "",
  ].filter(Boolean);
  if (stateParts.length > 0) {
    lines.push(`Chapter ${handoff.chapterNumber} ended — ${stateParts.join(" | ")}`);
  }
  if (handoff.completedEvents.length > 0) {
    lines.push(
      "Completed events (canon, already happened):",
      ...handoff.completedEvents.map(event => `- ${event}`),
    );
  }
  if (handoff.nextImmediateAction) {
    lines.push(`Expected next beat: ${handoff.nextImmediateAction}`);
  }
  return lines.join("\n");
};
