import { ThinkingLevel } from '@google/genai';
import type { ReasoningLevel } from './catalog';

/** Gemini thinking level for a Router reasoning level (Gemini accepts minimal–high). */
export const geminiThinkingConfig = (level: ReasoningLevel | undefined) => {
  const thinkingLevel = level && ({ minimal: ThinkingLevel.MINIMAL, low: ThinkingLevel.LOW, medium: ThinkingLevel.MEDIUM, high: ThinkingLevel.HIGH } as Partial<Record<ReasoningLevel, ThinkingLevel>>)[level];
  return thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {};
};
