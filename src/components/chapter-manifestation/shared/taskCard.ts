/** Locked-reference adapter; not a published or live application surface. */
import { AGENTS } from '../../../lib/agents';
import { buildAILoadingTaskCard as buildLibraryTask, type AILoadingTaskInput } from '@seihouse/library/manifestations';
export type { LoadingTaskCard } from '@seihouse/sen/manifestations';
export function buildAILoadingTaskCard(input: AILoadingTaskInput) {
  return buildLibraryTask(input, input.activeAgentId === 'scout' ? AGENTS.SCOUT : AGENTS.VERSA);
}
