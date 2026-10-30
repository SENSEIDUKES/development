import type { StorySpark, StorySparkRequest } from '../../story-seed/shared/storySpark';

export type StorySparkUsage = { unlimited: true } | { unlimited: false; limit: number; remaining: number; resetsAt: number | null };
export interface StorySparkStatus { configured: boolean; usage?: StorySparkUsage }

/**
 * Sparks' host: where its Story Sparks come from and where a planted one
 * goes. Every part is optional; without a writer, Sparks offers its own
 * hand-written sparks. Using and saving stay with the host.
 */
export interface SparkHost {
  /** Whether `requestSpark` can be used now (a model is configured). */
  checkSparks?: () => Promise<boolean | StorySparkStatus>;
  requestSpark?: (request: StorySparkRequest, signal?: AbortSignal, onUsage?: (usage: StorySparkUsage) => void) => Promise<StorySpark>;
  /** Keeps the spark in the Story Bank as a new Story Seed. */
  keepSpark?: (spark: StorySpark) => Promise<void>;
  /** Plants the spark: a new Story Seed it opens, or (inside a Story Seed) the open seed's Origin. */
  beginSpark?: (spark: StorySpark) => Promise<void>;
}
