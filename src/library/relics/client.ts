import type { RelicConditionDisclosure, RelicRewardDefinition, StoryRelicAssignment } from './contracts';
import type { CosmicArtifact } from './view';

/** Redacted read model. Evaluator inputs and completion evidence stay server-side. */
export interface RelicAssignmentView {
  id: string;
  storyId: string;
  status: StoryRelicAssignment['status'];
  name: string;
  description: string;
  condition: RelicConditionDisclosure;
  rewards: RelicRewardDefinition;
  progress: { current: number; target: number; unit?: string };
}
export interface RelicsSnapshot { earned: CosmicArtifact[]; assignments: RelicAssignmentView[] }
/** Host binds authenticated identity. No client grant/evaluate/award operation exists. */
export interface RelicsClient { getSnapshot(storyId?: string): Promise<RelicsSnapshot> }
