import type { CodexPictureRequest, StoryCoverRequest } from '@seihouse/library/stories';
import { base64ToBlob } from './imageFiles';

export const STORY_COVER_ENDPOINT = '/api/story-cover';

/** A cover the server refused or could not make; `status` is its HTTP status. */
export class StoryCoverRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'StoryCoverRequestError';
  }
}

interface ImageRequestOptions {
  model?: string;
  accessToken?: string;
  fetchImpl?: typeof fetch;
}

/** Sends one request to the cover server and reads the image it answers with. */
async function requestImage(body: Record<string, unknown>, options: ImageRequestOptions): Promise<Blob> {
  const response = await (options.fetchImpl ?? fetch)(STORY_COVER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    },
    body: JSON.stringify({ ...body, ...(options.model ? { model: options.model } : {}) }),
  });
  const answer = await response.json().catch(() => undefined) as { image?: unknown; mimeType?: unknown; error?: unknown } | undefined;
  if (!response.ok) {
    throw new StoryCoverRequestError(typeof answer?.error === 'string' ? answer.error : `The cover server answered ${response.status}.`, response.status);
  }
  if (typeof answer?.image !== 'string' || typeof answer.mimeType !== 'string' || !answer.mimeType.startsWith('image/')) {
    throw new StoryCoverRequestError('The cover server answered without an image.', 502);
  }
  return base64ToBlob(answer.image, answer.mimeType);
}

/**
 * Asks the cover server for one cover made from the story's own words, with
 * the Model Router's image choice when there is one. The owner's token lifts
 * the visitor limit.
 */
export const requestStoryCover = (story: StoryCoverRequest, options: ImageRequestOptions = {}): Promise<Blob> =>
  requestImage({ story }, options);

/**
 * Asks the cover server for a Codex card's picture, made from the card's look
 * and the story's own words, with the same image choice, token and limit.
 */
export const requestCodexPicture = (request: CodexPictureRequest, options: ImageRequestOptions = {}): Promise<Blob> =>
  requestImage({ card: request.card, story: request.story }, options);
