import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { StorySeedArtifact } from "../../components/story-seed/shared/storySeedRepository";
import {
  assertChapterContinuation,
  type AuthenticatedChapterGenerationContinuation,
  type ChapterGenerationContinuation,
} from "../../components/chapter-generation/shared/batch/chapterBatch";

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      const entry = (value as Record<string, unknown>)[key];
      if (entry !== undefined) result[key] = canonicalize(entry);
      return result;
    }, {});
};

const canonicalJson = (value: unknown): string => JSON.stringify(canonicalize(value));

const artifactDigest = (artifact: StorySeedArtifact): string => createHash("sha256")
  .update(canonicalJson({ seed: artifact.seed, blueprint: artifact.blueprint }))
  .digest("base64url");

const unsignedContinuation = (
  continuation: ChapterGenerationContinuation,
): ChapterGenerationContinuation => ({
  version: continuation.version,
  livingStoryState: structuredClone(continuation.livingStoryState),
  chapterMission: structuredClone(continuation.chapterMission),
});

const signatureFor = (
  continuation: ChapterGenerationContinuation,
  digest: string,
  secret: string,
): string => createHmac("sha256", secret)
  .update(`chapter-generation-continuation:v1\n${digest}\n${canonicalJson(unsignedContinuation(continuation))}`)
  .digest("base64url");

const safelyMatches = (actual: string, expected: string): boolean => {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
};

/** Signs disposable continuation state and binds it to the canonical input artifacts. */
export const sealChapterContinuation = (input: {
  continuation: ChapterGenerationContinuation;
  artifact: StorySeedArtifact;
  secret: string;
}): AuthenticatedChapterGenerationContinuation => {
  assertChapterContinuation(input.continuation);
  const digest = artifactDigest(input.artifact);
  return {
    ...unsignedContinuation(input.continuation),
    proof: {
      version: 1,
      artifactDigest: digest,
      signature: signatureFor(input.continuation, digest, input.secret),
    },
  };
};

/** Returns proof-free state only after its signature and artifact binding are verified. */
export const verifyChapterContinuation = (input: {
  continuation: ChapterGenerationContinuation;
  artifact: StorySeedArtifact;
  secret: string;
}): ChapterGenerationContinuation => {
  assertChapterContinuation(input.continuation);
  const proof = input.continuation.proof;
  if (!proof || proof.version !== 1 || !proof.artifactDigest || !proof.signature) {
    throw new Error("Chapter continuation proof is missing or unsupported.");
  }
  const expectedDigest = artifactDigest(input.artifact);
  if (!safelyMatches(proof.artifactDigest, expectedDigest)) {
    throw new Error("Chapter continuation does not belong to the selected Story Seed and Blueprint.");
  }
  const expectedSignature = signatureFor(input.continuation, expectedDigest, input.secret);
  if (!safelyMatches(proof.signature, expectedSignature)) {
    throw new Error("Chapter continuation signature is invalid.");
  }
  return unsignedContinuation(input.continuation);
};
