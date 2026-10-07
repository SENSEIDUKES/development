/**
 * WORKSHOP SEAM — not production code.
 *
 * Production's `src/lib/persistence/index.ts` (Light-Novels main @ 647165a)
 * re-exports the persistence client, which sends every call to the
 * authenticated `/api/persistence` service backed by PostgreSQL. This
 * stand-in keeps only the calls the copied Reader makes and answers them from
 * memory: the story's Lore Glossary, the reader's profile and the image quota.
 */
import type { LoreGlossary, UserProfile } from '../../types';

let glossary: LoreGlossary[] = [];
let profile: UserProfile | null = null;
let imageGenerationCount = 0;

const newTermId = () => `workshop-term-${Math.random().toString(36).slice(2, 10)}`;

export async function getLoreGlossary(storyId: string): Promise<LoreGlossary[]> {
  return glossary.filter((term) => term.novel_id === storyId).map((term) => ({ ...term }));
}

export async function saveLoreGlossaryTerm(
  term: Omit<LoreGlossary, 'id'> & { id?: string },
): Promise<LoreGlossary> {
  const saved: LoreGlossary = { ...term, id: term.id ?? newTermId() };
  glossary = [...glossary.filter((existing) => existing.id !== saved.id), saved];
  return { ...saved };
}

export async function deleteLoreGlossaryTerm(termId: string): Promise<void> {
  glossary = glossary.filter((term) => term.id !== termId);
}

export interface PersistenceMutationOptions {
  expectedSyncRevision?: string | null;
  idempotencyKey?: string;
  keepalive?: boolean;
}

export async function getUserProfile(_expectedUid?: string): Promise<UserProfile | null> {
  return profile;
}

export async function saveUserProfile(
  value: Partial<UserProfile>,
  _options: PersistenceMutationOptions = {},
): Promise<UserProfile> {
  profile = { ...(profile ?? {}), ...value } as UserProfile;
  return profile;
}

export async function consumeImageGenerationQuota(): Promise<{
  imageGenerationCount: number;
  imageQuotaResetAt: string;
}> {
  imageGenerationCount += 1;
  return {
    imageGenerationCount,
    imageQuotaResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/** Workshop only: start the preview with this glossary and no saved profile. */
export function seedWorkshopPersistence(next: { glossary?: LoreGlossary[] } = {}): void {
  glossary = (next.glossary ?? []).map((term) => ({ ...term }));
  profile = null;
  imageGenerationCount = 0;
}
