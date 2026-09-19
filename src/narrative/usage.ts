/** Host-owned authorization and accounting. SEN never assigns accounts, prices, or balances. */
export interface NarrativeUsageRequest {
  /** Durable operation identity: the host must replay this without a second charge. */
  operationId: string;
  capability: string;
  storyId: string;
}

export interface NarrativeUsageAuthorization {
  /** Opaque host receipt; never a client permission to settle or refund funds. */
  receipt: string;
  /** Recovery distinguishes an active hold from a completed or abandoned operation. */
  state: 'authorized' | 'settled' | 'released';
}

/** Implemented by a trusted host orchestrator, outside the browser's authority. */
export interface NarrativeUsagePort {
  authorize(request: NarrativeUsageRequest): Promise<NarrativeUsageAuthorization>;
  recover(operationId: string): Promise<NarrativeUsageAuthorization | undefined>;
  settle(receipt: string): Promise<void>;
  release(receipt: string): Promise<void>;
}
