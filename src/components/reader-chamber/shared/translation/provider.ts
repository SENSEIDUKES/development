/**
 * The Reader translation provider boundary.
 *
 * React never calls a model. The controller hands a frozen request to this
 * port, and the Development adapter posts it to the server route that holds
 * the provider key. The reply comes back raw and is validated by the shared
 * validator before anything is saved.
 */

import type { ReaderTranslationReceipt, ReaderTranslationRequest } from './contract';

export interface ReaderTranslationProviderReply {
  /** Exactly what the provider returned, still untrusted. */
  rawProviderResponse: string;
  receipt: ReaderTranslationReceipt;
}

export interface ReaderTranslationProvider {
  translate(
    request: ReaderTranslationRequest,
    signal?: AbortSignal,
  ): Promise<ReaderTranslationProviderReply>;
}
