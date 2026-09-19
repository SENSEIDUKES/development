import { describe, expect, it } from 'vitest';
import { createQiAccountStore } from '@seihouse/library/cultivation';
import { type QiAccountSnapshot } from '@seihouse/library/cultivation';

describe('cultivation read projection', () => {
  it('ignores an old request after the host clears an account', async () => {
    let reply!: (value: QiAccountSnapshot) => void;
    const store = createQiAccountStore({ getSnapshot: () => new Promise(resolve => { reply = resolve; }) });
    const pending = store.refresh();
    store.clear();
    reply({ uid: 'previous', balance: 900, transactions: [] });
    await pending;
    expect(store.getSnapshot()).toEqual({ status: 'unavailable', snapshot: null, error: null });
  });
  it('replaces snapshots without adding rewards or exposing balance writes', async () => {
    const store = createQiAccountStore({ getSnapshot: async () => ({ uid: 'reader', balance: 100, transactions: [] }) });
    await store.refresh(); await store.refresh();
    expect(store.getSnapshot().snapshot?.balance).toBe(100);
    expect(Object.keys(store).sort()).toEqual(['clear', 'getSnapshot', 'refresh', 'subscribe']);
  });
});
