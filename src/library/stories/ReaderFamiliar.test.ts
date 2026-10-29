import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../test-utils/InMemoryHarnessGenerationRepository';
import type { SoundCueAttachment } from '@seihouse/sen/audio';
import { matchFamiliarCommand } from '../familiars/helper';
import { createModeFamiliarContext, readerFamiliarContext } from './ReaderFamiliar';

const tools = { chapterId: 'no-chapter', busy: false, interruptPlayback: () => () => {} };
async function setup() {
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter: {
    getServerInfo: async () => ({ configured: false, provider: 'fixture', models: [], defaultModel: '' }),
    generate: async () => { throw new Error('Voice must not call generation.'); },
  } });
  await controller.hydrate();
  const story = await controller.createStory({ premise: 'A courier returns.' });
  return { controller, story, repository };
}
describe('Reader actions for the Familiar', () => {
  it('saves every preset and exact custom text through the real Fate controller and survives reload', async () => {
    const { controller, story, repository } = await setup();
    const context = readerFamiliarContext(controller.snapshot(), story.id, controller, tools);
    for (const id of ['worldBuilding', 'progression', 'conflict']) {
      await context.actions.find(action => action.id === id)!.run('');
      expect(controller.snapshot().stories[0].nextChapterDirection?.choice).toEqual({ kind: 'chapter-function', chapterFunction: id });
    }
    await context.actions.find(action => action.id === 'custom')!.run('赵 leaves the sect. Keep this exact.');
    const restored = await repository.load();
    expect(restored?.stories[0].nextChapterDirection?.choice).toEqual({ kind: 'reader', text: '赵 leaves the sect. Keep this exact.' });
    expect(controller.snapshot().chapters).toHaveLength(0);
  });
  it('rejects a request prepared for a different chapter and offers no actions while writing', async () => {
    const { controller, story } = await setup();
    const snapshot = controller.snapshot();
    snapshot.stories[0].head.nextChapterNumber = 2;
    const stale = readerFamiliarContext(snapshot, story.id, controller, tools);
    await expect(stale.actions[0].run('')).rejects.toThrow('next chapter changed');
    expect(readerFamiliarContext(controller.snapshot(), story.id, controller, { ...tools, busy: true }).actions).toHaveLength(0);
  });
  it('keeps Fate in the Reader and Sound Cues in Create mode, never guessing a sound', async () => {
    const { controller, story } = await setup();
    expect(readerFamiliarContext(controller.snapshot(), story.id, controller, tools).actions.map(action => action.id))
      .toEqual(['worldBuilding', 'progression', 'conflict', 'custom']);
    const cue = { anchor: { selectedText: 'whistling drafts' }, payload: { sound: 'wind', cue: { publicUrl: 'https://cdn.example/wind.mp3' } } } as SoundCueAttachment;
    const resolve = vi.fn(() => ({ ok: true as const, cue, paragraph: 0, occurrences: 2 }));
    const place = vi.fn(async () => {});
    const playCue = vi.fn();
    const context = createModeFamiliarContext({ chapterNumber: 8, soundWords: ['wind', 'blade clash'], resolve, place }, undefined, playCue);
    expect(context.actions.map(action => action.id)).toEqual(['sound']);
    expect(context.title).toBe('Create mode');
    const said = matchFamiliarCommand(context.actions, 'Add a howling wind sound on whistling drafts.')!;
    const sound = context.actions.find(action => action.id === said.actionId)!;
    expect(sound.check!(said.input)).toBeUndefined();
    expect(resolve).toHaveBeenLastCalledWith('wind', { kind: 'words', words: 'whistling drafts' });
    expect(sound.describe(said.input)).toBe('Chapter 8: “wind” on “whistling drafts”, paragraph 1. Those words appear 2 times in this chapter.');
    sound.preview!(said.input);
    expect(playCue).toHaveBeenCalledExactlyOnceWith('https://cdn.example/wind.mp3');
    // What was reviewed is placed, even if the request would now resolve elsewhere.
    const prepared = sound.prepare!(said.input);
    const later = { ...cue, anchor: { ...cue.anchor, selectedText: 'a later sentence' } } as SoundCueAttachment;
    resolve.mockReturnValue({ ok: true as const, cue: later, paragraph: 3, occurrences: 1 });
    await sound.run(said.input, prepared);
    expect(place).toHaveBeenCalledExactlyOnceWith(cue);
    expect(sound.check!('thunder on the sky')).toBe('Which sound? This story\'s sounds are: wind, blade clash.');
    expect(context.hint).toContain('“Add wind right there” while listening');
  });
});
