/**
 * A model's JSON answer, read the way models actually return it. Asked for
 * JSON, a model may still wrap it in a Markdown code fence (```json … ```),
 * especially when its provider cannot enforce a schema and the schema is
 * given in the instructions instead (Claude, MiniMax; #495). Every reader of a
 * model's JSON answer goes through here, so a fence never costs a chapter's
 * tags or a World Blueprint again (SENSEI's 2026-10-31 test: both were lost to
 * a fence around otherwise complete answers).
 */

/** The answer as written, then the inside of a code fence around it. */
export function modelJsonCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```[a-z]*\s*([\s\S]*?)\s*```$/i)?.[1]?.trim();
  return [trimmed, fenced].filter((candidate): candidate is string => Boolean(candidate));
}

/** The first candidate that parses, or `undefined` when none does. */
export function parseModelJson(raw: string | undefined): unknown {
  for (const candidate of modelJsonCandidates(raw ?? '')) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Try the next reading.
    }
  }
  return undefined;
}
