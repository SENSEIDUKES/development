import { describe, expect, it, vi } from 'vitest';
import { FamiliarHelperController, matchFamiliarCommand, type FamiliarHelperAction, type FamiliarHelperContext, type FamiliarVoice } from './helper';

function setup() {
  const run = vi.fn(async (_text: string) => {});
  const release = vi.fn();
  let heard: (text: string) => void = () => {};
  let failed: (message: string) => void = () => {};
  let spoken: () => void = () => {};
  const cancelListen = vi.fn();
  const cancelSpeak = vi.fn();
  const voice: FamiliarVoice = {
    available: true,
    listen: vi.fn((_language, result, failure) => { heard = result; failed = failure; return cancelListen; }),
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
  return { helper, voice, context, owner, run, release, cancelListen, cancelSpeak,
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
});
