import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import { FAMILIAR_ACTION_LIST, FamiliarHelperController, composeFamiliarContext, type FamiliarHelperContext, type FamiliarPage, type FamiliarVoice } from '@seihouse/library/familiar';
import { InMemoryHarnessGenerationRepository } from '../test-utils/InMemoryHarnessGenerationRepository';
import { createModeFamiliarContext, readerFamiliarContext } from '../library/stories/ReaderFamiliar';
import { appFamiliarActions, familiarPage } from './appFamiliarActions';
import { homeCodeAction } from './HomePage';
import { chapterCodeAction } from '../library/stories/ReaderFamiliar';
import type { NovelExpandedRoute } from './routes';

const ANYWHERE = ['go-home', 'go-create', 'go-profile', 'go-energy', 'go-settings', 'go-store'];
const base = (page: FamiliarPage, navigate = vi.fn()): FamiliarHelperContext =>
  ({ key: `place:${page}`, title: page, topics: [], actions: appFamiliarActions(navigate), hint: '', page });
const ids = (context?: FamiliarHelperContext) => context?.actions.map(action => action.id);
const voice: FamiliarVoice = { available: true, listen: () => ({ stop() {}, cancel() {} }), speak: (_text, _language, done) => { done(); return () => {}; } };

async function reader() {
  const controller = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(), modelAdapter: {
    getServerInfo: async () => ({ configured: false, provider: 'fixture', models: [], defaultModel: '' }),
    generate: async () => { throw new Error('The Familiar must not call generation.'); },
  } });
  await controller.hydrate();
  const story = await controller.createStory({ premise: 'A courier returns.' });
  return readerFamiliarContext(controller.snapshot(), story.id, controller, { chapterId: 'no-chapter', busy: false, interruptPlayback: () => () => {} });
}

describe('the Familiar\'s actions, page by page', () => {
  it('gives every page exactly its own actions and the anywhere ones, front suggestions first, never another page\'s', async () => {
    // The app's anywhere actions alone, on each page (none goes where the reader already is).
    expect(ids(composeFamiliarContext(base('home')))).toEqual(['go-create', 'go-energy', 'go-store', 'go-settings', 'go-profile']);
    expect(ids(composeFamiliarContext(base('profile')))).toEqual(['go-energy', 'go-store', 'go-settings', 'go-home', 'go-create']);
    expect(ids(composeFamiliarContext(base('create')))).toEqual(['go-energy', 'go-home', 'go-store', 'go-profile', 'go-settings']);
    expect(ids(composeFamiliarContext(base('discover')))).toEqual(['go-home', 'go-create', 'go-energy', 'go-profile', 'go-settings', 'go-store']);
    expect(ids(composeFamiliarContext(base('world-info')))).toEqual(['go-home', 'go-create', 'go-energy', 'go-profile', 'go-settings', 'go-store']);
    // The Reader: Fate first, then going anywhere. Never Create mode's sound.
    const fate = await reader();
    const inReader = composeFamiliarContext(base('reader'), fate)!;
    expect(ids(inReader)).toEqual(['progression', 'worldBuilding', 'conflict', 'custom', ...ANYWHERE]);
    expect(inReader.front).toBe(4);
    // Create mode: its sound, then going anywhere. Never Fate.
    const sounds = { chapterNumber: 2, soundWords: ['wind'], resolve: vi.fn(), place: vi.fn(async () => {}) };
    expect(ids(composeFamiliarContext(base('reader'), createModeFamiliarContext(sounds, undefined)))).toEqual(['sound', ...ANYWHERE]);
    // A Reader action handed to any other page is dropped, as is anything not in the master list.
    const stray = { ...fate, page: 'profile' as const, actions: [...fate.actions, { ...fate.actions[0], id: 'delete-everything' }] };
    expect(ids(composeFamiliarContext(base('profile'), stray))).toEqual(['go-energy', 'go-store', 'go-settings', 'go-home', 'go-create']);
  });

  it('lists every action the app gives the Familiar in the master list', async () => {
    const listed = new Set(FAMILIAR_ACTION_LIST.map(entry => entry.id));
    const sounds = { chapterNumber: 2, soundWords: ['wind'], resolve: vi.fn(), place: vi.fn(async () => {}) };
    for (const action of [...appFamiliarActions(vi.fn()), ...(await reader()).actions, ...createModeFamiliarContext(sounds, undefined).actions]) {
      expect(listed, action.id).toContain(action.id);
    }
  });

  it('maps every route to its page', () => {
    const pages: Record<NovelExpandedRoute['page'], FamiliarPage> = {
      home: 'home', discover: 'discover', create: 'create', world: 'create', story: 'world-info', blueprint: 'world-info', profile: 'profile', read: 'reader', write: 'reader',
    };
    for (const [route, page] of Object.entries(pages)) expect(familiarPage(route as NovelExpandedRoute['page'])).toBe(page);
  });

  it('takes the reader to My Energy at once when asked, without asking to confirm, and closes the card', () => {
    const navigate = vi.fn();
    const helper = new FamiliarHelperController(voice);
    helper.setContext(Symbol(), base('home', navigate), 'base');
    helper.open();
    helper.submit('Check my energy.');
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'profile', cave: '/home/energy' });
    expect(helper.getSnapshot().proposal).toBeUndefined();
    return vi.waitFor(() => expect(helper.getSnapshot().open).toBe(false));
  });

  it('still asks to confirm a Reader change, and goes places at once in live talk too', async () => {
    const navigate = vi.fn();
    const helper = new FamiliarHelperController(voice);
    helper.setContext(Symbol(), base('reader', navigate), 'base');
    helper.setContext(Symbol(), await reader());
    helper.open();
    helper.submit('conflict');
    expect(helper.getSnapshot().proposal?.actionId).toBe('conflict');
    helper.change();
    // Live: the brief marks the anywhere actions as instant, and proposing one goes there.
    let brief: Parameters<NonNullable<ConstructorParameters<typeof FamiliarHelperController>[2]>['start']>[0] | undefined;
    let call: ((request: { name: 'propose_action'; actionId: string; input: string }) => Promise<string>) | undefined;
    const live = new FamiliarHelperController(voice, 'en-US', { start: (given, events) => { brief = given; call = events.call; events.connected(); return { end() {}, send() {} }; } });
    live.setContext(Symbol(), base('reader', navigate), 'base');
    live.setContext(Symbol(), await reader());
    live.open(true);
    expect(brief?.actions.find(action => action.id === 'go-energy')).toMatchObject({ instant: true });
    expect(brief?.actions.find(action => action.id === 'conflict')?.instant).toBeUndefined();
    await expect(call!({ name: 'propose_action', actionId: 'go-store', input: '' })).resolves.toBe('Done: Opened Store.');
    expect(navigate).toHaveBeenLastCalledWith({ page: 'profile', cave: '/home/store' });
    await expect(call!({ name: 'propose_action', actionId: 'sound', input: 'wind on x' })).resolves.toBe('That choice is not on this page.');
  });

  it('opens the story on a Home card by its spoken code, in the order shown, and only on Home', async () => {
    const navigate = vi.fn();
    const order = { current: ['story-b', 'story-a'] };
    const helper = new FamiliarHelperController(voice);
    helper.setContext(Symbol(), base('home', navigate), 'base');
    helper.setContext(Symbol(), { key: 'home:codes', title: 'Home', topics: [], hint: '', page: 'home', actions: [homeCodeAction(navigate, order)] });
    helper.open();
    helper.submit('and two');
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'story', storyId: 'story-a' });
    await vi.waitFor(() => expect(helper.getSnapshot().open).toBe(false));
    helper.open();
    helper.submit('N9');
    await vi.waitFor(() => expect(helper.getSnapshot().message).toBe('There is no N9 on Home.'));
    // A chapter code means nothing on Home.
    helper.submit('C3');
    expect(helper.getSnapshot().message).toBe('C3 is not on this page.');
  });

  it('opens a chapter by its code in the Reader and picks Fate by the code on its option, still confirmed', async () => {
    const opened: number[] = [];
    const openChapter = (number: number) => { if (number > 5) return false; opened.push(number); return true; };
    const helper = new FamiliarHelperController(voice);
    helper.setContext(Symbol(), base('reader'), 'base');
    const fate = await reader();
    helper.setContext(Symbol(), { ...fate, actions: [...fate.actions, chapterCodeAction(openChapter)] });
    helper.open();
    helper.submit('chapter three');
    expect(opened).toEqual([3]);
    await vi.waitFor(() => expect(helper.getSnapshot().open).toBe(false));
    helper.open();
    // The Fate panel shows Progression first, then World Building.
    helper.submit('F2');
    expect(helper.getSnapshot().proposal?.actionId).toBe('worldBuilding');
    helper.change();
    helper.submit('fate one');
    expect(helper.getSnapshot().proposal?.actionId).toBe('progression');
    helper.change();
    helper.submit('N1');
    expect(helper.getSnapshot().message).toBe('N1 is not on this page.');
  });
});
