import { createEmptyHarnessWorkspaceState, readHarnessWorkspaceState, type HarnessWorkspaceState, type HarnessGenerationRepository } from '@seihouse/sen/harness-generation';
const cloneHarnessValue = <T,>(value: T): T => structuredClone(value);
/** Test-only repository port; it models reload by retaining one durable snapshot. */
export class InMemoryHarnessGenerationRepository implements HarnessGenerationRepository {
  private state: HarnessWorkspaceState;
  private pendingFailures: Error[] = [];

  constructor(initial: HarnessWorkspaceState = createEmptyHarnessWorkspaceState()) {
    this.state = readHarnessWorkspaceState(initial);
  }

  failNextSave(error = new Error('Simulated Harness Generation persistence failure.')) {
    this.pendingFailures.push(error);
  }

  async load(): Promise<HarnessWorkspaceState> {
    return cloneHarnessValue(this.state);
  }

  async save(state: HarnessWorkspaceState): Promise<void> {
    const failure = this.pendingFailures.shift();
    if (failure) throw failure;
    this.state = cloneHarnessValue(state);
  }

  snapshot(): HarnessWorkspaceState {
    return cloneHarnessValue(this.state);
  }
}
