/** Safe errors shared by the Router and its provider adapters. */
export class ModelRouterError extends Error {
  constructor(readonly code: 'unsupported-capability' | 'invalid-model' | 'missing-credential' | 'timeout' | 'output-limit' | 'provider-error', message: string) {
    super(message);
    this.name = 'ModelRouterError';
  }
}
