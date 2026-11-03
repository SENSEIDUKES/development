import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController, readHarnessWorkspaceState, type HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';

const adapter: HarnessGenerationModelAdapter = {
  getServerInfo: async () => ({ configured: true, provider: 'gemini', defaultModel: 'fixture', models: [] }),
  generate: vi.fn(async () => { throw new Error('No chapter is written here.'); }),
};

const setup = async () => {
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter: adapter });
  await controller.hydrate();
  const story = await controller.createStory({ premise: 'Yi Chen joins the Azure Sect.', destinedEnding: 'Glory.' });
  return { controller, repository, story };
};

describe('Publishing a story', () => {
  it('a new story stays private, in its creator\'s Create, until they publish it', async () => {
    const { story } = await setup();
    expect(story.visibility).toBe('private');
  });

  it('publishes and returns to a draft, keeping it on the device, and changes nothing else', async () => {
    const { controller, repository, story } = await setup();
    const before = controller.snapshot();
    const published = await controller.setStoryVisibility(story.id, 'public');
    expect(published.visibility).toBe('public');
    const saved = readHarnessWorkspaceState(await repository.load());
    expect(saved?.stories.find(entry => entry.id === story.id)?.visibility).toBe('public');
    // Who may read it changes; its chapters and Codex never do.
    const after = controller.snapshot();
    expect(after.chapters).toEqual(before.chapters);
    expect(after.codexEntries).toEqual(before.codexEntries);

    const draft = await controller.setStoryVisibility(story.id, 'private');
    expect(draft.visibility).toBe('private');
  });

  it('refuses a story that is not here', async () => {
    const { controller } = await setup();
    await expect(controller.setStoryVisibility('hst_missing', 'public')).rejects.toThrow('Open a Harness story before publishing it.');
  });
});
