import type { NarrativeUsagePort, NarrativeUsageRequest } from '@seihouse/sen/contracts';

export type NarrativeOperationCheckpoint<Result> =
  | { operationId: string; receipt: string; state: 'authorized' }
  | { operationId: string; receipt: string; state: 'provider-started' }
  | { operationId: string; receipt: string; state: 'complete'; result: Result };

/** Host persistence boundary. `begin` must atomically return the existing row for one operation id. */
export interface NarrativeOperationRepository<Result> {
  load(operationId: string): Promise<NarrativeOperationCheckpoint<Result> | undefined>;
  begin(checkpoint: Extract<NarrativeOperationCheckpoint<Result>, { state: 'authorized' }>): Promise<{ created: boolean; checkpoint: NarrativeOperationCheckpoint<Result> }>;
  save(checkpoint: NarrativeOperationCheckpoint<Result>): Promise<void>;
}

export class NarrativeOperationRecoveryRequiredError extends Error {
  constructor() {
    super('The provider outcome is unknown. Recover this operation before explicitly retrying.');
    this.name = 'NarrativeOperationRecoveryRequiredError';
  }
}

/** Provider output becomes durable before settlement; unknown calls keep their hold. */
export async function executeUsageAccountedOperation<Result>(options: {
  request: NarrativeUsageRequest;
  usage: NarrativeUsagePort;
  repository: NarrativeOperationRepository<Result>;
  execute(): Promise<Result>;
}): Promise<Result> {
  let checkpoint = await options.repository.load(options.request.operationId);
  if (checkpoint?.state === 'complete') {
    await options.usage.settle(checkpoint.receipt);
    return structuredClone(checkpoint.result);
  }
  if (checkpoint?.state === 'provider-started') throw new NarrativeOperationRecoveryRequiredError();
  if (!checkpoint) {
    const authorization = await options.usage.authorize(options.request);
    if (authorization.state === 'released') throw new Error('This narrative operation was released and cannot run.');
    if (authorization.state === 'settled') throw new NarrativeOperationRecoveryRequiredError();
    const begun = await options.repository.begin({ operationId: options.request.operationId, receipt: authorization.receipt, state: 'authorized' });
    checkpoint = begun.checkpoint;
    if (!begun.created) {
      if (checkpoint.state === 'complete') { await options.usage.settle(checkpoint.receipt); return structuredClone(checkpoint.result); }
      if (checkpoint.state === 'provider-started') throw new NarrativeOperationRecoveryRequiredError();
    }
  }
  const started = { operationId: checkpoint.operationId, receipt: checkpoint.receipt, state: 'provider-started' as const };
  await options.repository.save(started);
  const result = await options.execute();
  const complete = { operationId: started.operationId, receipt: started.receipt, state: 'complete' as const, result: structuredClone(result) };
  await options.repository.save(complete);
  await options.usage.settle(started.receipt);
  return structuredClone(result);
}

/** Test/DEV reference only; production chooses its own transaction store. */
export class InMemoryNarrativeOperationRepository<Result> implements NarrativeOperationRepository<Result> {
  private readonly records = new Map<string, NarrativeOperationCheckpoint<Result>>();
  async load(operationId: string) { const value = this.records.get(operationId); return value ? structuredClone(value) : undefined; }
  async begin(checkpoint: Extract<NarrativeOperationCheckpoint<Result>, { state: 'authorized' }>) {
    const existing = this.records.get(checkpoint.operationId);
    if (existing) return { created: false, checkpoint: structuredClone(existing) };
    this.records.set(checkpoint.operationId, structuredClone(checkpoint));
    return { created: true, checkpoint: structuredClone(checkpoint) };
  }
  async save(checkpoint: NarrativeOperationCheckpoint<Result>) { this.records.set(checkpoint.operationId, structuredClone(checkpoint)); }
}
