import type { MemoryProvenance } from '../types';
import { normalizeCodexAliases } from './codexContext';

export interface CodexEntryContextValue {
  aliases?: string[];
  contextPriority?: number;
  authorContextNote?: string;
  provenance?: MemoryProvenance;
}

export function normalizeCodexEntryContext(
  value: CodexEntryContextValue,
  existingProvenance?: MemoryProvenance,
  canonicalName?: string,
): CodexEntryContextValue {
  const aliases = normalizeCodexAliases(value.aliases, canonicalName);
  const authorContextNote = value.authorContextNote?.trim();
  const contextPriority = typeof value.contextPriority === 'number'
    && Number.isFinite(value.contextPriority)
    ? value.contextPriority
    : undefined;
  const provenanceDraft = existingProvenance || value.provenance
    ? { ...existingProvenance, ...value.provenance }
    : undefined;
  if (provenanceDraft?.isUserPinned === false) {
    delete provenanceDraft.isUserPinned;
  }
  const provenance = provenanceDraft && Object.keys(provenanceDraft).length > 0
    ? provenanceDraft
    : undefined;

  return {
    aliases: aliases.length > 0 ? aliases : undefined,
    contextPriority,
    authorContextNote: authorContextNote || undefined,
    provenance,
  };
}
