import type { ReaderTranslationProvider, ReaderTranslationProviderReply, ReaderTranslationRequest } from '@seihouse/sen/translation';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const responseError = async (response: Response): Promise<string> => {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.error === 'string') return body.error;
  } catch {
    // Fall through to the status message.
  }
  return `The translation request failed (${response.status}).`;
};

/** Browser-only adapter. The provider key stays on the server route. */
export class ReaderTranslationHttpProvider implements ReaderTranslationProvider {
  constructor(private readonly endpoint = '/api/reader-translation') {}

  async translate(request: ReaderTranslationRequest, signal?: AbortSignal) {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(request),
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) throw new Error(await responseError(response));
    const body: unknown = await response.json();
    if (!isRecord(body) || typeof body.rawProviderResponse !== 'string' || !isRecord(body.receipt)) {
      throw new Error('The translation service returned an unreadable response.');
    }
    return body as unknown as ReaderTranslationProviderReply;
  }
}
