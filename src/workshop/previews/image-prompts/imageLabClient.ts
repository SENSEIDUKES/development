import type { ImageLabAspectRatio } from '../../../server/image-lab/limits';

export interface ImageLabRequest {
  prompt: string;
  /** Empty means the Model Router's default image model. */
  model?: string;
  aspectRatio: ImageLabAspectRatio;
  token: string;
}

export interface ImageLabImage {
  blob: Blob;
  mimeType: string;
  model: string;
  durationMs: number;
}

export interface ImageModelOption {
  id: string;
  label: string;
  available: boolean;
}

export interface ImageModelChoices {
  models: ImageModelOption[];
  defaultModel?: string;
}

const decodeBase64 = (data: string, mimeType: string) => {
  const bytes = Uint8Array.from(atob(data), character => character.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
};

/** One image from the Image Lab (`/api/image-lab`), with the owner's access token. */
export async function generateLabImage(request: ImageLabRequest, fetcher: typeof fetch = fetch): Promise<ImageLabImage> {
  let response: Response;
  try {
    response = await fetcher('/api/image-lab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${request.token}` },
      body: JSON.stringify({ prompt: request.prompt, ...(request.model ? { model: request.model } : {}), aspectRatio: request.aspectRatio }),
    });
  } catch {
    throw new Error('The Image Lab could not be reached. Check the connection and try again.');
  }
  const body = await response.json().catch(() => undefined) as Record<string, unknown> | undefined;
  if (!response.ok) {
    throw new Error(typeof body?.error === 'string' ? body.error : `The Image Lab answered ${response.status}.`);
  }
  if (typeof body?.image !== 'string' || typeof body.mimeType !== 'string') throw new Error('The Image Lab sent back no image.');
  return {
    blob: decodeBase64(body.image, body.mimeType),
    mimeType: body.mimeType,
    model: typeof body.model === 'string' ? body.model : request.model ?? '',
    durationMs: typeof body.durationMs === 'number' ? body.durationMs : 0,
  };
}

/** The Model Router's image models, as its Workshop page reads them. */
export async function loadImageModels(fetcher: typeof fetch = fetch): Promise<ImageModelChoices> {
  const response = await fetcher('/api/model-router');
  if (!response.ok) throw new Error(`The Model Router answered ${response.status}.`);
  const status = await response.json() as { capabilities?: Array<{ id: string; defaultModel?: string; models?: ImageModelOption[] }> };
  const images = status.capabilities?.find(capability => capability.id === 'images');
  return {
    models: (images?.models ?? []).map(({ id, label, available }) => ({ id, label, available })),
    ...(images?.defaultModel ? { defaultModel: images.defaultModel } : {}),
  };
}
