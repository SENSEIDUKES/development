import type { CSSProperties } from 'react';
import {
  buildSystemContext,
  getColorCodeValue,
  getSystemColorMeaning,
  getSystemColorStyle,
  resolveFateFlagColorCode,
} from './colorCodes';
import type { ColorCodeId, SystemColorMeaning } from './colorCodes';
import type {
  FateResultData,
  SystemEvent,
  SystemPromptChange,
  SystemPromptPresentation,
  WorldNoticeData,
  WorldNoticeEntry,
} from './types';

/** The Reader-only rendering outcome for every supported structured System form. */
export type SystemPromptRoutePresentation = SystemPromptPresentation | 'fate';

/** A normalized System fact safe for either regular System presentation. */
export interface SystemPromptRow {
  label: string;
  value: string;
  trend?: 'up' | 'down';
}

interface RegularSystemPromptRoute {
  system: SystemEvent;
  rows: SystemPromptRow[];
  changes: SystemPromptChange[];
}

/**
 * The one Reader routing boundary for structured System blocks.
 *
 * `kind` chooses Fate; a regular prompt's authored `presentation` chooses one
 * of the three regular renderers. Legacy regular data deliberately retains its
 * historical shape-based fallback at this boundary only.
 */
export type SystemPromptRoute =
  | (RegularSystemPromptRoute & {
      presentation: 'narrative' | 'mechanical';
    })
  | (RegularSystemPromptRoute & {
      presentation: 'world_notice';
      worldNotice: WorldNoticeData;
    })
  | {
      presentation: 'fate';
      system: SystemEvent;
      fateResult: FateResultData;
    };

export interface SystemPromptSurface {
  meaning: SystemColorMeaning;
  fateFlag?: 'death' | 'ironFate';
  fateFlagColorCode?: ColorCodeId;
}

type JsonRecord = Record<string, unknown>;

const FATE_OUTCOMES: FateResultData['outcome'][] = [
  'FATE AVERTED',
  'FATE SCARRED',
  'DOOM MANIFESTED',
];

const isRecord = (value: unknown): value is JsonRecord => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const cleanText = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim() ? value.trim() : undefined
);

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap(item => {
    const text = cleanText(item);
    return text ? [text] : [];
  });
};

/** Runtime guard for a public Fate Result card payload. */
export function normalizeFateResultData(value: unknown): FateResultData | undefined {
  if (!isRecord(value)) return undefined;
  const outcome = cleanText(value.outcome);
  const timelineScar = cleanText(value.timelineScar);
  const permanentCosts = normalizeStringArray(value.permanentCosts);
  if (
    !outcome
    || !FATE_OUTCOMES.includes(outcome as FateResultData['outcome'])
    || !timelineScar
    || !permanentCosts
  ) {
    return undefined;
  }

  const newStoryState = cleanText(value.newStoryState);
  const newActiveStats = normalizeStringArray(value.newActiveStats);
  const genreShift = cleanText(value.genreShift);
  return {
    outcome: outcome as FateResultData['outcome'],
    timelineScar,
    permanentCosts,
    ...(newStoryState ? { newStoryState } : {}),
    ...(newActiveStats && newActiveStats.length > 0 ? { newActiveStats } : {}),
    ...(genreShift ? { genreShift } : {}),
  };
}

function normalizeWorldNoticeEntry(value: unknown): WorldNoticeEntry | undefined {
  if (!isRecord(value)) return undefined;
  const title = cleanText(value.title);
  if (!title) return undefined;

  const body = cleanText(value.body);
  const details = Array.isArray(value.details)
    ? value.details.flatMap(detail => {
        if (!isRecord(detail)) return [];
        const label = cleanText(detail.label);
        const detailValue = cleanText(detail.value);
        return label && detailValue ? [{ label, value: detailValue }] : [];
      })
    : undefined;

  return {
    title,
    ...(body ? { body } : {}),
    ...(details && details.length > 0 ? { details } : {}),
  };
}

/** Runtime guard for historical or externally supplied World Notice data. */
export function normalizeWorldNoticeData(value: unknown): WorldNoticeData | undefined {
  if (!isRecord(value) || !Array.isArray(value.entries)) return undefined;
  const entries = value.entries.flatMap(entry => {
    const normalized = normalizeWorldNoticeEntry(entry);
    return normalized ? [normalized] : [];
  });
  return entries.length > 0 ? { entries } : undefined;
}

/** Normalizes loose runtime rows before either regular renderer can read them. */
export function normalizeSystemPromptRows(value: unknown): SystemPromptRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(row => {
    if (!isRecord(row)) return [];
    const label = cleanText(row.label);
    const rowValue = cleanText(row.value);
    if (!label || !rowValue) return [];
    const trend = row.trend === 'up' || row.trend === 'down' ? row.trend : undefined;
    return [{ label, value: rowValue, ...(trend ? { trend } : {}) }];
  });
}

/** Normalizes loose runtime changes before narrative outcome rendering. */
export function normalizeSystemPromptChanges(value: unknown): SystemPromptChange[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(change => {
    if (!isRecord(change)) return [];
    const label = cleanText(change.label);
    const direction = change.direction === 'gain' || change.direction === 'loss'
      ? change.direction
      : undefined;
    if (!label || !direction) return [];
    const tone = ['positive', 'uncertain', 'warning', 'negative'].includes(String(change.tone))
      ? change.tone as SystemPromptChange['tone']
      : undefined;
    return [{ direction, label, ...(tone ? { tone } : {}) }];
  });
}

/**
 * Resolves the only legal presentation route for the Reader. It never uses
 * `promptType` to choose layout: colors remain semantic, and form selection
 * stays structural.
 */
export function resolveSystemPromptRoute(system?: SystemEvent): SystemPromptRoute | undefined {
  if (!system) return undefined;

  if (system.kind === 'fate_system_prompt') {
    const fateResult = normalizeFateResultData(system.fateResult);
    return fateResult ? { presentation: 'fate', system, fateResult } : undefined;
  }

  const rows = normalizeSystemPromptRows(system.rows);
  const changes = normalizeSystemPromptChanges(system.changes);
  const requested = 'presentation' in system ? system.presentation : undefined;
  if (requested === 'world_notice') {
    const worldNotice = normalizeWorldNoticeData(
      'worldNotice' in system ? system.worldNotice : undefined,
    );
    return worldNotice
      ? { presentation: 'world_notice', system, rows, changes, worldNotice }
      : undefined;
  }
  if (requested === 'narrative' || requested === 'mechanical') {
    return { presentation: requested, system, rows, changes };
  }

  return {
    presentation: rows.length === 0 || changes.length > 0 ? 'narrative' : 'mechanical',
    system,
    rows,
    changes,
  };
}

function getFateFlag(system: SystemEvent | undefined, content: string): SystemPromptSurface['fateFlag'] {
  const source = `${system?.title ?? ''}|${system?.kind ?? ''}|${content}`.toLowerCase();
  if (source.includes('death flag')) return 'death';
  if (source.includes('iron fate')) return 'ironFate';
  return undefined;
}

/** Shared semantic color context for Narrative, Mechanical, and World Notice. */
export function getSystemPromptSurface(system: SystemEvent | undefined, content: string): SystemPromptSurface {
  const fateFlag = getFateFlag(system, content);
  return {
    meaning: getSystemColorMeaning(
      system?.promptType,
      buildSystemContext(system, content),
    ),
    ...(fateFlag ? {
      fateFlag,
      fateFlagColorCode: resolveFateFlagColorCode(fateFlag),
    } : {}),
  };
}

/** One shared root style keeps all regular forms on the same semantic palette. */
export function getSystemPromptSurfaceStyle(
  surface: SystemPromptSurface,
  suppliedStyle?: CSSProperties,
): CSSProperties {
  return {
    ...getSystemColorStyle(surface.meaning),
    ...(surface.fateFlagColorCode
      ? { '--fate-flag-color': getColorCodeValue(surface.fateFlagColorCode) }
      : {}),
    ...suppliedStyle,
  } as CSSProperties;
}

/** Mechanical and legacy forms share the existing semantic panel class recipe. */
export function getSystemPromptSurfaceClasses(surface: SystemPromptSurface): string {
  const { meaning } = surface;
  const base = `${meaning.borderColor} ${meaning.textColor} ${meaning.bgColor} shadow-[0_0_15px_color-mix(in_srgb,var(--system-color)_15%,transparent)]`;
  return `${base}${meaning.type === 'system_error' ? ' animate-pulse' : ''}${surface.fateFlag ? ' animate-menacing-fate' : ''}`;
}
