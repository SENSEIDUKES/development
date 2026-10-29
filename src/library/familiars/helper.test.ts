import { describe, expect, it, vi } from 'vitest';
import { FamiliarHelperController, matchFamiliarCommand, type FamiliarHelperAction, type FamiliarHelperContext, type FamiliarLive, type FamiliarLiveBrief, type FamiliarLiveEvents, type FamiliarVoice } from './helper';

function setup() {
  const run = vi.fn(async (_text: string) => {});
  const release = vi.fn();
  let heard: (text: string) => void = () => {};
  let failed: (message: string) => void = () => {};
  let spoken: () => void = () => {};
  const cancelListen = vi.fn();
  const stopListen = vi.fn();
  const cancelSpeak = vi.fn();
  const voice: FamiliarVoice = {
    available: true,
    listen: vi.fn((_language, result, failure) => { heard = result; failed = failure; return { stop: stopListen, cancel: cancelListen }; }),
    speak: vi.fn((_text, _language, done) => { spoken = done; return cancelSpeak; }),
  };
  const actions: FamiliarHelperAction[] = [
    { id: 'conflict', label: 'Conflict', phrases: ['conflict'], describe: () => 'A rival arrives.', success: 'Saved.', run },
    { id: 'custom', label: 'Custom', phrases: ['custom'], input: { label: 'Direction', maxLength: 1200 }, describe: text => text, success: 'Saved.', run },
  ];
  const context: FamiliarHelperContext = { key: 'story:next-2', title: 'Fate', hint: 'Choose a path.', topics: [], actions, interrupt: () => release };
  const helper = new FamiliarHelperController(voice);
  const owner = Symbol();
  helper.setContext(owner, context);
  return { helper, voice, context, owner, run, release, cancelListen, stopListen, cancelSpeak,
    heard: (text: string) => heard(text), failed: (text: string) => failed(text), spoken: () => spoken(), lateResult: () => heard };
}

describe('global Familiar interaction', () => {
  it('keeps custom text verbatim and does not infer commands from unrelated speech', () => {
    const { context } = setup();
    expect(matchFamiliarCommand(context.actions, 'Custom: 赵 walks away, without forgiving him.')).toEqual({ actionId: 'custom', input: '赵 walks away, without forgiving him.' });
    expect(matchFamiliarCommand(context.actions, 'CONFLICT.')).toEqual({ actionId: 'conflict', input: '' });
    expect(matchFamiliarCommand(context.actions, 'avoid conflict')).toBeUndefined();
    expect(matchFamiliarCommand(context.actions, 'customary behavior')).toBeUndefined();
  });
  it('reads back a proposal and accepts a separate spoken confirmation before saving', async () => {
    const t = setup();
    t.helper.open(true);
    t.heard('conflict');
    expect(t.run).not.toHaveBeenCalled();
    expect(t.cancelListen).toHaveBeenCalled();
    expect(t.voice.speak).toHaveBeenCalledWith('A rival arrives. Say Confirm or Cancel.', 'en-US', expect.any(Function), expect.any(Function));
    t.spoken();
    expect(t.helper.getSnapshot().phase).toBe('listening');
    t.heard('confirm');
    await vi.waitFor(() => expect(t.helper.getSnapshot().message).toBe('Saved.'));
    expect(t.run).toHaveBeenCalledExactlyOnceWith('');
    // Heard before playback resumes over it.
    expect(t.voice.speak).toHaveBeenLastCalledWith('Saved.', 'en-US', expect.any(Function), expect.any(Function));
    expect(t.release).not.toHaveBeenCalled();
    t.spoken();
    expect(t.release).toHaveBeenCalledExactlyOnceWith(true);
  });
  it('speaks why a request cannot apply, then listens again, and never proposes it', () => {
    const t = setup();
    const check = vi.fn((input: string) => input === 'nowhere' ? 'I can\'t find “nowhere” in this chapter.' : undefined);
    t.helper.setContext(t.owner, { ...t.context, actions: [...t.context.actions,
      { id: 'sound', label: 'Add sound', phrases: ['add'], input: { label: 'Sound', maxLength: 200 }, check, describe: text => text, success: 'Placed.', run: t.run }] });
    t.helper.open(true);
    t.heard('add nowhere');
    expect(t.helper.getSnapshot().proposal).toBeUndefined();
    expect(t.voice.speak).toHaveBeenLastCalledWith('I can\'t find “nowhere” in this chapter.', 'en-US', expect.any(Function), expect.any(Function));
    t.spoken();
    expect(t.helper.getSnapshot()).toMatchObject({ phase: 'listening', message: 'Listening…' });
    t.heard('something unrelated');
    expect(t.voice.speak).toHaveBeenLastCalledWith('Choose a path.', 'en-US', expect.any(Function), expect.any(Function));
    expect(t.run).not.toHaveBeenCalled();
  });
  it('plays a proposal’s preview on request, then listens for Confirm or Cancel', () => {
    vi.useFakeTimers();
    try {
      const t = setup();
      const preview = vi.fn();
      t.helper.setContext(t.owner, { ...t.context, actions: [...t.context.actions,
        { id: 'sound', label: 'Add sound', phrases: ['add'], input: { label: 'Sound', maxLength: 200 }, preview, describe: text => `Wind on ${text}.`, success: 'Placed.', run: t.run }] });
      t.helper.open(true);
      t.heard('add whistling drafts');
      expect(t.voice.speak).toHaveBeenLastCalledWith('Wind on whistling drafts. Say Confirm, Hear it, or Cancel.', 'en-US', expect.any(Function), expect.any(Function));
      t.spoken();
      t.heard('hear it');
      expect(preview).toHaveBeenCalledExactlyOnceWith('whistling drafts');
      expect(t.helper.getSnapshot().phase).toBe('review');
      vi.advanceTimersByTime(2_500);
      expect(t.helper.getSnapshot().phase).toBe('listening');
      expect(t.helper.getSnapshot().proposal?.input).toBe('whistling drafts');
    } finally { vi.useRealTimers(); }
  });
  it('uses the same confirmation for typed input without speaking', async () => {
    const t = setup();
    t.helper.open();
    t.helper.submit('custom: Keep her name.');
    expect(t.helper.getSnapshot().proposal?.summary).toBe('Keep her name.');
    expect(t.voice.speak).not.toHaveBeenCalled();
    await t.helper.confirm();
    expect(t.run).toHaveBeenCalledExactlyOnceWith('Keep her name.');
  });
  it('ignores late recognition after cancel and releases its playback once', () => {
    const t = setup();
    t.helper.open(true);
    const late = t.lateResult();
    t.helper.close();
    late('conflict');
    t.helper.close();
    expect(t.helper.getSnapshot().open).toBe(false);
    expect(t.run).not.toHaveBeenCalled();
    expect(t.release).toHaveBeenCalledExactlyOnceWith(true);
  });
  it('invalidates proposals on context change without resuming old playback', async () => {
    const t = setup();
    t.helper.open(true);
    t.heard('conflict');
    t.helper.setContext(t.owner, { ...t.context, key: 'story:next-3' });
    t.spoken();
    await t.helper.confirm();
    expect(t.helper.getSnapshot().proposal).toBeUndefined();
    expect(t.run).not.toHaveBeenCalled();
    expect(t.release).toHaveBeenCalledExactlyOnceWith(false);
  });
  it('unregisters only its own screen and supports actions outside the Reader', async () => {
    const t = setup();
    const settings = Symbol();
    const run = vi.fn(async () => {});
    t.helper.setContext(settings, { key: 'settings', title: 'Settings', hint: 'Say Larger text.', topics: [], actions: [
      { id: 'larger', label: 'Larger text', phrases: ['larger text'], describe: () => 'Increase text size.', success: 'Text enlarged.', run },
    ] });
    t.helper.clearContext(t.owner);
    t.helper.open();
    t.helper.submit('larger text');
    await t.helper.confirm();
    expect(run).toHaveBeenCalledOnce();
    expect(t.helper.getSnapshot().message).toBe('Text enlarged.');
    t.helper.clearContext(settings);
    expect(t.helper.getSnapshot().context).toBeUndefined();
  });
  it('keeps a failed save reviewable and prevents duplicate confirms', async () => {
    const t = setup();
    let reject!: (reason: Error) => void;
    t.run.mockImplementation(() => new Promise((_resolve, no) => { reject = no; }));
    t.helper.open();
    t.helper.submit('conflict');
    const saving = t.helper.confirm();
    await t.helper.confirm();
    expect(t.run).toHaveBeenCalledOnce();
    reject(new Error('Wait for the chapter being written.'));
    await saving;
    expect(t.helper.getSnapshot()).toMatchObject({ phase: 'review', message: 'Wait for the chapter being written.' });
    expect(t.release).not.toHaveBeenCalled();
    t.helper.close();
    expect(t.release).toHaveBeenCalledWith(true);
  });
  it('keeps touch and text available after speech failure and stops on backgrounding', () => {
    const t = setup();
    t.helper.open(true);
    t.failed('Microphone denied.');
    expect(t.helper.getSnapshot()).toMatchObject({ phase: 'ready', message: 'Microphone denied.' });
    t.helper.submit('custom: ' + 'x'.repeat(1201));
    expect(t.helper.getSnapshot().proposal).toBeUndefined();
    t.helper.suspend();
    expect(t.release).toHaveBeenCalledWith(false);
    expect(t.helper.getSnapshot().open).toBe(false);
  });
  it('explains in Explain mode without proposing anything, and switches modes by voice', () => {
    const t = setup();
    t.helper.setContext(t.owner, { ...t.context, topics: [{ id: 'fate', label: 'Fate', phrases: ['fate', 'what is fate'], explanation: 'Fate decides the next chapter.' }] });
    t.helper.open(true);
    expect(t.helper.getSnapshot().mode).toBe('action');
    t.heard('explain');
    expect(t.helper.getSnapshot().mode).toBe('explain');
    expect(t.voice.speak).toHaveBeenLastCalledWith('Say Fate.', 'en-US', expect.any(Function), expect.any(Function));
    t.spoken();
    t.heard('What is Fate?');
    expect(t.voice.speak).toHaveBeenLastCalledWith('Fate decides the next chapter.', 'en-US', expect.any(Function), expect.any(Function));
    t.spoken();
    // An action's name explains nothing in Explain mode, and never runs.
    t.heard('conflict');
    expect(t.helper.getSnapshot().proposal).toBeUndefined();
    expect(t.run).not.toHaveBeenCalled();
    t.spoken();
    t.heard('action');
    expect(t.helper.getSnapshot()).toMatchObject({ mode: 'action', message: 'Choose a path.' });
  });
  it('says when a place has nothing to explain or do yet', () => {
    const t = setup();
    t.helper.setContext(t.owner, { ...t.context, actions: [] });
    t.helper.open();
    expect(t.helper.getSnapshot().message).toBe('Nothing to do here yet.');
    t.helper.setMode('explain');
    expect(t.helper.getSnapshot().message).toBe('Nothing to explain here yet.');
  });
  it('reads a topic in its recorded voice, falling back to the device voice when the recording cannot play', () => {
    const t = setup();
    let failPlay: (message: string) => void = () => {};
    const play = vi.fn((_url: string, _done: () => void, failure: (message: string) => void) => { failPlay = failure; return () => {}; });
    const helper = new FamiliarHelperController({ ...t.voice, play });
    helper.setContext(t.owner, { ...t.context, topics: [{ id: 'energy', label: 'Energy', phrases: ['energy'], explanation: 'Energy powers creation.', audioUrl: 'https://cdn.example/energy.mp3' }] });
    helper.open();
    helper.setMode('explain');
    helper.explain('energy');
    expect(play).toHaveBeenCalledWith('https://cdn.example/energy.mp3', expect.any(Function), expect.any(Function));
    expect(t.voice.speak).not.toHaveBeenCalled();
    expect(helper.getSnapshot()).toMatchObject({ topicId: 'energy', phase: 'speaking' });
    failPlay('blocked');
    expect(t.voice.speak).toHaveBeenLastCalledWith('Energy powers creation.', 'en-US', expect.any(Function), expect.any(Function));
  });
  it('returns to the app’s own place when a page leaves', () => {
    const t = setup();
    const app = Symbol();
    t.helper.setContext(app, { key: 'place:Home', title: 'Home', hint: '', topics: [], actions: [] }, 'base');
    expect(t.helper.getSnapshot().context?.title).toBe('Fate');
    t.helper.clearContext(t.owner);
    expect(t.helper.getSnapshot().context?.title).toBe('Home');
    t.helper.setContext(t.owner, t.context);
    expect(t.helper.getSnapshot().context?.title).toBe('Fate');
  });
  it('keeps listening until the reader taps that they are done talking', () => {
    const t = setup();
    t.helper.open(true);
    expect(t.helper.getSnapshot().phase).toBe('listening');
    t.helper.doneTalking();
    expect(t.stopListen).toHaveBeenCalledOnce();
    expect(t.cancelListen).not.toHaveBeenCalled();
    t.heard('conflict');
    expect(t.helper.getSnapshot().proposal?.actionId).toBe('conflict');
  });
  it('applies what was reviewed, even when the screen changes before Confirm', async () => {
    const t = setup();
    let target = 'the words read then';
    const run = vi.fn(async (_input: string, _prepared?: unknown) => {});
    t.helper.setContext(t.owner, { ...t.context, actions: [...t.context.actions,
      { id: 'sound', label: 'Add sound', phrases: ['add'], input: { label: 'Sound', maxLength: 200 }, prepare: () => target, describe: () => target, success: 'Placed.', run }] });
    t.helper.open();
    t.helper.submit('add wind right there');
    target = 'a later sentence';
    await t.helper.confirm();
    expect(run).toHaveBeenCalledExactlyOnceWith('wind right there', 'the words read then');
  });
  it('keeps the device voice stoppable when a recording fails at once and it reads instead', () => {
    const t = setup();
    const play = vi.fn((_url: string, _done: () => void, failure: (message: string) => void) => { failure('No player.'); return () => {}; });
    const helper = new FamiliarHelperController({ ...t.voice, play });
    helper.setContext(t.owner, { ...t.context, topics: [{ id: 'energy', label: 'Energy', phrases: ['energy'], explanation: 'Energy powers creation.', audioUrl: 'https://cdn.example/energy.mp3' }] });
    helper.open();
    helper.explain('energy');
    expect(t.voice.speak).toHaveBeenLastCalledWith('Energy powers creation.', 'en-US', expect.any(Function), expect.any(Function));
    helper.quiet();
    expect(t.cancelSpeak).toHaveBeenCalledOnce();
  });
});

describe('Familiar live talk', () => {
  function live() {
    const t = setup();
    let events: FamiliarLiveEvents | undefined;
    let brief: FamiliarLiveBrief | undefined;
    const end = vi.fn();
    const send = vi.fn();
    const adapter: FamiliarLive = { start: vi.fn((given, handlers) => { brief = given; events = handlers; return { end, send }; }) };
    const helper = new FamiliarHelperController(t.voice, 'en-US', adapter);
    helper.setIdentity({ name: 'Celestial Guardian', description: 'A loyal fox spirit.' });
    const topics = [{ id: 'energy', label: 'Energy', phrases: ['energy'], explanation: 'Energy pays for manifesting.' }];
    const context = { ...t.context, topics };
    helper.setContext(t.owner, context);
    helper.open();
    return { ...t, helper, adapter, end, send, context, events: () => events!, brief: () => brief! };
  }
  it('starts with who the Familiar is and what this place explains and does, and keeps the conversation to read back', () => {
    const t = live();
    t.helper.talk();
    expect(t.brief()).toEqual({
      familiar: { name: 'Celestial Guardian', description: 'A loyal fox spirit.' }, place: 'Fate', language: 'en-US',
      topics: [{ id: 'energy', label: 'Energy', explanation: 'Energy pays for manifesting.' }],
      actions: [{ id: 'conflict', label: 'Conflict' }, { id: 'custom', label: 'Custom', input: { label: 'Direction', maxLength: 1200 } }],
    });
    expect(t.helper.getSnapshot().live?.status).toBe('connecting');
    t.events().connected();
    t.events().caption('reader', 'What is');
    t.events().caption('reader', 'What is energy?');
    t.events().caption('familiar', 'It pays');
    t.events().caption('familiar', 'It pays for manifesting.');
    // A turn over: the next words start new lines.
    t.events().caption('reader', '');
    t.events().caption('familiar', '');
    t.events().caption('reader', 'Thanks.');
    expect(t.helper.getSnapshot().live).toEqual({ status: 'on' });
    expect(t.helper.getSnapshot().chat).toEqual([
      { speaker: 'note', text: 'Talking on Fate' },
      { speaker: 'reader', text: 'What is energy?' },
      { speaker: 'familiar', text: 'It pays for manifesting.' },
      { speaker: 'reader', text: 'Thanks.' },
    ]);
    // Hanging up keeps the conversation to read.
    t.helper.talk();
    expect(t.helper.getSnapshot().chat).toHaveLength(4);
    // The device voice never listens over it.
    expect(t.voice.listen).not.toHaveBeenCalled();
  });
  it('shows topics and proposes changes for the reader to confirm, and confirms only when asked', async () => {
    const t = live();
    t.helper.talk();
    t.events().connected();
    await expect(t.events().call({ name: 'show_topic', topicId: 'energy' })).resolves.toBe('Showing Energy on their screen.');
    expect(t.helper.getSnapshot()).toMatchObject({ mode: 'explain', topicId: 'energy' });
    // A topic shown in conversation is never read in the recorded voice over it.
    t.helper.explain('energy');
    expect(t.voice.speak).not.toHaveBeenCalled();
    await expect(t.events().call({ name: 'propose_action', actionId: 'custom', input: '' })).resolves.toBe('Direction: enter 1–1200 characters.');
    await expect(t.events().call({ name: 'propose_action', actionId: 'custom', input: 'Leave the sect.' })).resolves.toBe('On their screen to confirm: Leave the sect.');
    expect(t.helper.getSnapshot()).toMatchObject({ mode: 'action', phase: 'review', proposal: { actionId: 'custom', input: 'Leave the sect.' } });
    expect(t.run).not.toHaveBeenCalled();
    await expect(t.events().call({ name: 'answer_proposal', answer: 'confirm' })).resolves.toBe('Done. Saved.');
    expect(t.run).toHaveBeenCalledExactlyOnceWith('Leave the sect.');
    // Story playback waits for the conversation to end.
    expect(t.release).not.toHaveBeenCalled();
    await expect(t.events().call({ name: 'answer_proposal', answer: 'confirm' })).resolves.toBe('Nothing is waiting to be confirmed.');
    t.helper.talk();
    expect(t.end).toHaveBeenCalledOnce();
    expect(t.helper.getSnapshot().live).toBeUndefined();
    expect(t.release).toHaveBeenCalledWith(true);
    // What it did on screen is in the conversation too.
    expect(t.helper.getSnapshot().chat.filter(line => line.speaker === 'note').map(line => line.text))
      .toEqual(['Talking on Fate', 'Showed Energy', 'To confirm: Leave the sect.', 'Saved.']);
  });
  it('sends typed messages into the conversation, starting it if needed and holding them until it connects', () => {
    const t = live();
    t.helper.say('What is energy?');
    expect(t.adapter.start).toHaveBeenCalledOnce();
    expect(t.send).not.toHaveBeenCalled();
    t.events().connected();
    expect(t.send).toHaveBeenCalledExactlyOnceWith('What is energy?');
    t.helper.say('  And manifesting?  ');
    expect(t.send).toHaveBeenLastCalledWith('And manifesting?');
    expect(t.adapter.start).toHaveBeenCalledOnce();
    expect(t.helper.getSnapshot().chat.filter(line => line.speaker === 'reader').map(line => line.text)).toEqual(['What is energy?', 'And manifesting?']);
  });
  it('hands back a typed message that never reached the conversation, and keeps the microphone off', () => {
    const t = live();
    t.helper.say('What is energy?');
    t.events().ended(undefined, true);
    expect(t.send).not.toHaveBeenCalled();
    expect(t.voice.listen).not.toHaveBeenCalled();
    expect(t.helper.getSnapshot().unsent).toBe('What is energy?');
    expect(t.helper.getSnapshot().chat.at(-1)).toEqual({ speaker: 'note', text: 'Not sent: your Familiar could not connect.' });
    expect(t.helper.takeUnsent()).toBe('What is energy?');
    expect(t.helper.getSnapshot().unsent).toBeUndefined();
    // The next conversation does not resend it by itself.
    t.helper.talk();
    t.events().connected();
    expect(t.send).not.toHaveBeenCalled();
  });
  it('hangs up when the page changes or the panel closes, and ignores the old conversation after', async () => {
    const t = live();
    t.helper.talk();
    const old = t.events();
    t.helper.setContext(Symbol(), { ...t.context, key: 'home' });
    expect(t.end).toHaveBeenCalledOnce();
    expect(t.helper.getSnapshot().live).toBeUndefined();
    old.caption('familiar', 'late words');
    expect(t.helper.getSnapshot().live).toBeUndefined();
    await expect(old.call({ name: 'show_topic', topicId: 'energy' })).resolves.toBe('The conversation has ended.');
    t.helper.talk();
    t.helper.close();
    expect(t.end).toHaveBeenCalledTimes(2);
  });
  it('pauses story playback to talk, and keeps it paused while the device voice listens where live talk cannot start', () => {
    const t = live();
    const interrupt = vi.fn(() => t.release);
    t.helper.setContext(t.owner, { ...t.context, interrupt });
    t.helper.talk();
    expect(interrupt).toHaveBeenCalledOnce();
    t.events().ended(undefined, true);
    expect(t.voice.listen).toHaveBeenCalledOnce();
    expect(t.release).not.toHaveBeenCalled();
  });
  it('listens with the device voice where live talk cannot start, and says why it ended otherwise', () => {
    const t = live();
    t.helper.talk();
    t.events().ended(undefined, true);
    expect(t.voice.listen).toHaveBeenCalledOnce();
    t.helper.useText();
    t.helper.talk();
    t.events().ended('Your Familiar stopped talking.');
    expect(t.helper.getSnapshot()).toMatchObject({ live: undefined, message: 'Your Familiar stopped talking.' });
    expect(t.voice.listen).toHaveBeenCalledOnce();
  });
});

