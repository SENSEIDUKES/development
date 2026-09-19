import { describe, expect, it, vi } from 'vitest';
import type { NarrativeUsageAuthorization, NarrativeUsagePort } from '@seihouse/sen/contracts';
import { executeUsageAccountedOperation, InMemoryNarrativeOperationRepository, NarrativeOperationRecoveryRequiredError } from './narrativeOperation';

const fixture = () => {
  let authorization: NarrativeUsageAuthorization = { receipt: 'hold-1', state: 'authorized' };
  const usage: NarrativeUsagePort = {
    authorize: vi.fn(async () => authorization), recover: vi.fn(async () => authorization),
    settle: vi.fn(async () => { authorization = { ...authorization, state: 'settled' }; }), release: vi.fn(),
  };
  return { usage, repository: new InMemoryNarrativeOperationRepository<{ prose: string }>(), request: { operationId: 'attempt-1', capability: 'chapter.generate', storyId: 'story-1' } };
};

describe('trusted usage-accounted narrative operation', () => {
  it('persists the provider result before settling and replays without another provider call', async () => {
    const value = fixture();
    const execute = vi.fn(async () => ({ prose: 'Chapter' }));
    await expect(executeUsageAccountedOperation({ ...value, execute })).resolves.toEqual({ prose: 'Chapter' });
    await expect(executeUsageAccountedOperation({ ...value, execute })).resolves.toEqual({ prose: 'Chapter' });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(value.usage.settle).toHaveBeenCalledTimes(2);
  });
  it('keeps the reservation held and requires recovery after an unknown provider outcome', async () => {
    const value = fixture();
    await expect(executeUsageAccountedOperation({ ...value, execute: async () => { throw new Error('connection lost'); } })).rejects.toThrow('connection lost');
    await expect(executeUsageAccountedOperation({ ...value, execute: async () => ({ prose: 'duplicate' }) })).rejects.toBeInstanceOf(NarrativeOperationRecoveryRequiredError);
    expect(value.usage.settle).not.toHaveBeenCalled();
    expect(value.usage.release).not.toHaveBeenCalled();
  });
  it('fails closed when a settled receipt has no durable result', async () => {
    const value = fixture();
    await value.usage.settle('hold-1');
    await expect(executeUsageAccountedOperation({ ...value, execute: async () => ({ prose: 'duplicate' }) })).rejects.toBeInstanceOf(NarrativeOperationRecoveryRequiredError);
  });
});
