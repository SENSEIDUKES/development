import type { StoryCoverRequest } from '@seihouse/library/stories';
import { base64ToBlob } from './imageFiles';

export const STORY_COVER_ENDPOINT = '/api/story-cover';

/** A cover the server refused or could not make; `status` is its HTTP status. */
export class StoryCoverRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'StoryCoverRequestError';
  }
}

/**
 * Asks the cover server for one cover made from the story's own words, with
 * the Model Router's image choice when there is one. The owner's token lifts
 * the visitor limit.
 */
export async function requestStoryCover(story: StoryCoverRequest, options: {
  model?: string;
  accessToken?: string;
  fetchImpl?: typeof fetch;
} = {}): Promise<Blob> {
  const response = await (options.fetchImpl ?? fetch)(STORY_COVER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    },
    body: JSON.stringify({ story, ...(options.model ? { model: options.model } : {}) }),
  });
  const body = await response.json().catch(() => undefined) as { image?: unknown; mimeType?: unknown; error?: unknown } | undefined;
  if (!response.ok) {
    throw new StoryCoverRequestError(typeof body?.error === 'string' ? body.error : `The cover server answered ${response.status}.`, response.status);
  }
  if (typeof body?.image !== 'string' || typeof body.mimeType !== 'string' || !body.mimeType.startsWith('image/')) {
    throw new StoryCoverRequestError('The cover server answered without an image.', 502);
  }
  return base64ToBlob(body.image, body.mimeType);
}
