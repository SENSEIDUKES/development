import { preserveSemanticEvents, readHarnessMemoryEvents } from '../components/harness-generation/shared/responseAcceptance';
import type { HarnessGenerationController } from '../components/harness-generation/shared/controller';
import type { HarnessGenerationRepository } from '../components/harness-generation/shared/repository';

/** Seed historical committed events to exercise readers retained after extraction retired. No provider call. */
export async function seedLegacyChapterEvents(
  controller: HarnessGenerationController,
  repository: HarnessGenerationRepository,
  body: unknown,
) {
  const state = controller.snapshot();
  const chapter = state.chapters.at(-1)!;
  const result = preserveSemanticEvents(readHarnessMemoryEvents(JSON.stringify(body)), {
    storyId: chapter.storyId, attemptId: chapter.attemptId, chapterNumber: chapter.chapterNumber,
    createdAt: chapter.committedAt, prose: chapter.prose, eventNamespace: `historical-${state.events.length}`,
  });
  for (const event of result.events) {
    state.events.push({ ...event, chapterId: chapter.id });
    chapter.eventIds.push(event.id);
  }
  await repository.save(state);
  await controller.hydrate();
  await controller.replayStory(chapter.storyId, chapter.id);
}
